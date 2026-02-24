import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('fenice', process.env['LOG_LEVEL'] ?? 'info');

export interface ContextBundle {
  openApiSpec: string;
  projectConventions: string;
  exampleSchema: string;
  exampleModel: string;
  exampleService: string;
  exampleRoute: string;
}

const MAX_FILE_SIZE = 15_000;

async function safeReadFile(filePath: string, maxSize = MAX_FILE_SIZE): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    if (content.length > maxSize) {
      return content.slice(0, maxSize) + '\n\n... [truncated]';
    }
    return content;
  } catch {
    logger.warn({ filePath }, 'Context file not found, skipping');
    return '';
  }
}

export async function buildContextBundle(projectRoot: string): Promise<ContextBundle> {
  const [
    openApiSpec,
    projectConventions,
    exampleSchema,
    exampleModel,
    exampleService,
    exampleRoute,
  ] = await Promise.all([
    readOpenApiSpec(projectRoot),
    safeReadFile(join(projectRoot, 'CLAUDE.md')),
    safeReadFile(join(projectRoot, 'src/schemas/user.schema.ts')),
    safeReadFile(join(projectRoot, 'src/models/user.model.ts')),
    safeReadFile(join(projectRoot, 'src/services/user.service.ts')),
    safeReadFile(join(projectRoot, 'src/routes/user.routes.ts')),
  ]);

  return {
    openApiSpec,
    projectConventions,
    exampleSchema,
    exampleModel,
    exampleService,
    exampleRoute,
  };
}

async function readOpenApiSpec(projectRoot: string): Promise<string> {
  // Try reading from a cached spec file first, fall back to describing the structure
  try {
    const specPath = join(projectRoot, 'openapi.json');
    const content = await readFile(specPath, 'utf-8');
    if (content.length > MAX_FILE_SIZE) {
      return content.slice(0, MAX_FILE_SIZE) + '\n\n... [truncated]';
    }
    return content;
  } catch {
    // No cached spec — build a summary from file structure
    return buildSpecSummary(projectRoot);
  }
}

async function buildSpecSummary(projectRoot: string): Promise<string> {
  const files = [
    'src/schemas/common.schema.ts',
    'src/schemas/user.schema.ts',
    'src/schemas/auth.schema.ts',
  ];

  const parts: string[] = ['# Existing API Schema Summary\n'];

  for (const file of files) {
    const content = await safeReadFile(join(projectRoot, file), 5_000);
    if (content) {
      parts.push(`## ${file}\n\`\`\`typescript\n${content}\n\`\`\`\n`);
    }
  }

  return parts.join('\n');
}

export function formatContextForPrompt(bundle: ContextBundle): string {
  const parts: string[] = [];

  if (bundle.openApiSpec) {
    parts.push('## Current OpenAPI Spec / Schema Summary\n```\n' + bundle.openApiSpec + '\n```\n');
  }

  if (bundle.exampleSchema) {
    parts.push(
      '## Example Schema (user.schema.ts)\n```typescript\n' + bundle.exampleSchema + '\n```\n'
    );
  }

  if (bundle.exampleModel) {
    parts.push(
      '## Example Model (user.model.ts)\n```typescript\n' + bundle.exampleModel + '\n```\n'
    );
  }

  if (bundle.exampleService) {
    parts.push(
      '## Example Service (user.service.ts)\n```typescript\n' + bundle.exampleService + '\n```\n'
    );
  }

  if (bundle.exampleRoute) {
    parts.push(
      '## Example Route (user.routes.ts)\n```typescript\n' + bundle.exampleRoute + '\n```\n'
    );
  }

  return parts.join('\n');
}

const CONVENTIONS_SECTIONS = [
  '## Tech Stack',
  '## Key Commands',
  '## Code Style & Conventions',
  '## Common Gotchas',
];

export function trimConventions(
  fullConventions: string,
  sections: string[] = CONVENTIONS_SECTIONS
): string {
  if (!fullConventions) return '';
  const lines = fullConventions.split('\n');
  const result: string[] = [];
  let capturing = false;

  for (const line of lines) {
    if (sections.some((s) => line.startsWith(s))) {
      capturing = true;
    } else if (line.startsWith('## ') && capturing) {
      capturing = false;
    }
    if (capturing) result.push(line);
  }

  return result.join('\n');
}

export function formatContextForGeneration(bundle: ContextBundle): string {
  const parts: string[] = [];

  // Trimmed conventions instead of full CLAUDE.md
  const trimmed = trimConventions(bundle.projectConventions);
  if (trimmed) {
    parts.push('## Project Conventions (excerpt)\n```\n' + trimmed + '\n```\n');
  }

  // Only one example (schema) — the plan constrains the rest
  if (bundle.exampleSchema) {
    parts.push(
      '## Example Schema (user.schema.ts)\n```typescript\n' + bundle.exampleSchema + '\n```\n'
    );
  }

  return parts.join('\n');
}
