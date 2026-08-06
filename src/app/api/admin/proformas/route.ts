import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { buildCustomSku } from '@/lib/personalized-sku';

export const runtime = 'nodejs';

const validStatuses = new Set(['DRAFT', 'SENT', 'ACCEPTED', 'CANCELLED']);
const validSalesChannels = new Set(['SHOP', 'WHATSAPP', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'OTHER']);
const validSurchargeTypes = new Set(['CONFECCION', 'DELIVERY']);

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function generateProformaCode() {
    return `PRO-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

function toNumber(value: unknown, fallback: number) {
    if (value === undefined || value === null || value === '') return fallback;
    return Number(value);
}

type ProformaItemInput = {
    variant_id?: string;
    variantId?: string;
    product_name?: string;
    size?: string;
    color?: string;
    sku?: string;
    image_url?: string | null;
    qty?: number | string;
    unit_price?: number | string | null;
    surcharge_type?: string | null;
    surcharge_amount?: number | string | null;
    is_customized?: boolean;
    custom_measurements_json?: string | null;
    normalization_group_id?: string | null;
};

type ProformaRequest = {
    customer_name?: string;
    customer_phone?: string;
    validity_days?: number | string | null;
    shipping_cost?: number | string | null;
    discount_total?: number | string | null;
    notes?: string;
    sales_channel?: string;
    status?: string;
    items?: ProformaItemInput[];
};

export async function GET() {
    try {
        const proformas = await prisma.proforma_header.findMany({
            orderBy: { created_at: 'desc' },
            take: 100,
            include: {
                proforma_item: true
            }
        });

        return NextResponse.json(proformas);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json() as ProformaRequest;
        const customerName = normalizeText(body.customer_name);
        const customerPhone = normalizeText(body.customer_phone);
        const notes = normalizeText(body.notes) || null;
        const salesChannel = normalizeText(body.sales_channel).toUpperCase() || 'WHATSAPP';
        const status = normalizeText(body.status).toUpperCase() || 'DRAFT';
        const rawItems: ProformaItemInput[] = Array.isArray(body.items) ? body.items : [];

        if (!customerName || !customerPhone) {
            return NextResponse.json({ error: 'Nombre y celular del cliente son obligatorios' }, { status: 400 });
        }

        if (!validSalesChannels.has(salesChannel)) {
            return NextResponse.json({ error: 'Canal inválido' }, { status: 400 });
        }

        if (!validStatuses.has(status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        const shippingCost = toNumber(body.shipping_cost, 0);
        const discountTotal = toNumber(body.discount_total, 0);
        if (!Number.isFinite(shippingCost) || shippingCost < 0) {
            return NextResponse.json({ error: 'El costo de envío debe ser mayor o igual a 0' }, { status: 400 });
        }
        if (!Number.isFinite(discountTotal) || discountTotal < 0) {
            return NextResponse.json({ error: 'El descuento debe ser mayor o igual a 0' }, { status: 400 });
        }

        const rawValidityDays = body.validity_days === undefined || body.validity_days === null || body.validity_days === ''
            ? 5
            : Number(body.validity_days);
        if (!Number.isInteger(rawValidityDays) || rawValidityDays <= 0) {
            return NextResponse.json({ error: 'La validez debe ser un número de días válido' }, { status: 400 });
        }
        const validityDays = rawValidityDays;

        if (rawItems.length === 0) {
            return NextResponse.json({ error: 'Agrega al menos un producto a la proforma' }, { status: 400 });
        }

        const code = generateProformaCode();

        const newProforma = await prisma.$transaction(async (tx) => {
            const variantIds = rawItems
                .map(item => normalizeText(item.variant_id || item.variantId))
                .filter(Boolean);

            const variants = await tx.product_variant.findMany({
                where: { variant_id: { in: variantIds } },
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
            const preparedItems = rawItems.map((item, index) => {
                const qtyRaw = Number(item.qty);
                if (!Number.isInteger(qtyRaw) || qtyRaw <= 0) {
                    throw new Error('Cada producto debe tener una cantidad válida');
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
                let size = normalizeText(item.size) || null;
                let color = normalizeText(item.color) || null;
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
                    sku = sku || buildCustomSku(productName, null, size, color);
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

                const lineTotal = (unitPriceRaw + surchargeAmount) * qtyRaw;
                subtotal += lineTotal;

                return {
                    variantId: variantId || null,
                    productName,
                    size,
                    color,
                    sku,
                    qty: qtyRaw,
                    unitPrice: unitPriceRaw,
                    surchargeAmount,
                    surchargeType,
                    lineTotal: Number(lineTotal.toFixed(2)),
                    isCustomized: variant ? false : Boolean(item.is_customized),
                    customMeasurements: typeof item.custom_measurements_json === 'string' ? item.custom_measurements_json : null,
                    imageUrl,
                };
            });

            subtotal = Number(subtotal.toFixed(2));
            const total = Math.max(0, Number((subtotal + shippingCost - discountTotal).toFixed(2)));

            const header = await tx.proforma_header.create({
                data: {
                    code,
                    status,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    subtotal,
                    shipping_cost: shippingCost,
                    discount_total: discountTotal,
                    total,
                    currency: 'PEN',
                    sales_channel: salesChannel,
                    validity_days: validityDays,
                    notes,
                }
            });

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

        if (!newProforma) {
            return NextResponse.json({ error: 'No se pudo crear la proforma' }, { status: 500 });
        }

        await recordAudit({
            action: 'CREATE',
            entityType: 'proforma',
            entityId: newProforma.proforma_id,
            newData: newProforma,
        });

        return NextResponse.json(newProforma, { status: 201 });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}