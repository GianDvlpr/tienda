const { loadBackup } = require('./backup-utils.cjs');
try {
  if (!process.argv[2]) throw new Error('Uso: node scripts/verify-db-backup.cjs <carpeta>');
  const { data } = loadBackup(process.argv[2]);
  console.log('Modelos verificados: ' + data.size + '. Filas: ' + [...data.values()].reduce((n, rows) => n + rows.length, 0));
} catch (error) { console.error(error.message); process.exitCode = 1; }
