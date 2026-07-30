import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supplies = await prisma.$queryRaw<any[]>`
            SELECT supply_id, name, unit, unit_cost, stock, min_stock, is_active
            FROM dbo.supply
            WHERE type = N'TELA'
            ORDER BY name ASC;
        `;
        const stocks = await prisma.$queryRaw<any[]>`
            SELECT scs.supply_color_id, scs.supply_id, scs.color_id, scs.stock, scs.min_stock, scs.unit_cost_override,
                   scs.is_available, scs.is_active, c.name AS color_name, c.hex AS color_hex, c.sort_order AS color_sort_order
            FROM dbo.supply_color_stock scs
            JOIN dbo.custom_color c ON c.color_id = scs.color_id
            ORDER BY c.sort_order ASC, c.name ASC;
        `;

        const stocksBySupply = new Map<string, any[]>();
        stocks.forEach((row) => {
            const item = {
                ...row,
                color: { color_id: row.color_id, name: row.color_name, hex: row.color_hex, sort_order: row.color_sort_order }
            };
            stocksBySupply.set(String(row.supply_id), [...(stocksBySupply.get(String(row.supply_id)) || []), item]);
        });

        return NextResponse.json(supplies.map((supply) => ({
            ...supply,
            supply_color_stock: stocksBySupply.get(String(supply.supply_id)) || []
        })));
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
            const existing = await prisma.$queryRaw<any[]>`
                SELECT supply_color_id FROM dbo.supply_color_stock WHERE supply_id = ${body.supply_id} AND color_id = ${colorId};
            `;

            const rows = existing.length > 0
                ? await prisma.$queryRaw<any[]>`
                    UPDATE dbo.supply_color_stock
                    SET stock = ${Number(body.stock || 0)}, min_stock = ${Number(body.min_stock || 0)}, unit_cost_override = ${unitCostOverride},
                        is_available = ${body.is_available ?? true}, is_active = ${body.is_active ?? true}, updated_at = sysutcdatetime()
                    OUTPUT INSERTED.*
                    WHERE supply_id = ${body.supply_id} AND color_id = ${colorId};
                `
                : await prisma.$queryRaw<any[]>`
                    INSERT INTO dbo.supply_color_stock (supply_id, color_id, stock, min_stock, unit_cost_override, is_available, is_active)
                    OUTPUT INSERTED.*
                    VALUES (${body.supply_id}, ${colorId}, ${Number(body.stock || 0)}, ${Number(body.min_stock || 0)}, ${unitCostOverride}, ${body.is_available ?? true}, ${body.is_active ?? true});
                `;
            savedRows.push(rows[0]);
        }

        await prisma.$executeRaw`
            UPDATE dbo.supply
            SET stock = COALESCE((SELECT SUM(stock) FROM dbo.supply_color_stock WHERE supply_id = ${body.supply_id} AND is_active = 1), 0),
                updated_at = sysutcdatetime()
            WHERE supply_id = ${body.supply_id};
        `;

        return NextResponse.json({ success: true, items: savedRows });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
