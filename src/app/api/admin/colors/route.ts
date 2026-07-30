import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const colors = await prisma.$queryRaw<any[]>`
            SELECT color_id, name, hex, sort_order, is_available, is_active, created_at, updated_at
            FROM dbo.custom_color
            ORDER BY sort_order ASC, name ASC;
        `;
        return NextResponse.json(colors);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const rows = await prisma.$queryRaw<any[]>`
            INSERT INTO dbo.custom_color (name, hex, sort_order, is_available, is_active)
            OUTPUT INSERTED.color_id, INSERTED.name, INSERTED.hex, INSERTED.sort_order, INSERTED.is_available, INSERTED.is_active
            VALUES (${String(body.name || '').trim()}, ${String(body.hex || '').trim()}, ${Number(body.sort_order || 0)}, ${body.is_available ?? true}, ${body.is_active ?? true});
        `;
        return NextResponse.json(rows[0], { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
