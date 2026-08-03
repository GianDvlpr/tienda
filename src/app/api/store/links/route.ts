import { NextResponse } from 'next/server';
import { getPublicLinkPage } from '@/lib/link-page';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error cargando links';
}

export async function GET() {
    try {
        const data = await getPublicLinkPage();
        return NextResponse.json(data);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
