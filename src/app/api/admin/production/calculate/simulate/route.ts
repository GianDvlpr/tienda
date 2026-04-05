import { NextResponse } from 'next/server';
import { calculateProductionCost } from '@/lib/production-calc';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { lotItems, bomSupplies, bomServices } = body;

        if (!lotItems || lotItems.length === 0) {
            return NextResponse.json({ error: 'Debes proporcionar al menos una cantidad de prendas.' }, { status: 400 });
        }

        // The simulator sends raw data that matches the CalcSupplyInput and CalcServiceInput interfaces
        const result = calculateProductionCost(lotItems, bomSupplies, bomServices);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
