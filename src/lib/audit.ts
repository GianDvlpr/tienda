import { prisma } from './prisma';
import { cookies } from 'next/headers';

/**
 * Registra una acción en el log de auditoría.
 */
export async function recordAudit({
    action,
    entityType,
    entityId,
    oldData,
    newData,
    req // Opcional, pero útil si quisiéramos capturar IP
}: {
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType: string;
    entityId: string;
    oldData?: any;
    newData?: any;
    req?: Request;
}) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token')?.value;

        if (!token) {
            console.warn('Audit: Intento de auditoría sin token de sesión activo.');
            return;
        }

        let userId = '';
        try {
            const payload = JSON.parse(atob(token));
            userId = payload.user_id;
        } catch (e) {
            console.error('Audit: Error al decodificar token de auditoría:', e);
            return;
        }

        if (!userId) return;

        // Limpieza de datos (Prisma Decimal / Dates handling)
        const serialize = (data: any) => {
            if (!data) return null;
            return JSON.stringify(data);
        };

        await prisma.audit_log.create({
            data: {
                user_id: userId,
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
