import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const raw = resolvedParams.slug;
    const slug = decodeURIComponent(String(raw)).trim().toLowerCase();

    try {
        const productRows = await prisma.$queryRaw<any[]>`
            SELECT TOP 1 p.product_id
            FROM dbo.product p
            WHERE LOWER(LTRIM(RTRIM(p.slug))) = CONVERT(NVARCHAR(180), ${slug})
              AND p.is_active = 1;
        `;

        const p = productRows?.[0];
        if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Fetch up to 4 related products from the same collection(s) as this product
        const items = await prisma.$queryRaw<any[]>`
            SELECT TOP 4
                rp.product_id,
                rp.slug,
                rp.name,
                rp.base_price,
                img.url as primary_image_url,
                (
                    SELECT ISNULL(MIN(v.price), rp.base_price)
                    FROM product_variant v
                    WHERE v.product_id = rp.product_id AND v.is_active = 1
                ) as min_price,
                (
                    SELECT ISNULL(MAX(v.price), rp.base_price)
                    FROM product_variant v
                    WHERE v.product_id = rp.product_id AND v.is_active = 1
                ) as max_price,
                (
                    SELECT COUNT(*)
                    FROM product_variant v
                    WHERE v.product_id = rp.product_id AND v.is_active = 1 AND v.stock > 0
                ) as variants_in_stock
            FROM product rp
            LEFT JOIN (
                SELECT product_id, url, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY sort_order ASC, created_at DESC) as rn
                FROM product_image
            ) img ON img.product_id = rp.product_id AND img.rn = 1
            WHERE rp.product_id IN (
                SELECT product_id
                FROM product_collection
                WHERE collection_id IN (
                    SELECT collection_id
                    FROM product_collection
                    WHERE product_id = ${p.product_id}
                )
            )
            AND rp.product_id != ${p.product_id}
            AND rp.is_active = 1
            ORDER BY NEWID(); -- Random order
        `;

        return NextResponse.json({
            items: items.map((r: any) => ({
                productId: r.product_id,
                slug: r.slug,
                name: r.name,
                minPrice: Number(r.min_price ?? r.base_price ?? 0),
                maxPrice: Number(r.max_price ?? r.base_price ?? 0),
                variantsInStock: Number(r.variants_in_stock ?? 0),
                primaryImageUrl: r.primary_image_url ?? null,
            })),
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
