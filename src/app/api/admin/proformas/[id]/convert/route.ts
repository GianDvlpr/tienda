import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { calculateBundleDiscount, type BundleDiscountPromotion } from '@/lib/bundle-discount';

export const runtime = 'nodejs';

function generateOrderCode() {
    return `ORD-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const proforma = await prisma.proforma_header.findUnique({
            where: { proforma_id: id },
            include: { proforma_item: true }
        });

        if (!proforma) {
            return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 });
        }

        if (proforma.status === 'CONVERTED') {
            return NextResponse.json({ error: 'Esta proforma ya fue convertida a pedido' }, { status: 400 });
        }

        if (proforma.status === 'CANCELLED') {
            return NextResponse.json({ error: 'No se puede convertir una proforma cancelada' }, { status: 400 });
        }

        if (proforma.proforma_item.length === 0) {
            return NextResponse.json({ error: 'La proforma no tiene productos' }, { status: 400 });
        }

        const code = generateOrderCode();

        const newOrder = await prisma.$transaction(async (tx) => {
            const stockVariantIds = proforma.proforma_item
                .map(item => item.variant_id)
                .filter((value): value is string => Boolean(value));

            const variants = stockVariantIds.length > 0
                ? await tx.product_variant.findMany({
                    where: { variant_id: { in: stockVariantIds } },
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

            type PreparedItem = {
                variantId: string | null;
                productId: string | null;
                productName: string;
                size: string | null;
                color: string | null;
                sku: string | null;
                imageUrl: string | null;
                qty: number;
                unitPrice: number;
                lineTotal: number;
                isCustomized: boolean;
                customMeasurements: string | null;
                customizationSurcharge: number;
            };

            const preparedItems: PreparedItem[] = [];

            for (const item of proforma.proforma_item) {
                const qty = item.qty;
                const surcharge = Number(item.surcharge_amount ?? 0);
                const unitPrice = Number(item.unit_price ?? 0) + surcharge;
                const lineTotal = Number((unitPrice * qty).toFixed(2));

                if (item.variant_id) {
                    const variant = variantMap.get(item.variant_id);
                    if (!variant) {
                        throw new Error(`El producto "${item.product_name}" ya no existe en el catálogo`);
                    }

                    if (variant.stock < qty) {
                        throw new Error(`Stock insuficiente para "${variant.product.name}" (${variant.size}, ${variant.color}). Disponibles: ${variant.stock}`);
                    }

                    preparedItems.push({
                        variantId: variant.variant_id,
                        productId: String(variant.product_id),
                        productName: variant.product.name,
                        size: variant.size,
                        color: variant.color,
                        sku: variant.sku,
                        imageUrl: item.image_url || variant.product.product_image[0]?.url || null,
                        qty,
                        unitPrice,
                        lineTotal,
                        isCustomized: item.is_customized,
                        customMeasurements: item.custom_measurements_json,
                        customizationSurcharge: item.surcharge_type === 'CONFECCION' ? surcharge : 0,
                    });
                } else {
                    throw new Error(`El producto "${item.product_name}" no tiene variante asociada. Asócialo a un producto del catálogo para poder convertir la proforma a pedido.`);
                }
            }

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
                    productId: prepared.productId || '',
                    qty: prepared.qty,
                    unitPrice: prepared.unitPrice,
                    customizationSurcharge: prepared.customizationSurcharge,
                })),
                bundlePromotions
            );

            const subtotal = Number(preparedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
            const shippingCost = Number(proforma.shipping_cost ?? 0);
            const discountTotal = Number(bundleDiscount.toFixed(2));
            const total = Math.max(0, Number((subtotal + shippingCost - discountTotal).toFixed(2)));

            const header = await tx.order_header.create({
                data: {
                    code,
                    status: 'PENDING_WS',
                    shipping_name: proforma.customer_name,
                    shipping_phone: proforma.customer_phone,
                    shipping_address: 'Pendiente de confirmar dirección',
                    notes: proforma.notes
                        ? `Proforma ${proforma.code} convertida. ${proforma.notes}`
                        : `Proforma ${proforma.code} convertida a pedido`,
                    subtotal,
                    shipping_cost: shippingCost,
                    discount_total: discountTotal,
                    bundle_discount: bundleDiscount,
                    coupon_discount: 0,
                    total,
                    amount_paid: 0,
                    balance_due: total,
                    currency: proforma.currency || 'PEN',
                    sales_channel: proforma.sales_channel || 'OTHER',
                    paid_at: null,
                }
            });

            const createdItems: Array<{ variantId: string | null; qty: number; sku: string | null; productName: string }> = [];

            for (const prepared of preparedItems) {
                const orderItem = await tx.order_item.create({
                    data: {
                        order_id: header.order_id,
                        variant_id: prepared.variantId || '',
                        qty: prepared.qty,
                        unit_price: prepared.unitPrice,
                        line_total: prepared.lineTotal,
                        product_name: prepared.productName,
                        variant_size: prepared.size || '',
                        variant_color: prepared.color || '',
                        sku: prepared.sku || '',
                        image_url: prepared.imageUrl,
                        is_customized: prepared.isCustomized,
                        custom_measurements_json: prepared.customMeasurements,
                        customization_surcharge: prepared.customizationSurcharge,
                        customization_group_id: null,
                        customization_group_label: null,
                    }
                });

                createdItems.push({ variantId: prepared.variantId, qty: prepared.qty, sku: prepared.sku, productName: prepared.productName });

                if (prepared.variantId) {
                    const variant = variantMap.get(prepared.variantId);
                    if (!variant) continue;

                    const stockBefore = variant.stock;
                    const stockAfter = stockBefore - prepared.qty;

                    await tx.product_variant.update({
                        where: { variant_id: prepared.variantId },
                        data: { stock: { decrement: prepared.qty } }
                    });

                    await tx.inventory_movement.create({
                        data: {
                            variant_id: prepared.variantId,
                            movement_type: 'OUT',
                            qty: prepared.qty,
                            stock_before: stockBefore,
                            stock_after: stockAfter,
                            reason: `Proforma ${proforma.code} convertida a pedido`,
                            order_id: header.order_id,
                            order_item_id: orderItem.order_item_id,
                        }
                    });
                }
            }

            await tx.proforma_header.update({
                where: { proforma_id: proforma.proforma_id },
                data: {
                    status: 'CONVERTED',
                    converted_to_order_id: header.order_id,
                }
            });

            return tx.order_header.findUnique({
                where: { order_id: header.order_id },
                include: { order_item: true }
            });
        });

        if (!newOrder) {
            return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 });
        }

        await recordAudit({
            action: 'UPDATE',
            entityType: 'proforma',
            entityId: proforma.proforma_id,
            oldData: proforma,
            newData: { ...proforma, status: 'CONVERTED', converted_to_order_id: newOrder.order_id },
        });
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