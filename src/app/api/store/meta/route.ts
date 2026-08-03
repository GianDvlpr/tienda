import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    const collectionRaw = url.searchParams.get('collection'); // slug
    const collection =
        collectionRaw && collectionRaw.trim() !== '' ? collectionRaw.trim() : null;

    const onlyInStock = (url.searchParams.get('onlyInStock') ?? '0') === '1';
    const customizable = (url.searchParams.get('customizable') ?? '0') === '1';

    try {
        const collectionsRows = await prisma.collection.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' },
            select: { collection_id: true, slug: true, name: true, description: true },
        });

        const variants = await prisma.product_variant.findMany({
            where: {
                is_active: true,
                ...(onlyInStock ? { stock: { gt: 0 } } : {}),
                product: {
                    is_active: true,
                    ...(customizable ? { is_customizable: true } : {}),
                    ...(collection ? {
                        product_collection: { some: { collection: { slug: collection, is_active: true } } }
                    } : {}),
                },
            },
            include: { product: { select: { base_price: true } } },
        });

        const sizes = Array.from(new Set(variants.map((variant) => String(variant.size || '').trim()).filter(Boolean))).sort();
        const colors = Array.from(new Set(variants.map((variant) => String(variant.color || '').trim()).filter(Boolean))).sort();
        const prices = variants.map((variant) => Number(variant.price || variant.product.base_price || 0));
        const min = prices.length ? Math.min(...prices) : 0;
        const max = prices.length ? Math.max(...prices) : 0;

        return NextResponse.json({
            collections: collectionsRows.map((r) => ({
                collectionId: r.collection_id,
                slug: r.slug,
                name: r.name,
                description: r.description ?? null,
            })),
            filters: {
                sizes,
                colors,
            },
            priceRange: {
                minPrice: Number.isFinite(min) ? min : 0,
                maxPrice: Number.isFinite(max) ? max : 0,
            },
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to load meta' },
            { status: 500 }
        );
    }
}
