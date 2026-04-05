import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

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
        const { name, description, discount_amount, is_active, product_ids } = body;

        if (!name || !discount_amount || !product_ids || product_ids.length < 2) {
            return NextResponse.json({ error: 'Faltan datos obligatorios o se requieren al menos 2 productos' }, { status: 400 });
        }

        const newBundle = await (prisma as any).bundle_promotion.create({
            data: {
                name,
                description,
                discount_amount: Number(discount_amount),
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
