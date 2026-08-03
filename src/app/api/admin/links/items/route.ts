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

function cleanColor(value: unknown) {
    const color = cleanString(value, 20);
    if (!color) return null;
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : null;
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

export async function GET() {
    try {
        const items = await prisma.link_page_item.findMany({
            orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
        });
        return NextResponse.json(items);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const title = cleanString(body.title, 120);
        const url = cleanUrl(body.url);
        const icon_url = cleanUrl(body.icon_url);
        const featured_image_url = cleanUrl(body.featured_image_url);
        const background_color = cleanColor(body.background_color);
        const text_color = cleanColor(body.text_color);

        if (!title || !url) {
            return NextResponse.json({ error: 'Titulo y URL valida son requeridos' }, { status: 400 });
        }

        if (body.icon_url && !icon_url) {
            return NextResponse.json({ error: 'La URL del logo del enlace no es valida' }, { status: 400 });
        }

        if (body.featured_image_url && !featured_image_url) {
            return NextResponse.json({ error: 'La URL del banner destacado no es valida' }, { status: 400 });
        }

        if (body.background_color && !background_color) {
            return NextResponse.json({ error: 'El color de fondo debe estar en formato hex' }, { status: 400 });
        }

        if (body.text_color && !text_color) {
            return NextResponse.json({ error: 'El color de texto debe estar en formato hex' }, { status: 400 });
        }

        const item = await prisma.link_page_item.create({
            data: {
                title,
                description: cleanString(body.description, 250),
                url,
                icon_url,
                featured_image_url,
                background_color,
                text_color,
                badge_text: cleanString(body.badge_text, 40),
                link_type: cleanLinkType(body.link_type),
                sort_order: cleanSortOrder(body.sort_order),
                is_featured: body.is_featured ?? false,
                is_active: body.is_active ?? true,
            },
        });

        return NextResponse.json(item);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
