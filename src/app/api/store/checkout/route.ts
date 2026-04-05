import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { shipping_name, shipping_phone, shipping_address, items, subtotal, coupon_code, culqi_token, email, payment_method } = body;
        const method = payment_method || 'CULQI'; // Default to Culqi for older clients

        if (!shipping_name || !shipping_phone || !items || items.length === 0) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        if (method === 'CULQI' && !culqi_token) {
            return NextResponse.json({ error: 'Falta el token de pago' }, { status: 400 });
        }

        const culqiSecret = process.env.CULQI_SECRET_KEY;
        if (method === 'CULQI' && (!culqiSecret || culqiSecret === 'PON_TU_LLAVE_PRIVADA_AQUI')) {
            return NextResponse.json({ error: 'La pasarela de pagos no está configurada correctamente' }, { status: 500 });
        }

        // Re-calculate total securely on the backend
        let serverSubtotal = 0;
        const productCounts: Record<string, { qty: number, productId: string }> = {};

        for (const item of items) {
           serverSubtotal += item.unitPrice * item.qty;
           
           // Track product_ids for bundle detection (we need to know which product each variant belongs to)
           // The client should send productId or we can fetch it. 
           // Given current cart structure, let's fetch product_ids for these variants.
        }

        // 1. Fetch variant details to get product_ids
        const variantsInCart = await prisma.product_variant.findMany({
            where: { variant_id: { in: items.map((i: any) => i.variantId) } },
            select: { variant_id: true, product_id: true }
        });

        const cartProductStats: Record<string, number> = {};
        for (const item of items) {
            const variant = variantsInCart.find(v => v.variant_id === item.variantId);
            if (variant) {
                cartProductStats[variant.product_id] = (cartProductStats[variant.product_id] || 0) + item.qty;
            }
        }

        // 2. Detect Bundles/Conjuntos
        let bundle_discount_total = 0;
        const activeBundles = await (prisma as any).bundle_promotion.findMany({
            where: { is_active: true },
            include: { items: true }
        });

        for (const bundle of activeBundles) {
            const requiredProductIds = (bundle.items as any[]).map((bi: any) => bi.product_id);
            
            // Check if all required products are in cart
            const hasAll = requiredProductIds.every((id: string) => (cartProductStats[id] || 0) > 0);
            
            if (hasAll) {
                // How many sets can we form? 
                // It's the minimum quantity among the required products.
                const possibleSets = Math.min(...requiredProductIds.map((id: string) => cartProductStats[id]));
                
                const savings = possibleSets * Number(bundle.discount_amount);
                bundle_discount_total += savings;
            }
        }


        let discount_total = bundle_discount_total;
        let validated_coupon_code = null;

        if (coupon_code) {
            const coupon = await prisma.coupon.findUnique({
                where: { code: coupon_code.toUpperCase().trim() }
            });

            if (coupon && coupon.is_active) {
                const now = dayjs();
                const currentAmountForCoupon = serverSubtotal - bundle_discount_total;
                
                const is_valid_date = (!coupon.starts_at || now.isAfter(dayjs(coupon.starts_at))) &&
                                     (!coupon.expires_at || now.isBefore(dayjs(coupon.expires_at)));
                const has_usage = !coupon.usage_limit || coupon.usage_count < coupon.usage_limit;
                const min_met = !coupon.min_purchase || currentAmountForCoupon >= Number(coupon.min_purchase);

                if (is_valid_date && has_usage && min_met) {
                    validated_coupon_code = coupon.code;
                    let coupon_savings = 0;
                    if (coupon.discount_type === 'PERCENTAGE') {
                        coupon_savings = currentAmountForCoupon * (Number(coupon.discount_value) / 100);
                    } else {
                        coupon_savings = Number(coupon.discount_value);
                    }
                    discount_total += coupon_savings;
                }
            }
        }

        const serverTotal = Math.max(0, serverSubtotal - discount_total);


        // 1. Process payment with Culqi (Only if CULQI method)
        if (method === 'CULQI') {
            const amountCents = Math.round(serverSubtotal * 100);
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

            const culqiData = await culqiResponse.json();

            if (!culqiResponse.ok || culqiData.object === 'error') {
                const errorMsg = culqiData.user_message || culqiData.merchant_message || 'Transacción denegada por el banco.';
                return NextResponse.json({ error: errorMsg }, { status: 400 });
            }
        }

        // Generate a random Code like ORD-XXXX
        const code = `ORD-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;

        const newOrder: any = await prisma.$transaction(async (tx) => {
            // 2. Create order header
            const header = await tx.order_header.create({
                data: {
                    code,
                    status: method === 'WHATSAPP' ? 'PENDING_WS' : 'PAID',
                    shipping_name,
                    shipping_phone,
                    shipping_address: shipping_address || 'Por confirmar',
                    subtotal: serverSubtotal,
                    discount_total: discount_total,
                    coupon_code: validated_coupon_code,
                    total: serverTotal,
                    currency: 'PEN',
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
                        image_url: item.imageUrl
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
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
