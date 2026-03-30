import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/actions/product';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    try {
        const productData = await getProductBySlug(slug);
        if (!productData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json(productData);
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to load product' },
            { status: 500 }
        );
    }
}