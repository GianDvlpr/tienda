const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto, randomUUID } = require('node:crypto');

function loadTs(file, mocks = {}, globals = {}) {
    const absolute = path.resolve(file);
    const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const exports = {};
    vm.runInNewContext(output, { exports, console: { ...console, error() {} }, process: { env: { ADMIN_AUTH_SECRET: 'test-only-secret-with-more-than-32-characters', CULQI_SECRET_KEY: 'test' } },
        crypto: webcrypto, TextEncoder, TextDecoder, btoa, atob, AbortSignal, Request, Response,
        require(name) {
            if (Object.hasOwn(mocks, name)) return mocks[name];
            if (name.startsWith('.')) return loadTs(path.resolve(path.dirname(absolute), name + '.ts'), mocks, globals);
            if (name.startsWith('@/')) return loadTs(path.resolve('src', name.slice(2) + '.ts'), mocks, globals);
            return require(name);
        }, ...globals }, { filename: absolute });
    return exports;
}
const rules = loadTs('src/lib/order-rules.ts');

test('checkout only accepts the two supported methods', () => {
    assert.equal(rules.checkoutMethod('CULQI'), 'CULQI');
    assert.equal(rules.checkoutMethod('WHATSAPP'), 'WHATSAPP');
    for (const value of [undefined, null, '', 'CASH', 'PAID', {}, false]) assert.throws(() => rules.checkoutMethod(value));
});

test('logistical status does not create money and PAID requires the full ledger amount', () => {
    assert.doesNotThrow(() => rules.validatePaidStatus('IN_PRODUCTION', 100, 30));
    assert.throws(() => rules.validatePaidStatus('PAID', 100, 30));
    assert.doesNotThrow(() => rules.validatePaidStatus('PAID', 100, 100));
    const totals = rules.paymentTotals(100, [30, 20]);
    assert.equal(totals.amountPaid, 50); assert.equal(totals.balanceDue, 50);
    assert.equal(rules.paymentTotals(1, [0.1, 0.2]).amountPaid, 0.3);
    assert.equal(rules.paymentTotals(20, [30]).amountPaid, 30); // Never silently discard overpayment history.
});

test('invalid checkout method is rejected before querying the database or charging', async () => {
    const { POST } = loadTs('src/app/api/store/checkout/route.ts', {
        '@/lib/prisma': { prisma: new Proxy({}, { get() { throw new Error('Unexpected database access'); } }) },
        '@/lib/checkout-payment': { processCheckoutPayment() { throw new Error('Unexpected charge'); } },
    });
    const response = await POST(new Request('http://localhost/api/store/checkout', { method: 'POST', body: JSON.stringify({ payment_method: 'CASH' }) }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Método de pago inválido/);
});

test('atomic inventory predicate allows only one buyer of the last unit', async () => {
    let stock = 1; const lines = new Map(); const movements = [];
    const tx = {
        product_variant: {
            async updateMany({ where, data }) { assert.equal(where.stock.gte, 1); if (stock < where.stock.gte) return { count: 0 }; stock -= data.stock.decrement; return { count: 1 }; },
            async findUniqueOrThrow() { return { stock }; },
        },
        order_item: { async update({ where, data }) { lines.set(where.order_item_id, data.stock_deducted); } },
        inventory_movement: { async create({ data }) { movements.push(data); } },
    };
    const { deductItemStock } = loadTs('src/lib/order-stock.ts');
    const requests = [1, 2].map(n => deductItemStock(tx, { order_item_id: 'line' + n, order_id: 'order' + n, variant_id: 'variant', qty: 1 }, 'test'));
    const results = await Promise.allSettled(requests);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(stock, 0); assert.equal(movements.length, 1);
    assert.equal(movements[0].stock_before, 1); assert.equal(movements[0].stock_after, 0);
});

test('cancelling twice restores only the units actually deducted', async () => {
    let stock = 0;
    const items = [{ order_item_id: 'normal', variant_id: 'v', qty: 2, stock_deducted: true }, { order_item_id: 'custom', variant_id: 'v', qty: 4, stock_deducted: false }];
    const movements = [];
    const tx = {
        order_item: { async findMany() { return items.filter(i => i.stock_deducted); }, async update({ where, data }) { Object.assign(items.find(i => i.order_item_id === where.order_item_id), data); } },
        product_variant: { async update({ data }) { stock += data.stock.increment; return { stock }; } },
        inventory_movement: { async create({ data }) { movements.push(data); } },
    };
    const { releaseOrderStock } = loadTs('src/lib/order-stock.ts');
    await releaseOrderStock(tx, 'o', 'cancel'); await releaseOrderStock(tx, 'o', 'cancel');
    assert.equal(stock, 2); assert.equal(movements.length, 1);
});

function fakeCheckout(status = 'CREATED') {
    const attempt = { status, charge_id: null };
    const order = { order_id: 'order', code: 'ORD-test', total: 100, checkout_attempt: attempt };
    const prisma = {
        checkout_attempt: {
            async updateMany({ where, data }) { if (attempt.status !== where.status) return { count: 0 }; Object.assign(attempt, data); return { count: 1 }; },
            async update({ data }) { Object.assign(attempt, data); return attempt; },
        },
        order_header: { async findUniqueOrThrow() { return order; } },
    };
    return { prisma, attempt, order };
}

test('a network timeout is left for review and retry never submits a second charge', async () => {
    const state = fakeCheckout(); let charges = 0;
    const payment = loadTs('src/lib/checkout-payment.ts', { './prisma': { prisma: state.prisma } }, { async fetch() { charges++; throw new Error('Connection lost'); } });
    await Promise.all([payment.processCheckoutPayment('order', 'token', 'x@test.local'), payment.processCheckoutPayment('order', 'token', 'x@test.local')]);
    assert.equal(charges, 1); assert.equal(state.attempt.status, 'REVIEW');
    await payment.processCheckoutPayment('order', 'token', 'x@test.local'); assert.equal(charges, 1);
});

test('unconfirmed 3DS response never becomes a paid order', async () => {
    const state = fakeCheckout();
    const payment = loadTs('src/lib/checkout-payment.ts', { './prisma': { prisma: state.prisma } }, { async fetch() { return Response.json({ action_code: 'REVIEW' }); } });
    assert.equal(await payment.processCheckoutPayment('order', 'token', 'x@test.local'), false);
    assert.equal(state.attempt.status, 'REVIEW');
});

test('charge reconciliation checks order ownership, amount, currency, capture and refund', () => {
    const payment = loadTs('src/lib/checkout-payment.ts', { './prisma': { prisma: {} } });
    const valid = { object: 'charge', id: 'chr_test_123456', amount: 10000, currency_code: 'PEN', capture: true, amount_refunded: 0, metadata: { order_id: 'order' } };
    assert.equal(payment.isConfirmedCharge(valid, 'order', 100), true);
    for (const change of [{ amount: 1 }, { currency_code: 'USD' }, { capture: false }, { metadata: { order_id: 'other' } }, { amount_refunded: 1 }, { id: 'invalid' }]) assert.equal(payment.isConfirmedCharge({ ...valid, ...change }, 'order', 100), false);
});

test('new partial payment preserves earlier ledger entries while shipping stays unchanged', async () => {
    const order = { total: 100, status: 'IN_PRODUCTION', paid_at: null };
    const payments = [{ amount: 30, method: 'OTHER', reference: null }];
    const tx = {
        order_header: { async findUniqueOrThrow() { return order; }, async update({ data }) { Object.assign(order, data); } },
        order_payment: {
            async aggregate() { return { _sum: { amount: payments.reduce((sum, p) => sum + p.amount, 0) } }; },
            async findMany() { return [...payments].reverse(); },
            async create({ data }) { payments.push(data); return data; },
        },
    };
    const { addPayment } = loadTs('src/lib/order-payments.ts');
    await addPayment(tx, 'order', { amount: 20, method: 'YAPE' });
    assert.equal(order.amount_paid, 50); assert.equal(order.balance_due, 50); assert.equal(order.status, 'IN_PRODUCTION');
    await assert.rejects(() => addPayment(tx, 'order', { amount: 50.01, method: 'YAPE' }));
});

test('session is rejected after deactivation, role change or session version rotation', async () => {
    const auth = loadTs('src/lib/admin-auth.ts');
    const session = { user_id: randomUUID(), username: 'tester', role: 'ADMIN', session_version: randomUUID() };
    const token = await auth.createAdminToken(session);
    let user = { ...session, is_active: true };
    const active = loadTs('src/lib/admin-session.ts', { './prisma': { prisma: { admin_user: { async findUnique() { return user; } } } } });
    assert.ok(await active.verifyActiveAdminSession(token));
    user = { ...user, is_active: false }; assert.equal(await active.verifyActiveAdminSession(token), null);
    user = { ...user, is_active: true, role: 'SELLER' }; assert.equal(await active.verifyActiveAdminSession(token), null);
    user = { ...user, role: 'ADMIN', session_version: randomUUID() }; assert.equal(await active.verifyActiveAdminSession(token), null);
    assert.equal(await active.verifyActiveAdminSession('malformed'), null);
});

test('public order API requires a tracking token before reading the database', async () => {
    const { GET } = loadTs('src/app/api/store/orders/[code]/route.ts', { '@/lib/prisma': { prisma: new Proxy({}, { get() { throw Error('Unexpected DB access'); } }) } });
    const response = await GET({ nextUrl: new URL('http://localhost/api/store/orders/ORD-test') }, { params: Promise.resolve({ code: 'ORD-test' }) });
    assert.equal(response.status, 404);
});

test('backup ordering covers every current model and all foreign-key parents precede their children', () => {
    const { models, importOrder } = require('../scripts/backup-utils.cjs');
    const order = importOrder().map(m => m.name);
    assert.equal(order.length, models.length);
    for (const model of models) for (const field of model.fields.filter(f => f.kind === 'object' && f.relationFromFields?.length)) assert.ok(order.indexOf(field.type) < order.indexOf(model.name));
    for (const name of ['order_payment', 'proforma_header', 'proforma_item', 'link_page_settings', 'link_page_item', 'checkout_attempt']) assert.ok(order.includes(name));
});

test('incomplete backup is rejected in preflight without a database client', () => {
    const { loadBackup } = require('../scripts/backup-utils.cjs');
    const folder = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'aura-backup-test-'));
    try {
        fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify({ provider: 'postgresql', tables: [] }));
        assert.throws(() => loadBackup(folder), /todos los modelos/);
    } finally { fs.unlinkSync(path.join(folder, 'manifest.json')); fs.rmdirSync(folder); }
});

test('provider success followed by DB failure retains the charge reference and never charges again', async () => {
    const state = fakeCheckout(); let charges = 0;
    state.prisma.$transaction = async () => { throw Error('Database unavailable'); };
    const payment = loadTs('src/lib/checkout-payment.ts', { './prisma': { prisma: state.prisma } }, { async fetch() {
        charges++;
        return Response.json({ object: 'charge', id: 'chr_test_recoverable', amount: 10000, currency_code: 'PEN', capture: true, metadata: { order_id: 'order' } });
    } });
    await payment.processCheckoutPayment('order', 'token', 'x@test.local');
    assert.equal(state.attempt.status, 'REVIEW'); assert.equal(state.attempt.charge_id, 'chr_test_recoverable');
    await payment.processCheckoutPayment('order', 'token', 'x@test.local'); assert.equal(charges, 1);
});

test('reconciling the same confirmed charge twice records exactly one payment', async () => {
    const attempt = { status: 'REVIEW', charge_id: null };
    const order = { order_id: 'order', total: 100, checkout_attempt: attempt };
    let payments = 0;
    const tx = {
        checkout_attempt: { async update({ data }) { Object.assign(attempt, data); } },
        order_header: { async update({ data }) { Object.assign(order, data); return order; } },
    };
    const payment = loadTs('src/lib/checkout-payment.ts', {
        './prisma': { prisma: { async $transaction(fn) { return fn(tx); } } },
        './order-stock': { async lockOrder() { return order; } },
        './order-payments': { async addPayment() { payments++; } },
    });
    const charge = { object: 'charge', id: 'chr_test_reconcile', amount: 10000, currency_code: 'PEN', capture: true, metadata: { order_id: 'order' } };
    await payment.completeCheckoutPayment('order', charge);
    await payment.completeCheckoutPayment('order', charge);
    assert.equal(payments, 1); assert.equal(order.status, 'PAID');
    await assert.rejects(() => payment.completeCheckoutPayment('order', { ...charge, id: 'chr_test_another' }));
});

test('checkout persists order and deducts stock before asking the provider to charge, then safely replays', async () => {
    const variantId = '00000000-0000-4000-8000-000000000001';
    const product = { product_id: 'p', name: 'Prenda', base_price: 100, is_active: true, is_customizable: false, customization_surcharge: 0 };
    const variant = { variant_id: variantId, product_id: 'p', price: 100, stock: 1, is_active: true, size: 'M', color: 'Negro', sku: 'TEST', product };
    let order, attempt, charges = 0;
    const rows = [];
    const prisma = {
        product_variant: {
            async findMany() { return [variant]; },
            async updateMany({ where, data }) { if (variant.stock < where.stock.gte) return { count: 0 }; variant.stock -= data.stock.decrement; return { count: 1 }; },
            async findUniqueOrThrow() { return variant; },
        },
        bundle_promotion: { async findMany() { return []; } },
        order_header: { async create({ data }) { order = { ...data, order_id: 'order', tracking_token: 'a'.repeat(64), order_item: rows }; return order; } },
        checkout_attempt: {
            async findUnique() { return attempt || null; },
            async create({ data }) { attempt = { ...data, order }; return attempt; },
            async findUniqueOrThrow() { return attempt; },
        },
        order_item: {
            async create({ data }) { const item = { ...data, order_item_id: 'line' }; rows.push(item); return item; },
            async update({ data }) { Object.assign(rows[0], data); },
        },
        inventory_movement: { async create() {} },
        async $transaction(fn) { return fn(prisma); },
    };
    const { POST } = loadTs('src/app/api/store/checkout/route.ts', {
        '@/lib/prisma': { prisma },
        '@/lib/pusher': { pusherServer: { async trigger() {} } },
        '@/lib/checkout-payment': { async processCheckoutPayment() { assert.ok(order); assert.equal(variant.stock, 0); assert.equal(order.status, 'PENDING_PAYMENT'); charges++; attempt.status = 'SUCCEEDED'; } },
    });
    const body = { checkout_id: randomUUID(), payment_method: 'CULQI', shipping_name: 'Test', shipping_dni: '12345678', shipping_phone: '900000000', culqi_token: 'token-test', items: [{ variantId, qty: 1, name: 'Prenda', size: 'M', color: 'Negro' }] };
    const request = () => new Request('http://localhost/api/store/checkout', { method: 'POST', body: JSON.stringify(body) });
    assert.equal((await POST(request())).status, 200);
    assert.equal((await POST(request())).status, 200);
    assert.equal(charges, 1); assert.equal(rows.length, 1); assert.equal(variant.stock, 0);
    body.items[0].qty = 2;
    assert.equal((await POST(request())).status, 409); assert.equal(charges, 1);
});
