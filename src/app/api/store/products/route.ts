import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const SortEnum = z.enum(['NEW', 'PRICE_ASC', 'PRICE_DESC', 'NAME_ASC', 'NAME_DESC']);

const querySchema = z.object({
    collection: z.string().min(1).optional(),
    q: z.string().min(1).optional(),

    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),

    sizes: z.string().optional(),
    colors: z.string().optional(),
    customizable: z.coerce.number().optional(), // 0/1

    onlyInStock: z.coerce.number().optional(), // 0/1
    sort: SortEnum.optional(),

    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

type ProductRow = {
    product_id: string;
    slug: string;
    name: string;
    min_price: number | string | null;
    max_price: number | string | null;
    variants_in_stock: number | string | null;
    primary_image_url: string | null;
    secondary_image_url: string | null;
    is_customizable: boolean | number | null;
    customization_surcharge: number | string | null;
};

type CountRow = {
    total: number | string | null;
};

function safeCsvArray(param?: string): string[] {
    if (!param) return [];
    const arr = param.split(',').map((value) => value.trim()).filter(Boolean);
    return arr.length ? arr : [];
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid query params', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const qp = parsed.data;

    const sizesCsv = safeCsvArray(qp.sizes);
    const colorsCsv = safeCsvArray(qp.colors);

    const sort = qp.sort ?? 'NEW';

    try {
        const collection = qp.collection ?? null;
        const q = qp.q ?? null;
        const minPrice = qp.minPrice ?? null;
        const maxPrice = qp.maxPrice ?? null;

        const products = await prisma.product.findMany({
            where: {
                is_active: true,
                ...(qp.customizable ? { is_customizable: true } : {}),
                ...(collection ? {
                    product_collection: {
                        some: {
                            collection: { slug: collection, is_active: true }
                        }
                    }
                } : {}),
                ...(q ? {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { description: { contains: q, mode: 'insensitive' } },
                    ]
                } : {}),
                product_variant: {
                    some: {
                        is_active: true,
                        ...(sizesCsv.length ? { size: { in: sizesCsv } } : {}),
                        ...(colorsCsv.length ? { color: { in: colorsCsv } } : {}),
                        ...(qp.onlyInStock ? { stock: { gt: 0 } } : {}),
                    }
                }
            },
            include: {
                product_variant: { where: { is_active: true } },
                product_image: { orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }], take: 2 },
            },
        });

        const mappedItems = products.map((product) => {
            const variantPrices = product.product_variant.map((variant) => Number(variant.price || product.base_price || 0));
            const minProductPrice = variantPrices.length ? Math.min(...variantPrices) : Number(product.base_price || 0);
            const maxProductPrice = variantPrices.length ? Math.max(...variantPrices) : Number(product.base_price || 0);

            return {
                productId: product.product_id,
                slug: product.slug,
                name: product.name,
                minPrice: minProductPrice,
                maxPrice: maxProductPrice,
                variantsInStock: product.product_variant.filter((variant) => variant.stock > 0).length,
                primaryImageUrl: product.product_image[0]?.url ?? null,
                secondaryImageUrl: product.product_image[1]?.url ?? null,
                isCustomizable: Boolean(product.is_customizable),
                customizationSurcharge: Number(product.customization_surcharge ?? 5),
                createdAt: product.created_at,
            };
        }).filter((product) => (
            (minPrice === null || product.maxPrice >= minPrice)
            && (maxPrice === null || product.minPrice <= maxPrice)
        ));

        mappedItems.sort((a, b) => {
            if (sort === 'PRICE_ASC') return a.minPrice - b.minPrice;
            if (sort === 'PRICE_DESC') return b.minPrice - a.minPrice;
            if (sort === 'NAME_ASC') return a.name.localeCompare(b.name);
            if (sort === 'NAME_DESC') return b.name.localeCompare(a.name);
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const total = mappedItems.length;
        const items = mappedItems.slice((qp.page - 1) * qp.pageSize, qp.page * qp.pageSize);

        return NextResponse.json({
            items: items.map(({ createdAt, ...item }) => item),
            total,
            page: qp.page,
            pageSize: qp.pageSize,
        });
    } catch (e: unknown) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Failed to list products' },
            { status: 500 }
        );
    }
}
