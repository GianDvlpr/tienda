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

    const plainOrder = order ? JSON.parse(JSON.stringify(order)) : null;

    return <ClientTracker order={plainOrder} code={code} />;
}
