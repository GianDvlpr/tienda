import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyActiveAdminSession } from '@/lib/admin-session';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token')?.value;
        const session = await verifyActiveAdminSession(token);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        return NextResponse.json(session);
    } catch {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
}
