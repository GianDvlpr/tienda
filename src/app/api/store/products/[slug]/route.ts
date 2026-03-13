import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const raw = resolvedParams.slug;
    const slug = decodeURIComponent(String(raw)).trim().toLowerCase();

    try {
        const db = await prisma.$queryRaw<any[]>`SELECT DB_NAME() AS db;`;
        console.log('[detail] db:', db?.[0]?.db, 'slug:', slug);
        const productRows = await prisma.$queryRaw<any[]>`
  SELECT TOP 1
    p.product_id,
    p.slug,
    p.name,
    p.description,
    COALESCE(p.base_price, 0) AS base_price,
    c.name AS collection_name,
    c.slug AS collection_slug
  FROM dbo.product p
  OUTER APPLY (
    SELECT TOP 1 col.name, col.slug
    FROM dbo.product_collection pc
    JOIN dbo.collection col ON col.collection_id = pc.collection_id
    WHERE pc.product_id = p.product_id
  ) c
  WHERE LOWER(LTRIM(RTRIM(p.slug))) = CONVERT(NVARCHAR(180), ${slug})
    AND p.is_active = 1;
`;

        const p = productRows?.[0];
        if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // 2) Images
        const images = await prisma.$queryRaw<any[]>`
      SELECT image_id, url, public_id, sort_order
      FROM dbo.product_image
      WHERE product_id = ${p.product_id}
      ORDER BY sort_order ASC, created_at DESC;
    `;

        // 3) Variants
        const variants = await prisma.$queryRaw<any[]>`
      SELECT
        v.variant_id,
        v.sku,
        v.size,
        v.color,
        COALESCE(v.price, p.base_price, 0) AS price,
        v.stock
      FROM dbo.product_variant v
      JOIN dbo.product p ON p.product_id = v.product_id
      WHERE v.product_id = ${p.product_id} AND v.is_active = 1
      ORDER BY v.size ASC, v.color ASC;
    `;

        return NextResponse.json({
            product: {
                productId: p.product_id,
                slug: p.slug,
                name: p.name,
                description: p.description ?? null,
                basePrice: Number(p.base_price ?? 0),
                collection: p.collection_name ? {
                    name: p.collection_name,
                    slug: p.collection_slug
                } : null
            },
            images: (images ?? []).map((r: any) => ({
                imageId: r.image_id,
                url: r.url,
                publicId: r.public_id,
                sortOrder: Number(r.sort_order ?? 0),
            })),
            variants: (variants ?? []).map((r: any) => ({
                variantId: r.variant_id,
                sku: r.sku,
                size: r.size,
                color: r.color,
                price: Number(r.price ?? 0),
                stock: Number(r.stock ?? 0),
            })),
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to load product' },
            { status: 500 }
        );
    }
}