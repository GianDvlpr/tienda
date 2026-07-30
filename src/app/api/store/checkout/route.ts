import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import fs from 'fs';
import { calculateBundleDiscount, type BundleDiscountPromotion } from '@/lib/bundle-discount';

const LOG_FILE = 'c:\\IP\\tienda\\tmp\\checkout.log';

function logToFile(msg: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

type CheckoutItem = {
    variantId: string;
    qty: number;
    unitPrice: number;
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

type BundleTierRow = {
    bundle_id: string | number | { toString(): string };
    bundle_price: DbNumeric;
    tier_2_price: DbNumeric;
    tier_3_price: DbNumeric;
};

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
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

        // Re-calculate total securely on the backend
        let serverSubtotal = 0;

        for (const item of items) {
           serverSubtotal += item.unitPrice * item.qty;
           
           // Track product_ids for bundle detection (we need to know which product each variant belongs to)
           // The client should send productId or we can fetch it. 
           // Given current cart structure, let's fetch product_ids for these variants.
        }

        // 1. Fetch variant details to get product_ids
        const variantsInCart = await prisma.product_variant.findMany({
            where: { variant_id: { in: items.map((i) => i.variantId) } },
            select: { variant_id: true, product_id: true }
        });

        logToFile(`[CHECKOUT] Items in Cart: ${items.length}, Variants found: ${variantsInCart.length}`);

        const cartProductStats: Record<string, number> = {};
        const serverBundleItems: { productId: string; qty: number; unitPrice: number; customizationSurcharge?: number }[] = [];

        for (const item of items) {
            const variant = variantsInCart.find(v => 
                v.variant_id.toString().toLowerCase().trim() === item.variantId.toString().toLowerCase().trim()
            );
            if (variant) {
                const pId = variant.product_id.toString().toLowerCase().trim();
                cartProductStats[pId] = (cartProductStats[pId] || 0) + item.qty;
                serverBundleItems.push({
                    productId: pId,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    customizationSurcharge: item.customizationSurcharge || 0,
                });
            } else {
                logToFile(`[CHECKOUT] Variant NOT found in DB: ${item.variantId}`);
            }
        }

        logToFile(`[CHECKOUT] Product Stats: ${JSON.stringify(cartProductStats)}`);

        // 2. Detect Bundles/Conjuntos
        let bundle_discount_total = 0;
        const activeBundles = await prisma.bundle_promotion.findMany({
            where: { is_active: true },
            include: { items: true }
        });

        const tierRows = await prisma.$queryRaw<BundleTierRow[]>`
            SELECT bundle_id, bundle_price, tier_2_price, tier_3_price
            FROM dbo.bundle_promotion
            WHERE is_active = 1;
        `;
        const tiersByBundleId = new Map(tierRows.map((row) => [
            String(row.bundle_id),
            {
                bundle_price: row.bundle_price === null ? null : Number(row.bundle_price),
                tier_2_price: row.tier_2_price === null ? null : Number(row.tier_2_price),
                tier_3_price: row.tier_3_price === null ? null : Number(row.tier_3_price),
            }
        ]));

        logToFile(`[CHECKOUT] Active Bundles: ${activeBundles.length}`);

        const bundlePromotions: BundleDiscountPromotion[] = activeBundles.map((bundle) => {
            const tiers = tiersByBundleId.get(String(bundle.bundle_id));

            return {
                requiredProductIds: bundle.items.map((bi) => bi.product_id.toString().toLowerCase().trim()),
                discount_amount: Number(bundle.discount_amount || 0),
                bundle_price: tiers?.bundle_price ?? null,
                tier_2_price: tiers?.tier_2_price ?? null,
                tier_3_price: tiers?.tier_3_price ?? null,
            };
        });

        bundle_discount_total = calculateBundleDiscount(serverBundleItems, bundlePromotions);
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
                    currency: 'PEN',
                    payment_method: method,
                    payment_reference: paymentReference,
                    paid_at: method === 'CULQI' ? new Date() : null,
                    sales_channel: method === 'WHATSAPP' ? 'WHATSAPP' : 'SHOP',
                }
            });

            // 2. Create order items
            for (const item of items) {
                await tx.order_item.create({
                    data: {
                        order_id: header.order_id,
                        variant_id: item.variantId,
                        qty: item.qty,
                        unit_price: item.unitPrice,
                        line_total: item.unitPrice * item.qty,
                        product_name: item.name,
                        variant_size: item.size,
                        variant_color: item.color,
                        sku: item.sku || 'N/A',
                        image_url: item.imageUrl,
                        is_customized: !!item.isCustomized,
                        custom_measurements_json: item.isCustomized && item.customMeasurements ? JSON.stringify(item.customMeasurements) : null,
                        customization_surcharge: Number(item.customizationSurcharge || 0),
                        customization_group_id: item.customizationGroupId || null,
                        customization_group_label: item.customizationGroupLabel || null,
                    }
                });

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
            maxWait: 5000, // default is 2000
            timeout: 10000 // default is 5000
        });

        // 3. Trigger Pusher Notification for Admin
        try {
            const { pusherServer } = await import('@/lib/pusher');
            await pusherServer.trigger('admin-orders', 'new-order', {
                orderCode: newOrder.code,
                total: Number(newOrder.total),
                customer: shipping_name,
                itemsCount: items.length,
                couponCode: validated_coupon_code,
            });
        } catch (pusherError) {
            console.error('Error triggering Pusher event:', pusherError);
            // Non-blocking, the order was already created successfully
        }

        return NextResponse.json({ success: true, orderCode: newOrder.code });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
