import { prisma } from '@/lib/prisma';
import ClientTracker from './ClientTracker';
import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function PublicTrackingPage({ params, searchParams }: {
    params: Promise<{ code: string }>; searchParams: Promise<{ token?: string }>;
}) {
    const { code } = await params;
    const { token } = await searchParams;
    const order = typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? await prisma.order_header.findFirst({
        where: { code, tracking_token: token },
        select: { code: true, status: true, created_at: true, shipping_name: true, shipping_phone: true,
            order_item: { select: { order_item_id: true, product_name: true, variant_size: true, variant_color: true, qty: true, is_customized: true } },
            order_photo: { where: { is_public_tracking: true }, orderBy: { created_at: 'desc' }, select: { photo_id: true, url: true, caption: true } },
        },
    }) : null;
    // Minimize before serialization: no DNI, address, notes, money or raw phone leaves the server.
    const publicOrder = order ? { ...order, created_at: order.created_at.toISOString(),
        shipping_name: order.shipping_name.split(' ')[0],
        shipping_phone: '•••• ' + (order.shipping_phone || '').slice(-4),
    } : null;
    return <ClientTracker order={publicOrder} code={code} />;
}
