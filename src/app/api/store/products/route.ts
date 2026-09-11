import { NextRequest, NextResponse } from 'next/server';
import { listStoreProducts, querySchema } from '@/lib/store-products';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid query params', details: parsed.error.flatten() }, { status: 400 });
    try {
        return NextResponse.json(await listStoreProducts(parsed.data));
    } catch (error) {
        console.error('Catalog query failed:', error);
        return NextResponse.json({ error: 'Failed to list products' }, { status: 500 });
    }
}
