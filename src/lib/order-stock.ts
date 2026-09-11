import type { Prisma } from '@prisma/client';

export async function lockOrder(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT order_id FROM order_header WHERE order_id = ${id}::uuid FOR UPDATE`;
    const order = await tx.order_header.findUnique({ where: { order_id: id }, include: { checkout_attempt: true } });
    if (!order) throw new Error('Pedido no encontrado');
    return order;
}

export function assertOrderEditable(order: { checkout_attempt: { status: string } | null }) {
    if (order.checkout_attempt && !['SUCCEEDED', 'FAILED'].includes(order.checkout_attempt.status)) {
        throw new Error('Pago pendiente de conciliación; no se puede modificar este pedido');
    }
}

export async function deductItemStock(tx: Prisma.TransactionClient, item: {
    order_item_id: string; order_id: string; variant_id: string; qty: number;
}, reason: string) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) throw new Error('Cantidad inválida');
    const changed = await tx.product_variant.updateMany({
        where: { variant_id: item.variant_id, stock: { gte: item.qty }, is_active: true, product: { is_active: true } },
        data: { stock: { decrement: item.qty } },
    });
    if (changed.count !== 1) throw new Error('Stock insuficiente o variante inactiva');
    const variant = await tx.product_variant.findUniqueOrThrow({ where: { variant_id: item.variant_id } });
    await tx.order_item.update({ where: { order_item_id: item.order_item_id }, data: { stock_deducted: true } });
    await tx.inventory_movement.create({ data: {
        variant_id: item.variant_id, order_id: item.order_id, order_item_id: item.order_item_id,
        movement_type: 'OUT', qty: item.qty, stock_before: variant.stock + item.qty, stock_after: variant.stock, reason,
    } });
}

// Caller holds the order row lock. The flag makes cancellation/restoration repeatable.
export async function releaseOrderStock(tx: Prisma.TransactionClient, orderId: string, reason: string) {
    const items = await tx.order_item.findMany({ where: { order_id: orderId, stock_deducted: true }, orderBy: { variant_id: 'asc' } });
    for (const item of items) {
        const variant = await tx.product_variant.update({ where: { variant_id: item.variant_id }, data: { stock: { increment: item.qty } } });
        await tx.order_item.update({ where: { order_item_id: item.order_item_id }, data: { stock_deducted: false } });
        await tx.inventory_movement.create({ data: {
            variant_id: item.variant_id, order_id: orderId, order_item_id: item.order_item_id,
            movement_type: 'IN', qty: item.qty, stock_before: variant.stock - item.qty, stock_after: variant.stock, reason,
        } });
    }
}
