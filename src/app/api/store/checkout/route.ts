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
        for (const item of items) {
           serverSubtotal += item.unitPrice * item.qty;
        }

        let discount_total = 0;
        let validated_coupon_code = null;

        if (coupon_code) {
            const coupon = await prisma.coupon.findUnique({
                where: { code: coupon_code.toUpperCase().trim() }
            });

            if (coupon && coupon.is_active) {
                const now = dayjs();
                const is_valid_date = (!coupon.starts_at || now.isAfter(dayjs(coupon.starts_at))) &&
                                     (!coupon.expires_at || now.isBefore(dayjs(coupon.expires_at)));
                const has_usage = !coupon.usage_limit || coupon.usage_count < coupon.usage_limit;
                const min_met = !coupon.min_purchase || serverSubtotal >= Number(coupon.min_purchase);

                if (is_valid_date && has_usage && min_met) {
                    validated_coupon_code = coupon.code;
                    if (coupon.discount_type === 'PERCENTAGE') {
                        discount_total = serverSubtotal * (Number(coupon.discount_value) / 100);
                    } else {
                        discount_total = Number(coupon.discount_value);
                    }
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
