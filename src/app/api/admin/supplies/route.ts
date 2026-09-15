import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { z } from 'zod';
import { amount, productionErrorResponse } from '@/lib/production-rules';

export async function GET() {
    try {
        const supplies = await prisma.supply.findMany({
            orderBy: { name: 'asc' },
            include: { supply_color_stock: { include: { color: true } } },
        });
        return NextResponse.json(supplies);
    } catch (e: unknown) {
        return productionErrorResponse(e);
    }
}

export async function POST(req: Request) {
    try {
        const body = z.object({ name: z.string().trim().min(1).max(200), type: z.string().min(1).max(50), unit: z.string().min(1).max(20),
            unit_cost: amount, stock: amount.default(0), min_stock: amount.default(0), is_active: z.boolean().default(true) }).parse(await req.json());
        const { name, type, unit, unit_cost, stock, min_stock, is_active } = body;

        const newSupply = await prisma.supply.create({
            data: {
                name,
                type,
                unit,
                unit_cost: Number(unit_cost) || 0,
                stock: Number(stock) || 0,
                min_stock: Number(min_stock) || 0,
                is_active: is_active ?? true,
            }
        });


        // Registrar Auditoría
        await recordAudit({
            action: 'CREATE',
            entityType: 'supply',
            entityId: newSupply.supply_id,
            newData: newSupply
        });

        return NextResponse.json(newSupply);
    } catch (e: unknown) {
        return productionErrorResponse(e);
    }
}

