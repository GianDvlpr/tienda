import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { recordAudit } from '@/lib/audit';

export async function GET() {
    try {
        const users = await prisma.admin_user.findMany({
            orderBy: { created_at: 'desc' },
            select: {
                user_id: true,
                username: true,
                full_name: true,
                role: true,
                is_active: true,
                created_at: true,
                // NO devolvemos el password_hash

            }
        });
        return NextResponse.json(users);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password, full_name, is_active, role } = body;

        if (!username || !password || !full_name) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        const existing = await prisma.admin_user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const newUser = await prisma.admin_user.create({
            data: {
                username,
                password_hash,
                full_name,
                role: role || 'SELLER',
                is_active: is_active ?? true,
            }
        });

        // Registrar Auditoría (omitimos password_hash por seguridad)
        const { password_hash: _, ...safeUser } = newUser as any;
        await recordAudit({
            action: 'CREATE',
            entityType: 'admin_user',
            entityId: newUser.user_id,
            newData: safeUser
        });

        return NextResponse.json(newUser);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

