import { prisma } from '@/lib/prisma';
import ClientTracker from './ClientTracker';

export default async function PublicTrackingPage({ params }: { params: Promise<{ code: string }> }) {
    const resolvedParams = await params;
    const { code } = resolvedParams;

    const order = await prisma.order_header.findFirst({
        where: { code: { equals: code } },
        include: {
            order_item: true
        }
    });

    const publicPhotos = order
        ? await prisma.order_photo.findMany({
            where: { order_id: order.order_id, is_public_tracking: true },
            orderBy: { created_at: 'desc' },
            select: { photo_id: true, url: true, caption: true, created_at: true },
        })
        : [];

    const plainOrder = order ? JSON.parse(JSON.stringify({ ...order, order_photo: publicPhotos })) : null;

    return <ClientTracker order={plainOrder} code={code} />;
}
