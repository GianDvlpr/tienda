import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

async function recalcOrderTotals(
    tx: Prisma.TransactionClient,
    orderId: string,
    total: number
) {
    const payments = await tx.order_payment.findMany({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
    });
    const sumPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const amountPaid = Math.min(sumPaid, total);
    const balanceDue = Math.max(0, total - amountPaid);
    const latest = payments[0] ? { method: payments[0].method, reference: payments[0].reference } : null;

    await tx.order_header.update({
        where: { order_id: orderId },
        data: {
            amount_paid: amountPaid,
            balance_due: balanceDue,
            payment_method: latest ? latest.method : null,
            payment_reference: latest ? latest.reference : null,
            paid_at: amountPaid > 0 && balanceDue === 0 ? new Date() : null,
        },
    });

    return { amountPaid, balanceDue };
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
    try {
        const { id, paymentId } = await params;

        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.order_payment.findUnique({ where: { payment_id: paymentId } });
            if (!payment || payment.order_id !== id) {
                throw new Error('Pago no encontrado para este pedido');
            }

            await tx.order_payment.delete({ where: { payment_id: paymentId } });

            const order = await tx.order_header.findUnique({ where: { order_id: id } });
            if (!order) throw new Error('Pedido no encontrado');
            const total = Number(order.total || 0);
            const totals = await recalcOrderTotals(tx, id, total);

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