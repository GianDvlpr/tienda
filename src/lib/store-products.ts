import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { ProductListResponse } from '@/types/product';

const SortEnum = z.enum(['NEW', 'PRICE_ASC', 'PRICE_DESC', 'NAME_ASC', 'NAME_DESC']);

export const querySchema = z.object({
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

function safeCsvArray(param?: string): string[] {
    if (!param) return [];
    const arr = param.split(',').map((value) => value.trim()).filter(Boolean);
    return arr.length ? arr : [];
}

export async function listStoreProducts(qp: z.infer<typeof querySchema>): Promise<ProductListResponse> {
    const sizesCsv = safeCsvArray(qp.sizes);
    const colorsCsv = safeCsvArray(qp.colors);

    const sort = qp.sort ?? 'NEW';

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
            colors: [...new Set(product.product_variant.map(variant => variant.color).filter(Boolean))],
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

    return {
        items: items.map(({ createdAt, ...item }) => item),
        total,
        page: qp.page,
        pageSize: qp.pageSize,
    };
}
