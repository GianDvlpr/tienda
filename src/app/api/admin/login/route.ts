import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;

        const dbAdmin = await prisma.admin_user.findUnique({
            where: { username }
        });

        if (!dbAdmin || !dbAdmin.is_active) {
            return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
        }

        const match = await bcrypt.compare(password, dbAdmin.password_hash);
        
        if (match) {
            // Guardamos usuario y ROL en el token usando JSON en Base64
            const payload = JSON.stringify({ 
                username: dbAdmin.username, 
                role: dbAdmin.role,
                timestamp: Date.now() 
            });
            const token = Buffer.from(payload).toString('base64');
            
            const cookieStore = await cookies();
            cookieStore.set('admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7, // 1 semana
                path: '/',
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
