import { prisma } from "@/lib/prisma";
import { ProductDetailResponse } from "@/types/product";

export async function getProductBySlug(slug: string): Promise<ProductDetailResponse | null> {
    const normalizedSlug = decodeURIComponent(String(slug)).trim().toLowerCase();

    try {
        const productRows = await prisma.$queryRaw<any[]>`
            SELECT TOP 1
                p.product_id,
                p.slug,
                p.name,
                p.description,
                p.size_guide_url,
                p.size_guide_json,
                p.is_customizable,
                p.customization_type,
                p.customization_surcharge,
                p.custom_fabric_supply_id,
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
            WHERE LOWER(LTRIM(RTRIM(p.slug))) = CONVERT(NVARCHAR(180), ${normalizedSlug})
                AND p.is_active = 1;
        `;

        const p = productRows?.[0];
        if (!p) return null;

        // 2) Images
        const images = await prisma.$queryRaw<any[]>`
            SELECT image_id, url, public_id, color, sort_order
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
                COALESCE(NULLIF(v.price, 0), p.base_price, 0) AS price,
                v.stock
            FROM dbo.product_variant v
            JOIN dbo.product p ON p.product_id = v.product_id
            WHERE v.product_id = ${p.product_id} AND v.is_active = 1
            ORDER BY v.size ASC, v.color ASC;
        `;

        const bundleRows = await (prisma as any).bundle_promotion.findMany({
            where: {
                is_active: true,
                items: {
                    some: { product_id: p.product_id }
                }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                product_id: true,
                                name: true,
                                slug: true,
                                is_active: true,
                                is_customizable: true,
                                customization_type: true,
                                customization_surcharge: true,
                                size_guide_json: true,
                                base_price: true,
                                product_image: {
                                    orderBy: { sort_order: 'asc' },
                                    take: 1
                                },
                                product_variant: {
                                    where: { is_active: true },
                                    take: 1
                                }
                            }
                        }

                    }
                }
            }
        });
        const bundleTierRows = await prisma.$queryRaw<any[]>`
            SELECT bundle_id, bundle_price, tier_2_price, tier_3_price
            FROM dbo.bundle_promotion
            WHERE is_active = 1;
        `;
        const tiersByBundleId = new Map(bundleTierRows.map((row) => [
            String(row.bundle_id),
            {
                bundle_price: row.bundle_price === null ? null : Number(row.bundle_price),
                tier_2_price: row.tier_2_price === null ? null : Number(row.tier_2_price),
                tier_3_price: row.tier_3_price === null ? null : Number(row.tier_3_price),
            }
        ]));

        return {
            product: {
                productId: p.product_id,
                slug: p.slug,
                name: p.name,
                description: p.description ?? null,
                size_guide_url: p.size_guide_url ?? null,
                size_guide_json: p.size_guide_json ?? null,
                isCustomizable: Boolean(p.is_customizable),
                customizationType: p.customization_type ?? null,
                customizationSurcharge: Number(p.customization_surcharge ?? 5),
                customFabricSupplyId: p.custom_fabric_supply_id ?? null,
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
                color: r.color ?? null,
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
            bundles: bundleRows.map((b: any) => ({
                bundle_id: b.bundle_id,
                name: b.name,
                description: b.description,
                discount_amount: Number(b.discount_amount),
                bundle_price: tiersByBundleId.get(String(b.bundle_id))?.bundle_price ?? null,
                tier_2_price: tiersByBundleId.get(String(b.bundle_id))?.tier_2_price ?? null,
                tier_3_price: tiersByBundleId.get(String(b.bundle_id))?.tier_3_price ?? null,
                items: b.items.filter((i:any) => i.product.is_active).map((item: any) => {
                    const firstVariant = item.product.product_variant?.[0];
                    return {
                        productId: item.product.product_id,
                        name: item.product.name,
                        slug: item.product.slug,
                        primaryImageUrl: item.product.product_image[0]?.url ?? null,
                        // Añadiendo datos necesarios para el carrito
                        variantId: firstVariant?.variant_id,
                        unitPrice: Number(firstVariant?.price || item.product.base_price || 0),
                        size: firstVariant?.size || 'UN',
                        color: firstVariant?.color || 'UN',
                        sku: firstVariant?.sku || '',
                        isCustomizable: Boolean(item.product.is_customizable),
                        customizationType: item.product.customization_type ?? null,
                        customizationSurcharge: Number(item.product.customization_surcharge ?? 5),
                        sizeGuideJson: item.product.size_guide_json ?? null,
                    };
                })
            }))


        };

    } catch (e) {
        console.error('Error fetching product by slug:', e);
        return null;
    }
}

export async function getActiveProductSlugs(): Promise<string[]> {
    try {
        const rows = await prisma.$queryRaw<any[]>`
            SELECT slug FROM dbo.product WHERE is_active = 1;
        `;
        return rows.map(r => r.slug);
    } catch (e) {
        console.error('Error fetching active product slugs:', e);
        return [];
    }
}
