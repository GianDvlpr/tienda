import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            name, slug, description, base_price, base_cost, is_active, size_guide_url,
            collections, // array of collection_id strings
            images,      // array of { url, public_id, sort_order }
            variants     // array of { sku, size, color, price, cost, stock }
        } = body;

        if (!name || !slug) return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });

        const newProduct = await prisma.product.create({
            data: {
                name, slug, description, base_price, base_cost, is_active, size_guide_url,
                product_collection: {
                    create: collections?.map((c_id: string) => ({ collection_id: c_id })) || []
                },
                product_image: {
                    create: images?.map((img: any, idx: number) => ({
                        url: img.url,
                        public_id: img.public_id || `img_${Date.now()}_${idx}`,
                        sort_order: img.sort_order ?? idx
                    })) || []
                },
                product_variant: {
                    create: variants?.map((v: any) => ({
                        sku: v.sku,
                        size: v.size,
                        color: v.color,
                        price: v.price || base_price,
                        cost: v.cost || base_cost,
                        stock: v.stock || 0,
                        is_active: v.is_active ?? true
                    })) || []
                }
            }
        });

        return NextResponse.json(newProduct);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
