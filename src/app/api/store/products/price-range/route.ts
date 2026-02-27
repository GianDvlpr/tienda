import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    const collection = url.searchParams.get('collection'); // slug
    const onlyInStock = (url.searchParams.get('onlyInStock') ?? '0') === '1';

    try {
        const rows = await prisma.$queryRaw<{ minPrice: any; maxPrice: any }[]>`
      SELECT
        MIN(COALESCE(v.price, p.base_price, 0)) AS minPrice,
        MAX(COALESCE(v.price, p.base_price, 0)) AS maxPrice
      FROM dbo.product_variant v
      JOIN dbo.product p ON p.product_id = v.product_id
      WHERE
        p.is_active = 1
        AND v.is_active = 1
        AND (${onlyInStock ? 1 : 0} = 0 OR v.stock > 0)
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

        const r = rows?.[0] ?? {};
        const min = Number(r.minPrice ?? 0);
        const max = Number(r.maxPrice ?? 0);

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