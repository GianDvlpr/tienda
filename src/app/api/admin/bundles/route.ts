import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

function parseOptionalPrice(value: unknown) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : null;
}

export async function GET() {
    try {
        const bundles = await (prisma as any).bundle_promotion.findMany({
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                product_id: true
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json(bundles);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description, discount_amount, bundle_price, tier_2_price, tier_3_price, customization_surcharge, is_active, product_ids } = body;
        const discountAmount = Number(discount_amount || 0);
        const bundlePrice = parseOptionalPrice(bundle_price);
        const tier2Price = parseOptionalPrice(tier_2_price);
        const tier3Price = parseOptionalPrice(tier_3_price);

        if (!name || !product_ids || product_ids.length < 2 || (discountAmount <= 0 && !bundlePrice && !tier2Price && !tier3Price)) {
            return NextResponse.json({ error: 'Faltan datos obligatorios o se requieren al menos 2 productos' }, { status: 400 });
        }

        const newBundle = await (prisma as any).bundle_promotion.create({
            data: {
                name,
                description,
                discount_amount: discountAmount,
                bundle_price: bundlePrice,
                tier_2_price: tier2Price,
                tier_3_price: tier3Price,
                customization_surcharge: Number(customization_surcharge ?? 20),
                is_active: is_active ?? true,
                items: {
                    create: product_ids.map((id: string) => ({
                        product: { connect: { product_id: id } }
                    }))
                }
            },
            include: { items: true }
        });


        // Auditoría
        await recordAudit({
            action: 'CREATE',
            entityType: 'bundle_promotion',
            entityId: newBundle.bundle_id,
            newData: newBundle
        });

        return NextResponse.json(newBundle);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
