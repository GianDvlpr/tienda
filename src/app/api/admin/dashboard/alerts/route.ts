import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supplies = await (prisma.supply as any).findMany({
            where: {
                is_active: true,
            }
        });


        // Filter those where stock <= min_stock
        const alerts = (supplies as any[]).filter((s: any) => {

            const minStock = Number(s.min_stock) || 0;
            return minStock > 0 && Number(s.stock) <= minStock;
        });


        return NextResponse.json(alerts);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
