import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export const runtime = 'nodejs';

export async function GET() {
    try {
        // 1. Total revenue collected (excluding cancelled and unpaid balances)
        const revenueResult = await prisma.order_header.aggregate({
            _sum: {
                amount_paid: true
            },
            where: {
                status: {
                    not: 'CANCELLED'
                }
            }
        });
        const totalRevenue = revenueResult._sum.amount_paid || 0;

        // 2. Pending Orders Count
        const pendingCount = await prisma.order_header.count({
            where: {
                status: { in: ['PENDING_WS', 'PARTIALLY_PAID'] }
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

        // 5. Analytics Data (Aggregated Sales & Trends)
        const fourteenDaysAgo = dayjs().subtract(14, 'days').startOf('day').toDate();

        // 5.1 Revenue Trend (Last 14 days)
        const recentOrdersForTrend = await prisma.order_header.findMany({
            where: {
                status: { in: ['PARTIALLY_PAID', 'MEASURES_CONFIRMED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED'] },
                created_at: { gte: fourteenDaysAgo }
            },
            select: {
                amount_paid: true,
                created_at: true
            },
            orderBy: { created_at: 'asc' }
        });

        // Group by day
        const trendMap: Record<string, number> = {};
        for (let i = 0; i < 14; i++) {
            const date = dayjs().subtract(i, 'days').format('DD/MM');
            trendMap[date] = 0;
        }

        recentOrdersForTrend.forEach(order => {
            const date = dayjs(order.created_at).format('DD/MM');
            if (trendMap[date] !== undefined) {
                trendMap[date] += Number(order.amount_paid);
            }
        });

        const revenueTrend = Object.entries(trendMap)
            .map(([date, amount]) => ({ date, amount }))
            .reverse();

        // 5.2 Potential Sales (PENDING_WS)
        const pendingItems = await prisma.order_item.findMany({
            where: {
                order_header: {
                    status: { in: ['PENDING_WS', 'PARTIALLY_PAID'] }
                }
            },
            select: {
                product_name: true,
                qty: true,
                unit_price: true
            }
        });

        const pendingMap: Record<string, { units: number, value: number }> = {};
        pendingItems.forEach(item => {
            if (!pendingMap[item.product_name]) {
                pendingMap[item.product_name] = { units: 0, value: 0 };
            }
            pendingMap[item.product_name].units += item.qty;
            pendingMap[item.product_name].value += item.qty * Number(item.unit_price);
        });

        const pendingPotential = Object.entries(pendingMap)
            .map(([name, data]) => ({ name, units: data.units, value: data.value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // 5.3 Aggregated Sales (Confirmed/Delivered)
        const salesItems = await prisma.order_item.findMany({
            where: {
                order_header: {
                    status: { in: ['PARTIALLY_PAID', 'MEASURES_CONFIRMED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED'] }
                }
            },
            select: {
                product_name: true,
                variant_color: true,
                variant_size: true,
                qty: true
            }
        });

        const topProductsMap: Record<string, number> = {};
        const colorsMap: Record<string, number> = {};
        const sizesMap: Record<string, number> = {};

        salesItems.forEach(item => {
            topProductsMap[item.product_name] = (topProductsMap[item.product_name] || 0) + item.qty;
            colorsMap[item.variant_color] = (colorsMap[item.variant_color] || 0) + item.qty;
            sizesMap[item.variant_size] = (sizesMap[item.variant_size] || 0) + item.qty;
        });

        const topProducts = Object.entries(topProductsMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);

        const salesByColor = Object.entries(colorsMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const salesBySize = Object.entries(sizesMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return NextResponse.json({
            totalRevenue,
            pendingCount,
            recentOrders,
            lowStock,
            analytics: {
                topProducts,
                salesByColor,
                salesBySize,
                revenueTrend,
                pendingPotential
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
