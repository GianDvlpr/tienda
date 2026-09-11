import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertOrderEditable, lockOrder, deductItemStock, releaseOrderStock } from '@/lib/order-stock';
import { recalcPayments } from '@/lib/order-payments';
import { cents, validatePaidStatus } from '@/lib/order-rules';
import { trackerPusherServer } from '@/lib/pusher';
import { recordAudit } from '@/lib/audit';
import { calculateBundleDiscount, type BundleDiscountPromotion } from '@/lib/bundle-discount';

export const runtime = 'nodejs';

const validSalesChannels = new Set(['SHOP', 'WHATSAPP', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'OTHER']);
const validStatuses = new Set(['PENDING_WS', 'PARTIALLY_PAID', 'PAID', 'SEPARATED', 'MEASURES_CONFIRMED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED']);

type OrderItemInput = {
    variant_id?: string;
    variantId?: string;
    qty?: number | string;
    unit_price?: number | string | null;
};

type UpdateOrderRequest = {
    status?: string;
    shipping_name?: string;
    shipping_dni?: string | null;
    shipping_phone?: string;
    shipping_address?: string;
    shipping_city?: string | null;
    shipping_reference?: string | null;
    shipping_cost?: number | string | null;
    notes?: string | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    amount_paid?: number | string | null;
    external_reference?: string | null;
    sales_channel?: string;
    items?: OrderItemInput[];
};

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown) {
    const text = normalizeText(value);
    return text || null;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const order = await prisma.order_header.findUnique({
            where: { order_id: id },
            include: {
                order_item: true
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        const photos = await prisma.order_photo.findMany({
            where: { order_id: id },
            orderBy: { created_at: 'desc' },
        });

        return NextResponse.json({ ...order, order_photo: photos });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json() as UpdateOrderRequest;
        const result = await prisma.$transaction(async tx => {
            const oldData = await lockOrder(tx, id);
            assertOrderEditable(oldData);
            const oldItems = await tx.order_item.findMany({ where: { order_id: id } });
            const status = body.status ? normalizeText(body.status).toUpperCase() : oldData.status;
            if (!validStatuses.has(status)) throw new Error('Estado inválido');
            if (oldData.status === 'CANCELLED' && status !== 'CANCELLED') throw new Error('Un pedido cancelado no puede reactivarse; crea uno nuevo');
            const salesChannel = body.sales_channel ? normalizeText(body.sales_channel).toUpperCase() : oldData.sales_channel;
            if (!validSalesChannels.has(salesChannel)) throw new Error('Canal inválido');
            const shippingName = body.shipping_name === undefined ? oldData.shipping_name : normalizeText(body.shipping_name);
            const shippingPhone = body.shipping_phone === undefined ? oldData.shipping_phone : normalizeText(body.shipping_phone);
            const shippingDni = body.shipping_dni === undefined ? oldData.shipping_dni : nullableText(body.shipping_dni);
            const shippingAddress = body.shipping_address === undefined ? oldData.shipping_address : normalizeText(body.shipping_address);
            if (!shippingName || !shippingPhone || !shippingAddress) throw new Error('Nombre, celular y dirección son obligatorios');
            if (shippingDni && !/^\d{8}$/.test(shippingDni)) throw new Error('DNI inválido');
            const paymentSum = await tx.order_payment.aggregate({ where: { order_id: id }, _sum: { amount: true } });
            const paid = cents(paymentSum._sum.amount ?? 0) / 100;
            if (body.amount_paid !== undefined && cents(body.amount_paid) !== cents(paid)) throw new Error('Modifica los cobros desde el historial de pagos');
            const shippingCost = body.shipping_cost === undefined ? Number(oldData.shipping_cost) : cents(body.shipping_cost || 0) / 100;
            let subtotal = Number(oldData.subtotal);
            let bundleDiscount = Number(oldData.bundle_discount ?? 0);
            let discountTotal = Number(oldData.discount_total);
            if (Array.isArray(body.items)) {
                if (!body.items.length) throw new Error('Agrega al menos un producto');
                const sameItems = body.items.length === oldItems.length && body.items.every(item => oldItems.some(old =>
                    old.variant_id === (item.variant_id || item.variantId) && old.qty === Number(item.qty) && cents(old.unit_price) === cents(item.unit_price)));
                if (!sameItems) {
                    if (oldData.status === 'CANCELLED' || status === 'CANCELLED') throw new Error('No se pueden sustituir ítems al cancelar');
                    if (oldItems.some(item => item.is_customized)) throw new Error('Conserva los ítems personalizados; esta edición no permite sustituir sus medidas');
                    const itemMap = new Map<string, { variantId: string; qty: number; unitPrice: number }>();
                    for (const item of body.items) {
                        const variantId = normalizeText(item.variant_id || item.variantId);
                        const qty = Number(item.qty);
                        if (!variantId || !Number.isInteger(qty) || qty <= 0) throw new Error('Variante o cantidad inválida');
                        const unitPrice = cents(item.unit_price) / 100;
                        const previous = itemMap.get(variantId);
                        if (previous && previous.unitPrice !== unitPrice) throw new Error('Precios distintos para la misma variante');
                        itemMap.set(variantId, { variantId, qty: qty + (previous?.qty || 0), unitPrice });
                    }
                    await releaseOrderStock(tx, id, 'Reposición por edición');
                    // Preserve historical movements while detaching removed line references.
                    await tx.inventory_movement.updateMany({ where: { order_id: id }, data: { order_item_id: null } });
                    await tx.order_item.deleteMany({ where: { order_id: id } });
                    const discountItems: Array<{ productId: string; qty: number; unitPrice: number }> = [];
                    subtotal = 0;
                    for (const item of [...itemMap.values()].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
                        const variant = await tx.product_variant.findUniqueOrThrow({ where: { variant_id: item.variantId }, include: { product: { include: { product_image: { orderBy: { sort_order: 'asc' }, take: 1 } } } } });
                        const lineTotal = cents(item.unitPrice * item.qty) / 100;
                        subtotal += lineTotal;
                        const saved = await tx.order_item.create({ data: { order_id: id, variant_id: variant.variant_id, qty: item.qty, unit_price: item.unitPrice, line_total: lineTotal,
                            product_name: variant.product.name, variant_size: variant.size, variant_color: variant.color, sku: variant.sku, image_url: variant.product.product_image[0]?.url } });
                        await deductItemStock(tx, saved, 'Edición de pedido');
                        discountItems.push({ productId: variant.product_id, qty: item.qty, unitPrice: item.unitPrice });
                    }
                    const bundles = await tx.bundle_promotion.findMany({ where: { is_active: true }, include: { items: true } });
                    const promotions: BundleDiscountPromotion[] = bundles.map(b => ({ requiredProductIds: b.items.map(i => i.product_id), discount_amount: Number(b.discount_amount), bundle_price: Number(b.bundle_price), tier_2_price: Number(b.tier_2_price), tier_3_price: Number(b.tier_3_price) }));
                    bundleDiscount = calculateBundleDiscount(discountItems, promotions);
                    discountTotal = Math.max(0, Number(oldData.discount_total) - Number(oldData.bundle_discount ?? 0)) + bundleDiscount;
                }
            }
            const total = Math.max(0, Math.round((subtotal + shippingCost - discountTotal) * 100) / 100);
            if (cents(total) < cents(paid)) throw new Error('El total no puede ser menor que los pagos registrados; concilia los cobros primero');
            validatePaidStatus(status, total, paid);
            if (status === 'CANCELLED') await releaseOrderStock(tx, id, 'Cancelación de pedido');
            await tx.order_header.update({ where: { order_id: id }, data: {
                status, sales_channel: salesChannel, shipping_name: shippingName, shipping_phone: shippingPhone, shipping_dni: shippingDni,
                shipping_address: shippingAddress, shipping_cost: shippingCost, subtotal, total, bundle_discount: bundleDiscount, discount_total: discountTotal,
                shipping_city: body.shipping_city === undefined ? oldData.shipping_city : nullableText(body.shipping_city),
                shipping_reference: body.shipping_reference === undefined ? oldData.shipping_reference : nullableText(body.shipping_reference),
                notes: body.notes === undefined ? oldData.notes : nullableText(body.notes),
                external_reference: body.external_reference === undefined ? oldData.external_reference : nullableText(body.external_reference), updated_at: new Date(),
            } });
            await recalcPayments(tx, id);
            const updated = await tx.order_header.findUniqueOrThrow({ where: { order_id: id }, include: { order_item: true } });
            return { oldData, updated };
        }, { timeout: 60000, maxWait: 20000 });
        await recordAudit({ action: 'UPDATE', entityType: 'order', entityId: id, oldData: result.oldData, newData: result.updated });
        try { await trackerPusherServer.trigger('order-' + result.updated.code, 'status-updated', { status: result.updated.status, code: result.updated.code }); } catch { console.error('No se pudo notificar el estado'); }
        return NextResponse.json(result.updated);
    } catch (e: unknown) { return NextResponse.json({ error: getErrorMessage(e) }, { status: 400 }); }
}
