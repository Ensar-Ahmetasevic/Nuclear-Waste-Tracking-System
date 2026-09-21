// Rebuilds lib/server/schema-field-meta.cjs from prisma/schema.prisma.
// Prisma 7 DMMF omits isRequired / hasDefaultValue / relationFromFields.
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const schemaSource = readFileSync(resolve('prisma/schema.prisma'), 'utf8');
const requiredScalars = {};
const defaultedScalars = {};
for (const block of schemaSource.matchAll(/model\s+(\w+)\s*\{([^}]*)\}/g)) {
  const modelName = block[1];
  const required = [];
  const defaults = [];
  for (const line of block[2].split('\n')) {
    const match = line.match(/^\s*(\w+)\s+(String|Int|Float|Boolean|DateTime|Json|Bytes|BigInt|Decimal)(\?)?/);
    if (!match || match[3]) continue;
    required.push(match[1]);
    if (/@default\s*\(/.test(line) || /@id\b/.test(line) || /@updatedAt\b/.test(line)) defaults.push(match[1]);
  }
  requiredScalars[modelName] = required;
  defaultedScalars[modelName] = defaults;
}

const target = resolve('lib/server/schema-field-meta.cjs');
writeFileSync(
  target,
  `// Generated from prisma/schema.prisma for Prisma 7 stripped DMMF. Do not edit by hand.\nmodule.exports = ${JSON.stringify({ requiredScalars, defaultedScalars }, null, 2)};\n`,
);
console.log(`Wrote ${target}`);
