import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const movements = await prisma.supply_movement.findMany({
            where: { supply_id: id },
            orderBy: { created_at: 'desc' },
        });

        return NextResponse.json(movements);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
