import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { shipping_name, shipping_phone, shipping_address, items, subtotal } = body;

        if (!shipping_name || !shipping_phone || !items || items.length === 0) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        // Generate a random Code like ORD-XXXX
        const code = `ORD-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;

        const newOrder = await prisma.$transaction(async (tx) => {
            // 1. Create order header
            const header = await tx.order_header.create({
                data: {
                    code,
                    status: 'PENDING_WS',
                    shipping_name,
                    shipping_phone,
                    shipping_address: shipping_address || 'Por confirmar',
                    subtotal,
                    total: subtotal, // without shipping cost for now
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
