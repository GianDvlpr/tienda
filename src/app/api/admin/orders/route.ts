import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const validSalesChannels = new Set(['SHOP', 'WHATSAPP', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'OTHER']);
const validStatuses = new Set(['PENDING_WS', 'PAID', 'MEASURES_CONFIRMED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED']);
const paidStatuses = new Set(['PAID', 'MEASURES_CONFIRMED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED']);

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function generateOrderCode(prefix = 'ADM') {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

type ManualOrderItemInput = {
    variant_id?: string;
    variantId?: string;
    qty?: number | string;
    unit_price?: number | string | null;
};

type ManualOrderRequest = {
    shipping_name?: string;
    shipping_dni?: string;
    shipping_phone?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_reference?: string;
    notes?: string;
    payment_method?: string;
    payment_reference?: string;
    external_reference?: string;
    sales_channel?: string;
    status?: string;
    items?: ManualOrderItemInput[];
};

export async function GET() {
    try {
        const orders = await prisma.order_header.findMany({
            orderBy: { created_at: 'desc' },
            take: 100, // Limit to recent 100 entries for MVP
            include: {
                order_item: true
            }
        });

        return NextResponse.json(orders);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json() as ManualOrderRequest;
        const shippingName = normalizeText(body.shipping_name);
        const shippingDni = normalizeText(body.shipping_dni);
        const shippingPhone = normalizeText(body.shipping_phone);
        const shippingAddress = normalizeText(body.shipping_address) || 'Venta por canal externo';
        const shippingCity = normalizeText(body.shipping_city) || null;
        const shippingReference = normalizeText(body.shipping_reference) || null;
        const notes = normalizeText(body.notes) || null;
        const paymentMethod = normalizeText(body.payment_method) || null;
        const paymentReference = normalizeText(body.payment_reference) || null;
        const externalReference = normalizeText(body.external_reference) || null;
        const salesChannel = normalizeText(body.sales_channel).toUpperCase() || 'OTHER';
        const status = normalizeText(body.status).toUpperCase() || 'PAID';
        const rawItems: ManualOrderItemInput[] = Array.isArray(body.items) ? body.items : [];

        if (!shippingName || !shippingDni || !shippingPhone) {
            return NextResponse.json({ error: 'Nombre, DNI y celular del cliente son obligatorios' }, { status: 400 });
        }

        if (!/^\d{8}$/.test(shippingDni)) {
            return NextResponse.json({ error: 'El DNI debe tener 8 dígitos' }, { status: 400 });
        }

        if (!validSalesChannels.has(salesChannel)) {
            return NextResponse.json({ error: 'Canal de venta inválido' }, { status: 400 });
        }

        if (!validStatuses.has(status)) {
            return NextResponse.json({ error: 'Estado inicial inválido' }, { status: 400 });
        }

        if (rawItems.length === 0) {
            return NextResponse.json({ error: 'Agrega al menos un producto a la venta' }, { status: 400 });
        }

        const itemMap = new Map<string, { variantId: string; qty: number; unitPrice?: number }>();
        for (const item of rawItems) {
            const variantId = normalizeText(item.variant_id || item.variantId);
            const qty = Number(item.qty);
            const unitPrice = item.unit_price === undefined || item.unit_price === null || item.unit_price === ''
                ? undefined
                : Number(item.unit_price);

            if (!variantId || !Number.isInteger(qty) || qty <= 0) {
                return NextResponse.json({ error: 'Cada producto debe tener variante y cantidad válida' }, { status: 400 });
            }

            if (unitPrice !== undefined && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
                return NextResponse.json({ error: 'El precio unitario debe ser válido' }, { status: 400 });
            }

            const existing = itemMap.get(variantId);
            if (existing) {
                existing.qty += qty;
                if (unitPrice !== undefined) existing.unitPrice = unitPrice;
            } else {
                itemMap.set(variantId, { variantId, qty, unitPrice });
            }
        }

        const items = Array.from(itemMap.values());
        const code = generateOrderCode(salesChannel === 'WHATSAPP' ? 'WS' : salesChannel === 'TIKTOK' ? 'TT' : 'ADM');

        const newOrder = await prisma.$transaction(async (tx) => {
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

                const unitPrice = item.unitPrice ?? Number(variant.price ?? variant.product.base_price ?? 0);
                const lineTotal = unitPrice * item.qty;
                subtotal += lineTotal;

                return { item, variant, unitPrice, lineTotal };
            });

            const header = await tx.order_header.create({
                data: {
                    code,
                    status,
                    shipping_name: shippingName,
                    shipping_dni: shippingDni,
                    shipping_phone: shippingPhone,
                    shipping_address: shippingAddress,
                    shipping_city: shippingCity,
                    shipping_reference: shippingReference,
                    notes,
                    subtotal,
                    discount_total: 0,
                    bundle_discount: 0,
                    coupon_discount: 0,
                    total: subtotal,
                    currency: 'PEN',
                    payment_method: paymentMethod,
                    payment_reference: paymentReference,
                    paid_at: paidStatuses.has(status) ? new Date() : null,
                    sales_channel: salesChannel,
                    external_reference: externalReference,
                }
            });

            for (const prepared of preparedItems) {
                const stockBefore = prepared.variant.stock;
                const stockAfter = stockBefore - prepared.item.qty;

                const orderItem = await tx.order_item.create({
                    data: {
                        order_id: header.order_id,
                        variant_id: prepared.variant.variant_id,
                        qty: prepared.item.qty,
                        unit_price: prepared.unitPrice,
                        line_total: prepared.lineTotal,
                        product_name: prepared.variant.product.name,
                        variant_size: prepared.variant.size,
                        variant_color: prepared.variant.color,
                        sku: prepared.variant.sku,
                        image_url: prepared.variant.product.product_image[0]?.url || null,
                    }
                });

                await tx.product_variant.update({
                    where: { variant_id: prepared.variant.variant_id },
                    data: { stock: { decrement: prepared.item.qty } }
                });

                await tx.inventory_movement.create({
                    data: {
                        variant_id: prepared.variant.variant_id,
                        movement_type: 'OUT',
                        qty: prepared.item.qty,
                        stock_before: stockBefore,
                        stock_after: stockAfter,
                        reason: `Venta manual ${salesChannel}`,
                        order_id: header.order_id,
                        order_item_id: orderItem.order_item_id,
                    }
                });
            }

            return tx.order_header.findUnique({
                where: { order_id: header.order_id },
                include: { order_item: true }
            });
        });

        if (!newOrder) {
            return NextResponse.json({ error: 'No se pudo crear la venta' }, { status: 500 });
        }

        await recordAudit({
            action: 'CREATE',
            entityType: 'order',
            entityId: newOrder.order_id,
            newData: newOrder,
        });

        return NextResponse.json(newOrder, { status: 201 });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
