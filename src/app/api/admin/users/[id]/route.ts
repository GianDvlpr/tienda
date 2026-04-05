import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { recordAudit } from '@/lib/audit';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await req.json();
        const { username, full_name, is_active, password, role } = body;

        // Auditoría: Capturar estado anterior
        const oldUser = await prisma.admin_user.findUnique({
            where: { user_id: id },
            select: { user_id: true, username: true, full_name: true, is_active: true, role: true }
        });

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
            select: { user_id: true, username: true, full_name: true, is_active: true, role: true }
        });

        // Registrar Auditoría
        await recordAudit({
            action: 'UPDATE',
            entityType: 'admin_user',
            entityId: id,
            oldData: oldUser,
            newData: updated
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

        // Auditoría: Capturar antes de borrar
        const oldUser = await prisma.admin_user.findUnique({
            where: { user_id: id },
            select: { user_id: true, username: true, full_name: true }
        });

        await prisma.admin_user.delete({
            where: { user_id: id }
        });

        // Registrar Auditoría de eliminación
        await recordAudit({
            action: 'DELETE',
            entityType: 'admin_user',
            entityId: id,
            oldData: oldUser,
            newData: { deleted: true }
        });


        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
