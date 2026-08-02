import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { prepareVariantsWithUniqueSkus } from '@/lib/product-variant-sku';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                product_image: { orderBy: { sort_order: 'asc' }, take: 1 },
                product_variant: true,
                product_collection: {
                    include: { collection: true }
                }
            }
        });
        return NextResponse.json(products);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

function nullablePositiveNumber(value: unknown) {
    const numberValue = Number(value ?? 0);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            name, slug, description, base_price, base_cost, is_active, size_guide_url, size_guide_json,
            is_customizable, customization_type, customization_surcharge,
            custom_fabric_supply_id,
            collections, // array of collection_id strings
            images,      // array of { url, public_id, color, sort_order }
            variants     // array of { sku, size, color, price, cost, stock }
        } = body;

        if (!name || !slug) return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });

        const newProduct = await prisma.$transaction(async (tx: any) => {
            const preparedVariants = await prepareVariantsWithUniqueSkus(tx, variants, name);

            const product = await tx.product.create({
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


                    product_collection: {
                        create: collections?.map((c_id: string) => ({ collection_id: c_id })) || []
                    },
                    product_variant: {
                        create: preparedVariants.map((v: any) => ({
                            sku: v.sku,
                            size: v.size,
                            color: v.color,
                            price: nullablePositiveNumber(v.price),
                            cost: v.cost || base_cost,
                            stock: v.stock || 0,
                            is_active: v.is_active ?? true
                        })) || []
                    }
                }
            });

            for (const [idx, img] of (images || []).entries()) {
                await tx.$executeRaw`
                    INSERT INTO dbo.product_image (product_id, url, public_id, color, sort_order)
                    VALUES (
                        ${product.product_id},
                        ${img.url},
                        ${img.public_id || `img_${Date.now()}_${idx}`},
                        ${String(img.color || '').trim() || null},
                        ${img.sort_order ?? idx}
                    );
                `;
            }

            const customFabricSupplyId = is_customizable && custom_fabric_supply_id ? custom_fabric_supply_id : null;
            if (customFabricSupplyId) {
                await tx.$executeRaw`
                    UPDATE dbo.product
                    SET custom_fabric_supply_id = ${customFabricSupplyId}
                    WHERE product_id = ${product.product_id};
                `;
            } else {
                await tx.$executeRaw`
                    UPDATE dbo.product
                    SET custom_fabric_supply_id = NULL
                    WHERE product_id = ${product.product_id};
                `;
            }

            return product;
        });

        // Registrar Auditoría
        await recordAudit({
            action: 'CREATE',
            entityType: 'product',
            entityId: newProduct.product_id,
            newData: newProduct
        });

        return NextResponse.json(newProduct);
    } catch (e: any) {
        const status = String(e.message || '').startsWith('Variante duplicada') ? 400 : 500;
        return NextResponse.json({ error: e.message }, { status });
    }
}

