import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const resolvedParams = await params;
  const code = resolvedParams.code;

  const token = _req.nextUrl.searchParams.get('token');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const r = await prisma.order_header.findUnique({
    where: { code, tracking_token: _req.nextUrl.searchParams.get('token') || '' },
    select: { code: true, status: true, total: true, amount_paid: true, balance_due: true, created_at: true },
  });

  if (!r) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    code: r.code,
    status: r.status,
    total: Number(r.total ?? 0),
    amountPaid: Number(r.amount_paid ?? 0),
    balanceDue: Number(r.balance_due ?? 0),
    createdAt: r.created_at,
  });
}
