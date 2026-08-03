import { prisma } from "@/lib/prisma";
import { ProductDetailResponse } from "@/types/product";

export async function getProductBySlug(slug: string): Promise<ProductDetailResponse | null> {
    const normalizedSlug = decodeURIComponent(String(slug)).trim().toLowerCase();

    try {
        const p = await prisma.product.findFirst({
            where: {
                slug: { equals: normalizedSlug, mode: 'insensitive' },
                is_active: true,
            },
            include: {
                product_collection: {
                    take: 1,
                    include: { collection: true },
                },
                product_image: {
                    orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
                },
                product_variant: {
                    where: { is_active: true },
                    orderBy: [{ size: 'asc' }, { color: 'asc' }],
                },
            },
        });
        if (!p) return null;

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
        const collection = p.product_collection[0]?.collection ?? null;

        return {
            product: {
                productId: p.product_id,
                slug: p.slug,
                name: p.name,
                description: p.description ?? null,
                size_guide_url: p.size_guide_url ?? null,
                size_guide_json: p.size_guide_json ?? null,
                isCustomizable: Boolean(p.is_customizable),
                customizationType: p.customization_type === 'PANTS' || p.customization_type === 'UPPER' ? p.customization_type : null,
                customizationSurcharge: Number(p.customization_surcharge ?? 5),
                customFabricSupplyId: p.custom_fabric_supply_id ?? null,
                basePrice: Number(p.base_price ?? 0),
                collection: collection ? {
                    name: collection.name,
                    slug: collection.slug
                } : null
            },
            images: (p.product_image ?? []).map((r: any) => ({
                imageId: r.image_id,
                url: r.url,
                publicId: r.public_id,
                color: r.color ?? null,
                sortOrder: Number(r.sort_order ?? 0),
            })),
            variants: (p.product_variant ?? []).map((r: any) => ({
                variantId: r.variant_id,
                sku: r.sku,
                size: r.size,
                color: r.color,
                price: Number(r.price || p.base_price || 0),
                stock: Number(r.stock ?? 0),
            })),
            bundles: bundleRows.map((b: any) => ({
                bundle_id: b.bundle_id,
                name: b.name,
                description: b.description,
                discount_amount: Number(b.discount_amount),
                bundle_price: b.bundle_price === null ? null : Number(b.bundle_price),
                tier_2_price: b.tier_2_price === null ? null : Number(b.tier_2_price),
                tier_3_price: b.tier_3_price === null ? null : Number(b.tier_3_price),
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
                        customizationType: item.product.customization_type === 'PANTS' || item.product.customization_type === 'UPPER' ? item.product.customization_type : null,
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
        const rows = await prisma.product.findMany({
            where: { is_active: true },
            select: { slug: true },
        });
        return rows.map(r => r.slug);
    } catch (e) {
        console.error('Error fetching active product slugs:', e);
        return [];
    }
}
