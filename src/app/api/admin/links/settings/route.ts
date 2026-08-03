import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { defaultLinkPageSettings, getEffectiveLinkPageSettings, LINK_PAGE_SETTINGS_KEY } from '@/lib/link-page';

export const runtime = 'nodejs';

const allowedThemes = new Set(['BOUTIQUE', 'DARK_GOLD', 'ROSE', 'MINIMAL', 'CAMPAIGN']);

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

function cleanTheme(value: unknown) {
    const theme = cleanString(value, 30)?.toUpperCase() ?? defaultLinkPageSettings.theme;
    return allowedThemes.has(theme) ? theme : defaultLinkPageSettings.theme;
}

function cleanColor(value: unknown) {
    const color = cleanString(value, 20);
    if (!color) return null;
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : null;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error guardando configuracion';
}

export async function GET() {
    try {
        const settings = await getEffectiveLinkPageSettings();
        return NextResponse.json(settings);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const title = cleanString(body.title, 120);

        if (!title) {
            return NextResponse.json({ error: 'El titulo es requerido' }, { status: 400 });
        }

        const avatar_url = cleanUrl(body.avatar_url);
        if (body.avatar_url && !avatar_url) {
            return NextResponse.json({ error: 'La URL del avatar no es valida' }, { status: 400 });
        }

        const announcement_url = cleanUrl(body.announcement_url);
        if (body.announcement_url && !announcement_url) {
            return NextResponse.json({ error: 'La URL del anuncio no es valida' }, { status: 400 });
        }

        const announcement_logo_url = cleanUrl(body.announcement_logo_url);
        if (body.announcement_logo_url && !announcement_logo_url) {
            return NextResponse.json({ error: 'La URL del logo del anuncio no es valida' }, { status: 400 });
        }

        const background_image_url = cleanUrl(body.background_image_url);
        if (body.background_image_url && !background_image_url) {
            return NextResponse.json({ error: 'La URL del fondo no es valida' }, { status: 400 });
        }

        const background_color = cleanColor(body.background_color);
        if (body.background_color && !background_color) {
            return NextResponse.json({ error: 'El color de fondo debe estar en formato hex, por ejemplo #f8efe5' }, { status: 400 });
        }

        const settings = await prisma.link_page_settings.upsert({
            where: { settings_key: LINK_PAGE_SETTINGS_KEY },
            create: {
                settings_key: LINK_PAGE_SETTINGS_KEY,
                title,
                logo_text: cleanString(body.logo_text, 80) ?? defaultLinkPageSettings.logo_text,
                eyebrow_text: cleanString(body.eyebrow_text, 80) ?? defaultLinkPageSettings.eyebrow_text,
                theme: cleanTheme(body.theme),
                background_image_url,
                background_color,
                enable_animations: body.enable_animations ?? defaultLinkPageSettings.enable_animations,
                subtitle: cleanString(body.subtitle, 250),
                avatar_url,
                announcement: cleanString(body.announcement, 300),
                announcement_url,
                announcement_logo_url,
                is_announcement_active: body.is_announcement_active ?? defaultLinkPageSettings.is_announcement_active,
                is_active: body.is_active ?? defaultLinkPageSettings.is_active,
                footer_text: cleanString(body.footer_text, 120) ?? defaultLinkPageSettings.footer_text,
            },
            update: {
                title,
                logo_text: cleanString(body.logo_text, 80) ?? defaultLinkPageSettings.logo_text,
                eyebrow_text: cleanString(body.eyebrow_text, 80) ?? defaultLinkPageSettings.eyebrow_text,
                theme: cleanTheme(body.theme),
                background_image_url,
                background_color,
                enable_animations: body.enable_animations ?? true,
                subtitle: cleanString(body.subtitle, 250),
                avatar_url,
                announcement: cleanString(body.announcement, 300),
                announcement_url,
                announcement_logo_url,
                is_announcement_active: body.is_announcement_active ?? false,
                is_active: body.is_active ?? true,
                footer_text: cleanString(body.footer_text, 120) ?? defaultLinkPageSettings.footer_text,
                updated_at: new Date(),
            },
        });

        return NextResponse.json(settings);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
