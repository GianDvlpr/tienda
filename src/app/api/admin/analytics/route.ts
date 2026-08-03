import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type AnalyticsEventRow = {
    session_id: string;
    event_type: string;
    path: string;
    product_id: string | null;
    product_slug: string | null;
    product_name: string | null;
    bundle_id: string | null;
    bundle_name: string | null;
    created_at: Date;
};

type AnalyticsSessionRow = {
    session_id: string;
    first_seen_at: Date;
    referrer: string | null;
    utm_source: string | null;
    device_type: string | null;
    country: string | null;
};

function getRangeDays(value: string | null) {
    if (value === '7d') return 7;
    if (value === '90d') return 90;
    return 30;
}

function increment(map: Map<string, number>, key: string, by = 1) {
    map.set(key, (map.get(key) || 0) + by);
}

function topEntries(map: Map<string, number>, limit: number) {
    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
}

function normalizeSource(session: AnalyticsSessionRow) {
    if (session.utm_source) return session.utm_source;
    if (!session.referrer) return 'Directo';

    try {
        const host = new URL(session.referrer).hostname.replace(/^www\./, '');
        if (host.includes('instagram')) return 'Instagram';
        if (host.includes('tiktok')) return 'TikTok';
        if (host.includes('facebook') || host.includes('fb.')) return 'Facebook';
        if (host.includes('google')) return 'Google';
        if (host.includes('whatsapp')) return 'WhatsApp';
        return host;
    } catch {
        return 'Referido';
    }
}

export async function GET(req: NextRequest) {
    try {
        const days = getRangeDays(req.nextUrl.searchParams.get('range'));
        const since = dayjs().subtract(days - 1, 'days').startOf('day').toDate();

        const [events, sessions] = await Promise.all([
            prisma.analytics_event.findMany({
                where: { created_at: { gte: since } },
                select: {
                    session_id: true,
                    event_type: true,
                    path: true,
                    product_id: true,
                    product_slug: true,
                    product_name: true,
                    bundle_id: true,
                    bundle_name: true,
                    created_at: true,
                },
                orderBy: { created_at: 'desc' },
                take: 20000,
            }),
            prisma.analytics_session.findMany({
                where: { first_seen_at: { gte: since } },
                select: {
                    session_id: true,
                    first_seen_at: true,
                    referrer: true,
                    utm_source: true,
                    device_type: true,
                    country: true,
                },
                orderBy: { first_seen_at: 'desc' },
                take: 10000,
            }),
        ]) as [AnalyticsEventRow[], AnalyticsSessionRow[]];

        const visitsByDayMap = new Map<string, { pageViews: number; sessions: Set<string> }>();
        for (let index = days - 1; index >= 0; index--) {
            visitsByDayMap.set(dayjs().subtract(index, 'days').format('DD/MM'), { pageViews: 0, sessions: new Set<string>() });
        }

        const pageMap = new Map<string, number>();
        const productMap = new Map<string, number>();
        const bundleViewMap = new Map<string, number>();
        const bundleCartMap = new Map<string, number>();
        const sourceMap = new Map<string, number>();
        const deviceMap = new Map<string, number>();
        const countryMap = new Map<string, number>();

        for (const event of events) {
            if (event.event_type === 'page_view') {
                const day = dayjs(event.created_at).format('DD/MM');
                const dayEntry = visitsByDayMap.get(day);
                if (dayEntry) {
                    dayEntry.pageViews += 1;
                    dayEntry.sessions.add(event.session_id);
                }
                increment(pageMap, event.path.split('?')[0] || '/');
            }

            if (event.event_type === 'product_view') {
                increment(productMap, event.product_name || event.product_slug || event.product_id || 'Producto sin nombre');
            }

            if (event.event_type === 'bundle_view') {
                increment(bundleViewMap, event.bundle_name || event.bundle_id || 'Conjunto sin nombre');
            }

            if (event.event_type === 'bundle_add_to_cart' || event.event_type === 'bundle_add_to_cart_custom') {
                increment(bundleCartMap, event.bundle_name || event.bundle_id || 'Conjunto sin nombre');
            }
        }

        for (const session of sessions) {
            increment(sourceMap, normalizeSource(session));
            increment(deviceMap, session.device_type || 'unknown');
            if (session.country) increment(countryMap, session.country);
        }

        return NextResponse.json({
            rangeDays: days,
            totals: {
                sessions: sessions.length,
                pageViews: events.filter((event) => event.event_type === 'page_view').length,
                productViews: events.filter((event) => event.event_type === 'product_view').length,
                bundleViews: events.filter((event) => event.event_type === 'bundle_view').length,
            },
            visitsByDay: Array.from(visitsByDayMap.entries()).map(([date, data]) => ({
                date,
                visits: data.sessions.size,
                pageViews: data.pageViews,
            })),
            topProducts: topEntries(productMap, 8),
            topBundles: topEntries(bundleViewMap, 8),
            bundleAdds: topEntries(bundleCartMap, 8),
            topSources: topEntries(sourceMap, 8),
            topPages: topEntries(pageMap, 8),
            devices: topEntries(deviceMap, 5),
            countries: topEntries(countryMap, 8),
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Error al cargar analíticas';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
