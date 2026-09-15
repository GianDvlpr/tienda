import { Prisma } from '@prisma/client';
import { calculateProductionCost, type CalcLotItem } from './production-calc';
import { lotItemsSchema, ProductionError } from './production-rules';
import { lockSupply, consumeSupply } from './supply-stock';

export async function productionPlan(tx: Prisma.TransactionClient, productId: string, items: CalcLotItem[]) {
    lotItemsSchema.parse(items);
    const product = await tx.product.findUnique({ where: { product_id: productId }, include: { product_variant: { where: { is_active: true } } } });
    if (!product?.is_active) throw new ProductionError('Producto inexistente o inactivo');
    const destinations = items.map(item => {
        const matches = product.product_variant.filter(v => v.color === item.color && v.size === item.size);
        if (matches.length !== 1) throw new ProductionError(`Configura una variante activa única para ${item.color} / ${item.size}`);
        return { ...item, variant_id: matches[0].variant_id };
    });
    const supplies = await tx.product_bom_supply.findMany({ where: { product_id: productId }, include: { supply: true } });
    const services = await tx.product_bom_service.findMany({ where: { product_id: productId }, include: { service: true } });
    if (!supplies.length && !services.length) throw new ProductionError('Configura la receta antes de registrar producción');
    if (supplies.some(row => !row.supply.is_active) || services.some(row => !row.service.is_active)) throw new ProductionError('La receta contiene materiales o servicios inactivos');
    const colorsBySupply = new Map<string, Record<string, number>>();
    for (const id of [...new Set(supplies.map(row => row.supply_id))].sort()) {
        const current = await lockSupply(tx, id);
        colorsBySupply.set(id, Object.fromEntries(current.supply_color_stock.map(row => [row.color.name, Number(row.unit_cost_override ?? current.unit_cost)])));
        for (const row of supplies.filter(row => row.supply_id === id)) row.supply = current;
    }
    const cost = calculateProductionCost(items, supplies.map(row => ({ ...row, colorCosts: colorsBySupply.get(row.supply_id) })), services);
    return { ...cost, destinations };
}

// The caller holds the lot row lock (or just created this lot in the same transaction).
export async function finishProduction(tx: Prisma.TransactionClient, lotId: string) {
    await tx.$queryRaw`SELECT lot_id FROM production_lot WHERE lot_id = ${lotId}::uuid FOR UPDATE`;
    const lot = await tx.production_lot.findUnique({ where: { lot_id: lotId }, include: { items: true, consumptions: true } });
    if (!lot) throw new ProductionError('Lote no encontrado', 404);
    // Historical produced lots are never reposted: their finished stock may already have been entered manually.
    if (lot.status === 'PRODUCIDO') return lot;
    if (lot.status !== 'PENDIENTE') throw new ProductionError('El estado del lote no permite finalizarlo');
    lotItemsSchema.parse(lot.items);
    const product = await tx.product.findUnique({ where: { product_id: lot.product_id }, include: { product_variant: { where: { is_active: true } } } });
    if (!product?.is_active) throw new ProductionError('Producto inexistente o inactivo');
    const snapshot = lot.cost_snapshot ? JSON.parse(lot.cost_snapshot) as { destinations: { color: string; size: string; variant_id: string }[] } : null;
    const variants = lot.items.map(item => {
        const saved = snapshot?.destinations.find(row => row.color === item.color && row.size === item.size);
        const candidates = product.product_variant.filter(v => v.color === item.color && v.size === item.size && (!saved || v.variant_id === saved.variant_id));
        if (candidates.length !== 1) throw new ProductionError(`Variante no disponible: ${item.color} / ${item.size}`);
        return { variantId: candidates[0].variant_id, qty: item.qty };
    }).sort((a,b) => a.variantId.localeCompare(b.variantId));
    for (const consumption of [...lot.consumptions].sort((a,b) => a.supply_id.localeCompare(b.supply_id))) {
        await consumeSupply(tx, consumption.supply_id, Number(consumption.quantity), consumption.color, lotId, lot.code);
    }
    for (const item of variants) {
        const changed = await tx.product_variant.updateMany({ where: { variant_id: item.variantId, is_active: true, product: { is_active: true } }, data: { stock: { increment: item.qty } } });
        if (changed.count !== 1) throw new ProductionError('La variante ya no está disponible');
        const variant = await tx.product_variant.findUniqueOrThrow({ where: { variant_id: item.variantId } });
        await tx.inventory_movement.create({ data: { variant_id: item.variantId, movement_type: 'IN', qty: item.qty,
            stock_before: variant.stock - item.qty, stock_after: variant.stock, reason: `Producción ${lot.code} (${lotId})` } });
    }
    return tx.production_lot.update({ where: { lot_id: lotId }, data: { status: 'PRODUCIDO', updated_at: new Date() } });
}
