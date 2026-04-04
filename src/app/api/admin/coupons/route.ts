import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { created_at: 'desc' }
        });
        return NextResponse.json(coupons);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, discount_type, discount_value, min_purchase, starts_at, expires_at, usage_limit, is_active } = body;

        if (!code || !discount_type || discount_value === undefined) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const newCoupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase().trim(),
                discount_type,
                discount_value,
                min_purchase: min_purchase || null,
                starts_at: starts_at ? new Date(starts_at) : null,
                expires_at: expires_at ? new Date(expires_at) : null,
                usage_limit: usage_limit ? parseInt(usage_limit) : null,
                is_active: is_active ?? true,
            }
        });

        return NextResponse.json(newCoupon);
    } catch (e: any) {
        if (e.code === 'P2002') {
            return NextResponse.json({ error: 'El código de cupón ya existe' }, { status: 400 });
        }
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
