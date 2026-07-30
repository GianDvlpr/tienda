import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const rows = await prisma.$queryRaw<any[]>`
            UPDATE dbo.custom_color
            SET name = ${String(body.name || '').trim()},
                hex = ${String(body.hex || '').trim()},
                sort_order = ${Number(body.sort_order || 0)},
                is_available = ${body.is_available ?? true},
                is_active = ${body.is_active ?? true},
                updated_at = sysutcdatetime()
            OUTPUT INSERTED.color_id, INSERTED.name, INSERTED.hex, INSERTED.sort_order, INSERTED.is_available, INSERTED.is_active
            WHERE color_id = ${id};
        `;
        return NextResponse.json(rows[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
