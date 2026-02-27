import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
    _req: NextRequest,
    ctx: { params: { code: string } }
) {
    const code = ctx.params.code;

    const rows = await prisma.$queryRaw<any[]>`
    SELECT TOP 1
      code,
      status,
      total,
      created_at AS createdAt
    FROM dbo.order_header
    WHERE code = ${code};
  `;

    const r = rows?.[0];

    if (!r) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
        code: r.code,
        status: r.status,
        total: Number(r.total ?? 0),
        createdAt: r.createdAt,
    });
}