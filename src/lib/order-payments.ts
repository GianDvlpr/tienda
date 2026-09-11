import type { Prisma } from '@prisma/client';
import { cents, paymentTotals } from './order-rules';

export const paymentMethods = new Set(['CULQI', 'YAPE', 'PLIN', 'TRANSFER', 'CARD', 'CASH', 'OTHER']);

export async function recalcPayments(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order_header.findUniqueOrThrow({ where: { order_id: orderId } });
    const payments = await tx.order_payment.findMany({ where: { order_id: orderId }, orderBy: [{ created_at: 'desc' }, { payment_id: 'desc' }] });
    const totals = paymentTotals(order.total, payments.map(p => p.amount));
    await tx.order_header.update({ where: { order_id: orderId }, data: {
        amount_paid: totals.amountPaid, balance_due: totals.balanceDue,
        payment_method: payments[0]?.method ?? null, payment_reference: payments[0]?.reference ?? null,
        paid_at: totals.amountPaid > 0 && totals.balanceDue === 0 ? order.paid_at ?? new Date() : null,
        // Financial labels can follow the ledger, but never advance production/shipping.
        ...(['PAID', 'PARTIALLY_PAID', 'PENDING_WS'].includes(order.status) ? {
            status: totals.balanceDue === 0 && totals.amountPaid > 0 ? 'PAID' : totals.amountPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING_WS',
        } : {}), updated_at: new Date(),
    } });
    return totals;
}

export async function addPayment(tx: Prisma.TransactionClient, orderId: string, input: {
    amount: unknown; method: string; reference?: string | null; notes?: string | null;
}) {
    const amount = cents(input.amount);
    if (amount <= 0 || !paymentMethods.has(input.method)) throw new Error('Monto o método de pago inválido');
    const order = await tx.order_header.findUniqueOrThrow({ where: { order_id: orderId } });
    const sum = await tx.order_payment.aggregate({ where: { order_id: orderId }, _sum: { amount: true } });
    if (cents(sum._sum.amount ?? 0) + amount > cents(order.total)) throw new Error('El pago excede el saldo pendiente');
    const payment = await tx.order_payment.create({ data: { order_id: orderId, amount: amount / 100,
        method: input.method, reference: input.reference || null, notes: input.notes || null } });
    await recalcPayments(tx, orderId);
    return payment;
}
