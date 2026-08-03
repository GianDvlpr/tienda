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
            select: { size: true, color: true },
        });

        const sizes = Array.from(new Set(variants.map((variant) => String(variant.size || '').trim()).filter(Boolean))).sort();
        const colors = Array.from(new Set(variants.map((variant) => String(variant.color || '').trim()).filter(Boolean))).sort();

        return NextResponse.json({
            sizes,
            colors,
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to load filters' },
            { status: 500 }
        );
    }
}
