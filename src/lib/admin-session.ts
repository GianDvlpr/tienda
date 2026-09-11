import { prisma } from './prisma';
import { verifyAdminToken } from './admin-auth';

export async function verifyActiveAdminSession(token?: string) {
    try {
        const session = await verifyAdminToken(token);
        if (!session) return null;
        const user = await prisma.admin_user.findUnique({ where: { user_id: session.user_id },
            select: { is_active: true, role: true, username: true, session_version: true } });
        if (!user?.is_active || user.role !== session.role || user.username !== session.username || user.session_version !== session.session_version) return null;
        return session;
    } catch { return null; }
}
