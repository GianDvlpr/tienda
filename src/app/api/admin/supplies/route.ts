import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export async function GET() {
    try {
        const supplies = await prisma.supply.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(supplies);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, type, unit, unit_cost, stock, min_stock, is_active } = body;

        const newSupply = await (prisma as any).supply.create({
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
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

