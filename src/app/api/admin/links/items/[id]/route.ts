import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const allowedTypes = new Set(['CATALOG', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'EMAIL', 'ANNOUNCEMENT', 'CUSTOM']);

function cleanString(value: unknown, maxLength: number) {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanUrl(value: unknown) {
    const url = cleanString(value, 500);
    if (!url) return null;
    if (url.startsWith('/') && !url.startsWith('//')) return url;

    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? url : null;
    } catch {
        return null;
    }
}

function cleanSortOrder(value: unknown) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function cleanLinkType(value: unknown) {
    const linkType = cleanString(value, 40)?.toUpperCase() ?? 'CUSTOM';
    return allowedTypes.has(linkType) ? linkType : 'CUSTOM';
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error guardando enlace';
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const title = cleanString(body.title, 120);
        const url = cleanUrl(body.url);

        if (!title || !url) {
            return NextResponse.json({ error: 'Titulo y URL valida son requeridos' }, { status: 400 });
        }

        const item = await prisma.link_page_item.update({
            where: { link_id: id },
            data: {
                title,
                description: cleanString(body.description, 250),
                url,
                link_type: cleanLinkType(body.link_type),
                sort_order: cleanSortOrder(body.sort_order),
                is_featured: body.is_featured ?? false,
                is_active: body.is_active ?? true,
                updated_at: new Date(),
            },
        });

        return NextResponse.json(item);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.link_page_item.delete({
            where: { link_id: id },
        });
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
