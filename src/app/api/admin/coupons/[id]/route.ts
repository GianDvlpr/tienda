import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { is_active } = body;
        const updated = await prisma.coupon.update({
            where: { coupon_id: id },
            data: { is_active: !!is_active }
        });
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { code, discount_type, discount_value, min_purchase, expires_at, usage_limit, is_active } = body;
        
        if (!code || !discount_type || discount_value === undefined) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const updated = await prisma.coupon.update({
            where: { coupon_id: id },
            data: {
                code: code.toUpperCase().trim(),
                discount_type,
                discount_value,
                min_purchase: min_purchase || null,
                expires_at: expires_at ? new Date(expires_at) : null,
                usage_limit: usage_limit ? parseInt(usage_limit) : null,
                is_active: is_active ?? true,
                updated_at: new Date()
            }
        });
        return NextResponse.json(updated);
    } catch (e: any) {
        if (e.code === 'P2002') return NextResponse.json({ error: 'Este código de cupón ya está siendo usado por otro cupón activo.' }, { status: 400 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.coupon.delete({
            where: { coupon_id: id }
        });
        return NextResponse.json({ success: true, message: 'Cupón eliminado' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
