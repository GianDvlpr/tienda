import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await req.json();
        const { name, slug, description, is_active } = body;

        // Check if slug is taken by another
        if (slug) {
            const existing = await prisma.collection.findFirst({
                where: { slug, NOT: { collection_id: id } }
            });
            if (existing) {
                return NextResponse.json({ error: 'Ese slug (URL) ya está siendo usado por otra colección' }, { status: 400 });
            }
        }

        const updated = await prisma.collection.update({
            where: { collection_id: id },
            data: { name, slug, description, is_active },
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        // Validar si tiene productos asosciados antes de borrar
        const links = await prisma.product_collection.count({ where: { collection_id: id } });
        if (links > 0) {
            return NextResponse.json({ error: 'No se puede eliminar. Hay productos asignados a esta colección.' }, { status: 400 });
        }

        await prisma.collection.delete({
            where: { collection_id: id }
        });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
