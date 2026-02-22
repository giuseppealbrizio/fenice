import { WorldDeltaEventSchema } from '../src/schemas/world-delta.schema.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = resolve(__dirname, '../docs/3d-world/schemas/world-delta-v1.json');

const current = WorldDeltaEventSchema.toJSONSchema();

let existing: unknown;
try {
  existing = JSON.parse(readFileSync(filePath, 'utf-8'));
} catch {
  console.error(`ERROR: ${filePath} not found. Run "npm run export-schema" first.`);
  process.exit(1);
}

if (JSON.stringify(current) !== JSON.stringify(existing)) {
  console.error('ERROR: JSON Schema out of sync with Zod source.');
  console.error('Run "npm run export-schema" to regenerate.');
  process.exit(1);
}

process.stdout.write('JSON Schema is in sync with Zod source.\n');
