import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const order = await prisma.order_header.findUnique({
            where: { order_id: id },
            include: {
                order_item: true
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await req.json();
        
        const { status, notes } = body;

        const updated = await prisma.order_header.update({
            where: { order_id: id },
            data: {
                status,
                notes: notes !== undefined ? notes : undefined,
                updated_at: new Date()
            }
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
