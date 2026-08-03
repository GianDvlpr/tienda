import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const color = await prisma.custom_color.update({
            where: { color_id: id },
            data: {
                name: String(body.name || '').trim(),
                hex: String(body.hex || '').trim(),
                sort_order: Number(body.sort_order || 0),
                is_available: body.is_available ?? true,
                is_active: body.is_active ?? true,
                updated_at: new Date(),
            },
        });
        return NextResponse.json(color);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
