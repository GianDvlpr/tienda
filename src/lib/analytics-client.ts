'use client';

export type StoreAnalyticsEventType = 'page_view' | 'product_view' | 'bundle_view' | 'bundle_click' | 'bundle_add_to_cart' | 'bundle_add_to_cart_custom';

type StoreAnalyticsEvent = {
    eventType: StoreAnalyticsEventType;
    path?: string;
    product?: {
        id?: string;
        slug?: string;
        name?: string;
    };
    bundle?: {
        id?: string;
        name?: string;
    };
    metadata?: Record<string, unknown>;
};

const SESSION_STORAGE_KEY = 'aura_analytics_session_id';

function getSessionId() {
    let sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionId) return sessionId;

    sessionId = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    return sessionId;
}

function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        source: params.get('utm_source') || undefined,
        medium: params.get('utm_medium') || undefined,
        campaign: params.get('utm_campaign') || undefined,
    };
}

export function trackStoreEvent(event: StoreAnalyticsEvent) {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/admin')) return;
    if (window.location.pathname.startsWith('/order')) return;

    const payload = {
        sessionId: getSessionId(),
        eventType: event.eventType,
        path: event.path || `${window.location.pathname}${window.location.search}`,
        referrer: document.referrer || undefined,
        utm: getUtmParams(),
        product: event.product,
        bundle: event.bundle,
        metadata: event.metadata,
    };
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon('/api/store/analytics/event', new Blob([body], { type: 'application/json' }));
        if (sent) return;
    }

    fetch('/api/store/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
    }).catch(() => undefined);
}
