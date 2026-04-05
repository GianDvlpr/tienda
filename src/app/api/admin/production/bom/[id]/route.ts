import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        
        const supplies = await prisma.product_bom_supply.findMany({
            where: { product_id: id },
            include: { supply: true }
        });
        
        const services = await prisma.product_bom_service.findMany({
            where: { product_id: id },
            include: { service: true }
        });

        return NextResponse.json({ supplies, services });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await req.json();
        const { supplies, services } = body;

        await prisma.$transaction(async (tx) => {
            // Re-create supplies
            if (supplies) {
                await tx.product_bom_supply.deleteMany({ where: { product_id: id } });
                if (supplies.length > 0) {
                    await tx.product_bom_supply.createMany({
                        data: supplies.map((s: any) => ({
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
                        data: services.map((s: any) => ({
                            product_id: id,
                            service_id: s.service_id,
                            quantity: Number(s.quantity) || 1,
                        }))
                    });
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
