import { prisma } from '@/lib/prisma';
import ClientTracker from './ClientTracker';

type PublicOrderPhotoRow = {
    photo_id: string;
    url: string;
    caption: string | null;
    created_at: Date;
};

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
        ? await prisma.$queryRaw<PublicOrderPhotoRow[]>`
            SELECT photo_id, url, caption, created_at
            FROM dbo.order_photo
            WHERE order_id = ${order.order_id}
              AND is_public_tracking = 1
            ORDER BY created_at DESC
        `
        : [];

    const plainOrder = order ? JSON.parse(JSON.stringify({ ...order, order_photo: publicPhotos })) : null;

    return <ClientTracker order={plainOrder} code={code} />;
}
