import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const payload = JSON.parse(atob(token));
        return NextResponse.json(payload);
    } catch (e) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
}
