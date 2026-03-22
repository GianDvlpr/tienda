import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const orders = await prisma.order_header.findMany({
            orderBy: { created_at: 'desc' },
            take: 100, // Limit to recent 100 entries for MVP
            include: {
                order_item: true
            }
        });

        return NextResponse.json(orders);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
