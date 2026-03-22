import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const collections = await prisma.collection.findMany({
            orderBy: { created_at: 'desc' },
        });
        return NextResponse.json(collections);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, slug, description, is_active } = body;

        if (!name || !slug) {
            return NextResponse.json({ error: 'Nombre y URL/Slug son obligatorios' }, { status: 400 });
        }

        const existing = await prisma.collection.findUnique({ where: { slug } });
        if (existing) {
            return NextResponse.json({ error: 'La URL / Slug ya está en uso' }, { status: 400 });
        }

        const newCollection = await prisma.collection.create({
            data: {
                name,
                slug,
                description,
                is_active: is_active ?? true,
            }
        });

        return NextResponse.json(newCollection);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
