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

        const result = await prisma.$executeRaw`
            UPDATE dbo.order_photo
            SET caption = ${caption},
                is_public_tracking = ${isPublicTracking},
                updated_at = sysutcdatetime()
            WHERE order_id = ${id}
              AND photo_id = ${photoId}
        `;

        if (result === 0) {
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

        const result = await prisma.$executeRaw`
            DELETE FROM dbo.order_photo
            WHERE order_id = ${id}
              AND photo_id = ${photoId}
        `;

        if (result === 0) {
            return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
