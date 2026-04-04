import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export async function POST(req: Request) {
    try {
        const { code, subtotal } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'Código de cupón requerido' }, { status: 400 });
        }

        const coupon = await prisma.coupon.findUnique({
            where: { code: code.toUpperCase().trim() }
        });

        if (!coupon || !coupon.is_active) {
            return NextResponse.json({ error: 'Cupón no válido o inexistente' }, { status: 400 });
        }

        // Check expiration
        if (coupon.expires_at && dayjs().isAfter(dayjs(coupon.expires_at))) {
            return NextResponse.json({ error: 'El cupón ha expirado' }, { status: 400 });
        }

        // Check starts_at
        if (coupon.starts_at && dayjs().isBefore(dayjs(coupon.starts_at))) {
            return NextResponse.json({ error: 'El cupón aún no está activo' }, { status: 400 });
        }

        // Check usage limit
        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
            return NextResponse.json({ error: 'El cupón ha agotado su límite de usos' }, { status: 400 });
        }

        // Check minimum purchase
        if (coupon.min_purchase && subtotal < Number(coupon.min_purchase)) {
            return NextResponse.json({ 
                error: `La compra mínima para este cupón es de S/ ${Number(coupon.min_purchase).toFixed(2)}` 
            }, { status: 400 });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discount_type === 'PERCENTAGE') {
            discountAmount = subtotal * (Number(coupon.discount_value) / 100);
        } else {
            discountAmount = Number(coupon.discount_value);
        }

        // Cap discount to subtotal to prevent negative totals
        if (discountAmount > subtotal) {
            discountAmount = subtotal;
        }

        return NextResponse.json({
            success: true,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: Number(coupon.discount_value),
            discountAmount: Number(discountAmount.toFixed(2))
        });

    } catch (e: any) {
        return NextResponse.json({ error: 'Error al validar cupón' }, { status: 500 });
    }
}
