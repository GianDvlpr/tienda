'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackStoreEvent } from '@/lib/analytics-client';

export default function StoreAnalytics() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastTrackedPath = useRef<string | null>(null);

    useEffect(() => {
        const query = searchParams.toString();
        const path = query ? `${pathname}?${query}` : pathname;

        if (lastTrackedPath.current === path) return;
        lastTrackedPath.current = path;

        trackStoreEvent({ eventType: 'page_view', path });
    }, [pathname, searchParams]);

    return null;
}
