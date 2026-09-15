import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { amount, ProductionError, productionErrorResponse } from '@/lib/production-rules';
import { lockSupply, decimal } from '@/lib/supply-stock';
import { recordAudit } from '@/lib/audit';

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
    } catch (e: unknown) {
        return productionErrorResponse(e);
    }
}

const schema = z.object({
    supply_id: z.string().uuid(), color_ids: z.array(z.string().uuid()).min(1).max(100),
    stock: amount, min_stock: amount.default(0), unit_cost_override: amount.nullable().optional(),
    is_available: z.boolean().default(true), is_active: z.boolean().default(true),
    expected_total: z.number().finite(), expected_stocks: z.record(z.string(), z.number().finite()),
    reconcile: z.boolean().default(false),
});
export async function POST(req: Request) {
    try {
        const input = schema.parse(await req.json());
        const result = await prisma.$transaction(async tx => {
            const supply = await lockSupply(tx, input.supply_id);
            if (!supply.stock.equals(input.expected_total)) throw new ProductionError('El stock cambió. Actualiza la lista y vuelve a revisar las cantidades.');
            const beforeSum = supply.supply_color_stock.reduce((sum,row) => sum.plus(row.stock), decimal(0));
            if (!beforeSum.equals(supply.stock) && !input.reconcile) throw new ProductionError('El total no coincide con los colores. Verifica el conteo físico y confirma la conciliación.');
            const rows = [];
            for (const id of [...new Set(input.color_ids)].sort()) {
                const current = supply.supply_color_stock.find(row => row.color_id === id);
                if (current && (input.expected_stocks[id] === undefined || !current.stock.equals(input.expected_stocks[id]))) throw new ProductionError('El stock del color cambió. Actualiza la lista y vuelve a revisar.');
                if (!current && input.expected_stocks[id] !== undefined) throw new ProductionError('El color cambió. Actualiza la lista.');
                const color = await tx.custom_color.findUnique({ where: { color_id: id } });
                if (!color?.is_active) throw new ProductionError('Color inexistente o inactivo');
                const values = { stock: input.stock, min_stock: input.min_stock, unit_cost_override: input.unit_cost_override ?? null,
                    is_available: input.is_available, is_active: input.is_active, updated_at: new Date() };
                rows.push(await tx.supply_color_stock.upsert({ where: { supply_id_color_id: { supply_id: input.supply_id, color_id: id } },
                    create: { supply_id: input.supply_id, color_id: id, ...values }, update: values }));
            }
            // Physical stock remains counted even if a color is hidden or unavailable for sale.
            const all = await tx.supply_color_stock.findMany({ where: { supply_id: input.supply_id } });
            const total = all.reduce((sum,row) => sum.plus(row.stock), decimal(0));
            await tx.supply.update({ where: { supply_id: input.supply_id }, data: { stock: total, updated_at: new Date() } });
            await tx.supply_movement.create({ data: { supply_id: input.supply_id, movement_type: 'ADJUST', qty: total.minus(supply.stock).abs(),
                stock_before: supply.stock, stock_after: total,
                reason: `${input.reconcile ? 'Conciliación física' : 'Ajuste de colores'}: ${input.color_ids.length} color(es)` } });
            return { rows, before: supply };
        }, { timeout: 15000 });
        await recordAudit({ action: 'UPDATE', entityType: 'supply', entityId: input.supply_id, oldData: result.before, newData: { colors: result.rows, reconciled: input.reconcile } });
        return NextResponse.json({ success: true, items: result.rows });
    } catch (error) { return productionErrorResponse(error); }
}
