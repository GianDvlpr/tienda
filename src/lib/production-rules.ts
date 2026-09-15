import { z } from 'zod';
import { NextResponse } from 'next/server';
export class ProductionError extends Error {
    constructor(message: string, public status = 409) { super(message); }
}
export const amount = z.number().finite().min(0).max(100000000).refine(n => Math.abs(n * 10000 - Math.round(n * 10000)) < 0.0001, 'Máximo cuatro decimales');
export const lotItemsSchema = z.array(z.object({
    color: z.string().trim().min(1).max(80), size: z.string().trim().min(1).max(50), qty: z.number().int().positive().max(100000),
})).min(1).max(500).superRefine((items, ctx) => {
    const keys = items.map(i => JSON.stringify([i.color, i.size]));
    if (new Set(keys).size !== keys.length) ctx.addIssue({ code: 'custom', message: 'No repitas talla y color en el lote' });
});
export const createLotSchema = z.object({
    lot_id: z.string().uuid(), product_id: z.string().uuid(), lotItems: lotItemsSchema,
    status: z.enum(['PENDIENTE', 'PRODUCIDO']).default('PENDIENTE'), notes: z.string().max(2000).nullable().optional(),
});
export function productionErrorResponse(error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    if (error instanceof ProductionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Production operation failed:', error);
    return NextResponse.json({ error: 'No se pudo completar la operación. Reintenta o revisa el registro del servidor.' }, { status: 500 });
}
