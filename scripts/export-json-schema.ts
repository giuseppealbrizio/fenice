import { WorldDeltaEventSchema } from '../src/schemas/world-delta.schema.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../docs/3d-world/schemas/world-delta-v1.json');

mkdirSync(dirname(outPath), { recursive: true });

const jsonSchema = WorldDeltaEventSchema.toJSONSchema();

writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + '\n');
process.stdout.write(`Exported JSON Schema to ${outPath}\n`);
