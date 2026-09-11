require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { delegateName, importOrder, loadBackup } = require('./backup-utils.cjs');

async function main() {
  if (process.env.CONFIRM_IMPORT !== '1' || !process.argv[2]) throw new Error('Uso: CONFIRM_IMPORT=1 node scripts/import-db-backup.cjs <carpeta>. Reemplaza todos los datos de destino.');
  // Read/validate every file before creating a client or deleting destination data.
  const { data } = loadBackup(process.argv[2]);
  const ordered = importOrder();
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async tx => {
      for (const model of [...ordered].reverse()) await tx[delegateName(model.name)].deleteMany();
      for (const model of ordered) {
        const rows = data.get(model.name);
        for (let offset = 0; offset < rows.length; offset += 500) await tx[delegateName(model.name)].createMany({ data: rows.slice(offset, offset + 500) });
        if (await tx[delegateName(model.name)].count() !== rows.length) throw new Error('Conteo restaurado incorrecto: ' + model.name);
      }
    }, { timeout: 120000, maxWait: 20000, isolationLevel: 'Serializable' });
    // Restore serial counters after successful data commit; setval is not transactional.
    // A failure here is reported explicitly; rerun the import before reopening writes.
    for (const model of ordered) for (const field of model.fields) {
      if (field.default?.name !== 'autoincrement') continue;
      const table = model.dbName || model.name, column = field.dbName || field.name;
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table + '') || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) throw new Error('Identificador inválido');
      await prisma.$queryRawUnsafe(`SELECT setval(pg_get_serial_sequence('\"${table}\"', '${column}'), COALESCE((SELECT MAX(\"${column}\") FROM \"${table}\"), 1), EXISTS(SELECT 1 FROM \"${table}\"))`);
    }
    console.log('Restauración completa. Modelos: ' + ordered.length);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
