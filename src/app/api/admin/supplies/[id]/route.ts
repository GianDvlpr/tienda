import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { lockSupply } from '@/lib/supply-stock';
import { productionErrorResponse } from '@/lib/production-rules';
import { z } from 'zod';
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = z.string().uuid().parse((await params).id);
        const result = await prisma.$transaction(async tx => {
            const supply = await lockSupply(tx, id);
            const movements = await tx.supply_movement.count({ where: { supply_id: id } });
            const bom = await tx.product_bom_supply.count({ where: { supply_id: id } });
            const consumed = await tx.production_lot_consumption.count({ where: { supply_id: id } });
            if (movements || bom || consumed) {
                await tx.supply.update({ where: { supply_id: id }, data: { is_active: false, updated_at: new Date() } });
                return { supply, softDeleted: true };
            }
            await tx.supply.delete({ where: { supply_id: id } });
            return { supply, softDeleted: false };
        });
        await recordAudit({ action: result.softDeleted ? 'UPDATE' : 'DELETE', entityType: 'supply', entityId: id, oldData: result.supply,
            newData: result.softDeleted ? { is_active: false } : { deleted: true } });
        return NextResponse.json({ success: true, softDeleted: result.softDeleted, deleted: !result.softDeleted,
            message: result.softDeleted ? 'El insumo tiene historial y fue desactivado.' : 'Insumo eliminado.' });
    } catch (error) { return productionErrorResponse(error); }
}
