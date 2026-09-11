export function cents(value: unknown): number {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error('Importe inválido');
    return Math.round(number * 100);
}

export function checkoutMethod(value: unknown): 'CULQI' | 'WHATSAPP' {
    if (value !== 'CULQI' && value !== 'WHATSAPP') throw new Error('Método de pago inválido');
    return value;
}

export function paymentTotals(total: unknown, amounts: unknown[]) {
    const paid = amounts.reduce<number>((sum, amount) => sum + cents(amount), 0);
    return { amountPaid: paid / 100, balanceDue: Math.max(0, cents(total) - paid) / 100 };
}

export function validatePaidStatus(status: string, total: unknown, paid: unknown) {
    if (status === 'PAID' && cents(paid) < cents(total)) {
        throw new Error('Registra el pago completo antes de marcar el pedido como pagado');
    }
}

export function trackingPath(code: string, token: string) {
    return `/track/${encodeURIComponent(code)}?token=${encodeURIComponent(token)}`;
}
