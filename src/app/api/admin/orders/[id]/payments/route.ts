import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { addPayment } from '@/lib/order-payments';
import { lockOrder, assertOrderEditable } from '@/lib/order-stock';
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
            const order = await lockOrder(tx, id);
            assertOrderEditable(order);
            if (order.status === 'CANCELLED') throw new Error('No se aceptan cobros en un pedido cancelado');
            const newPayment = await addPayment(tx, id, { amount: amountRaw, method, reference, notes });
            return { newPayment };
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