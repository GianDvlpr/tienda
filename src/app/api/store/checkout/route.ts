import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { createHash, randomUUID } from 'node:crypto';
import { checkoutMethod, trackingPath } from '@/lib/order-rules';
import { deductItemStock } from '@/lib/order-stock';
import { processCheckoutPayment } from '@/lib/checkout-payment';
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
    checkout_id?: string;
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
        let method: 'CULQI' | 'WHATSAPP';
        try { method = checkoutMethod(payment_method); } catch { fail('Método de pago inválido'); }
        const checkoutId = body.checkout_id;
        if (!checkoutId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutId)) fail('Identificador de compra inválido');
        if (!Array.isArray(items) || items.length > 100) fail('Carrito inválido');
        const requestHash = createHash('sha256').update(JSON.stringify({ shipping_name, shipping_dni, shipping_phone, shipping_address, items, coupon_code, method, email })).digest('hex');
        const previous = await prisma.checkout_attempt.findUnique({ where: { checkout_id: checkoutId } });
        if (previous) {
            if (previous.request_hash !== requestHash) return NextResponse.json({ error: 'Esta compra ya fue enviada con otros datos' }, { status: 409 });
            return checkoutResult(checkoutId);
        }

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
            const qty = Number(item.qty);

            if (!variant || !variant.is_active || !variant.product?.is_active) {
                fail(`La variante de "${item.name || 'un producto'}" no está disponible`);
            }
            if (!Number.isInteger(qty) || qty <= 0 || qty > 1000) {
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


        const code = 'ORD-' + randomUUID().replaceAll('-', '').slice(0, 24);
        if (method === 'CULQI' && serverTotal <= 0) fail('El importe del pago debe ser mayor que cero');

        const newOrder = await prisma.$transaction(async (tx) => {
            // 2. Create order header
            const header = await tx.order_header.create({
                data: {
                    code,
                    status: method === 'WHATSAPP' ? 'PENDING_WS' : 'PENDING_PAYMENT',
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
                    amount_paid: 0,
                    balance_due: serverTotal,
                    currency: 'PEN',
                    payment_method: method,
                    payment_reference: null,
                    paid_at: null,
                    sales_channel: method === 'WHATSAPP' ? 'WHATSAPP' : 'SHOP',
                }
            });

            await tx.checkout_attempt.create({ data: {
                checkout_id: checkoutId, request_hash: requestHash,
                token_hash: method === 'CULQI' ? createHash('sha256').update(culqi_token!).digest('hex') : null,
                order_id: header.order_id, status: method === 'CULQI' ? 'CREATED' : 'SUCCEEDED',
            } });
            // 2. Create order items with server-calculated prices
            for (const item of [...serverItems].sort((a,b) => a.variantId.localeCompare(b.variantId))) {
                const savedItem = await tx.order_item.create({
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

                await deductItemStock(tx, savedItem, 'Checkout ' + code);
            }

            // 3. Mark coupon usage
            if (validated_coupon_code) {
                const rows = await tx.$queryRaw<Array<{ coupon_id: string }>>
                    `UPDATE coupon SET usage_count = usage_count + 1 WHERE code = ${validated_coupon_code}
                    AND is_active = true AND (usage_limit IS NULL OR usage_count < usage_limit)
                    AND (starts_at IS NULL OR starts_at < NOW()) AND (expires_at IS NULL OR expires_at > NOW()) RETURNING coupon_id`;
                if (rows.length !== 1) fail('El cupón ya no está disponible');
            }

            return header;
        }, {
            timeout: 60_000,
            maxWait: 20_000
        });

        if (method === 'CULQI') await processCheckoutPayment(newOrder.order_id, culqi_token!, email || 'compras@auraboutique.com');

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

        return checkoutResult(checkoutId);
    } catch (e: unknown) {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') return NextResponse.json({ error: 'La compra ya fue enviada; consulta con el mismo identificador' }, { status: 409 });
        return NextResponse.json({ error: e instanceof CheckoutValidationError ? e.message : 'No se pudo completar la compra. Reintenta con el mismo identificador.' }, { status: e instanceof CheckoutValidationError ? 400 : 500 });
    }
}

async function checkoutResult(checkoutId: string) {
    const attempt = await prisma.checkout_attempt.findUniqueOrThrow({ where: { checkout_id: checkoutId }, include: { order: { include: { order_item: true } } } });
    const order = attempt.order;
    if (attempt.status !== 'SUCCEEDED') return NextResponse.json({ success: false, orderCode: order.code,
        trackingUrl: trackingPath(order.code, order.tracking_token), pending: attempt.status !== 'FAILED',
        error: attempt.status === 'FAILED' ? 'Pago rechazado. No se volverá a cobrar este intento.' : 'Pedido registrado. El pago está pendiente de confirmación; no realices otro pago.',
    }, { status: 409 });
    return NextResponse.json({ success: true, orderCode: order.code, trackingUrl: trackingPath(order.code, order.tracking_token),
        subtotal: Number(order.subtotal), discountTotal: Number(order.discount_total), bundleDiscount: Number(order.bundle_discount), couponDiscount: Number(order.coupon_discount), total: Number(order.total),
        items: order.order_item.map(item => ({ qty: item.qty, name: item.product_name, size: item.variant_size, color: item.variant_color,
            unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total), isCustomized: item.is_customized,
            customMeasurements: item.custom_measurements_json ? JSON.parse(item.custom_measurements_json) : null,
            customizationSurcharge: Number(item.customization_surcharge), customizationGroupLabel: item.customization_group_label })) });
}

export async function GET(req: Request) {
    const checkoutId = new URL(req.url).searchParams.get('checkout_id');
    if (!checkoutId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutId)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const attempt = await prisma.checkout_attempt.findUnique({ where: { checkout_id: checkoutId } });
    if (!attempt) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const response = await checkoutResult(checkoutId);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
}
