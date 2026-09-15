import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { finishProduction } from '@/lib/production';
import { productionErrorResponse } from '@/lib/production-rules';
import { recordAudit } from '@/lib/audit';
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = z.string().uuid().parse((await params).id);
        const lot = await prisma.$transaction(tx => finishProduction(tx, id), { timeout: 20000 });
        await recordAudit({ action: 'UPDATE', entityType: 'production_lot', entityId: id, newData: lot });
        return NextResponse.json({ success: true, lot });
    } catch (error) { return productionErrorResponse(error); }
}
