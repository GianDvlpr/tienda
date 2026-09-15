import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { lockSupply, assertColorBalance, decimal } from '@/lib/supply-stock';
import { amount, ProductionError, productionErrorResponse } from '@/lib/production-rules';
const schema = z.object({ supply_id: z.string().uuid(), color_id: z.string().uuid().optional(), qty: amount.refine(n => n > 0),
    reason: z.string().max(180).optional(), new_unit_cost: amount.optional() });
export async function POST(req: Request) {
    try {
        const input = schema.parse(await req.json());
        const result = await prisma.$transaction(async tx => {
            const supply = await lockSupply(tx, input.supply_id);
            assertColorBalance(supply);
            const q = decimal(input.qty);
            const after = supply.stock.plus(q);
            let incoming = decimal(input.new_unit_cost ?? supply.unit_cost);
            if (supply.supply_color_stock.length || input.color_id) {
                const row = supply.supply_color_stock.find(row => row.color_id === input.color_id);
                if (!row || !row.is_active || !row.color.is_active) throw new ProductionError('Selecciona un color activo de este insumo');
                const beforeCost = row.unit_cost_override ?? supply.unit_cost;
                incoming = decimal(input.new_unit_cost ?? beforeCost);
                const colorCost = row.stock.plus(q).isZero() ? incoming : row.stock.times(beforeCost).plus(q.times(incoming)).div(row.stock.plus(q));
                await tx.supply_color_stock.update({ where: { supply_color_id: row.supply_color_id }, data: {
                    stock: { increment: q }, unit_cost_override: colorCost.toDecimalPlaces(4), updated_at: new Date(),
                } });
            }
            const cost = supply.stock.lessThanOrEqualTo(0) ? incoming : supply.stock.times(supply.unit_cost).plus(q.times(incoming)).div(after);
            const updated = await tx.supply.update({ where: { supply_id: input.supply_id }, data: { stock: after, unit_cost: cost.toDecimalPlaces(4), updated_at: new Date() } });
            await tx.supply_movement.create({ data: { supply_id: input.supply_id, movement_type: 'IN', qty: q, stock_before: supply.stock, stock_after: after,
                reason: `${input.reason || 'Reabastecimiento'}${input.color_id ? ' / color '+input.color_id : ''}` } });
            return updated;
        }, { timeout: 15000 });
        return NextResponse.json(result);
    } catch (error) { return productionErrorResponse(error); }
}
