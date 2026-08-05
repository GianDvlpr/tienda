import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const includeUnavailable = req.nextUrl.searchParams.get('includeUnavailable') === 'true';

        const products = await prisma.product.findMany({
            where: {
                is_active: true,
                is_customizable: true,
                custom_fabric_supply_id: { not: null },
            },
            include: {
                product_image: {
                    orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
                    take: 1,
                },
            },
            orderBy: [{ name: 'asc' }],
        });

        const supplyIds = Array.from(new Set(
            products.map((p) => p.custom_fabric_supply_id).filter((id): id is string => Boolean(id))
        ));

        const stockRows = supplyIds.length
            ? await prisma.supply_color_stock.findMany({
                where: {
                    supply_id: { in: supplyIds },
                    color: { is_active: true },
                    ...(includeUnavailable ? {} : { is_available: true, is_active: true, stock: { gt: 0 } }),
                },
                include: { color: true },
                orderBy: [{ color: { sort_order: 'asc' } }, { color: { name: 'asc' } }],
            })
            : [];

        const supplyIdsWithNames = supplyIds.length
            ? await prisma.supply.findMany({
                where: { supply_id: { in: supplyIds } },
                select: { supply_id: true, name: true },
            })
            : [];
        const supplyNameById = new Map(supplyIdsWithNames.map((s) => [s.supply_id, s.name]));

        const colorsBySupply = new Map<string, typeof stockRows>();
        for (const row of stockRows) {
            const list = colorsBySupply.get(row.supply_id) ?? [];
            list.push(row);
            colorsBySupply.set(row.supply_id, list);
        }

        const result = products.map((p) => {
            const supplyId = p.custom_fabric_supply_id;
            const rows = supplyId ? (colorsBySupply.get(supplyId) ?? []) : [];
            return {
                productId: p.product_id,
                slug: p.slug,
                name: p.name,
                primaryImageUrl: p.product_image[0]?.url ?? null,
                fabricName: supplyId ? (supplyNameById.get(supplyId) ?? null) : null,
                colors: rows.map((row) => ({
                    name: row.color.name,
                    hex: row.color.hex,
                    available: Boolean(row.color.is_available && row.is_available && row.is_active && Number(row.stock) > 0),
                    stock: Number(row.stock),
                })),
            };
        }).filter((p) => p.colors.length > 0);

        return NextResponse.json(result);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}