import { prisma } from './prisma';
import { cookies } from 'next/headers';
import { verifyAdminToken } from './admin-auth';

/**
 * Registra una acción en el log de auditoría.
 */
export async function recordAudit({
    action,
    entityType,
    entityId,
    oldData,
    newData,
}: {
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType: string;
    entityId: string;
    oldData?: unknown;
    newData?: unknown;
    req?: Request;
}) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token')?.value;
        const session = await verifyAdminToken(token);

        if (!session) {
            console.warn('Audit: Intento de auditoría sin token de sesión activo.');
            return;
        }

        // Limpieza de datos (Prisma Decimal / Dates handling)
        const serialize = (data: unknown) => {
            if (!data) return null;
            return JSON.stringify(data);
        };

        await prisma.audit_log.create({
            data: {
                user_id: session.user_id,
                action,
                entity_type: entityType,
                entity_id: String(entityId),
                old_values: serialize(oldData),
                new_values: serialize(newData),
            }
        });
    } catch (error) {
        console.error('Audit Error:', error);
    }
}
