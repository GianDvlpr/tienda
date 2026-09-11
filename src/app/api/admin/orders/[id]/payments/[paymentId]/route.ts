import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { recalcPayments } from '@/lib/order-payments';
import { lockOrder, assertOrderEditable } from '@/lib/order-stock';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
    try {
        const { id, paymentId } = await params;

        const result = await prisma.$transaction(async (tx) => {
            const lockedOrder = await lockOrder(tx, id);
            assertOrderEditable(lockedOrder);
            const payment = await tx.order_payment.findUnique({ where: { payment_id: paymentId } });
            if (!payment || payment.order_id !== id) {
                throw new Error('Pago no encontrado para este pedido');
            }

            if (payment.method === 'CULQI' && payment.reference?.startsWith('chr_')) throw new Error('Un cargo verificado requiere un reembolso conciliado, no eliminación manual');
            await tx.order_payment.delete({ where: { payment_id: paymentId } });

            const order = await tx.order_header.findUnique({ where: { order_id: id } });
            if (!order) throw new Error('Pedido no encontrado');
            const totals = await recalcPayments(tx, id);

            return { payment, totals };
        });

        await recordAudit({
            action: 'DELETE',
            entityType: 'order_payment',
            entityId: paymentId,
            oldData: result.payment,
        });

        return NextResponse.json({ ok: true, totals: result.totals });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}