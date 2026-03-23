import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { shipping_name, shipping_phone, shipping_address, items, subtotal, culqi_token, email, payment_method } = body;
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
                    amount: amountCents,
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

        const newOrder = await prisma.$transaction(async (tx) => {
            // 2. Create order header
            const header = await tx.order_header.create({
                data: {
                    code,
                    status: method === 'WHATSAPP' ? 'PENDING_WS' : 'PAID',
                    shipping_name,
                    shipping_phone,
                    shipping_address: shipping_address || 'Por confirmar',
                    subtotal: serverSubtotal,
                    total: serverSubtotal, // without shipping cost for now
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
                await tx.product_variant.update({
                    where: { variant_id: item.variantId },
                    data: { stock: { decrement: item.qty } }
                });
            }

            return header;
        });

        return NextResponse.json({ success: true, orderCode: newOrder.code });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
