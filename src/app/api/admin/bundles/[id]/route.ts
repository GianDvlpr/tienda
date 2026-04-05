import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, description, discount_amount, is_active, product_ids } = body;

        // Capturar estado anterior para auditoría
        const oldBundle = await (prisma as any).bundle_promotion.findUnique({
            where: { bundle_id: id },
            include: { items: true }
        });

        const updated = await prisma.$transaction(async (tx: any) => {
            // Actualizar datos básicos
            const bundle = await tx.bundle_promotion.update({
                where: { bundle_id: id },
                data: {
                    name,
                    description,
                    discount_amount: Number(discount_amount),
                    is_active: is_active ?? true,
                }
            });

            // Si se pasaron product_ids nuevos, regenerar items
            if (product_ids) {
                // Borrar items actuales
                await tx.bundle_promotion_item.deleteMany({
                    where: { bundle_id: id }
                });
                // Crear nuevos
                await tx.bundle_promotion_item.createMany({
                    data: product_ids.map((pId: string) => ({
                        bundle_id: id,
                        product_id: pId
                    }))
                });
            }

            return tx.bundle_promotion.findUnique({
                where: { bundle_id: id },
                include: { items: true }
            });
        });


        // Registrar Auditoría
        await recordAudit({
            action: 'UPDATE',
            entityType: 'bundle_promotion',
            entityId: id,
            oldData: oldBundle,
            newData: updated
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Auditoría: Capturar antes de borrar
        const oldBundle = await (prisma as any).bundle_promotion.findUnique({
            where: { bundle_id: id },
            include: { items: true }
        });

        await (prisma as any).bundle_promotion.delete({
            where: { bundle_id: id }
        });


        // Registrar Auditoría
        await recordAudit({
            action: 'DELETE',
            entityType: 'bundle_promotion',
            entityId: id,
            oldData: oldBundle,
            newData: { deleted: true }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
