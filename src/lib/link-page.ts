import { prisma } from '@/lib/prisma';

export const LINK_PAGE_SETTINGS_KEY = 'main';

export const defaultLinkPageSettings = {
    settings_key: LINK_PAGE_SETTINGS_KEY,
    title: 'Aura Boutique',
    subtitle: 'Moda femenina exclusiva con envios a todo el Peru',
    avatar_url: null as string | null,
    announcement: 'Nuevo catalogo disponible',
    announcement_url: '/shop',
    announcement_logo_url: null as string | null,
    is_announcement_active: true,
    is_active: true,
    created_at: new Date(0),
    updated_at: new Date(0),
};

export async function getLinkPageSettings() {
    return prisma.link_page_settings.findUnique({
        where: { settings_key: LINK_PAGE_SETTINGS_KEY },
    });
}

export async function getEffectiveLinkPageSettings() {
    return (await getLinkPageSettings()) ?? defaultLinkPageSettings;
}

export async function getPublicLinkPage() {
    const settings = await getEffectiveLinkPageSettings();
    const items = settings.is_active
        ? await prisma.link_page_item.findMany({
            where: { is_active: true },
            orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
        })
        : [];

    return { settings, items };
}
