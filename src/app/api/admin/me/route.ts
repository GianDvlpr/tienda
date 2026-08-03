import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/admin-auth';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token')?.value;
        const session = await verifyAdminToken(token);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        return NextResponse.json(session);
    } catch {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
}
