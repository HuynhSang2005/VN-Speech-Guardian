#!/usr/bin/env node
// Minimal generator script (Node). Scans app module model files for Zod schemas
// and emits simple DTO classes using createZodDto into each module's dto/ folder.
const fs = require('fs');
const path = require('path');

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function findSchemasInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const re = /export\s+const\s+(\w+Schema)\s*=/g;
  const matches = [];
  let m;
  while ((m = re.exec(content))) matches.push(m[1]);
  return matches;
}

const modulesBase = path.join(__dirname, '..', '..', 'apps', 'gateway-nestjs', 'src', 'modules');
if (!fs.existsSync(modulesBase)) {
  console.log('No modules directory found, skipping module-level DTO generation');
  process.exit(0);
}

const modules = fs.readdirSync(modulesBase).filter((d) => fs.existsSync(path.join(modulesBase, d)));
for (const mod of modules) {
  const modPath = path.join(modulesBase, mod);
  const modelFiles = fs.readdirSync(modPath).filter((f) => f.endsWith('.ts') && f.includes('model'));
  if (!modelFiles.length) continue;
  const dtoDir = path.join(modPath, 'dto');
  ensureDir(dtoDir);
  for (const f of modelFiles) {
    const full = path.join(modPath, f);
    const schemas = findSchemasInFile(full);
    if (!schemas.length) continue;
  // dto files live in module's dto/ folder, so import models from one level up
  let content = `// Auto-generated from ${full}\nimport { createZodDto } from 'nestjs-zod';\nimport { ${schemas.join(', ')} } from '../${path.basename(f, path.extname(f))}';\n\n`;
    for (const s of schemas) {
      const cls = s.replace(/Schema$/, 'Dto');
      content += `export class ${cls} extends createZodDto(${s}) {}\n\n`;
    }
    const outFile = path.join(dtoDir, `${path.basename(f, path.extname(f))}.dto.ts`);
    fs.writeFileSync(outFile, content, 'utf8');
    console.log('Wrote', outFile);
  }
}

console.log('gen-nest-dto finished');
