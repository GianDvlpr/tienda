import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyActiveAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { completeCheckoutPayment } from '@/lib/checkout-payment';
import { recordAudit } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await verifyActiveAdminSession((await cookies()).get('admin_token')?.value);
    if (session?.role !== 'ADMIN') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    try {
        const { id } = await params;
        const attempt = await prisma.checkout_attempt.findUnique({ where: { order_id: id } });
        const { charge_id } = await req.json();
        const chargeId = charge_id || attempt?.charge_id;
        if (typeof chargeId !== 'string' || !/^chr_(test|live)_[a-zA-Z0-9]+$/.test(chargeId)) throw new Error('Indica el ID del cargo desde Culqi');
        const response = await fetch('https://api.culqi.com/v2/charges/' + encodeURIComponent(chargeId), { headers: { Authorization: 'Bearer ' + process.env.CULQI_SECRET_KEY }, signal: AbortSignal.timeout(20000), cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo verificar el cargo con Culqi');
        const order = await completeCheckoutPayment(id, await response.json());
        await recordAudit({ action: 'UPDATE', entityType: 'payment_reconciliation', entityId: id, newData: { chargeId } });
        return NextResponse.json({ success: true, status: order.status });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo conciliar' }, { status: 400 });
    }
}
