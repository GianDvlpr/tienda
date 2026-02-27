import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: { slug: string } }) {
    const slug = ctx.params.slug;

    try {
        // 1) Product
        const productRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 1
        product_id,
        slug,
        name,
        description,
        COALESCE(base_price, 0) AS base_price
      FROM dbo.product
      WHERE slug = ${slug} AND is_active = 1;
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
            },
            images: (images ?? []).map((r) => ({
                imageId: r.image_id,
                url: r.url,
                publicId: r.public_id,
                sortOrder: Number(r.sort_order ?? 0),
            })),
            variants: (variants ?? []).map((r) => ({
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