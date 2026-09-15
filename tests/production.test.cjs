const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
function loader(mocks = {}) {
    const cache = new Map();
    function load(file) {
        file = path.resolve(file);
        if (cache.has(file)) return cache.get(file);
        const exports = {};
        cache.set(file, exports);
        const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
        new Function('require', 'exports', js)(name => {
            if (name in mocks) return mocks[name];
            if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts');
            if (name.startsWith('.')) return load(path.join(path.dirname(file), name + '.ts'));
            return require(name);
        }, exports);
        return exports;
    }
    return load;
}
const load = loader();
const rules = load('src/lib/production-rules.ts');
const { calculateProductionCost } = load('src/lib/production-calc.ts');
test('production rejects negative, zero, fractional, duplicate and nonnumeric quantities', () => {
    for (const qty of [-2, 0, 1.5, '2', NaN, Infinity]) assert.equal(rules.lotItemsSchema.safeParse([{ size: 'S', color: 'Negro', qty }]).success, false);
    const item = { size: 'S', color: 'Negro', qty: 1 };
    assert.equal(rules.lotItemsSchema.safeParse([item, item]).success, false);
    assert.equal(rules.createLotSchema.safeParse({ lot_id: randomUUID(), product_id: randomUUID(), lotItems: [item], status: 'INVALID' }).success, false);
});
test('cost snapshot uses service overrides, color costs, and fabric rounding', () => {
    const cost = calculateProductionCost([{ size: 'S', color: 'Negro', qty: 2 }], [{ supply: { supply_id: 's', name: 'Tela', type: 'TELA', unit: 'MT', unit_cost: 2 }, quantity: 1.1, varies_by_color: true, colorCosts: { Negro: 4 } }], [{ service: { service_id: 'v', name: 'Confección', unit_cost: 10 }, quantity: 1, unit_cost_override: 7 }]);
    assert.equal(cost.totalCost, 24); assert.equal(cost.totalServiceCost, 14); assert.equal(cost.supplyNeeds[0].quantity, 2.5);
    assert.equal(calculateProductionCost([{ size: 'S', color: 'Negro', qty: 2 }], [], [{ service: { service_id: 'v', name: 'Confección', unit_cost: 10 }, quantity: 1, unit_cost_override: 0 }]).totalCost, 0);
});

test('production database integration in an isolated disposable schema', { skip: process.env.RUN_PRODUCTION_DB_TESTS !== '1', timeout: 240000 }, async t => {
    require('dotenv').config({ quiet: true });
    const { PrismaClient } = require('@prisma/client');
    const admin = new PrismaClient();
    const schema = 'test_production_' + randomUUID().replaceAll('-', '');
    assert.match(schema, /^test_production_[a-f0-9]{32}$/);
    const tables = ['supply', 'custom_color', 'supply_color_stock', 'supply_movement', 'product', 'product_variant', 'service', 'product_bom_supply', 'product_bom_service', 'production_lot', 'production_lot_item', 'production_lot_consumption', 'inventory_movement'];
    let db;
    try {
        await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
        for (const table of tables) await admin.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
        const url = new URL(process.env.DATABASE_URL); url.searchParams.set('schema', schema); url.searchParams.set('connection_limit', '5');
        db = new PrismaClient({ datasourceUrl: url.href });
        assert.equal((await db.$queryRaw`SELECT current_schema() AS name`)[0].name, schema);
        const isolatedDb = new Proxy(db, { get(target, property) {
            if (property === '$transaction') return (fn, options) => target.$transaction(async tx => {
                // ORM queries are schema-qualified; raw row locks also need an explicit transaction search path.
                await tx.$executeRawUnsafe('SET LOCAL search_path TO "' + schema + '"');
                assert.equal((await tx.$queryRaw`SELECT current_schema() AS name`)[0].name, schema);
                return fn(tx);
            }, options);
            return target[property];
        } });
        const use = loader({ '@/lib/prisma': { prisma: isolatedDb }, '@/lib/audit': { recordAudit: async () => {} } });
        const lots = use('src/app/api/admin/production/lots/route.ts');
        const finish = use('src/app/api/admin/production/lots/[id]/finish/route.ts');
        const restock = use('src/app/api/admin/supplies/restock/route.ts');
        const colors = use('src/app/api/admin/supply-colors/route.ts');
        const request = data => new Request('http://test.local', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
        const call = async (route, data) => { const response = await route.POST(request(data)); return { status: response.status, body: await response.json() }; };
        const finalize = async id => { const r = await finish.POST(request({}), { params: Promise.resolve({ id }) }); return { status: r.status, body: await r.json() }; };
        async function fixture(stock = 40) {
            const id = randomUUID();
            const product = await db.product.create({ data: { name: 'Fixture', slug: id, product_variant: { create: { sku: id, size: 'S', color: id, stock: 0 } } }, include: { product_variant: true } });
            const color = await db.custom_color.create({ data: { name: id, hex: '#000000' } });
            const supply = await db.supply.create({ data: { name: id, type: 'TELA', unit: 'MT', unit_cost: 2, stock, supply_color_stock: { create: { color_id: color.color_id, stock } } } });
            const service = await db.service.create({ data: { name: id, unit_cost: 10 } });
            await db.product_bom_supply.create({ data: { product_id: product.product_id, supply_id: supply.supply_id, quantity: 1.25, varies_by_color: true } });
            await db.product_bom_service.create({ data: { product_id: product.product_id, service_id: service.service_id, quantity: 1, unit_cost_override: 7 } });
            return { product, color, supply, input: { lot_id: randomUUID(), product_id: product.product_id, lotItems: [{ color: id, size: 'S', qty: 2 }], status: 'PENDIENTE' } };
        }
        await t.test('pending snapshot and concurrent finalization post inventory exactly once', async () => {
            const f = await fixture();
            const created = await call(lots, f.input); assert.equal(created.status, 200, JSON.stringify(created.body));
            assert.equal(Number(created.body.lot.total_cost), 19);
            await db.service.updateMany({ data: { unit_cost: 999 } });
            const responses = await Promise.all([finalize(f.input.lot_id), finalize(f.input.lot_id)]);
            for (const r of responses) assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(Number((await db.supply.findUnique({ where: { supply_id: f.supply.supply_id } })).stock), 37.5);
            assert.equal(Number((await db.supply_color_stock.findFirst({ where: { supply_id: f.supply.supply_id } })).stock), 37.5);
            assert.equal((await db.product_variant.findUnique({ where: { variant_id: f.product.product_variant[0].variant_id } })).stock, 2);
            assert.equal(await db.inventory_movement.count({ where: { variant_id: f.product.product_variant[0].variant_id } }), 1);
            assert.equal(Number(responses[0].body.lot.total_cost), 19);
            const replay = await call(lots, f.input); assert.equal(replay.status, 200);
            assert.equal((await call(lots, { ...f.input, notes: 'changed' })).status, 409);
        });
        await t.test('two lots cannot consume the same final materials; failed operation rolls back', async () => {
            const f = await fixture(20);
            const a = { ...f.input, status: 'PRODUCIDO', lotItems: [{ ...f.input.lotItems[0], qty: 12 }] };
            const b = { ...a, lot_id: randomUUID() };
            const results = await Promise.all([call(lots, a), call(lots, b)]);
            assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
            assert.equal(Number((await db.supply.findUnique({ where: { supply_id: f.supply.supply_id } })).stock), 5);
            assert.equal(await db.production_lot.count({ where: { product_id: f.product.product_id } }), 1);
            assert.equal((await db.product_variant.findUnique({ where: { variant_id: f.product.product_variant[0].variant_id } })).stock, 12);
        });
        await t.test('simultaneous restocks preserve quantities, movement balances and weighted cost', async () => {
            const supply = await db.supply.create({ data: { name: 'plain', type: 'AVIO', unit: 'UND', unit_cost: 2, stock: 10 } });
            const results = await Promise.all([5,8].map(qty => call(restock, { supply_id: supply.supply_id, qty, new_unit_cost: 4 })));
            for (const r of results) assert.equal(r.status, 200, JSON.stringify(r.body));
            const current = await db.supply.findUnique({ where: { supply_id: supply.supply_id } });
            assert.equal(Number(current.stock), 23); assert.ok(Math.abs(Number(current.unit_cost) - 72/23) < .0002);
            const movements = await db.supply_movement.findMany({ where: { supply_id: supply.supply_id }, orderBy: { created_at: 'asc' } });
            assert.equal(Number(movements[0].stock_before), 10); assert.equal(Number(movements[1].stock_after),23);
        });
        await t.test('color restock requires a color and stale stock edits cannot restore consumed fabric', async () => {
            const f = await fixture(10);
            assert.equal((await call(restock, { supply_id: f.supply.supply_id, qty: 2 })).status, 409);
            assert.equal((await call(lots, { ...f.input, status: 'PRODUCIDO' })).status, 200);
            const stale = { supply_id: f.supply.supply_id, color_ids: [f.color.color_id], stock: 10, expected_total: 10, expected_stocks: { [f.color.color_id]: 10 } };
            assert.equal((await call(colors, stale)).status, 409);
            const replenished = await call(restock, { supply_id: f.supply.supply_id, color_id: f.color.color_id, qty: 2, new_unit_cost: 4 });
            assert.equal(replenished.status, 200);
            assert.equal(Number(replenished.body.stock), 9.5);
            assert.equal(Number((await db.supply_color_stock.findFirst({ where: { supply_id: f.supply.supply_id } })).stock), 9.5);
        });
        await t.test('concurrent identical create requests create and consume only one lot', async () => {
            const f = await fixture(); const input = { ...f.input, status: 'PRODUCIDO' };
            const results = await Promise.all([call(lots, input), call(lots, input)]);
            for(const r of results) assert.equal(r.status,200,JSON.stringify(r.body));
            assert.equal(await db.production_lot.count({where:{product_id:f.product.product_id}}),1);
            assert.equal(Number((await db.supply.findUnique({where:{supply_id:f.supply.supply_id}})).stock),37.5);
        });
        await t.test('a later material failure rolls back earlier consumption and keeps the lot pending', async () => {
            const f = await fixture(10);
            const extra = await db.supply.create({data:{supply_id:'ffffffff-ffff-4fff-8fff-ffffffffffff',name:'insufficient',type:'AVIO',unit:'UND',unit_cost:1,stock:0}});
            await db.product_bom_supply.create({data:{product_id:f.product.product_id,supply_id:extra.supply_id,quantity:1}});
            assert.equal((await call(lots,f.input)).status,200);
            assert.equal((await finalize(f.input.lot_id)).status,409);
            assert.equal(Number((await db.supply.findUnique({where:{supply_id:f.supply.supply_id}})).stock),10);
            assert.equal(await db.supply_movement.count({where:{lot_id:f.input.lot_id}}),0);
            assert.equal((await db.production_lot.findUnique({where:{lot_id:f.input.lot_id}})).status,'PENDIENTE');
            assert.equal((await db.product_variant.findUnique({where:{variant_id:f.product.product_variant[0].variant_id}})).stock,0);
        });
        await t.test('color adjustments preserve hidden stock and require explicit reconciliation of old differences', async () => {
            const f=await fixture(10);
            const input={supply_id:f.supply.supply_id,color_ids:[f.color.color_id],stock:7,expected_total:10,expected_stocks:{[f.color.color_id]:10},is_active:false};
            const adjusted=await call(colors,input);assert.equal(adjusted.status,200,JSON.stringify(adjusted.body));
            assert.equal(Number((await db.supply.findUnique({where:{supply_id:f.supply.supply_id}})).stock),7);
            await db.supply.update({where:{supply_id:f.supply.supply_id},data:{stock:6}});
            const mismatch={...input,expected_total:6,expected_stocks:{[f.color.color_id]:7}};
            assert.equal((await call(colors,mismatch)).status,409);
            assert.equal((await call(colors,{...mismatch,reconcile:true})).status,200);
            assert.equal(Number((await db.supply.findUnique({where:{supply_id:f.supply.supply_id}})).stock),7);
        });
        await t.test('invalid quantities never create lots and history query is valid', async () => {
            const f = await fixture();
            assert.equal((await call(lots,{...f.input,lotItems:[{...f.input.lotItems[0],qty:-2}],status:'PRODUCIDO'})).status,400);
            assert.equal(await db.production_lot.count({where:{product_id:f.product.product_id}}),0);
            const response=await lots.GET(); assert.equal(response.status,200);
            const data=await response.json();assert.ok(data.length>0);assert.ok(data[0].consumptions[0].supply.name);
        });
    } finally {
        if(db) await db.$disconnect();
        // Only the random schema created by this test can be removed.
        if (!/^test_production_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid test schema');
        await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.$disconnect();
    }
});
