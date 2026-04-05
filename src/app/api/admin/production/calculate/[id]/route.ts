import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateProductionCost } from '@/lib/production-calc';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const product_id = (await params).id;
        const body = await req.json();
        const { lotItems } = body;

        if (!lotItems || lotItems.length === 0) {
            return NextResponse.json({ error: 'Debes proporcionar al menos una cantidad' }, { status: 400 });
        }

        const bomSupplies = await prisma.product_bom_supply.findMany({
            where: { product_id },
            include: { supply: true }
        });

        const bomServices = await prisma.product_bom_service.findMany({
            where: { product_id },
            include: { service: true }
        });

        const result = calculateProductionCost(lotItems, bomSupplies as any, bomServices as any);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
