import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const colors = await prisma.custom_color.findMany({
            orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
        });
        return NextResponse.json(colors);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const color = await prisma.custom_color.create({
            data: {
                name: String(body.name || '').trim(),
                hex: String(body.hex || '').trim(),
                sort_order: Number(body.sort_order || 0),
                is_available: body.is_available ?? true,
                is_active: body.is_active ?? true,
            },
        });
        return NextResponse.json(color, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
