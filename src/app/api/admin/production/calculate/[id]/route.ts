import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { productionPlan } from '@/lib/production';
import { lotItemsSchema, productionErrorResponse } from '@/lib/production-rules';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = z.string().uuid().parse((await params).id);
        const { lotItems } = z.object({ lotItems: lotItemsSchema }).parse(await req.json());
        const result = await prisma.$transaction(tx => productionPlan(tx, id, lotItems), { timeout: 20000 });
        return NextResponse.json({ success: true, ...result });
    } catch (error) { return productionErrorResponse(error); }
}
