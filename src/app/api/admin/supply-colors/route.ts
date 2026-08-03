import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supplies = await prisma.supply.findMany({
            where: { type: 'TELA' },
            orderBy: { name: 'asc' },
            include: {
                supply_color_stock: {
                    include: { color: true },
                    orderBy: [{ color: { sort_order: 'asc' } }, { color: { name: 'asc' } }],
                }
            }
        });

        return NextResponse.json(supplies);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const colorIds = Array.isArray(body.color_ids) && body.color_ids.length > 0 ? body.color_ids : [body.color_id].filter(Boolean);
        if (!body.supply_id || colorIds.length === 0) {
            return NextResponse.json({ error: 'Selecciona una tela y al menos un color' }, { status: 400 });
        }

        const unitCostOverride = body.unit_cost_override === undefined || body.unit_cost_override === null ? null : Number(body.unit_cost_override);
        const savedRows: any[] = [];

        for (const colorId of colorIds) {
            const row = await prisma.supply_color_stock.upsert({
                where: { supply_id_color_id: { supply_id: body.supply_id, color_id: colorId } },
                create: {
                    supply_id: body.supply_id,
                    color_id: colorId,
                    stock: Number(body.stock || 0),
                    min_stock: Number(body.min_stock || 0),
                    unit_cost_override: unitCostOverride,
                    is_available: body.is_available ?? true,
                    is_active: body.is_active ?? true,
                },
                update: {
                    stock: Number(body.stock || 0),
                    min_stock: Number(body.min_stock || 0),
                    unit_cost_override: unitCostOverride,
                    is_available: body.is_available ?? true,
                    is_active: body.is_active ?? true,
                    updated_at: new Date(),
                },
            });
            savedRows.push(row);
        }

        const activeRows = await prisma.supply_color_stock.findMany({
            where: { supply_id: body.supply_id, is_active: true },
            select: { stock: true },
        });
        const totalStock = activeRows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
        await prisma.supply.update({
            where: { supply_id: body.supply_id },
            data: { stock: totalStock, updated_at: new Date() },
        });

        return NextResponse.json({ success: true, items: savedRows });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
