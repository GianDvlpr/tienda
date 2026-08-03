import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type AnalyticsEventType = 'page_view' | 'product_view' | 'bundle_view' | 'bundle_click' | 'bundle_add_to_cart' | 'bundle_add_to_cart_custom';

type AnalyticsPayload = {
    sessionId?: unknown;
    eventType?: unknown;
    path?: unknown;
    referrer?: unknown;
    utm?: {
        source?: unknown;
        medium?: unknown;
        campaign?: unknown;
    };
    product?: {
        id?: unknown;
        slug?: unknown;
        name?: unknown;
    };
    bundle?: {
        id?: unknown;
        name?: unknown;
    };
    metadata?: unknown;
};

const validEventTypes = new Set<AnalyticsEventType>([
    'page_view',
    'product_view',
    'bundle_view',
    'bundle_click',
    'bundle_add_to_cart',
    'bundle_add_to_cart_custom',
]);

const WINDOW_MS = 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 90;
const eventCounts = new Map<string, { count: number; resetAt: number }>();

function cleanString(value: unknown, maxLength: number) {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanGuid(value: unknown) {
    const cleaned = cleanString(value, 36);
    if (!cleaned) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned) ? cleaned : null;
}

function getHeader(req: Request, name: string, maxLength: number) {
    return cleanString(req.headers.get(name), maxLength);
}

function isBot(userAgent: string) {
    return /bot|crawler|spider|crawling|facebookexternalhit|preview|slurp|bingbot|googlebot/i.test(userAgent);
}

function getDeviceType(userAgent: string) {
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobi|android|iphone|ipod/i.test(userAgent)) return 'mobile';
    return 'desktop';
}

function getBrowser(userAgent: string) {
    if (/Edg\//.test(userAgent)) return 'Edge';
    if (/Chrome\//.test(userAgent) && !/Chromium\//.test(userAgent)) return 'Chrome';
    if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return 'Safari';
    if (/Firefox\//.test(userAgent)) return 'Firefox';
    return 'Other';
}

function getOs(userAgent: string) {
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Mac OS/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Other';
}

function getRateLimitKey(req: Request, sessionId: string) {
    const ip = getHeader(req, 'x-forwarded-for', 80)?.split(',')[0]?.trim() || getHeader(req, 'x-real-ip', 80) || 'unknown';
    return `${ip}:${sessionId}`;
}

function isRateLimited(key: string) {
    const now = Date.now();
    const current = eventCounts.get(key);

    if (!current || now > current.resetAt) {
        eventCounts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }

    current.count += 1;
    return current.count > MAX_EVENTS_PER_WINDOW;
}

function serializeMetadata(value: unknown) {
    if (!value || typeof value !== 'object') return null;
    return JSON.stringify(value).slice(0, 4000);
}

export async function POST(req: Request) {
    try {
        const userAgent = req.headers.get('user-agent') || '';
        if (!userAgent || isBot(userAgent)) {
            return NextResponse.json({ success: true });
        }

        const payload = await req.json() as AnalyticsPayload;
        const sessionId = cleanString(payload.sessionId, 64);
        const eventType = cleanString(payload.eventType, 50) as AnalyticsEventType | null;
        const path = cleanString(payload.path, 500);

        if (!sessionId || !eventType || !validEventTypes.has(eventType) || !path) {
            return NextResponse.json({ success: true });
        }

        if (isRateLimited(getRateLimitKey(req, sessionId))) {
            return NextResponse.json({ success: true });
        }

        const referrer = cleanString(payload.referrer, 1000);
        const utmSource = cleanString(payload.utm?.source, 120);
        const utmMedium = cleanString(payload.utm?.medium, 120);
        const utmCampaign = cleanString(payload.utm?.campaign, 180);
        const country = getHeader(req, 'x-vercel-ip-country', 80) || getHeader(req, 'cf-ipcountry', 80);
        const city = getHeader(req, 'x-vercel-ip-city', 120) || getHeader(req, 'cf-ipcity', 120);

        await prisma.analytics_session.upsert({
            where: { session_id: sessionId },
            create: {
                session_id: sessionId,
                landing_path: path,
                referrer,
                utm_source: utmSource,
                utm_medium: utmMedium,
                utm_campaign: utmCampaign,
                country,
                city,
                device_type: getDeviceType(userAgent),
                browser: getBrowser(userAgent),
                os: getOs(userAgent),
            },
            update: {
                last_seen_at: new Date(),
                referrer: referrer || undefined,
                utm_source: utmSource || undefined,
                utm_medium: utmMedium || undefined,
                utm_campaign: utmCampaign || undefined,
            },
        });

        await prisma.analytics_event.create({
            data: {
                session_id: sessionId,
                event_type: eventType,
                path,
                product_id: cleanGuid(payload.product?.id),
                product_slug: cleanString(payload.product?.slug, 180),
                product_name: cleanString(payload.product?.name, 250),
                bundle_id: cleanGuid(payload.bundle?.id),
                bundle_name: cleanString(payload.bundle?.name, 200),
                metadata: serializeMetadata(payload.metadata),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics event error:', error);
        return NextResponse.json({ success: true });
    }
}
