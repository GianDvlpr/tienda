import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const slides = await prisma.hero_slide.findMany({
            orderBy: { sort_order: 'asc' },
        });
        return NextResponse.json(slides);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image_url, title, subtitle, button_text, link_url, sort_order, is_active } = body;

        if (!image_url) {
            return NextResponse.json({ error: 'La imagen es requerida' }, { status: 400 });
        }

        const newSlide = await prisma.hero_slide.create({
            data: {
                image_url,
                title,
                subtitle,
                button_text,
                link_url,
                sort_order: sort_order ?? 0,
                is_active: is_active ?? true,
            }
        });

        return NextResponse.json(newSlide);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
