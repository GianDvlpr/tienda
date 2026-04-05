import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supplies = await prisma.supply.findMany({
            where: {
                is_active: true,
                min_stock: { gt: 0 }
            }
        });

        // Filter those where stock <= min_stock
        const alerts = supplies.filter(s => Number(s.stock) <= Number(s.min_stock));

        return NextResponse.json(alerts);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
