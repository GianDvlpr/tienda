import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    const collection = url.searchParams.get('collection'); // slug
    const onlyInStock = (url.searchParams.get('onlyInStock') ?? '0') === '1';

    try {
        const variants = await prisma.product_variant.findMany({
            where: {
                is_active: true,
                ...(onlyInStock ? { stock: { gt: 0 } } : {}),
                product: {
                    is_active: true,
                    ...(collection ? {
                        product_collection: { some: { collection: { slug: collection, is_active: true } } }
                    } : {}),
                },
            },
            include: { product: { select: { base_price: true } } },
        });
        const prices = variants.map((variant) => Number(variant.price || variant.product.base_price || 0));
        const min = prices.length ? Math.min(...prices) : 0;
        const max = prices.length ? Math.max(...prices) : 0;

        return NextResponse.json({
            minPrice: Number.isFinite(min) ? min : 0,
            maxPrice: Number.isFinite(max) ? max : 0,
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to load price range' },
            { status: 500 }
        );
    }
}
