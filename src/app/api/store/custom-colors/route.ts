import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const supplyId = req.nextUrl.searchParams.get('supplyId');
        const colors = supplyId ? await prisma.$queryRaw<any[]>`
            SELECT c.name, c.hex,
                   CAST(CASE WHEN c.is_available = 1 AND scs.is_available = 1 AND scs.is_active = 1 AND scs.stock > 0 THEN 1 ELSE 0 END AS bit) AS is_available
            FROM dbo.supply_color_stock scs
            JOIN dbo.custom_color c ON c.color_id = scs.color_id
            WHERE scs.supply_id = ${supplyId}
              AND c.is_active = 1
            ORDER BY c.sort_order ASC, c.name ASC;
        ` : await prisma.$queryRaw<any[]>`
            SELECT name, hex, is_available
            FROM dbo.custom_color
            WHERE is_active = 1
            ORDER BY sort_order ASC, name ASC;
        `;
        return NextResponse.json(colors.map((color: any) => ({
            name: color.name,
            hex: color.hex,
            available: color.is_available,
        })));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
