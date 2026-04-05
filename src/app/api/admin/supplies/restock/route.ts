import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { supply_id, qty, reason, new_unit_cost } = body;

        if (!supply_id || Number(qty) <= 0) {
            throw new Error('Cantidad o Insumo inválido.');
        }

        const quantity = Number(qty);

        // Execute in transaction to ensure integrity
        const supply = await prisma.$transaction(async (tx: any) => {
            const currentSupply = await tx.supply.findUnique({
                where: { supply_id }
            });

            if (!currentSupply) throw new Error('Insumo no encontrado');

            const stockBefore = Number(currentSupply.stock);
            const stockAfter = stockBefore + quantity;

            // Recalculate average cost if a new unit cost is provided and valid
            let finalCost = Number(currentSupply.unit_cost);
            if (new_unit_cost !== undefined && Number(new_unit_cost) > 0) {
                const incomingCost = Number(new_unit_cost);
                // Weighted average cost (Costo Promedio Ponderado)
                // New Cost = ((Old Stock * Old Cost) + (New Qty * New Cost)) / (Old Stock + New Qty)
                
                // If old stock was 0 or less, just adopt the new cost.
                if (stockBefore <= 0) {
                    finalCost = incomingCost;
                } else {
                    const totalValueBefore = stockBefore * Number(currentSupply.unit_cost);
                    const incomingValue = quantity * incomingCost;
                    finalCost = (totalValueBefore + incomingValue) / stockAfter;
                }
            }

            const updatedSupply = await tx.supply.update({
                where: { supply_id },
                data: {
                    stock: stockAfter,
                    unit_cost: Number(finalCost.toFixed(4))
                }
            });

            await tx.supply_movement.create({
                data: {
                    supply_id,
                    movement_type: 'IN',
                    qty: quantity,
                    stock_before: stockBefore,
                    stock_after: stockAfter,
                    reason: reason || 'Re-abastecimiento manual',
                }
            });

            return updatedSupply;
        }, { timeout: 10000 });

        return NextResponse.json(supply);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
