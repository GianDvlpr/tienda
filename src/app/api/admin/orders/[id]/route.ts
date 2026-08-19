import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackerPusherServer } from '@/lib/pusher';
import { recordAudit } from '@/lib/audit';
import { calculateBundleDiscount, type BundleDiscountPromotion } from '@/lib/bundle-discount';

export const runtime = 'nodejs';

const validSalesChannels = new Set(['SHOP', 'WHATSAPP', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'OTHER']);
const validStatuses = new Set(['PENDING_WS', 'PARTIALLY_PAID', 'PAID', 'SEPARATED', 'MEASURES_CONFIRMED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
const paidStatuses = new Set(['PARTIALLY_PAID', 'PAID', 'MEASURES_CONFIRMED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED']);

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

function resolvePaymentAmounts(status: string, total: number, rawAmountPaid: unknown, fallbackAmountPaid: number) {
    const amountInput = rawAmountPaid === undefined || rawAmountPaid === null || rawAmountPaid === ''
        ? undefined
        : Number(rawAmountPaid);

    if (amountInput !== undefined && (!Number.isFinite(amountInput) || amountInput < 0)) {
        throw new Error('El adelanto pagado debe ser válido');
    }

    if (status === 'PENDING_WS') {
        return { amountPaid: 0, balanceDue: total };
    }

if (status === 'PARTIALLY_PAID') {
        const amountPaid = amountInput ?? fallbackAmountPaid;
        if (amountPaid <= 0 || amountPaid >= total) {
            throw new Error('Para pago parcial, el adelanto debe ser mayor a 0 y menor al total');
        }

        return { amountPaid, balanceDue: Math.max(0, total - amountPaid) };
    }

    if (status === 'SEPARATED') {
        const amountPaid = amountInput ?? fallbackAmountPaid;
        if (amountPaid < 0 || amountPaid >= total) {
            throw new Error('Para prenda separada, el adelanto debe ser mayor o igual a 0 y menor al total');
        }

        return { amountPaid, balanceDue: Math.max(0, total - amountPaid) };
    }

    if (status === 'CANCELLED') {
        const amountPaid = amountInput ?? fallbackAmountPaid;
        return { amountPaid, balanceDue: Math.max(0, total - amountPaid) };
    }

    return { amountPaid: total, balanceDue: 0 };
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
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await req.json() as UpdateOrderRequest;
        const hasItemsUpdate = Array.isArray(body.items);

        // Auditoría: Capturar estado anterior
        const oldData = await prisma.order_header.findUnique({
            where: { order_id: id },
            include: { order_item: true }
        });

        if (!oldData) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        const status = body.status ? normalizeText(body.status).toUpperCase() : oldData.status;
        const salesChannel = body.sales_channel ? normalizeText(body.sales_channel).toUpperCase() : oldData.sales_channel;

        if (!validStatuses.has(status)) {
            return NextResponse.json({ error: 'Estado de pedido inválido' }, { status: 400 });
        }

        if (!validSalesChannels.has(salesChannel)) {
            return NextResponse.json({ error: 'Canal de venta inválido' }, { status: 400 });
        }

        const shippingName = body.shipping_name !== undefined ? normalizeText(body.shipping_name) : oldData.shipping_name;
        const shippingDni = body.shipping_dni !== undefined ? normalizeText(body.shipping_dni) : oldData.shipping_dni;
        const shippingPhone = body.shipping_phone !== undefined ? normalizeText(body.shipping_phone) : oldData.shipping_phone;
        const shippingAddress = body.shipping_address !== undefined ? normalizeText(body.shipping_address) : oldData.shipping_address;

        if (!shippingName || !shippingDni || !shippingPhone) {
            return NextResponse.json({ error: 'Nombre, DNI y celular del cliente son obligatorios' }, { status: 400 });
        }

        if (!/^\d{8}$/.test(shippingDni)) {
            return NextResponse.json({ error: 'El DNI debe tener 8 dígitos' }, { status: 400 });
        }

        if (!shippingAddress) {
            return NextResponse.json({ error: 'La dirección de entrega es obligatoria' }, { status: 400 });
        }

        const fallbackAmountPaid = Number(oldData.amount_paid || 0);
        const rawShippingCost = body.shipping_cost === undefined || body.shipping_cost === null || body.shipping_cost === ''
            ? Number(oldData.shipping_cost || 0)
            : Number(body.shipping_cost);
        if (!Number.isFinite(rawShippingCost) || rawShippingCost < 0) {
            return NextResponse.json({ error: 'El costo de envío debe ser un número válido mayor o igual a 0' }, { status: 400 });
        }
        const shippingCost = rawShippingCost;
        const headerData = {
            status,
            shipping_name: shippingName,
            shipping_dni: shippingDni,
            shipping_phone: shippingPhone,
            shipping_address: shippingAddress,
            shipping_city: body.shipping_city !== undefined ? nullableText(body.shipping_city) : oldData.shipping_city,
            shipping_reference: body.shipping_reference !== undefined ? nullableText(body.shipping_reference) : oldData.shipping_reference,
            notes: body.notes !== undefined ? nullableText(body.notes) : oldData.notes,
            payment_method: body.payment_method !== undefined ? nullableText(body.payment_method) : oldData.payment_method,
            payment_reference: body.payment_reference !== undefined ? nullableText(body.payment_reference) : oldData.payment_reference,
            external_reference: body.external_reference !== undefined ? nullableText(body.external_reference) : oldData.external_reference,
            sales_channel: salesChannel,
            paid_at: paidStatuses.has(status) && !oldData.paid_at ? new Date() : oldData.paid_at,
            updated_at: new Date(),
        };

        let updated;

        if (hasItemsUpdate) {
            const rawItems = body.items || [];
            if (rawItems.length === 0) {
                return NextResponse.json({ error: 'El pedido debe tener al menos un producto' }, { status: 400 });
            }

            const itemMap = new Map<string, { variantId: string; qty: number; unitPrice: number }>();
            for (const item of rawItems) {
                const variantId = normalizeText(item.variant_id || item.variantId);
                const qty = Number(item.qty);
                const unitPrice = Number(item.unit_price);

                if (!variantId || !Number.isInteger(qty) || qty <= 0) {
                    return NextResponse.json({ error: 'Cada producto debe tener variante y cantidad válida' }, { status: 400 });
                }

                if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                    return NextResponse.json({ error: 'El precio unitario debe ser válido' }, { status: 400 });
                }

                const existing = itemMap.get(variantId);
                if (existing) {
                    existing.qty += qty;
                    existing.unitPrice = unitPrice;
                } else {
                    itemMap.set(variantId, { variantId, qty, unitPrice });
                }
            }

            const items = Array.from(itemMap.values());

            updated = await prisma.$transaction(async (tx) => {
                await tx.inventory_movement.deleteMany({ where: { order_id: id } });

                for (const item of oldData.order_item) {
                    await tx.product_variant.update({
                        where: { variant_id: item.variant_id },
                        data: { stock: { increment: item.qty } }
                    });
                }

                await tx.order_item.deleteMany({ where: { order_id: id } });

                const variants = await tx.product_variant.findMany({
                    where: { variant_id: { in: items.map(item => item.variantId) } },
                    include: {
                        product: {
                            include: {
                                product_image: { orderBy: { sort_order: 'asc' }, take: 1 }
                            }
                        }
                    }
                });

                const variantMap = new Map(variants.map(variant => [variant.variant_id, variant]));
                let subtotal = 0;

                const preparedItems = items.map(item => {
                    const variant = variantMap.get(item.variantId);
                    if (!variant) {
                        throw new Error('Uno de los productos seleccionados no existe');
                    }

                    if (variant.stock < item.qty) {
                        throw new Error(`Stock insuficiente para "${variant.product.name}" (${variant.size}, ${variant.color}). Disponibles: ${variant.stock}`);
                    }

                    const lineTotal = item.unitPrice * item.qty;
                    subtotal += lineTotal;

                    return { item, variant, lineTotal, productId: String(variant.product_id) };
                });

                const activeBundles = await tx.bundle_promotion.findMany({
                    where: { is_active: true },
                    include: { items: true }
                });
                const bundlePromotions: BundleDiscountPromotion[] = activeBundles.map(bundle => ({
                    requiredProductIds: bundle.items.map(bundleItem => String(bundleItem.product_id)),
                    discount_amount: Number(bundle.discount_amount || 0),
                    bundle_price: bundle.bundle_price === null ? null : Number(bundle.bundle_price),
                    tier_2_price: bundle.tier_2_price === null ? null : Number(bundle.tier_2_price),
                    tier_3_price: bundle.tier_3_price === null ? null : Number(bundle.tier_3_price),
                }));
                const bundleDiscount = calculateBundleDiscount(
                    preparedItems.map(prepared => ({
                        productId: prepared.productId,
                        qty: prepared.item.qty,
                        unitPrice: prepared.item.unitPrice,
                    })),
                    bundlePromotions
                );
                const couponDiscount = Number(oldData.coupon_discount || 0);
                const existingDiscountTotal = Number(oldData.discount_total || 0);
                const oldBundleDiscount = Number(oldData.bundle_discount || 0);
                const otherDiscount = Math.max(0, existingDiscountTotal - oldBundleDiscount - couponDiscount);
const discountTotal = bundleDiscount + couponDiscount + otherDiscount;
                const total = Math.max(0, subtotal + shippingCost - discountTotal);
                const { amountPaid, balanceDue } = resolvePaymentAmounts(status, total, body.amount_paid, fallbackAmountPaid);

                const header = await tx.order_header.update({
                    where: { order_id: id },
                    data: {
                        ...headerData,
                        subtotal,
                        discount_total: discountTotal,
                        bundle_discount: bundleDiscount,
                        coupon_discount: couponDiscount,
                        shipping_cost: shippingCost,
                        total,
                        amount_paid: amountPaid,
                        balance_due: balanceDue,
                    }
                });

                for (const prepared of preparedItems) {
                    const { item, variant, lineTotal } = prepared;
                    const stockBefore = variant.stock;
                    const stockAfter = stockBefore - item.qty;

                    const orderItem = await tx.order_item.create({
                        data: {
                            order_id: id,
                            variant_id: variant.variant_id,
                            qty: item.qty,
                            unit_price: item.unitPrice,
                            line_total: lineTotal,
                            product_name: variant.product.name,
                            variant_size: variant.size,
                            variant_color: variant.color,
                            sku: variant.sku,
                            image_url: variant.product.product_image[0]?.url || null,
                        }
                    });

                    await tx.product_variant.update({
                        where: { variant_id: variant.variant_id },
                        data: { stock: { decrement: item.qty } }
                    });

                    await tx.inventory_movement.create({
                        data: {
                            variant_id: variant.variant_id,
                            movement_type: 'OUT',
                            qty: item.qty,
                            stock_before: stockBefore,
                            stock_after: stockAfter,
                            reason: `Edición pedido ${oldData.code}`,
                            order_id: id,
                            order_item_id: orderItem.order_item_id,
                        }
                    });
                }

                return tx.order_header.findUnique({
                    where: { order_id: header.order_id },
                    include: { order_item: true }
                });
            }, {
                timeout: 60_000,
                maxWait: 20_000
            });
} else {
            const oldSubtotal = Number(oldData.subtotal || 0);
            const oldDiscountTotal = Number(oldData.discount_total || 0);
            const total = Math.max(0, oldSubtotal + shippingCost - oldDiscountTotal);
            const { amountPaid, balanceDue } = resolvePaymentAmounts(status, total, body.amount_paid, fallbackAmountPaid);
            updated = await prisma.order_header.update({
                where: { order_id: id },
                data: {
                    ...headerData,
                    shipping_cost: shippingCost,
                    total,
                    amount_paid: amountPaid,
                    balance_due: balanceDue,
                }
            });
        }

        if (!updated) {
            return NextResponse.json({ error: 'No se pudo actualizar el pedido' }, { status: 500 });
        }

        // Registrar Auditoría
        await recordAudit({
            action: 'UPDATE',
            entityType: 'order',
            entityId: id,
            oldData,
            newData: updated
        });

        // Trigger Real-time update to the public tracker
        try {
            await trackerPusherServer.trigger(`order-${updated.code}`, 'status-updated', {
                status: updated.status,
                code: updated.code
            });
        } catch (pushErr) {
            console.error('Error broadcasting to pusher tracker:', pushErr);
        }

        return NextResponse.json(updated);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
