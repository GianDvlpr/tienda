const fs = require('fs');
const path = require('path');

const backupRoot = process.argv[2];

if (!backupRoot) {
  console.error('Usage: node scripts/verify-db-backup.cjs <backup-folder>');
  process.exit(1);
}

const manifestPath = path.join(process.cwd(), backupRoot, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];

for (const table of manifest.tables) {
  const rows = JSON.parse(fs.readFileSync(path.join(process.cwd(), backupRoot, table.file), 'utf8'));
  if (rows.length !== table.rowCount) {
    errors.push(`${table.model}: manifest ${table.rowCount}, file ${rows.length}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const totalRows = manifest.tables.reduce((sum, table) => sum + table.rowCount, 0);
console.log(`Validated ${manifest.tables.length} tables. Total rows: ${totalRows}`);
