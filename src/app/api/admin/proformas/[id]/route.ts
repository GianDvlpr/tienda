import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const validStatuses = new Set(['DRAFT', 'SENT', 'ACCEPTED', 'CANCELLED']);
const validSurchargeTypes = new Set(['CONFECCION', 'DELIVERY']);

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

function toNumber(value: unknown, fallback: number) {
    if (value === undefined || value === null || value === '') return fallback;
    return Number(value);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const proforma = await prisma.proforma_header.findUnique({
            where: { proforma_id: id },
            include: { proforma_item: true }
        });

        if (!proforma) {
            return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 });
        }

        return NextResponse.json(proforma);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

type ProformaItemInput = {
    proforma_item_id?: string;
    variant_id?: string;
    variantId?: string;
    product_name?: string;
    size?: string;
    variant_size?: string;
    color?: string;
    variant_color?: string;
    sku?: string;
    image_url?: string | null;
    qty?: number | string;
    unit_price?: number | string | null;
    surcharge_type?: string | null;
    surcharge_amount?: number | string | null;
    is_customized?: boolean;
    custom_measurements_json?: string | null;
};

type ProformaUpdateRequest = {
    status?: string;
    customer_name?: string;
    customer_phone?: string;
    shipping_cost?: number | string | null;
    discount_total?: number | string | null;
    notes?: string;
    items?: ProformaItemInput[];
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json() as ProformaUpdateRequest;

        const existing = await prisma.proforma_header.findUnique({
            where: { proforma_id: id },
            include: { proforma_item: true }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 });
        }

        if (existing.status === 'CONVERTED' || existing.status === 'CANCELLED') {
            return NextResponse.json({ error: 'No se puede editar una proforma convertida o cancelada' }, { status: 400 });
        }

        const customerName = body.customer_name !== undefined ? normalizeText(body.customer_name) : existing.customer_name;
        const customerPhone = body.customer_phone !== undefined ? normalizeText(body.customer_phone) : existing.customer_phone;
        const notes = body.notes !== undefined ? (normalizeText(body.notes) || null) : existing.notes;

        if (!customerName || !customerPhone) {
            return NextResponse.json({ error: 'Nombre y celular del cliente son obligatorios' }, { status: 400 });
        }

        let status = existing.status;
        if (body.status !== undefined) {
            const newStatus = normalizeText(body.status).toUpperCase();
            if (!validStatuses.has(newStatus)) {
                return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
            }
            status = newStatus;
        }

        const shippingCost = body.shipping_cost !== undefined ? toNumber(body.shipping_cost, 0) : Number(existing.shipping_cost);
        const discountTotal = body.discount_total !== undefined ? toNumber(body.discount_total, 0) : Number(existing.discount_total);
        if (!Number.isFinite(shippingCost) || shippingCost < 0) {
            return NextResponse.json({ error: 'El costo de envío debe ser mayor o igual a 0' }, { status: 400 });
        }
        if (!Number.isFinite(discountTotal) || discountTotal < 0) {
            return NextResponse.json({ error: 'El descuento debe ser mayor o igual a 0' }, { status: 400 });
        }

        let rawItems = existing.proforma_item;
        if (body.items !== undefined) {
            if (!Array.isArray(body.items) || body.items.length === 0) {
                return NextResponse.json({ error: 'Agrega al menos un producto a la proforma' }, { status: 400 });
            }
            rawItems = body.items as unknown as typeof existing.proforma_item;
        }

        const updated = await prisma.$transaction(async (tx) => {
            const variantIds = (rawItems as unknown as ProformaItemInput[])
                .map(item => normalizeText(item.variant_id || item.variantId))
                .filter(Boolean);

            const variants = variantIds.length > 0
                ? await tx.product_variant.findMany({
                    where: { variant_id: { in: variantIds } },
                    include: {
                        product: {
                            include: {
                                product_image: { orderBy: { sort_order: 'asc' }, take: 1 }
                            }
                        }
                    }
                })
                : [];
            const variantMap = new Map(variants.map(variant => [variant.variant_id, variant]));

            let subtotal = 0;
            const preparedItems = (rawItems as unknown as ProformaItemInput[]).map((item, index) => {
                const qtyRaw = Number(item.qty);
                if (!Number.isInteger(qtyRaw) || qtyRaw <= 0) {
                    throw new Error(`El producto de la línea ${index + 1} debe tener una cantidad válida`);
                }

                const surchargeAmount = toNumber(item.surcharge_amount, 0);
                if (!Number.isFinite(surchargeAmount) || surchargeAmount < 0) {
                    throw new Error('El monto del recargo debe ser mayor o igual a 0');
                }

                let surchargeType = normalizeText(item.surcharge_type).toUpperCase() || null;
                if (surchargeType && surchargeType !== 'NONE' && !validSurchargeTypes.has(surchargeType)) {
                    throw new Error('Tipo de recargo inválido');
                }

                const variantId = normalizeText(item.variant_id || item.variantId);
                const variant = variantId ? variantMap.get(variantId) : undefined;

                if (variantId && !variant) {
                    throw new Error('Uno de los productos seleccionados no existe');
                }

                let productName: string;
                let size = normalizeText(item.size) || normalizeText(item.variant_size) || null;
                let color = normalizeText(item.color) || normalizeText(item.variant_color) || null;
                let sku = normalizeText(item.sku) || null;
                let imageUrl = typeof item.image_url === 'string' ? item.image_url : null;

                if (variant) {
                    productName = variant.product.name;
                    size = size || variant.size;
                    color = color || variant.color;
                    sku = sku || variant.sku;
                    imageUrl = imageUrl || variant.product.product_image[0]?.url || null;
                } else {
                    productName = normalizeText(item.product_name);
                    if (!productName) {
                        throw new Error(`El producto de la línea ${index + 1} necesita un nombre`);
                    }
                    if (!surchargeType && surchargeAmount > 0) {
                        surchargeType = 'CONFECCION';
                    }
                }

                let unitPriceRaw = toNumber(item.unit_price, Number.NaN);
                if (!Number.isFinite(unitPriceRaw)) {
                    if (variant) {
                        const variantPrice = Number(variant.price ?? 0);
                        unitPriceRaw = variantPrice > 0 ? variantPrice : Number(variant.product.base_price ?? 0);
                    } else {
                        throw new Error(`El precio unitario del producto "${productName}" es obligatorio`);
                    }
                }
                if (unitPriceRaw < 0) {
                    throw new Error('El precio unitario debe ser mayor o igual a 0');
                }

                const lineTotal = Number(((unitPriceRaw + surchargeAmount) * qtyRaw).toFixed(2));
                subtotal += lineTotal;

                return {
                    proformaItemId: normalizeText(item.proforma_item_id) || null,
                    variantId: variantId || null,
                    productName,
                    size,
                    color,
                    sku,
                    qty: qtyRaw,
                    unitPrice: unitPriceRaw,
                    surchargeAmount,
                    surchargeType,
                    lineTotal,
                    isCustomized: variant ? false : Boolean(item.is_customized),
                    customMeasurements: typeof item.custom_measurements_json === 'string' ? item.custom_measurements_json : null,
                    imageUrl,
                };
            });

            subtotal = Number(subtotal.toFixed(2));
            const total = Math.max(0, Number((subtotal + shippingCost - discountTotal).toFixed(2)));

            const header = await tx.proforma_header.update({
                where: { proforma_id: id },
                data: {
                    status,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    notes,
                    subtotal,
                    shipping_cost: shippingCost,
                    discount_total: discountTotal,
                    total,
                }
            });

            await tx.proforma_item.deleteMany({ where: { proforma_id: id } });

            for (const prepared of preparedItems) {
                await tx.proforma_item.create({
                    data: {
                        proforma_id: header.proforma_id,
                        variant_id: prepared.variantId,
                        product_name: prepared.productName,
                        variant_size: prepared.size,
                        variant_color: prepared.color,
                        sku: prepared.sku,
                        qty: prepared.qty,
                        unit_price: prepared.unitPrice,
                        line_total: prepared.lineTotal,
                        image_url: prepared.imageUrl,
                        is_customized: prepared.isCustomized,
                        custom_measurements_json: prepared.customMeasurements,
                        surcharge_type: prepared.surchargeType,
                        surcharge_amount: prepared.surchargeAmount,
                    }
                });
            }

            return tx.proforma_header.findUnique({
                where: { proforma_id: header.proforma_id },
                include: { proforma_item: true }
            });
        });

        await recordAudit({
            action: 'UPDATE',
            entityType: 'proforma',
            entityId: id,
            oldData: existing,
            newData: updated,
        });

        return NextResponse.json(updated);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const existing = await prisma.proforma_header.findUnique({
            where: { proforma_id: id },
            include: { proforma_item: true }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 });
        }

        if (existing.status === 'CONVERTED') {
            return NextResponse.json({ error: 'No se puede eliminar una proforma convertida a pedido' }, { status: 400 });
        }

        await prisma.$transaction([
            prisma.proforma_item.deleteMany({ where: { proforma_id: id } }),
            prisma.proforma_header.delete({ where: { proforma_id: id } }),
        ]);

        await recordAudit({
            action: 'DELETE',
            entityType: 'proforma',
            entityId: id,
            oldData: existing,
        });

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}