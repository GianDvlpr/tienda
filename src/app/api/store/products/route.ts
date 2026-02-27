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

    onlyInStock: z.coerce.number().optional(), // 0/1
    sort: SortEnum.optional(),

    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

function safeJsonArray(param?: string): string | null {
    if (!param) return null;
    try {
        const v = JSON.parse(param);
        if (!Array.isArray(v)) return null;
        const arr = v.map(String).filter(Boolean);
        return arr.length ? JSON.stringify(arr) : null;
    } catch {
        return null;
    }
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

    const sizesJson = safeJsonArray(qp.sizes);
    const colorsJson = safeJsonArray(qp.colors);

    const onlyInStockBit = qp.onlyInStock ? 1 : 0;
    const sort = qp.sort ?? 'NEW';

    try {
        // Items (SP)
        const items = await prisma.$queryRaw<any[]>`
      EXEC dbo.USP_SHOP_LIST_PRODUCTS
        @collection_slug = ${qp.collection ?? null},
        @q = ${qp.q ?? null},
        @min_price = ${qp.minPrice ?? null},
        @max_price = ${qp.maxPrice ?? null},
        @sizes_json = ${sizesJson},
        @colors_json = ${colorsJson},
        @only_in_stock = ${onlyInStockBit},
        @sort = ${sort},
        @page = ${qp.page},
        @page_size = ${qp.pageSize};
    `;

        // Total (SP)
        const totalRows = await prisma.$queryRaw<any[]>`
      EXEC dbo.USP_SHOP_COUNT_PRODUCTS
        @collection_slug = ${qp.collection ?? null},
        @q = ${qp.q ?? null},
        @min_price = ${qp.minPrice ?? null},
        @max_price = ${qp.maxPrice ?? null},
        @sizes_json = ${sizesJson},
        @colors_json = ${colorsJson},
        @only_in_stock = ${onlyInStockBit};
    `;

        const total = Number(totalRows?.[0]?.total ?? 0);

        return NextResponse.json({
            items: items.map((r) => ({
                productId: r.product_id,
                slug: r.slug,
                name: r.name,
                minPrice: Number(r.min_price ?? 0),
                maxPrice: Number(r.max_price ?? 0),
                variantsInStock: Number(r.variants_in_stock ?? 0),
                primaryImageUrl: r.primary_image_url ?? null,
            })),
            total,
            page: qp.page,
            pageSize: qp.pageSize,
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to list products' },
            { status: 500 }
        );
    }
}