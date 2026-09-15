import { Prisma } from '@prisma/client';
import { ProductionError } from './production-rules';
export const decimal = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
export async function lockSupply(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT supply_id FROM supply WHERE supply_id = ${id}::uuid FOR UPDATE`;
    const supply = await tx.supply.findUnique({ where: { supply_id: id }, include: { supply_color_stock: { include: { color: true } } } });
    if (!supply || !supply.is_active) throw new ProductionError('Insumo inexistente o inactivo');
    return supply;
}
export type LockedSupply = Awaited<ReturnType<typeof lockSupply>>;
export function assertColorBalance(supply: LockedSupply) {
    if (!supply.supply_color_stock.length) return;
    const sum = supply.supply_color_stock.reduce((total, row) => total.plus(row.stock), decimal(0));
    if (!sum.equals(supply.stock)) throw new ProductionError(`El stock total y por color de ${supply.name} no coincide. Revisa el conteo en Stock por Color antes de continuar.`);
}
export async function consumeSupply(tx: Prisma.TransactionClient, id: string, qty: number, color: string | null, lotId: string, code: string) {
    if (!Number.isFinite(qty) || qty <= 0) throw new ProductionError('Consumo inválido');
    const supply = await lockSupply(tx, id);
    assertColorBalance(supply);
    const q = decimal(qty).toDecimalPlaces(4);
    if (supply.stock.lessThan(q)) throw new ProductionError(`Stock insuficiente: ${supply.name}`);
    if (supply.supply_color_stock.length || color) {
        const row = supply.supply_color_stock.find(r => r.color.name === color);
        if (!row || !row.is_active || !row.is_available || !row.color.is_active || !row.color.is_available || row.stock.lessThan(q)) {
            throw new ProductionError(`Stock insuficiente o color no disponible: ${supply.name} / ${color || 'sin color'}`);
        }
        await tx.supply_color_stock.update({ where: { supply_color_id: row.supply_color_id }, data: { stock: { decrement: q }, updated_at: new Date() } });
    }
    const updated = await tx.supply.update({ where: { supply_id: id }, data: { stock: { decrement: q }, updated_at: new Date() } });
    await tx.supply_movement.create({ data: { supply_id: id, movement_type: 'OUT', qty: q, stock_before: supply.stock, stock_after: updated.stock,
        reason: `Producción ${code}${color ? ' / '+color : ''}`, lot_id: lotId } });
}
