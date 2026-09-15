import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { amount, productionErrorResponse } from '@/lib/production-rules';
const bomSchema = z.object({
    supplies: z.array(z.object({ supply_id: z.string().uuid(), size: z.string().max(50).nullable().optional(),
        quantity: amount.refine(n => n > 0), varies_by_color: z.boolean().default(false) })).max(500).optional(),
    services: z.array(z.object({ service_id: z.string().uuid(), quantity: amount.refine(n => n > 0),
        unit_cost_override: amount.nullable().optional() })).max(500).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = z.string().uuid().parse((await params).id);
        
        const supplies = await prisma.product_bom_supply.findMany({
            where: { product_id: id },
            include: { supply: true }
        });
        
        const services = await prisma.product_bom_service.findMany({
            where: { product_id: id },
            include: { service: true }
        });

        return NextResponse.json({ supplies, services });
    } catch (e: unknown) {
        return productionErrorResponse(e);
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = z.string().uuid().parse((await params).id);
        const body = bomSchema.parse(await req.json());
        const { supplies, services } = body;

        await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT product_id FROM product WHERE product_id = ${id}::uuid FOR UPDATE`;
            // Re-create supplies
            if (supplies) {
                await tx.product_bom_supply.deleteMany({ where: { product_id: id } });
                if (supplies.length > 0) {
                    await tx.product_bom_supply.createMany({
                        data: supplies.map((s) => ({
                            product_id: id,
                            supply_id: s.supply_id,
                            size: s.size || null,
                            quantity: Number(s.quantity) || 0,
                            varies_by_color: s.varies_by_color ?? false,
                        }))
                    });
                }
            }

            // Re-create services
            if (services) {
                await tx.product_bom_service.deleteMany({ where: { product_id: id } });
                if (services.length > 0) {
                    await tx.product_bom_service.createMany({
                        data: services.map((s) => ({
                            product_id: id,
                            service_id: s.service_id,
                            quantity: Number(s.quantity) || 1,
                            unit_cost_override: s.unit_cost_override != null ? Number(s.unit_cost_override) : null,
                        }))
                    });
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        return productionErrorResponse(e);
    }
}
