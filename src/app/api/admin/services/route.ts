import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const services = await prisma.service.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(services);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, unit_cost, is_active } = body;

        const newService = await prisma.service.create({
            data: {
                name,
                unit_cost: Number(unit_cost) || 0,
                is_active: is_active ?? true,
            }
        });

        return NextResponse.json(newService);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
