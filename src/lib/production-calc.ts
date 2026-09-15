import { lotItemsSchema, ProductionError } from './production-rules';
type Numeric = number | string | { toString(): string };
export interface CalcLotItem {
  size: string;
  color: string;
  qty: number;
}

export interface CalcSupplyInput {
  supply: {
    supply_id: string;
    name: string;
    type: string;
    unit: string;
    unit_cost: Numeric;
  };
  quantity: Numeric;
  size?: string | null;
  varies_by_color?: boolean;
  colorCosts?: Record<string, number>;
}

export interface CalcServiceInput {
  service: {
    service_id: string;
    name: string;
    unit_cost: Numeric;
  };
  quantity: Numeric;
  unit_cost_override?: Numeric | null;
}

export interface SupplyNeed {
  supply_id: string; name: string; type: string; unit: string; unit_cost: number; color: string | null;
  quantity: number; cost: number; waste: number;
}
export interface ServiceNeed { service_id: string; name: string; unit_cost: number; quantity: number; cost: number; }
export interface CalcResult {
  totalQty: number;
  totalSupplyCost: number;
  totalServiceCost: number;
  totalCost: number;
  avgCostPerGarment: number;
  supplyNeeds: SupplyNeed[];
  serviceNeeds: ServiceNeed[];
}

export function calculateProductionCost(
  lotItems: CalcLotItem[],
  bomSupplies: CalcSupplyInput[],
  bomServices: CalcServiceInput[]
): CalcResult {
  lotItemsSchema.parse(lotItems);
  for (const row of [...bomSupplies, ...bomServices]) {
    if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) throw new ProductionError('La receta contiene cantidades inválidas');
    const source = 'supply' in row ? row.supply : row.service;
    const cost = 'unit_cost_override' in row && row.unit_cost_override != null ? row.unit_cost_override : source.unit_cost;
    if (!Number.isFinite(Number(cost)) || Number(cost) < 0) throw new ProductionError('La receta contiene costos inválidos');
  }
  let totalSupplyCost = 0;
  let totalServiceCost = 0;
  let totalQty = 0;

  const supplyNeeds: SupplyNeed[] = []; // { supply_id, name, type, unit, unit_cost, color, quantity, cost, waste }

  // Process lot items one by one
  for (const lotItem of lotItems) {
    totalQty += lotItem.qty;

    // 1. Calculate Supplies for this lot item
    for (const boms of bomSupplies) {
      if (!boms.size || boms.size === 'ALL' || boms.size === lotItem.size) {
        const materialRawQty = Number(boms.quantity) * lotItem.qty;

        const targetColor = boms.varies_by_color ? lotItem.color : null;
        const existing = supplyNeeds.find(
          s => s.supply_id === boms.supply.supply_id && s.color === targetColor
        );

        if (existing) {
          existing.quantity += materialRawQty;
        } else {
          supplyNeeds.push({
            supply_id: boms.supply.supply_id,
            name: boms.supply.name,
            type: boms.supply.type,
            unit: boms.supply.unit,
            unit_cost: targetColor && boms.colorCosts?.[targetColor] != null ? boms.colorCosts[targetColor] : Number(boms.supply.unit_cost),
            color: targetColor,
            quantity: materialRawQty,
            cost: 0,
            waste: 0,
          });
        }
      }
    }
  }

  // Apply rounding for fabrics and sum up total supply cost
  totalSupplyCost = 0;
  for (const sn of supplyNeeds) {
    if (!Number.isFinite(sn.unit_cost) || sn.unit_cost < 0) throw new ProductionError('Costo de material inválido');
    sn.waste = 0;
    if (sn.type === 'TELA' || sn.unit === 'MT') {
      const rounded = Math.ceil(sn.quantity * 2) / 2;
      sn.waste = Number((rounded - sn.quantity).toFixed(2));
      sn.quantity = rounded;
    }
    sn.cost = Number((sn.quantity * sn.unit_cost).toFixed(2));
    totalSupplyCost += sn.cost;
  }

  // 2. Calculate Services
  const serviceNeeds: ServiceNeed[] = [];
  for (const bserv of bomServices) {
    const qtyNeeded = Number(bserv.quantity) * totalQty;
    
    // Choose between override cost or standard cost
    const unitCostToUse = (bserv.unit_cost_override !== undefined && bserv.unit_cost_override !== null)
      ? Number(bserv.unit_cost_override)
      : Number(bserv.service.unit_cost);

    const cost = Number((qtyNeeded * unitCostToUse).toFixed(2));
    totalServiceCost += cost;

    serviceNeeds.push({
      service_id: bserv.service.service_id,
      name: bserv.service.name,
      unit_cost: unitCostToUse,
      quantity: qtyNeeded,
      cost: cost,
    });
  }

  const totalCost = Number((totalSupplyCost + totalServiceCost).toFixed(2));
  const avgCostPerGarment = totalQty > 0 ? Number((totalCost / totalQty).toFixed(2)) : 0;

  return {
    totalQty,
    totalSupplyCost: Number(totalSupplyCost.toFixed(2)),
    totalServiceCost: Number(totalServiceCost.toFixed(2)),
    totalCost,
    avgCostPerGarment,
    supplyNeeds,
    serviceNeeds,
  };
}
