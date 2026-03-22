import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const slides = await prisma.hero_slide.findMany({
            where: { is_active: true },
            orderBy: { sort_order: 'asc' },
        });
        return NextResponse.json(slides);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
