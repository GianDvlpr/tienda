import { redirect } from 'next/navigation';
import { trackingPath } from '@/lib/order-rules';
export const metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ token?: string }> }) {
    const { code } = await params;
    const { token } = await searchParams;
    redirect(trackingPath(code, typeof token === 'string' ? token : ''));
}
