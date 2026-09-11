const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks = {}) {
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', output)(name => mocks[name] || require(name), module, module.exports);
    return module.exports;
}
const seo = load('src/lib/seo.ts');
test('JSON-LD cannot close its HTML script and preserves product text', () => {
    const value = { name: '</script><script>alert(1)</script>' };
    const encoded = seo.serializeJsonLd(value);
    assert.equal(encoded.includes('<'), false);
    assert.deepEqual(JSON.parse(encoded), value);
});
test('pagination has distinct canonicals while filter URLs are noindex', () => {
    const metadata = params => seo.catalogMetadata('/shop', 'Ropa', 'Descripción', params);
    assert.equal(metadata({}).alternates.canonical, 'https://auraboutique.me/shop');
    assert.equal(metadata({ page: '2' }).alternates.canonical, 'https://auraboutique.me/shop?page=2');
    assert.equal(metadata({ page: '2' }).robots.index, true);
    assert.equal(metadata({ q: 'chaleco' }).robots.index, false);
    assert.equal(metadata({ colors: 'Negro', page: '2' }).robots.index, false);
    assert.equal(metadata({ utm_source: 'instagram' }).robots.index, true);
});
test('offers keep each variant price and stock paired', () => {
    const result = seo.productStructuredData({ product: { name: 'Pantalón', slug: 'pantalon', description: '<b>Elegante</b>' }, images: [], variants: [
        { sku: 'A', price: 40, stock: 0 }, { sku: 'B', price: 60, stock: 2 },
    ] });
    assert.equal(result.description, 'Elegante');
    assert.equal(result.offers[0].price, 40);
    assert.equal(result.offers[0].availability, 'https://schema.org/OutOfStock');
    assert.equal(result.offers[1].price, 60);
    assert.equal(result.offers[1].availability, 'https://schema.org/InStock');
});
test('shared catalog query preserves sorting, pagination and personalized filtering', async () => {
    let where;
    const rows = Array.from({ length: 15 }, (_, i) => ({ product_id: String(i), slug: 'p-'+i, name: 'Prenda '+i, created_at: new Date(2026, 0, i+1), base_price: 20,
        product_variant: [{ price: i+1, stock: i % 2 }], product_image: [], is_customizable: true }));
    const { listStoreProducts, querySchema } = load('src/lib/store-products.ts', { '@/lib/prisma': { prisma: { product: { findMany: async args => { where = args.where; return rows; } } } } });
    const result = await listStoreProducts(querySchema.parse({ page: '2', customizable: '1', sort: 'PRICE_ASC', minPrice: '2' }));
    assert.equal(result.total, 14);
    assert.equal(result.page, 2);
    assert.deepEqual(result.items.map(item => item.minPrice), [14, 15]);
    assert.equal(where.is_customizable, true);
    assert.equal(where.is_active, true);
    assert.equal(querySchema.safeParse({ page: '-1' }).success, false);
});
