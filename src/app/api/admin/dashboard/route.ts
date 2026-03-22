import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
    try {
        // 1. Total Revenue (Excluding Cancelled)
        const revenueResult = await prisma.order_header.aggregate({
            _sum: {
                total: true
            },
            where: {
                status: {
                    not: 'CANCELLED'
                }
            }
        });
        const totalRevenue = revenueResult._sum.total || 0;

        // 2. Pending Orders Count
        const pendingCount = await prisma.order_header.count({
            where: {
                status: 'PENDING_WS'
            }
        });

        // 3. Recent 5 Orders
        const recentOrders = await prisma.order_header.findMany({
            take: 5,
            orderBy: { created_at: 'desc' },
            select: {
                order_id: true,
                code: true,
                shipping_name: true,
                status: true,
                total: true,
                created_at: true,
            }
        });

        // 4. Low Stock Variants
        const lowStock = await prisma.product_variant.findMany({
            where: {
                stock: { lte: 3 }, // Alert threshold: 3
                is_active: true,
                product: {
                    is_active: true
                }
            },
            take: 10,
            include: {
                product: {
                    select: { name: true }
                }
            },
            orderBy: { stock: 'asc' }
        });

        return NextResponse.json({
            totalRevenue,
            pendingCount,
            recentOrders,
            lowStock
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
