import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const supplyId = req.nextUrl.searchParams.get('supplyId');
        const colors = supplyId ? await prisma.supply_color_stock.findMany({
            where: { supply_id: supplyId, color: { is_active: true } },
            include: { color: true },
            orderBy: [{ color: { sort_order: 'asc' } }, { color: { name: 'asc' } }],
        }) : await prisma.custom_color.findMany({
            where: { is_active: true },
            orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
        });
        return NextResponse.json(colors.map((color: any) => ({
            name: color.color?.name ?? color.name,
            hex: color.color?.hex ?? color.hex,
            available: color.color
                ? Boolean(color.color.is_available && color.is_available && color.is_active && Number(color.stock) > 0)
                : Boolean(color.is_available),
        })));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
