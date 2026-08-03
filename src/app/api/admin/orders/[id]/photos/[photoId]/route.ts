import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
    try {
        const { id, photoId } = await params;
        const body = await req.json();
        const caption = body.caption === undefined ? null : normalizeText(body.caption) || null;
        const isPublicTracking = body.is_public_tracking === true || body.isPublicTracking === true;

        const result = await prisma.order_photo.updateMany({
            where: { order_id: id, photo_id: photoId },
            data: { caption, is_public_tracking: isPublicTracking, updated_at: new Date() },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
    try {
        const { id, photoId } = await params;

        const result = await prisma.order_photo.deleteMany({
            where: { order_id: id, photo_id: photoId },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
