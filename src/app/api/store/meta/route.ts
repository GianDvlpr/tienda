import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type CollectionRow = {
    collection_id: string; 
    slug: string;
    name: string;
    description: string | null;
};

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    const collectionRaw = url.searchParams.get('collection'); // slug
    const collection =
        collectionRaw && collectionRaw.trim() !== '' ? collectionRaw.trim() : null;

    const onlyInStock = (url.searchParams.get('onlyInStock') ?? '0') === '1';
    const onlyInStockInt = onlyInStock ? 1 : 0;

    try {
        // 1) collections (globales)
        const collectionsRows = await prisma.$queryRaw<CollectionRow[]>`
      SELECT collection_id, slug, name, description
      FROM dbo.collection
      WHERE is_active = 1
      ORDER BY name ASC;
    `;

        // 2) sizes (según colección/stock)
        const sizesRows = await prisma.$queryRaw<{ size: string }[]>`
      SELECT DISTINCT v.size
      FROM dbo.product_variant v
      JOIN dbo.product p ON p.product_id = v.product_id
      WHERE
        p.is_active = 1
        AND v.is_active = 1
        AND (${onlyInStockInt} = 0 OR v.stock > 0)
        AND (
          ${collection} IS NULL
          OR EXISTS (
            SELECT 1
            FROM dbo.collection c
            JOIN dbo.product_collection pc ON pc.collection_id = c.collection_id
            WHERE pc.product_id = p.product_id
              AND c.slug = ${collection}
              AND c.is_active = 1
          )
        )
        AND v.size IS NOT NULL AND LTRIM(RTRIM(v.size)) <> ''
      ORDER BY v.size ASC;
    `;

        // 3) colors (según colección/stock)
        const colorsRows = await prisma.$queryRaw<{ color: string }[]>`
      SELECT DISTINCT v.color
      FROM dbo.product_variant v
      JOIN dbo.product p ON p.product_id = v.product_id
      WHERE
        p.is_active = 1
        AND v.is_active = 1
        AND (${onlyInStockInt} = 0 OR v.stock > 0)
        AND (
          ${collection} IS NULL
          OR EXISTS (
            SELECT 1
            FROM dbo.collection c
            JOIN dbo.product_collection pc ON pc.collection_id = c.collection_id
            WHERE pc.product_id = p.product_id
              AND c.slug = ${collection}
              AND c.is_active = 1
          )
        )
        AND v.color IS NOT NULL AND LTRIM(RTRIM(v.color)) <> ''
      ORDER BY v.color ASC;
    `;

        // 4) price range (según colección/stock)
        const priceRows = await prisma.$queryRaw<{ minPrice: any; maxPrice: any }[]>`
      SELECT
        MIN(COALESCE(v.price, p.base_price, 0)) AS minPrice,
        MAX(COALESCE(v.price, p.base_price, 0)) AS maxPrice
      FROM dbo.product_variant v
      JOIN dbo.product p ON p.product_id = v.product_id
      WHERE
        p.is_active = 1
        AND v.is_active = 1
        AND (${onlyInStockInt} = 0 OR v.stock > 0)
        AND (
          ${collection} IS NULL
          OR EXISTS (
            SELECT 1
            FROM dbo.collection c
            JOIN dbo.product_collection pc ON pc.collection_id = c.collection_id
            WHERE pc.product_id = p.product_id
              AND c.slug = ${collection}
              AND c.is_active = 1
          )
        );
    `;

        const pr = priceRows?.[0] ?? {};
        const min = Number(pr.minPrice ?? 0);
        const max = Number(pr.maxPrice ?? 0);

        return NextResponse.json({
            collections: collectionsRows.map((r) => ({
                collectionId: r.collection_id,
                slug: r.slug,
                name: r.name,
                description: r.description ?? null,
            })),
            filters: {
                sizes: sizesRows.map((r) => String(r.size)),
                colors: colorsRows.map((r) => String(r.color)),
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