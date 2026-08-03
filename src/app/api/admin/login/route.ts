import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { adminTokenMaxAge, createAdminToken } from '@/lib/admin-auth';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getLoginKey(req: Request, username: unknown) {
    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwardedFor || req.headers.get('x-real-ip') || 'unknown';
    return `${ip}:${String(username || '').toLowerCase()}`;
}

function isRateLimited(key: string) {
    const attempt = loginAttempts.get(key);
    if (!attempt) return false;

    if (Date.now() > attempt.resetAt) {
        loginAttempts.delete(key);
        return false;
    }

    return attempt.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(key: string) {
    const now = Date.now();
    const attempt = loginAttempts.get(key);

    if (!attempt || now > attempt.resetAt) {
        loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
        return;
    }

    attempt.count += 1;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;
        const loginKey = getLoginKey(req, username);

        if (isRateLimited(loginKey)) {
            return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
        }

        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
            recordFailedLogin(loginKey);
            return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
        }

        const dbAdmin = await prisma.admin_user.findUnique({
            where: { username }
        });

        if (!dbAdmin || !dbAdmin.is_active) {
            recordFailedLogin(loginKey);
            return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
        }

        const match = await bcrypt.compare(password, dbAdmin.password_hash);
        
        if (match) {
            const token = await createAdminToken({
                user_id: dbAdmin.user_id,
                username: dbAdmin.username, 
                role: dbAdmin.role === 'ADMIN' ? 'ADMIN' : 'SELLER',
            });
            
            const cookieStore = await cookies();
            cookieStore.set('admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: adminTokenMaxAge,
                path: '/',
            });

            loginAttempts.delete(loginKey);
            return NextResponse.json({ success: true });
        }

        recordFailedLogin(loginKey);
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Error al iniciar sesión';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
