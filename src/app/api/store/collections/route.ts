import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
    try {
        const rows = await prisma.$queryRawUnsafe<any[]>(
            `
      SELECT
        collection_id,
        slug,
        name,
        description
      FROM dbo.collection
      WHERE is_active = 1
      ORDER BY name ASC;
      `
        );

        return NextResponse.json({
            items: rows.map((r) => ({
                collectionId: r.collection_id,
                slug: r.slug,
                name: r.name,
                description: r.description ?? null,
            })),
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? 'Failed to load collections' },
            { status: 500 }
        );
    }
}