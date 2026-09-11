const fs = require('node:fs');
const path = require('node:path');
const { Prisma } = require('@prisma/client');
const models = Prisma.dmmf.datamodel.models;
const delegateName = name => name.charAt(0).toLowerCase() + name.slice(1);

function importOrder() {
  const done = new Set(), ordered = [];
  while (ordered.length < models.length) {
    const ready = models.filter(m => !done.has(m.name) && m.fields.filter(f => f.kind === 'object' && f.relationFromFields?.length).every(f => done.has(f.type)));
    if (!ready.length) throw new Error('Ciclo de dependencias en el esquema; requiere estrategia explícita de restauración');
    ready.forEach(m => { done.add(m.name); ordered.push(m); });
  }
  return ordered;
}

function loadBackup(folder) {
  const root = fs.realpathSync(folder);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  if (!Array.isArray(manifest.tables) || manifest.provider !== 'postgresql') throw new Error('Manifiesto inválido');
  const names = manifest.tables.map(t => t.model);
  if (new Set(names).size !== names.length || names.length !== models.length || models.some(m => !names.includes(m.name))) throw new Error('El respaldo no contiene exactamente todos los modelos actuales. Migra una copia del respaldo antes de restaurar.');
  const data = new Map();
  for (const model of importOrder()) {
    const entry = manifest.tables.find(t => t.model === model.name);
    if (typeof entry.file !== 'string') throw new Error('Archivo inválido');
    const file = fs.realpathSync(path.resolve(root, entry.file));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Archivo fuera del respaldo');
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(rows) || !Number.isInteger(entry.rowCount) || rows.length !== entry.rowCount) throw new Error('Conteo inválido: ' + model.name);
    const scalarFields = model.fields.filter(f => f.kind !== 'object');
    data.set(model.name, rows.map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Fila inválida');
      if (Object.keys(row).some(key => !scalarFields.some(f => f.name === key))) throw new Error('Columnas desconocidas: ' + model.name);
      const copy = { ...row };
      for (const field of scalarFields) {
        if (copy[field.name] == null) {
          if (field.isRequired) throw new Error('Campo requerido ausente: ' + model.name + '.' + field.name);
          continue;
        }
        if (field.type === 'DateTime') {
          copy[field.name] = new Date(copy[field.name]);
          if (Number.isNaN(copy[field.name].getTime())) throw new Error('Fecha inválida');
        }
      }
      return copy;
    }));
  }
  return { manifest, data };
}
module.exports = { models, delegateName, importOrder, loadBackup };
