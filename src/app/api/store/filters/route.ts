import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    const collection = url.searchParams.get('collection'); // slug
    const onlyInStock = (url.searchParams.get('onlyInStock') ?? '0') === '1';

    try {
        const sizesRows = await prisma.$queryRaw<{ size: string }[]>`
      SELECT DISTINCT v.size
      FROM dbo.product_variant v
      JOIN dbo.product p ON p.product_id = v.product_id
      WHERE
        p.is_active = 1
        AND v.is_active = 1
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
        AND (${onlyInStock ? 1 : 0} = 0 OR v.stock > 0)
        AND v.size IS NOT NULL AND LTRIM(RTRIM(v.size)) <> ''
      ORDER BY v.size ASC;
    `;

        const colorsRows = await prisma.$queryRaw<{ color: string }[]>`
      SELECT DISTINCT v.color
      FROM dbo.product_variant v
      JOIN dbo.product p ON p.product_id = v.product_id
      WHERE
        p.is_active = 1
        AND v.is_active = 1
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
        AND (${onlyInStock ? 1 : 0} = 0 OR v.stock > 0)
        AND v.color IS NOT NULL AND LTRIM(RTRIM(v.color)) <> ''
      ORDER BY v.color ASC;
    `;

        return NextResponse.json({
            sizes: sizesRows.map((r) => String(r.size)),
            colors: colorsRows.map((r) => String(r.color)),
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to load filters' },
            { status: 500 }
        );
    }
}