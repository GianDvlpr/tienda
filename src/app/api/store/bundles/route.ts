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

        return NextResponse.json(bundles.map((b: any) => ({
            bundle_id: b.bundle_id,
            name: b.name,
            discount_amount: Number(b.discount_amount),
            bundle_price: b.bundle_price === null ? null : Number(b.bundle_price),
            tier_2_price: b.tier_2_price === null ? null : Number(b.tier_2_price),
            tier_3_price: b.tier_3_price === null ? null : Number(b.tier_3_price),
            customization_surcharge: b.customization_surcharge === null ? 20 : Number(b.customization_surcharge),
            requiredProductIds: b.items.map((i: any) => i.product_id)
        })));
    } catch (e: any) {
        console.error('Error fetching bundles for store:', e);
        return NextResponse.json({ error: 'Failed to load bundles' }, { status: 500 });
    }
}
