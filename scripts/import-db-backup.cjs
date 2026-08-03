const fs = require('fs');
const path = require('path');
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const backupRoot = process.argv[2];

const importOrder = [
  'Healthcheck',
  'collection',
  'customer',
  'product',
  'product_variant',
  'product_collection',
  'product_image',
  'order_header',
  'order_item',
  'order_photo',
  'inventory_movement',
  'stock_reservation',
  'hero_slide',
  'admin_user',
  'complaint',
  'coupon',
  'supply',
  'custom_color',
  'service',
  'supply_color_stock',
  'product_bom_supply',
  'product_bom_service',
  'production_lot',
  'production_lot_item',
  'production_lot_consumption',
  'supply_movement',
  'audit_log',
  'analytics_session',
  'analytics_event',
  'bundle_promotion',
  'bundle_promotion_item',
];

const dateFields = new Set([
  'created_at',
  'updated_at',
  'paid_at',
  'expires_at',
  'released_at',
  'starts_at',
  'first_seen_at',
  'last_seen_at',
]);

function delegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function normalizeRow(row) {
  const next = { ...row };
  for (const [key, value] of Object.entries(next)) {
    if (value && dateFields.has(key)) next[key] = new Date(value);
  }
  return next;
}

function readRows(modelName, manifestByModel) {
  const entry = manifestByModel.get(modelName);
  if (!entry) throw new Error(`Missing ${modelName} in manifest`);
  return JSON.parse(fs.readFileSync(path.join(backupRoot, entry.file), 'utf8')).map(normalizeRow);
}

async function main() {
  if (!backupRoot) {
    throw new Error('Usage: node scripts/import-db-backup.cjs <backup-folder>');
  }

  if (process.env.CONFIRM_IMPORT !== '1') {
    throw new Error('Set CONFIRM_IMPORT=1 to import. This script clears destination tables first.');
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(backupRoot, 'manifest.json'), 'utf8'));
  const manifestByModel = new Map(manifest.tables.map((table) => [table.model, table]));

  for (const modelName of [...importOrder].reverse()) {
    const delegate = prisma[delegateName(modelName)];
    await delegate.deleteMany();
  }

  for (const modelName of importOrder) {
    const rows = readRows(modelName, manifestByModel);
    if (rows.length > 0) {
      await prisma[delegateName(modelName)].createMany({ data: rows });
    }
    const importedCount = await prisma[delegateName(modelName)].count();
    const expectedCount = manifestByModel.get(modelName).rowCount;
    if (importedCount !== expectedCount) {
      throw new Error(`${modelName}: expected ${expectedCount}, imported ${importedCount}`);
    }
    console.log(`${modelName}: ${importedCount}`);
  }

  console.log('Import completed successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
