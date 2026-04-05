import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const product = await prisma.product.findUnique({
            where: { product_id: id },
            include: {
                product_image: { orderBy: { sort_order: 'asc' } },
                product_variant: true,
                product_collection: true
            }
        });
        if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        return NextResponse.json(product);
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
            name, slug, description, base_price, base_cost, is_active, size_guide_url,
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

        // Prisma $transaction is necessary for complex nested updates that require deletions
        const updated = await prisma.$transaction(async (tx) => {
            // 1. Update basic fields
            const prod = await tx.product.update({
                where: { product_id: id },
                data: { name, slug, description, base_price, base_cost, is_active, size_guide_url }
            });

            // 2. Sync Collections (Delete all, re-insert)
            if (collections) {
                await tx.product_collection.deleteMany({ where: { product_id: id } });
                await tx.product_collection.createMany({
                    data: collections.map((c_id: string) => ({ product_id: id, collection_id: c_id }))
                });
            }

            // 3. Sync Images (Delete all, re-insert. Not ideal for performance but fine for MVP)
            if (images) {
                await tx.product_image.deleteMany({ where: { product_id: id } });
                await tx.product_image.createMany({
                    data: images.map((img: any, idx: number) => ({
                        product_id: id,
                        url: img.url,
                        public_id: img.public_id || `img_${Date.now()}_${idx}`,
                        sort_order: img.sort_order ?? idx
                    }))
                });
            }

            // 4. Upsert Variants
            // To be safe with external foreign keys (like order_item), we UPSERT instead of delete/create
            if (variants && variants.length > 0) {
                const incomingIds = variants.map((v:any) => v.variant_id).filter(Boolean);
                // Mark missing ones as inactive instead of deleting to avoid FK errors
                await tx.product_variant.updateMany({
                    where: { product_id: id, variant_id: { notIn: incomingIds } },
                    data: { is_active: false }
                });

                for (const v of variants) {
                    if (v.variant_id) {
                        await tx.product_variant.update({
                            where: { variant_id: v.variant_id },
                            data: { sku: v.sku, size: v.size, color: v.color, price: v.price, stock: v.stock }
                        });
                    } else {
                        await tx.product_variant.create({
                            data: {
                                product_id: id,
                                sku: v.sku, size: v.size, color: v.color, price: v.price || prod.base_price,
                                stock: v.stock || 0
                            }
                        });
                    }
                }
            }

            return prod;
        }, {
            timeout: 20000
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
        return NextResponse.json({ error: e.message }, { status: 500 });
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
