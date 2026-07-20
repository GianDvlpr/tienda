import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const bundles = await (prisma as any).bundle_promotion.findMany({
            where: { is_active: true },
            include: {
                items: {
                    select: {
                        product_id: true
                    }
                }
            }
        });

        const tierRows = await prisma.$queryRaw<any[]>`
            SELECT bundle_id, bundle_price, tier_2_price, tier_3_price
            FROM dbo.bundle_promotion
            WHERE is_active = 1;
        `;
        const tiersByBundleId = new Map(tierRows.map((row) => [
            String(row.bundle_id),
            {
                bundle_price: row.bundle_price === null ? null : Number(row.bundle_price),
                tier_2_price: row.tier_2_price === null ? null : Number(row.tier_2_price),
                tier_3_price: row.tier_3_price === null ? null : Number(row.tier_3_price),
            }
        ]));

        return NextResponse.json(bundles.map((b: any) => ({
            bundle_id: b.bundle_id,
            name: b.name,
            discount_amount: Number(b.discount_amount),
            bundle_price: tiersByBundleId.get(String(b.bundle_id))?.bundle_price ?? null,
            tier_2_price: tiersByBundleId.get(String(b.bundle_id))?.tier_2_price ?? null,
            tier_3_price: tiersByBundleId.get(String(b.bundle_id))?.tier_3_price ?? null,
            requiredProductIds: b.items.map((i: any) => i.product_id)
        })));
    } catch (e: any) {
        console.error('Error fetching bundles for store:', e);
        return NextResponse.json({ error: 'Failed to load bundles' }, { status: 500 });
    }
}
