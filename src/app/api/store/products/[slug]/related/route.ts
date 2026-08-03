import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const raw = resolvedParams.slug;
    const slug = decodeURIComponent(String(raw)).trim().toLowerCase();

    try {
        const p = await prisma.product.findFirst({
            where: { slug: { equals: slug, mode: 'insensitive' }, is_active: true },
            include: { product_collection: { select: { collection_id: true } } },
        });
        if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const collectionIds = p.product_collection.map((pc) => pc.collection_id);
        const products = await prisma.product.findMany({
            where: {
                product_id: { not: p.product_id },
                is_active: true,
                product_collection: { some: { collection_id: { in: collectionIds } } },
            },
            include: {
                product_image: { orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }], take: 1 },
                product_variant: { where: { is_active: true } },
            },
            take: 20,
        });
        const items = products.sort(() => Math.random() - 0.5).slice(0, 4);

        return NextResponse.json({
            items: items.map((product) => {
                const prices = product.product_variant.map((variant) => Number(variant.price || product.base_price || 0));
                return {
                    productId: product.product_id,
                    slug: product.slug,
                    name: product.name,
                    minPrice: prices.length ? Math.min(...prices) : Number(product.base_price ?? 0),
                    maxPrice: prices.length ? Math.max(...prices) : Number(product.base_price ?? 0),
                    variantsInStock: product.product_variant.filter((variant) => variant.stock > 0).length,
                    primaryImageUrl: product.product_image[0]?.url ?? null,
                };
            }),
            total: items.length,
            page: 1,
            pageSize: 4,
        });

    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to load related products' },
            { status: 500 }
        );
    }
}
