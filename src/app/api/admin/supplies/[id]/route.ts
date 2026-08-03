import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const supply = await prisma.supply.findUnique({ where: { supply_id: id } });
        if (!supply) return NextResponse.json({ error: 'Insumo no encontrado' }, { status: 404 });

        const [movementCount, bomCount, consumptionCount] = await Promise.all([
            prisma.supply_movement.count({ where: { supply_id: id } }),
            prisma.product_bom_supply.count({ where: { supply_id: id } }),
            prisma.production_lot_consumption.count({ where: { supply_id: id } }),
        ]);

        const hasHistory = movementCount > 0 || bomCount > 0 || consumptionCount > 0;

        if (hasHistory) {
            const updated = await prisma.supply.update({
                where: { supply_id: id },
                data: { is_active: false, updated_at: new Date() },
            });

            await recordAudit({
                action: 'UPDATE',
                entityType: 'supply',
                entityId: id,
                oldData: supply,
                newData: { ...updated, hiddenReason: 'Insumo con historial, ocultado en vez de eliminado' },
            });

            return NextResponse.json({ success: true, softDeleted: true, message: 'El insumo tiene historial y fue desactivado.' });
        }

        await prisma.supply.delete({ where: { supply_id: id } });

        await recordAudit({
            action: 'DELETE',
            entityType: 'supply',
            entityId: id,
            oldData: supply,
            newData: { deleted: true },
        });

        return NextResponse.json({ success: true, deleted: true, message: 'Insumo eliminado.' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
