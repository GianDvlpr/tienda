import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const lots = await prisma.production_lot.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                product: { select: { name: true, slug: true } },
                items: true,
                consumptions: { include: { supply: true } }
            }
        });
        return NextResponse.json(lots);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { product_id, lotItems, status, notes } = body;

        if (!product_id || !lotItems || lotItems.length === 0) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        // We run the exact same calculation here to persist the snapshot
        const bomSupplies = await prisma.product_bom_supply.findMany({ where: { product_id }, include: { supply: true } });
        const bomServices = await prisma.product_bom_service.findMany({ where: { product_id }, include: { service: true } });

        let totalSupplyCost = 0;
        let totalServiceCost = 0;
        const supplyNeeds: any[] = [];

        for (const lotItem of lotItems) {
            for (const boms of bomSupplies) {
                if (!boms.size || boms.size === 'ALL' || boms.size === lotItem.size) {
                    const materialQty = Number(boms.quantity) * lotItem.qty;

                    const targetColor = boms.varies_by_color ? lotItem.color : null;
                    const existing = supplyNeeds.find(s => s.supply_id === boms.supply_id && s.color === targetColor);
                    
                    if (existing) {
                        existing.quantity += materialQty;
                    } else {
                        supplyNeeds.push({
                            supply_id: boms.supply_id,
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
        for (const sn of supplyNeeds) {
            // Round up to nearest 0.5 if it's fabric
            if (sn.type === 'TELA' || sn.unit === 'MT') {
                sn.quantity = Math.ceil(sn.quantity * 2) / 2;
            }
            // Recalculate cost based on rounded quantity
            sn.cost = sn.quantity * sn.unit_cost;
            totalSupplyCost += sn.cost;
        }

        let totalQty = lotItems.reduce((acc: number, item: any) => acc + item.qty, 0);
        for (const bserv of bomServices) {
            totalServiceCost += (Number(bserv.quantity) * totalQty) * Number(bserv.service.unit_cost);
        }

        const totalCost = totalSupplyCost + totalServiceCost;
        const lotCode = `LOT-${Date.now().toString().slice(-6)}`;

        // Transaction to create the lot and its snapshot
        await prisma.$transaction(async (tx) => {
            const lot = await tx.production_lot.create({
                data: {
                    code: lotCode,
                    product_id,
                    status: status || 'PENDIENTE',
                    total_cost: totalCost,
                    notes,
                    items: {
                        create: lotItems.map((item: any) => ({
                            color: item.color,
                            size: item.size,
                            qty: item.qty
                        }))
                    },
                    consumptions: {
                        create: supplyNeeds.map((sn: any) => ({
                            supply_id: sn.supply_id,
                            color: sn.color,
                            quantity: sn.quantity,
                            unit_cost: sn.unit_cost
                        }))
                    }
                }
            });

            // If it is immediately marked as produced, we deduct inventory
            if (lot.status === 'PRODUCIDO') {
                for (const sn of supplyNeeds) {
                    const currentSupply = await tx.supply.findUnique({ where: { supply_id: sn.supply_id } });
                    if (!currentSupply) continue;
                    
                    const q = Number(sn.quantity);
                    const stockBefore = Number(currentSupply.stock);
                    const stockAfter = stockBefore - q;

                    await tx.supply.update({
                        where: { supply_id: sn.supply_id },
                        data: { stock: stockAfter }
                    });

                    await tx.supply_movement.create({
                        data: {
                            supply_id: sn.supply_id,
                            movement_type: 'OUT',
                            qty: q,
                            stock_before: stockBefore,
                            stock_after: stockAfter,
                            reason: `Consumo por Lote ${lot.code}`,
                            lot_id: lot.lot_id
                        }
                    });
                }
            }
        });

        return NextResponse.json({ success: true, message: 'Lote registrado con éxito' });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
