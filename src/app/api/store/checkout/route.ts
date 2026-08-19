import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { calculateBundleDiscount, type BundleDiscountPromotion } from '@/lib/bundle-discount';
import { CUSTOM_MEASUREMENT_LABELS, getMeasurementDeltaErrors, getMeasurementsForSize } from '@/lib/customization';

function logToFile(msg: string) {
    console.info(`[CHECKOUT] ${msg}`);
}

type CheckoutItem = {
    variantId: string;
    qty: number;
    unitPrice?: number;
    name: string;
    size: string;
    color: string;
    sku?: string | null;
    imageUrl?: string | null;
    isCustomized?: boolean;
    customMeasurements?: Record<string, string> | null;
    customizationSurcharge?: number;
    customizationGroupId?: string | null;
    customizationGroupLabel?: string | null;
};

type CheckoutBody = {
    shipping_name?: string;
    shipping_dni?: string;
    shipping_phone?: string;
    shipping_address?: string;
    items?: CheckoutItem[];
    coupon_code?: string | null;
    culqi_token?: string;
    email?: string;
    payment_method?: string;
};

type DbNumeric = number | string | { toString(): string } | null;

type ServerOrderItem = {
    variantId: string;
    productId: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    name: string;
    size: string;
    color: string;
    sku: string;
    imageUrl?: string | null;
    isCustomized: boolean;
    customMeasurements: Record<string, string> | null;
    customizationSurcharge: number;
    customizationGroupId: string | null;
    customizationGroupLabel: string | null;
};

type VariantForCheckout = {
    variant_id: string;
    product_id: string;
    sku: string;
    size: string;
    color: string;
    price: number;
    stock: number;
    is_active: boolean;
    product: {
        product_id: string;
        name: string;
        base_price: number;
        is_active: boolean;
        is_customizable: boolean;
        customization_type: string | null;
        customization_surcharge: number;
        size_guide_json: string | null;
    };
};

class CheckoutValidationError extends Error {}

function fail(message: string): never {
    throw new CheckoutValidationError(message);
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeId(value: unknown) {
    return String(value || '').trim().toLowerCase();
}

function toBoolean(value: unknown) {
    return value === true || value === 1 || value === '1';
}

function sanitizeMeasurements(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, String(val ?? '').trim()])
    );
}

export async function POST(req: Request) {
    try {
        const body = await req.json() as CheckoutBody;
        const { shipping_name, shipping_dni, shipping_phone, shipping_address, items = [], coupon_code, culqi_token, email, payment_method } = body;
        const shippingDni = normalizeText(shipping_dni);
        const method = payment_method || 'CULQI'; // Default to Culqi for older clients

        if (!shipping_name || !shippingDni || !shipping_phone || !items || items.length === 0) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        if (!/^\d{8}$/.test(shippingDni)) {
            return NextResponse.json({ error: 'El DNI debe tener 8 dígitos' }, { status: 400 });
        }

        if (method === 'CULQI' && !culqi_token) {
            return NextResponse.json({ error: 'Falta el token de pago' }, { status: 400 });
        }

        const hasCustomizedItems = items.some((item) => !!item.isCustomized);
        if (hasCustomizedItems && method !== 'WHATSAPP') {
            return NextResponse.json({ error: 'Los pedidos personalizados solo pueden solicitarse por WhatsApp' }, { status: 400 });
        }

        const culqiSecret = process.env.CULQI_SECRET_KEY;
        if (method === 'CULQI' && (!culqiSecret || culqiSecret === 'PON_TU_LLAVE_PRIVADA_AQUI')) {
            return NextResponse.json({ error: 'La pasarela de pagos no está configurada correctamente' }, { status: 500 });
        }

        const variantIds = Array.from(new Set(items.map((item) => normalizeText(item.variantId)).filter(Boolean)));
        if (variantIds.length === 0) fail('No se encontraron variantes válidas en el carrito');

        const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (variantIds.some((variantId) => !guidPattern.test(variantId))) {
            fail('El carrito contiene una variante inválida');
        }

        const variantRows = await prisma.product_variant.findMany({
            where: { variant_id: { in: variantIds } },
            include: { product: true },
        });
        const variantsInCart: VariantForCheckout[] = variantRows.map((row) => ({
            variant_id: String(row.variant_id),
            product_id: String(row.product_id),
            sku: String(row.sku || ''),
            size: String(row.size || ''),
            color: String(row.color || ''),
            price: Number(row.price || row.product.base_price || 0),
            stock: Number(row.stock ?? 0),
            is_active: toBoolean(row.is_active),
            product: {
                product_id: String(row.product_id),
                name: String(row.product.name),
                base_price: Number(row.product.base_price ?? 0),
                is_active: toBoolean(row.product.is_active),
                is_customizable: toBoolean(row.product.is_customizable),
                customization_type: row.product.customization_type,
                customization_surcharge: Number(row.product.customization_surcharge ?? 5),
                size_guide_json: row.product.size_guide_json ?? null,
            },
        }));
        const variantsById = new Map(variantsInCart.map((variant) => [normalizeId(variant.variant_id), variant]));

        logToFile(`[CHECKOUT] Items in Cart: ${items.length}, Variants found: ${variantsInCart.length}`);

        const activeBundles = await prisma.bundle_promotion.findMany({
            where: { is_active: true },
            include: { items: true }
        });

        const tiersByBundleId = new Map(activeBundles.map((bundle) => [
            String(bundle.bundle_id),
            {
                bundle_price: bundle.bundle_price === null ? null : Number(bundle.bundle_price),
                tier_2_price: bundle.tier_2_price === null ? null : Number(bundle.tier_2_price),
                tier_3_price: bundle.tier_3_price === null ? null : Number(bundle.tier_3_price),
                customization_surcharge: bundle.customization_surcharge === null ? 8 : Number(bundle.customization_surcharge),
            }
        ]));

        logToFile(`[CHECKOUT] Active Bundles: ${activeBundles.length}`);

        const itemContexts = items.map((item, index) => {
            const variantId = normalizeText(item.variantId);
            const variant = variantsById.get(normalizeId(variantId));
            const qty = Math.floor(Number(item.qty || 0));

            if (!variant || !variant.is_active || !variant.product?.is_active) {
                fail(`La variante de "${item.name || 'un producto'}" no está disponible`);
            }
            if (!Number.isFinite(qty) || qty <= 0) {
                fail(`Cantidad inválida para "${variant.product.name}"`);
            }

            return {
                index,
                item,
                qty,
                variant,
                productId: normalizeId(variant.product_id),
                groupId: item.isCustomized ? normalizeText(item.customizationGroupId) || null : null,
            };
        });

        const groupSurchargeByItemIndex = new Map<number, number>();
        const groupLabelByGroupId = new Map<string, string>();
        const customGroups = new Map<string, typeof itemContexts>();

        for (const context of itemContexts) {
            if (!context.groupId) continue;
            customGroups.set(context.groupId, [...(customGroups.get(context.groupId) ?? []), context]);
        }

        for (const [groupId, contexts] of customGroups) {
            const productIds = new Set(contexts.map((context) => context.productId));
            const matchingBundle = activeBundles.find((bundle) => {
                const requiredProductIds = (bundle.items ?? []).map((item) => normalizeId(item.product_id)).filter(Boolean);
                return requiredProductIds.length > 0
                    && requiredProductIds.length === productIds.size
                    && requiredProductIds.every((productId: string) => productIds.has(productId));
            });

            if (!matchingBundle) fail('El conjunto personalizado no está disponible o fue modificado');

            const bundleTiers = tiersByBundleId.get(String(matchingBundle.bundle_id));
            groupSurchargeByItemIndex.set(contexts[0].index, Number(bundleTiers?.customization_surcharge ?? 20));
            groupLabelByGroupId.set(groupId, `Conjunto personalizado: ${matchingBundle.name}`);
        }

        const serverItems: ServerOrderItem[] = itemContexts.map((context) => {
            const { item, qty, variant } = context;
            const product = variant.product;
            const isCustomized = !!item.isCustomized;
            const basePrice = Number(variant.price ?? product.base_price ?? 0);
            let customizationSurcharge = 0;
            let customMeasurements: Record<string, string> | null = null;
            const displaySize = isCustomized ? normalizeText(item.size) || String(variant.size || '') : String(variant.size || '');
            const displayColor = isCustomized ? normalizeText(item.color) || String(variant.color || '') : String(variant.color || '');

            if (!Number.isFinite(basePrice) || basePrice < 0) fail(`Precio inválido para "${product.name}"`);

            if (isCustomized) {
                if (!product.is_customizable) fail(`"${product.name}" no permite personalización`);
                if (!displaySize || !displayColor) fail(`Falta talla o color personalizado para "${product.name}"`);

                customizationSurcharge = context.groupId
                    ? Number(groupSurchargeByItemIndex.get(context.index) ?? 0)
                    : Number(product.customization_surcharge ?? 5);

                const customizationType = product.customization_type === 'PANTS' ? 'PANTS' : 'UPPER';
                const labels = CUSTOM_MEASUREMENT_LABELS[customizationType];
                customMeasurements = sanitizeMeasurements(item.customMeasurements);
                const missing = labels.filter((label) => !String(customMeasurements?.[label] || '').trim());
                if (missing.length > 0) fail(`Completa las medidas de "${product.name}": ${missing.join(', ')}`);

                const referenceMeasurements = getMeasurementsForSize(product.size_guide_json, displaySize, labels);
                const measurementErrors = getMeasurementDeltaErrors(customMeasurements, referenceMeasurements, labels);
                if (measurementErrors.length > 0) fail(`Revisa las medidas de "${product.name}": ${measurementErrors.join(' · ')}`);
            }

            const unitPrice = basePrice + customizationSurcharge;

            return {
                variantId: String(variant.variant_id),
                productId: context.productId,
                qty,
                unitPrice,
                lineTotal: unitPrice * qty,
                name: String(product.name),
                size: displaySize,
                color: displayColor,
                sku: String(variant.sku || item.sku || 'N/A'),
                imageUrl: item.imageUrl ?? null,
                isCustomized,
                customMeasurements,
                customizationSurcharge,
                customizationGroupId: context.groupId,
                customizationGroupLabel: context.groupId ? groupLabelByGroupId.get(context.groupId) ?? null : null,
            };
        });

        const stockByVariant = new Map<string, number>();
        for (const item of serverItems) {
            if (item.isCustomized) continue;
            stockByVariant.set(normalizeId(item.variantId), (stockByVariant.get(normalizeId(item.variantId)) ?? 0) + item.qty);
        }
        for (const [variantId, qty] of stockByVariant) {
            const variant = variantsById.get(variantId);
            if (!variant || Number(variant.stock || 0) < qty) {
                fail(`Stock insuficiente para "${variant?.product?.name || 'un producto'}". Disponibles: ${variant?.stock || 0}`);
            }
        }

        const serverSubtotal = serverItems.reduce((sum, item) => sum + item.lineTotal, 0);
        const serverBundleItems = serverItems.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitPrice: item.unitPrice,
            customizationSurcharge: item.customizationSurcharge,
        }));
        const cartProductStats = serverItems.reduce<Record<string, number>>((acc, item) => {
            acc[item.productId] = (acc[item.productId] || 0) + item.qty;
            return acc;
        }, {});
        logToFile(`[CHECKOUT] Product Stats: ${JSON.stringify(cartProductStats)}`);

        const bundlePromotions: BundleDiscountPromotion[] = activeBundles.map((bundle) => {
            const tiers = tiersByBundleId.get(String(bundle.bundle_id));

            return {
                requiredProductIds: bundle.items.map((bi) => normalizeId(bi.product_id)),
                discount_amount: Number(bundle.discount_amount || 0),
                bundle_price: tiers?.bundle_price ?? null,
                tier_2_price: tiers?.tier_2_price ?? null,
                tier_3_price: tiers?.tier_3_price ?? null,
            };
        });

        const bundle_discount_total = calculateBundleDiscount(serverBundleItems, bundlePromotions);
        logToFile(`[CHECKOUT] Bundle discount total: ${bundle_discount_total}`);

        let coupon_savings = 0;
        let validated_coupon_code: string | null = null;

        logToFile(`[CHECKOUT] Incoming coupon_code: "${coupon_code}"`);

        if (coupon_code) {
            const coupon = await prisma.coupon.findUnique({
                where: { code: coupon_code.toUpperCase().trim() }
            });

            if (coupon && coupon.is_active) {
                const now = dayjs();
                const amountForValidation = serverSubtotal - bundle_discount_total;
                
                const is_valid_date = (!coupon.starts_at || now.isAfter(dayjs(coupon.starts_at))) &&
                                     (!coupon.expires_at || now.isBefore(dayjs(coupon.expires_at)));
                const has_usage = !coupon.usage_limit || coupon.usage_count < coupon.usage_limit;
                const min_met = !coupon.min_purchase || amountForValidation >= Number(coupon.min_purchase);

                logToFile(`[CHECKOUT] Coupon found: "${coupon.code}". ValidDate: ${is_valid_date}, HasUsage: ${has_usage}, MinMet: ${min_met} (Amount: ${amountForValidation}, Min: ${coupon.min_purchase})`);

                if (is_valid_date && has_usage && min_met) {
                    validated_coupon_code = coupon.code;
                    if (coupon.discount_type === 'PERCENTAGE') {
                        coupon_savings = amountForValidation * (Number(coupon.discount_value) / 100);
                    } else {
                        coupon_savings = Number(coupon.discount_value);
                    }
                    logToFile(`[CHECKOUT] Coupon "${coupon.code}" applied! Savings: ${coupon_savings}`);
                }
            } else {
                logToFile(`[CHECKOUT] Coupon NOT found or NOT active: "${coupon_code}"`);
            }
        }

        const discount_total = bundle_discount_total + coupon_savings;
        const serverTotal = Math.max(0, serverSubtotal - discount_total);

        logToFile(`Order Calculation [${serverSubtotal}]: Bundles: ${bundle_discount_total}, Coupon: ${coupon_savings}, Total: ${serverTotal}`);


        let paymentReference: string | null = null;

        // 1. Process payment with Culqi (Only if CULQI method)
        if (method === 'CULQI') {
            const culqiResponse = await fetch('https://api.culqi.com/v2/charges', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${culqiSecret}`
                },
                body: JSON.stringify({
                    amount: Math.round(serverTotal * 100), // Use total with discount for Culqi
                    currency_code: 'PEN',
                    email: email || 'compras@auraboutique.com',
                    source_id: culqi_token
                })
            });

            const culqiData = await culqiResponse.json() as {
                object?: string;
                user_message?: string;
                merchant_message?: string;
                id?: string;
            };

            if (!culqiResponse.ok || culqiData.object === 'error') {
                const errorMsg = culqiData.user_message || culqiData.merchant_message || 'Transacción denegada por el banco.';
                return NextResponse.json({ error: errorMsg }, { status: 400 });
            }

            paymentReference = culqiData.id || null;
        }

        // Generate a random Code like ORD-XXXX
        const code = `ORD-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;

        const newOrder = await prisma.$transaction(async (tx) => {
            // 2. Create order header
            const header = await tx.order_header.create({
                data: {
                    code,
                    status: method === 'WHATSAPP' ? 'PENDING_WS' : 'PAID',
                    shipping_name,
                    shipping_dni: shippingDni,
                    shipping_phone,
                    shipping_address: shipping_address || 'Por confirmar',
                    subtotal: serverSubtotal,
                    discount_total: discount_total,
                    bundle_discount: bundle_discount_total,
                    coupon_discount: coupon_savings,
                    coupon_code: validated_coupon_code,
                    total: serverTotal,
                    amount_paid: method === 'WHATSAPP' ? 0 : serverTotal,
                    balance_due: method === 'WHATSAPP' ? serverTotal : 0,
                    currency: 'PEN',
                    payment_method: method,
                    payment_reference: paymentReference,
                    paid_at: method === 'CULQI' ? new Date() : null,
                    sales_channel: method === 'WHATSAPP' ? 'WHATSAPP' : 'SHOP',
                }
            });

            // 2. Create order items with server-calculated prices
            for (const item of serverItems) {
                await tx.order_item.create({
                    data: {
                        order_id: header.order_id,
                        variant_id: item.variantId,
                        qty: item.qty,
                        unit_price: item.unitPrice,
                        line_total: item.lineTotal,
                        product_name: item.name,
                        variant_size: item.size,
                        variant_color: item.color,
                        sku: item.sku,
                        image_url: item.imageUrl,
                        is_customized: item.isCustomized,
                        custom_measurements_json: item.isCustomized && item.customMeasurements ? JSON.stringify(item.customMeasurements) : null,
                        customization_surcharge: item.customizationSurcharge,
                        customization_group_id: item.customizationGroupId,
                        customization_group_label: item.customizationGroupLabel,
                    }
                });

                if (item.isCustomized) continue;

                // Optional: We can discount stock here or from the Admin Panel. 
                // Let's discount it right away to prevent overselling.
                const variant = await tx.product_variant.findUnique({
                    where: { variant_id: item.variantId },
                    select: { stock: true }
                });

                if (!variant || variant.stock < item.qty) {
                    throw new Error(`Stock insuficiente para "${item.name}" (${item.size}, ${item.color}). Disponibles: ${variant?.stock || 0}`);
                }

                await tx.product_variant.update({
                    where: { variant_id: item.variantId },
                    data: { stock: { decrement: item.qty } }
                });
            }

            // 3. Mark coupon usage
            if (validated_coupon_code) {
                await tx.coupon.update({
                    where: { code: validated_coupon_code },
                    data: { usage_count: { increment: 1 } }
                });
            }

            return header;
        }, {
            timeout: 60_000,
            maxWait: 20_000
        });

        // 3. Trigger Pusher Notification for Admin
        try {
            const { pusherServer } = await import('@/lib/pusher');
            await pusherServer.trigger('admin-orders', 'new-order', {
                orderCode: newOrder.code,
                total: Number(newOrder.total),
                customer: shipping_name,
                itemsCount: serverItems.length,
                couponCode: validated_coupon_code,
            });
        } catch (pusherError) {
            console.error('Error triggering Pusher event:', pusherError);
            // Non-blocking, the order was already created successfully
        }

        return NextResponse.json({
            success: true,
            orderCode: newOrder.code,
            subtotal: serverSubtotal,
            discountTotal: discount_total,
            bundleDiscount: bundle_discount_total,
            couponDiscount: coupon_savings,
            total: serverTotal,
            items: serverItems.map((item) => ({
                qty: item.qty,
                name: item.name,
                size: item.size,
                color: item.color,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
                isCustomized: item.isCustomized,
                customMeasurements: item.customMeasurements,
                customizationSurcharge: item.customizationSurcharge,
                customizationGroupLabel: item.customizationGroupLabel,
            })),
        });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: e instanceof CheckoutValidationError ? 400 : 500 });
    }
}
