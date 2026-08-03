import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const resolvedParams = await params;
  const code = resolvedParams.code;

  const r = await prisma.order_header.findUnique({
    where: { code },
    select: { code: true, status: true, total: true, created_at: true },
  });

  if (!r) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    code: r.code,
    status: r.status,
    total: Number(r.total ?? 0),
    createdAt: r.created_at,
  });
}
