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

type ProductRow = {
    product_id: string;
    slug: string;
    name: string;
    min_price: number | string | null;
    max_price: number | string | null;
    variants_in_stock: number | string | null;
    primary_image_url: string | null;
    secondary_image_url: string | null;
};

type CountRow = {
    total: number | string | null;
};

function safeCsvArray(param?: string): string | null {
    if (!param) return null;
    const arr = param.split(',').map((value) => value.trim()).filter(Boolean);
    return arr.length ? arr.join(',') : null;
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

    const onlyInStockBit = qp.onlyInStock ? 1 : 0;
    const sort = qp.sort ?? 'NEW';

    try {
        const offset = (qp.page - 1) * qp.pageSize;
        const collection = qp.collection ?? null;
        const q = qp.q ?? null;
        const minPrice = qp.minPrice ?? null;
        const maxPrice = qp.maxPrice ?? null;

        const items = await prisma.$queryRaw<ProductRow[]>`
            WITH filtered_products AS (
                SELECT p.product_id, p.slug, p.name, p.base_price, p.created_at
                FROM dbo.product p
                WHERE p.is_active = 1
                  AND (
                    ${collection} IS NULL
                    OR EXISTS (
                        SELECT 1
                        FROM dbo.product_collection pc
                        JOIN dbo.collection c ON c.collection_id = pc.collection_id
                        WHERE pc.product_id = p.product_id
                          AND c.slug = ${collection}
                          AND c.is_active = 1
                    )
                  )
                  AND (
                    ${q} IS NULL
                    OR p.name LIKE '%' + ${q} + '%'
                    OR p.description LIKE '%' + ${q} + '%'
                  )
                  AND EXISTS (
                    SELECT 1
                    FROM dbo.product_variant v
                    WHERE v.product_id = p.product_id
                      AND v.is_active = 1
                      AND (${minPrice} IS NULL OR COALESCE(v.price, p.base_price, 0) >= ${minPrice})
                      AND (${maxPrice} IS NULL OR COALESCE(v.price, p.base_price, 0) <= ${maxPrice})
                      AND (${sizesCsv} IS NULL OR v.size IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(COALESCE(${sizesCsv}, ''), ',')))
                      AND (${colorsCsv} IS NULL OR v.color IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(COALESCE(${colorsCsv}, ''), ',')))
                      AND (${onlyInStockBit} = 0 OR v.stock > 0)
                  )
            )
            SELECT
                fp.product_id,
                fp.slug,
                fp.name,
                price_stats.min_price,
                price_stats.max_price,
                price_stats.variants_in_stock,
                images.primary_image_url,
                images.secondary_image_url
            FROM filtered_products fp
            OUTER APPLY (
                SELECT
                    MIN(COALESCE(v.price, fp.base_price, 0)) AS min_price,
                    MAX(COALESCE(v.price, fp.base_price, 0)) AS max_price,
                    SUM(CASE WHEN v.stock > 0 THEN 1 ELSE 0 END) AS variants_in_stock
                FROM dbo.product_variant v
                WHERE v.product_id = fp.product_id
                  AND v.is_active = 1
            ) price_stats
            OUTER APPLY (
                SELECT
                    MAX(CASE WHEN ranked.rn = 1 THEN ranked.url END) AS primary_image_url,
                    MAX(CASE WHEN ranked.rn = 2 THEN ranked.url END) AS secondary_image_url
                FROM (
                    SELECT url, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at DESC) AS rn
                    FROM dbo.product_image
                    WHERE product_id = fp.product_id
                ) ranked
                WHERE ranked.rn <= 2
            ) images
            ORDER BY
                CASE WHEN ${sort} = 'PRICE_ASC' THEN price_stats.min_price END ASC,
                CASE WHEN ${sort} = 'PRICE_DESC' THEN price_stats.min_price END DESC,
                CASE WHEN ${sort} = 'NAME_ASC' THEN fp.name END ASC,
                CASE WHEN ${sort} = 'NAME_DESC' THEN fp.name END DESC,
                CASE WHEN ${sort} = 'NEW' THEN fp.created_at END DESC,
                fp.created_at DESC
            OFFSET ${offset} ROWS FETCH NEXT ${qp.pageSize} ROWS ONLY;
        `;

        const totalRows = await prisma.$queryRaw<CountRow[]>`
            SELECT COUNT(*) AS total
            FROM dbo.product p
            WHERE p.is_active = 1
              AND (
                ${collection} IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM dbo.product_collection pc
                    JOIN dbo.collection c ON c.collection_id = pc.collection_id
                    WHERE pc.product_id = p.product_id
                      AND c.slug = ${collection}
                      AND c.is_active = 1
                )
              )
              AND (
                ${q} IS NULL
                OR p.name LIKE '%' + ${q} + '%'
                OR p.description LIKE '%' + ${q} + '%'
              )
              AND EXISTS (
                SELECT 1
                FROM dbo.product_variant v
                WHERE v.product_id = p.product_id
                  AND v.is_active = 1
                  AND (${minPrice} IS NULL OR COALESCE(v.price, p.base_price, 0) >= ${minPrice})
                  AND (${maxPrice} IS NULL OR COALESCE(v.price, p.base_price, 0) <= ${maxPrice})
                  AND (${sizesCsv} IS NULL OR v.size IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(COALESCE(${sizesCsv}, ''), ',')))
                  AND (${colorsCsv} IS NULL OR v.color IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(COALESCE(${colorsCsv}, ''), ',')))
                  AND (${onlyInStockBit} = 0 OR v.stock > 0)
              );
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
                secondaryImageUrl: r.secondary_image_url ?? null,
            })),
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
