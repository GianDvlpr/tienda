import { prisma } from './prisma';
import { addPayment } from './order-payments';
import { cents } from './order-rules';
import { lockOrder, releaseOrderStock } from './order-stock';

type Charge = { object?: string; id?: string; amount?: number; currency_code?: string; capture?: boolean; captured?: boolean; amount_refunded?: number; metadata?: { order_id?: string } };

export function isConfirmedCharge(charge: Charge, orderId: string, total: unknown) {
    return charge.object === 'charge' && typeof charge.id === 'string' && /^chr_(test|live)_[a-zA-Z0-9]+$/.test(charge.id)
        && charge.currency_code === 'PEN' && charge.amount === cents(total)
        && charge.capture === true && !(Number(charge.amount_refunded || 0) > 0)
        && charge.metadata?.order_id === orderId;
}

export async function completeCheckoutPayment(orderId: string, charge: Charge) {
    return prisma.$transaction(async tx => {
        const order = await lockOrder(tx, orderId);
        if (!isConfirmedCharge(charge, orderId, order.total)) throw new Error('El cargo no corresponde al pedido o no está capturado');
        const attempt = order.checkout_attempt;
        if (!attempt || attempt.status === 'FAILED') throw new Error('Intento de pago no conciliable');
        if (attempt.status === 'SUCCEEDED') {
            if (attempt.charge_id !== charge.id) throw new Error('El pedido tiene otro cargo registrado');
            return order;
        }
        await addPayment(tx, orderId, { amount: order.total, method: 'CULQI', reference: charge.id });
        await tx.checkout_attempt.update({ where: { order_id: orderId }, data: { status: 'SUCCEEDED', charge_id: charge.id, updated_at: new Date() } });
        return tx.order_header.update({ where: { order_id: orderId }, data: { status: 'PAID', updated_at: new Date() } });
    });
}

export async function failCheckoutPayment(orderId: string) {
    await prisma.$transaction(async tx => {
        const order = await lockOrder(tx, orderId);
        if (!order.checkout_attempt || ['FAILED', 'SUCCEEDED'].includes(order.checkout_attempt.status)) return;
        await releaseOrderStock(tx, orderId, 'Pago rechazado por proveedor');
        if (order.coupon_code) await tx.coupon.updateMany({ where: { code: order.coupon_code, usage_count: { gt: 0 } }, data: { usage_count: { decrement: 1 } } });
        await tx.checkout_attempt.update({ where: { order_id: orderId }, data: { status: 'FAILED', updated_at: new Date() } });
        await tx.order_header.update({ where: { order_id: orderId }, data: { status: 'CANCELLED', updated_at: new Date() } });
    });
}

export async function processCheckoutPayment(orderId: string, token: string, email: string) {
    // A persisted claim is consumed once. A crash after this point requires reconciliation,
    // never automatic resubmission of a potentially successful external charge.
    const claimed = await prisma.checkout_attempt.updateMany({ where: { order_id: orderId, status: 'CREATED' }, data: { status: 'PROCESSING', updated_at: new Date() } });
    if (claimed.count !== 1) return false;
    try {
        const order = await prisma.order_header.findUniqueOrThrow({ where: { order_id: orderId } });
        const response = await fetch('https://api.culqi.com/v2/charges', {
            method: 'POST', signal: AbortSignal.timeout(20000), headers: {
                'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.CULQI_SECRET_KEY,
            }, body: JSON.stringify({ amount: cents(order.total), currency_code: 'PEN', source_id: token,
                email, capture: true, metadata: { order_id: orderId }, description: 'Pedido ' + order.code }),
        });
        const charge = await response.json();
        if (response.ok && isConfirmedCharge(charge, orderId, order.total)) {
            // Save the provider reference before finalizing so a failed DB transaction is recoverable.
            await prisma.checkout_attempt.update({ where: { order_id: orderId }, data: { charge_id: charge.id } });
            await completeCheckoutPayment(orderId, charge);
            return true;
        }
        if (response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status) && charge.object === 'error') {
            await failCheckoutPayment(orderId);
            return false;
        }
    } catch (error) {
        console.error('Checkout requiere conciliación', orderId, error instanceof Error ? error.name : 'UnknownError');
    }
    await prisma.checkout_attempt.updateMany({ where: { order_id: orderId, status: 'PROCESSING' }, data: { status: 'REVIEW', updated_at: new Date() } });
    return false;
}
