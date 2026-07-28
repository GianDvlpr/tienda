import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackerPusherServer } from '@/lib/pusher';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const validSalesChannels = new Set(['SHOP', 'WHATSAPP', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'OTHER']);
const validStatuses = new Set(['PENDING_WS', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
const paidStatuses = new Set(['PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED']);

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
    notes?: string | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    external_reference?: string | null;
    sales_channel?: string;
    items?: OrderItemInput[];
};

type OrderPhotoRow = {
    photo_id: string;
    order_id: string;
    url: string;
    public_id: string | null;
    caption: string | null;
    is_public_tracking: boolean | number;
    created_at: Date;
    updated_at: Date;
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

        const photos = await prisma.$queryRaw<OrderPhotoRow[]>`
            SELECT photo_id, order_id, url, public_id, caption, is_public_tracking, created_at, updated_at
            FROM dbo.order_photo
            WHERE order_id = ${id}
            ORDER BY created_at DESC
        `;

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

                for (const item of items) {
                    const variant = variantMap.get(item.variantId);
                    if (!variant) {
                        throw new Error('Uno de los productos seleccionados no existe');
                    }

                    if (variant.stock < item.qty) {
                        throw new Error(`Stock insuficiente para "${variant.product.name}" (${variant.size}, ${variant.color}). Disponibles: ${variant.stock}`);
                    }

                    subtotal += item.unitPrice * item.qty;
                }

                const discountTotal = Number(oldData.discount_total || 0);
                const shippingCost = Number(oldData.shipping_cost || 0);
                const total = Math.max(0, subtotal + shippingCost - discountTotal);

                const header = await tx.order_header.update({
                    where: { order_id: id },
                    data: {
                        ...headerData,
                        subtotal,
                        total,
                    }
                });

                for (const item of items) {
                    const variant = variantMap.get(item.variantId);
                    if (!variant) throw new Error('Uno de los productos seleccionados no existe');

                    const lineTotal = item.unitPrice * item.qty;
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
            });
        } else {
            updated = await prisma.order_header.update({
                where: { order_id: id },
                data: headerData
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
