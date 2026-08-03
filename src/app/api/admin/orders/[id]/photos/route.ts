import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const url = normalizeText(body.url);
        const publicId = normalizeText(body.public_id || body.publicId) || null;
        const caption = normalizeText(body.caption) || null;
        const isPublicTracking = body.is_public_tracking === true || body.isPublicTracking === true;

        if (!url) {
            return NextResponse.json({ error: 'La URL de la foto es obligatoria' }, { status: 400 });
        }

        const order = await prisma.order_header.findUnique({ where: { order_id: id }, select: { order_id: true } });
        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        const photo = await prisma.order_photo.create({
            data: {
                order_id: id,
                url,
                public_id: publicId,
                caption,
                is_public_tracking: isPublicTracking,
            },
        });

        return NextResponse.json(photo, { status: 201 });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
