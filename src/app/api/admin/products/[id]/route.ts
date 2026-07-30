import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { getTemporaryVariantSku, prepareVariantsWithUniqueSkus } from '@/lib/product-variant-sku';

function sameNumber(a: unknown, b: unknown) {
    const left = a === null || a === undefined || a === '' ? null : Number(a);
    const right = b === null || b === undefined || b === '' ? null : Number(b);
    return left === right;
}

function sameText(a: unknown, b: unknown) {
    return String(a || '').trim() === String(b || '').trim();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const product = await prisma.product.findUnique({
            where: { product_id: id },
            include: {
                product_variant: true,
                product_collection: true
            }
        });
        if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

        const productExtraRows = await prisma.$queryRaw<{ custom_fabric_supply_id: string | null }[]>`
            SELECT custom_fabric_supply_id FROM dbo.product WHERE product_id = ${id};
        `;

        const images = await prisma.$queryRaw<any[]>`
            SELECT image_id, product_id, url, public_id, color, sort_order, created_at
            FROM dbo.product_image
            WHERE product_id = ${id}
            ORDER BY sort_order ASC, created_at DESC;
        `;

        return NextResponse.json({ ...product, custom_fabric_supply_id: productExtraRows[0]?.custom_fabric_supply_id ?? null, product_image: images });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await req.json();
        const { 
            name, slug, description, base_price, base_cost, is_active, size_guide_url, size_guide_json,
            is_customizable, customization_type, customization_surcharge,
            custom_fabric_supply_id,
            collections, images, variants
        } = body;

        // Validar slug
        const existing = await prisma.product.findFirst({ where: { slug, NOT: { product_id: id } }});
        if (existing) return NextResponse.json({ error: 'El URL (slug) ya está en uso' }, { status: 400 });

        // Auditoría: Capturar estado anterior
        const oldData = await prisma.product.findUnique({
            where: { product_id: id },
            include: { product_variant: true, product_collection: true }
        });

        if (!oldData) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

        const oldImages = Array.isArray(images) ? await prisma.product_image.findMany({
            where: { product_id: id },
            select: { image_id: true, public_id: true, url: true, color: true, sort_order: true }
        }) : [];

        const incomingIds = Array.isArray(variants) ? variants.map((v:any) => v.variant_id).filter(Boolean) : [];
        const preparedVariants = Array.isArray(variants) && variants.length > 0
            ? await prepareVariantsWithUniqueSkus(prisma as any, variants, name, incomingIds)
            : [];
        const oldVariantsById = new Map(oldData.product_variant.map((variant: any) => [variant.variant_id, variant]));
        const oldSkusByVariantId = new Map(oldData.product_variant.map((variant: any) => [variant.variant_id, String(variant.sku || '').trim().toUpperCase()]));
        const incomingIdSet = new Set(incomingIds);
        const variantIdsToDeactivate = oldData.product_variant
            .filter((variant: any) => !incomingIdSet.has(variant.variant_id) && variant.is_active)
            .map((variant: any) => variant.variant_id);

        const temporarySkuVariants = preparedVariants.filter((variant: any) => {
            if (!variant.variant_id) return false;
            const currentSku = oldSkusByVariantId.get(variant.variant_id);
            const nextSku = String(variant.sku || '').trim().toUpperCase();
            if (!currentSku || currentSku === nextSku) return false;

            return preparedVariants.some((other: any) => (
                other.variant_id
                && other.variant_id !== variant.variant_id
                && oldSkusByVariantId.get(other.variant_id) === nextSku
            ));
        });

        // Prisma $transaction is necessary for complex nested updates that require deletions
        const updated = await prisma.$transaction(async (tx: any) => {
            // 1. Update basic fields
            const prod = await tx.product.update({
                where: { product_id: id },
                data: {
                    name,
                    slug,
                    description,
                    base_price,
                    base_cost,
                    is_active,
                    size_guide_url,
                    size_guide_json,
                    is_customizable: !!is_customizable,
                    customization_type: is_customizable ? customization_type : null,
                    customization_surcharge: Number(customization_surcharge ?? 5),
                }
            });

            await tx.$executeRaw`
                UPDATE dbo.product
                SET custom_fabric_supply_id = ${is_customizable && custom_fabric_supply_id ? custom_fabric_supply_id : null}
                WHERE product_id = ${id};
            `;


            // 2. Sync Collections by diff instead of recreating all rows
            if (Array.isArray(collections)) {
                const currentCollectionIds = new Set(oldData.product_collection.map((pc: any) => pc.collection_id));
                const nextCollectionIds = new Set(collections.filter(Boolean));
                const collectionsToDelete = Array.from(currentCollectionIds).filter((collectionId) => !nextCollectionIds.has(collectionId));
                const collectionsToCreate = Array.from(nextCollectionIds).filter((collectionId) => !currentCollectionIds.has(collectionId));

                if (collectionsToDelete.length > 0) {
                    await tx.product_collection.deleteMany({ where: { product_id: id, collection_id: { in: collectionsToDelete } } });
                }

                if (collectionsToCreate.length > 0) {
                    await tx.product_collection.createMany({
                        data: collectionsToCreate.map((collection_id) => ({ product_id: id, collection_id }))
                    });
                }
            }

            // 3. Sync Images by public_id so unchanged images are not rewritten
            if (Array.isArray(images)) {
                const incomingImages = images.map((img: any, idx: number) => ({
                    product_id: id,
                    url: img.url,
                    public_id: img.public_id || `img_${Date.now()}_${idx}`,
                    color: String(img.color || '').trim() || null,
                    sort_order: img.sort_order ?? idx,
                })).filter((img: any) => img.url);
                const incomingPublicIds = incomingImages.map((img: any) => img.public_id);

                if (incomingPublicIds.length > 0) {
                    await tx.product_image.deleteMany({ where: { product_id: id, public_id: { notIn: incomingPublicIds } } });
                } else {
                    await tx.product_image.deleteMany({ where: { product_id: id } });
                }

                const oldImageByPublicId = new Map(oldImages.map((img: any) => [img.public_id, img]));
                const imagesToCreate = incomingImages.filter((img: any) => !oldImageByPublicId.has(img.public_id));
                const imagesToUpdate = incomingImages.filter((img: any) => {
                    const oldImage = oldImageByPublicId.get(img.public_id);
                    return oldImage && (
                        oldImage.url !== img.url
                        || oldImage.color !== img.color
                        || Number(oldImage.sort_order ?? 0) !== Number(img.sort_order ?? 0)
                    );
                });

                if (imagesToCreate.length > 0) {
                    await tx.product_image.createMany({ data: imagesToCreate });
                }

                for (const image of imagesToUpdate) {
                    await tx.product_image.update({
                        where: { public_id: image.public_id },
                        data: { url: image.url, color: image.color, sort_order: image.sort_order }
                    });
                }
            }

            // 4. Upsert Variants
            // To be safe with external foreign keys (like order_item), we UPSERT instead of delete/create
            if (preparedVariants.length > 0) {
                // Mark missing ones as inactive instead of deleting to avoid FK errors
                if (variantIdsToDeactivate.length > 0) {
                    await tx.product_variant.updateMany({
                        where: { variant_id: { in: variantIdsToDeactivate } },
                        data: { is_active: false }
                    });
                }

                for (const [idx, v] of temporarySkuVariants.entries()) {
                    await tx.product_variant.update({
                        where: { variant_id: v.variant_id },
                        data: { sku: getTemporaryVariantSku(v.variant_id, idx) }
                    });
                }

                for (const v of preparedVariants) {
                    if (v.variant_id) {
                        const oldVariant = oldVariantsById.get(v.variant_id);
                        const nextData = { sku: v.sku, size: v.size, color: v.color, price: v.price, cost: v.cost, stock: v.stock, is_active: v.is_active ?? true };
                        const changed = !oldVariant
                            || !sameText(oldVariant.sku, nextData.sku)
                            || !sameText(oldVariant.size, nextData.size)
                            || !sameText(oldVariant.color, nextData.color)
                            || !sameNumber(oldVariant.price, nextData.price)
                            || !sameNumber(oldVariant.cost, nextData.cost)
                            || Number(oldVariant.stock) !== Number(nextData.stock)
                            || Boolean(oldVariant.is_active) !== Boolean(nextData.is_active);

                        if (changed) {
                            await tx.product_variant.update({
                                where: { variant_id: v.variant_id },
                                data: nextData
                            });
                        }
                    } else {
                        await tx.product_variant.create({
                            data: {
                                product_id: id,
                                sku: v.sku, size: v.size, color: v.color, price: v.price || prod.base_price,
                                cost: v.cost || prod.base_cost,
                                stock: v.stock || 0,
                                is_active: v.is_active ?? true
                            }
                        });
                    }
                }
            }

            return prod;
        }, {
            maxWait: 10000,
            timeout: 60000
        });

        // Registrar Auditoría
        await recordAudit({
            action: 'UPDATE',
            entityType: 'product',
            entityId: id,
            oldData,
            newData: updated
        });

        return NextResponse.json({ success: true, product: updated });
    } catch (e: any) {
        const status = String(e.message || '').startsWith('Variante duplicada') ? 400 : 500;
        return NextResponse.json({ error: e.message }, { status });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Auditoría: Capturar antes de borrar
        const oldData = await prisma.product.findUnique({
            where: { product_id: id },
            include: { product_variant: true }
        });
        
        // Safety check: Don't allow deletion if variants have associated orders
        const usageCount = await prisma.order_item.count({
            where: { product_variant: { product_id: id } }
        });

        if (usageCount > 0) {
            // Soft delete
            await prisma.product.update({
                where: { product_id: id },
                data: { is_active: false }
            });
            await prisma.product_variant.updateMany({
                where: { product_id: id },
                data: { is_active: false }
            });
            return NextResponse.json({ success: true, message: 'Producto ocultado en vez de eliminado por tener ventas' });
        }

        // Hard Delete requires deleting children first
        await prisma.$transaction([
            prisma.product_collection.deleteMany({ where: { product_id: id } }),
            prisma.product_image.deleteMany({ where: { product_id: id } }),
            prisma.product_variant.deleteMany({ where: { product_id: id } }),
            prisma.product.delete({ where: { product_id: id } }),
        ]);

        // Registrar Auditoría de eliminación
        await recordAudit({
            action: 'DELETE',
            entityType: 'product',
            entityId: id,
            oldData,
            newData: { deleted: true }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
