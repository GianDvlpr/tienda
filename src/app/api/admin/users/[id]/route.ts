import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await req.json();
        const { username, full_name, is_active, password, role } = body;

        let dataToUpdate: any = { username, full_name, is_active };
        if (role) {
            dataToUpdate.role = role;
        }

        if (password) {
            dataToUpdate.password_hash = await bcrypt.hash(password, 10);
        }

        const updated = await prisma.admin_user.update({
            where: { user_id: id },
            data: dataToUpdate,
            select: { user_id: true, username: true, full_name: true, is_active: true }
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        await prisma.admin_user.delete({
            where: { user_id: id }
        });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
