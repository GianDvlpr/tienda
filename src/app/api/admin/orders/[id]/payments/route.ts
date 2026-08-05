import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const validMethods = new Set(['CULQI', 'YAPE', 'PLIN', 'TRANSFER', 'CARD', 'CASH', 'OTHER']);

function normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown) {
    const text = normalizeText(value);
    return text || null;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Error inesperado';
}

async function recalcOrderTotals(
    tx: Prisma.TransactionClient,
    orderId: string,
    total: number,
    latestPayment: { method: string; reference: string | null } | null
) {
    const payments = await tx.order_payment.findMany({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
    });
    const sumPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const amountPaid = Math.min(sumPaid, total);
    const balanceDue = Math.max(0, total - amountPaid);

    const latest = latestPayment ?? (payments[0] ? { method: payments[0].method, reference: payments[0].reference } : null);

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

    return { amountPaid, balanceDue, paymentsCount: payments.length };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const payments = await prisma.order_payment.findMany({
            where: { order_id: id },
            orderBy: { created_at: 'desc' },
        });
        return NextResponse.json(payments);
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const amountRaw = body.amount === undefined || body.amount === null || body.amount === ''
            ? undefined
            : Number(body.amount);
        const method = normalizeText(body.method).toUpperCase();

        if (amountRaw === undefined || !Number.isFinite(amountRaw) || amountRaw <= 0) {
            return NextResponse.json({ error: 'El monto del pago debe ser mayor a 0' }, { status: 400 });
        }
        if (!validMethods.has(method)) {
            return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
        }

        const reference = nullableText(body.reference);
        const notes = nullableText(body.notes);

        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order_header.findUnique({ where: { order_id: id } });
            if (!order) throw new Error('Pedido no encontrado');

            const total = Number(order.total || 0);
            const currentPaid = Number(order.amount_paid || 0);
            if (currentPaid + amountRaw > total + 0.01) {
                throw new Error(`El pago excede el total del pedido. Saldo pendiente: ${total - currentPaid}`);
            }

            const newPayment = await tx.order_payment.create({
                data: {
                    order_id: id,
                    amount: amountRaw,
                    method,
                    reference,
                    notes,
                },
            });

            const totals = await recalcOrderTotals(tx, id, total, { method, reference });

            return { newPayment, totals };
        });

        await recordAudit({
            action: 'CREATE',
            entityType: 'order_payment',
            entityId: result.newPayment.payment_id,
            newData: { orderId: id, ...result.newPayment },
        });

        return NextResponse.json(result.newPayment, { status: 201 });
    } catch (e: unknown) {
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}