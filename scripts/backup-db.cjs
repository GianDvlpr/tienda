const fs = require('fs');
const path = require('path');
require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

function delegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function serialize(value) {
  return JSON.stringify(value, (_key, current) => {
    if (typeof current === 'bigint') return current.toString();
    return current;
  }, 2);
}

async function main() {
  const backupRoot = path.join(process.cwd(), 'backups', `db-backup-${timestamp()}`);
  const dataDir = path.join(backupRoot, 'data');
  const prismaDir = path.join(backupRoot, 'prisma');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(prismaDir, { recursive: true });

  fs.copyFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), path.join(prismaDir, 'schema.prisma'));
  fs.cpSync(path.join(process.cwd(), 'prisma', 'migrations'), path.join(prismaDir, 'migrations'), { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    provider: 'postgresql',
    schema: 'prisma/schema.prisma',
    migrations: 'prisma/migrations',
    tables: [],
  };

  for (const model of Prisma.dmmf.datamodel.models) {
    const delegate = prisma[delegateName(model.name)];
    if (!delegate || typeof delegate.findMany !== 'function') {
      throw new Error(`No Prisma delegate found for model ${model.name}`);
    }

    const rows = await delegate.findMany();
    const fileName = `${model.name}.json`;
    fs.writeFileSync(path.join(dataDir, fileName), serialize(rows));

    manifest.tables.push({
      model: model.name,
      table: model.dbName || model.name,
      file: `data/${fileName}`,
      rowCount: rows.length,
    });

    console.log(`${model.name}: ${rows.length}`);
  }

  fs.writeFileSync(path.join(backupRoot, 'manifest.json'), serialize(manifest));
  console.log(`Backup written to ${backupRoot}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
