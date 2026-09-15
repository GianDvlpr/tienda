import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { productionPlan, finishProduction } from '@/lib/production';
import { createLotSchema, ProductionError, productionErrorResponse } from '@/lib/production-rules';

export async function GET() {
    try {
        const lots = await prisma.production_lot.findMany({ orderBy: { created_at: 'desc' }, include: {
            product: { select: { name: true, slug: true } }, items: true, consumptions: true,
        } });
        const supplies = await prisma.supply.findMany({ where: { supply_id: { in: [...new Set(lots.flatMap(lot => lot.consumptions.map(c => c.supply_id)))] } } });
        const byId = new Map(supplies.map(s => [s.supply_id, s]));
        return NextResponse.json(lots.map(lot => ({ ...lot, consumptions: lot.consumptions.map(c => ({ ...c, supply: byId.get(c.supply_id) ?? { name: 'Insumo histórico', unit: '' } })) })));
    } catch (error) { return productionErrorResponse(error); }
}
export async function POST(req: Request) {
    try {
        const input = createLotSchema.parse(await req.json());
        const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
        const lot = await prisma.$transaction(async tx => {
            // Serializes concurrent retries before the first row exists.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.lot_id}, 0))`;
            const previous = await tx.production_lot.findUnique({ where: { lot_id: input.lot_id } });
            if (previous) {
                if (!previous.cost_snapshot || JSON.parse(previous.cost_snapshot).requestHash !== hash) throw new ProductionError('La solicitud ya existe con otros datos. Revisa el historial.');
                return previous;
            }
            await tx.$queryRaw`SELECT product_id FROM product WHERE product_id = ${input.product_id}::uuid FOR UPDATE`;
            const plan = await productionPlan(tx, input.product_id, input.lotItems);
            const created = await tx.production_lot.create({ data: {
                lot_id: input.lot_id, code: `LOT-${input.lot_id}`, product_id: input.product_id, status: 'PENDIENTE', notes: input.notes,
                total_cost: plan.totalCost, cost_snapshot: JSON.stringify({ version: 1, requestHash: hash, ...plan }),
                items: { create: input.lotItems },
                consumptions: { create: plan.supplyNeeds.map(c => ({ supply_id: c.supply_id, color: c.color, quantity: c.quantity, unit_cost: c.unit_cost })) },
            } });
            return input.status === 'PRODUCIDO' ? finishProduction(tx, created.lot_id) : created;
        }, { timeout: 20000 });
        await recordAudit({ action: 'CREATE', entityType: 'production_lot', entityId: lot.lot_id, newData: lot });
        return NextResponse.json({ success: true, message: 'Lote registrado con éxito', lot });
    } catch (error) { return productionErrorResponse(error); }
}
