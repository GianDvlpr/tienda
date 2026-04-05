import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const product_id = (await params).id;
        const body = await req.json();
        // lotItems is an array: [{ color: 'Rojo', size: 'S', qty: 10 }, ...]
        const { lotItems } = body;

        if (!lotItems || lotItems.length === 0) {
            return NextResponse.json({ error: 'Debes proporcionar al menos una cantidad' }, { status: 400 });
        }

        const bomSupplies = await prisma.product_bom_supply.findMany({
            where: { product_id },
            include: { supply: true }
        });

        const bomServices = await prisma.product_bom_service.findMany({
            where: { product_id },
            include: { service: true }
        });

        let totalSupplyCost = 0;
        let totalServiceCost = 0;
        let totalQty = 0;

        // Group supplies calculation
        const supplyNeeds: any[] = []; // { supply, qty, color(optional), cost }

        // We process item by item in the lot to apply the BOM accurately
        for (const lotItem of lotItems) {
            totalQty += lotItem.qty;

            // 1. Calculate Supply for this lot item
            for (const boms of bomSupplies) {
                // Determine if this BOM applies to this size
                if (!boms.size || boms.size === 'ALL' || boms.size === lotItem.size) {
                    const materialQty = Number(boms.quantity) * lotItem.qty;

                    // Grouping Logic
                    const targetColor = boms.varies_by_color ? lotItem.color : null;
                    const existing = supplyNeeds.find(s => s.supply_id === boms.supply_id && s.color === targetColor);
                    
                    if (existing) {
                        existing.quantity += materialQty;
                    } else {
                        supplyNeeds.push({
                            supply_id: boms.supply_id,
                            name: boms.supply.name,
                            type: boms.supply.type,
                            unit: boms.supply.unit,
                            unit_cost: Number(boms.supply.unit_cost),
                            color: targetColor,
                            quantity: materialQty,
                            cost: 0,
                        });
                    }
                }
            }
        }

        // Apply rounding for fabrics and sum up total supply cost
        totalSupplyCost = 0;
        for (const sn of supplyNeeds) {
            sn.waste = 0;
            // Round up to nearest 0.5 if it's fabric
            if (sn.type === 'TELA' || sn.unit === 'MT') {
                const rounded = Math.ceil(sn.quantity * 2) / 2;
                sn.waste = Number((rounded - sn.quantity).toFixed(2));
                sn.quantity = rounded;
            }
            // Recalculate cost based on rounded quantity
            sn.cost = sn.quantity * sn.unit_cost;
            totalSupplyCost += sn.cost;
        }

        // 2. Calculate Services (they apply to the total quantity, usually 1 unit of service = 1 unit of garment)
        const serviceNeeds: any[] = [];
        for (const bserv of bomServices) {
            const qtyNeeded = Number(bserv.quantity) * totalQty;
            const cost = qtyNeeded * Number(bserv.service.unit_cost);
            totalServiceCost += cost;

            serviceNeeds.push({
                service_id: bserv.service_id,
                name: bserv.service.name,
                unit_cost: Number(bserv.service.unit_cost),
                quantity: qtyNeeded,
                cost: cost
            });
        }

        const totalCost = totalSupplyCost + totalServiceCost;
        const avgCostPerGarment = totalQty > 0 ? (totalCost / totalQty) : 0;

        return NextResponse.json({
            success: true,
            totalQty,
            totalSupplyCost,
            totalServiceCost,
            totalCost,
            avgCostPerGarment,
            supplyNeeds,
            serviceNeeds
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
