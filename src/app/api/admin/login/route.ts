import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;

        const validUser = process.env.ADMIN_USER || 'admin';
        const validPass = process.env.ADMIN_PASS || 'admin123';

        // 1. Check Super Admin (Fallback/.env)
        let isValidLogin = false;
        
        if (username === validUser && password === validPass) {
            isValidLogin = true;
        } else {
            // 2. Check Database Admin User
            const dbAdmin = await prisma.admin_user.findUnique({
                where: { username }
            });

            if (dbAdmin && dbAdmin.is_active) {
                const match = await bcrypt.compare(password, dbAdmin.password_hash);
                if (match) isValidLogin = true;
            }
        }

        if (isValidLogin) {
            // Generamos un token tonto para demostrar la sesión.
            // Para un solo usuario o poquitos administradores es suficiente una cookie HttpOnly firme.
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
            
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
