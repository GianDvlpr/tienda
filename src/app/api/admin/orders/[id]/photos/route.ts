import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type OrderPhotoRow = {
    photo_id: string;
    order_id: string;
    url: string;
    public_id: string | null;
    caption: string | null;
    is_public_tracking: boolean | number;
    created_at: Date;
    updated_at: Date;
};

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

        const rows = await prisma.$queryRaw<OrderPhotoRow[]>`
            INSERT INTO dbo.order_photo (order_id, url, public_id, caption, is_public_tracking)
            OUTPUT INSERTED.photo_id, INSERTED.order_id, INSERTED.url, INSERTED.public_id, INSERTED.caption,
                   INSERTED.is_public_tracking, INSERTED.created_at, INSERTED.updated_at
            VALUES (${id}, ${url}, ${publicId}, ${caption}, ${isPublicTracking})
        `;

        return NextResponse.json(rows[0], { status: 201 });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
