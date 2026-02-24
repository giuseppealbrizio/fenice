# M5: Builder v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the AI Builder from a single-purpose "new endpoint" generator into a versatile development agent with task type awareness, smart context selection, robust recovery, and verifiable dry-run output.

**Architecture:** Six task types with dedicated prompts, a file indexer for smart context selection during planning, three-level recovery (repair → draft PR → fail), and enriched dry-run output (diffs, plan coverage, impact analysis). All changes are server-side. No new HTTP endpoints — enriched data flows through existing routes.

**Tech Stack:** Node.js 22, TypeScript 5 (strict), Hono + Zod v4 + Mongoose v9, `@anthropic-ai/sdk`, `simple-git`, `@octokit/rest`, `diff` (npm package for unified diffs)

---

## Batch 1: Schema & Model Foundation

### Task 1: Add `TaskType` enum and update `BuilderOptionsSchema`

**Files:**
- Modify: `src/schemas/builder.schema.ts`
- Test: `tests/unit/schemas/builder.schema.test.ts`

**Step 1: Write the failing tests**

Add to `tests/unit/schemas/builder.schema.test.ts`:

```typescript
describe('TaskTypeEnum', () => {
  it('should accept all 6 valid task types', () => {
    const types = ['new-resource', 'refactor', 'bugfix', 'schema-migration', 'test-gen', 'doc-gen'];
    for (const t of types) {
      expect(TaskTypeEnum.safeParse(t).success).toBe(true);
    }
  });

  it('should reject invalid task types', () => {
    expect(TaskTypeEnum.safeParse('deploy').success).toBe(false);
    expect(TaskTypeEnum.safeParse('').success).toBe(false);
  });
});

describe('BuilderOptionsSchema with taskType', () => {
  it('should accept options with taskType', () => {
    const result = BuilderOptionsSchema.safeParse({
      dryRun: false,
      taskType: 'refactor',
    });
    expect(result.success).toBe(true);
  });

  it('should accept options without taskType (optional)', () => {
    const result = BuilderOptionsSchema.safeParse({ dryRun: true });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/schemas/builder.schema.test.ts`
Expected: FAIL — `TaskTypeEnum` is not exported

**Step 3: Implement the schema changes**

In `src/schemas/builder.schema.ts`:

- Add after line 1:
```typescript
export const TaskTypeEnum = z.enum([
  'new-resource',
  'refactor',
  'bugfix',
  'schema-migration',
  'test-gen',
  'doc-gen',
]);
```

- Add `taskType` to `BuilderOptionsSchema` (after `includeTests`):
```typescript
taskType: TaskTypeEnum.optional(),
```

- Add type export at the bottom:
```typescript
export type TaskType = z.infer<typeof TaskTypeEnum>;
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/schemas/builder.schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/schemas/builder.schema.ts tests/unit/schemas/builder.schema.test.ts
git commit -m "feat(builder): add TaskType enum and optional taskType to BuilderOptions"
```

---

### Task 2: Add `contextFiles` and `taskType` to `BuilderPlanSchema`

**Files:**
- Modify: `src/schemas/builder.schema.ts`
- Test: `tests/unit/schemas/builder.schema.test.ts`

**Step 1: Write the failing tests**

```typescript
describe('BuilderPlanSchema with contextFiles and taskType', () => {
  it('should accept plan with contextFiles and taskType', () => {
    const result = BuilderPlanSchema.safeParse({
      summary: 'Add product CRUD',
      taskType: 'new-resource',
      contextFiles: ['src/schemas/user.schema.ts', 'src/models/user.model.ts'],
      files: [{ path: 'src/schemas/product.schema.ts', type: 'schema', action: 'create', description: 'Product schema' }],
    });
    expect(result.success).toBe(true);
  });

  it('should accept plan without contextFiles (backward compat)', () => {
    const result = BuilderPlanSchema.safeParse({
      summary: 'Fix a bug',
      files: [{ path: 'src/services/user.service.ts', type: 'service', action: 'modify', description: 'Fix null check' }],
    });
    expect(result.success).toBe(true);
  });

  it('should accept plan with taskType only', () => {
    const result = BuilderPlanSchema.safeParse({
      summary: 'Refactor auth',
      taskType: 'refactor',
      files: [{ path: 'src/services/auth.service.ts', type: 'service', action: 'modify', description: 'Rename method' }],
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/schemas/builder.schema.test.ts`
Expected: FAIL — `taskType` and `contextFiles` not recognized

**Step 3: Implement**

In `src/schemas/builder.schema.ts`, update `BuilderPlanSchema`:

```typescript
export const BuilderPlanSchema = z.object({
  files: z.array(BuilderPlanFileSchema).min(1),
  summary: z.string().min(1).max(1000),
  taskType: TaskTypeEnum.optional(),
  contextFiles: z.array(z.string().min(1)).optional(),
});
```

**Step 4: Run tests**

Run: `npx vitest run tests/unit/schemas/builder.schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/schemas/builder.schema.ts tests/unit/schemas/builder.schema.test.ts
git commit -m "feat(builder): add taskType and contextFiles to BuilderPlanSchema"
```

---

### Task 3: Add `completed_draft` status and enrich `BuilderJobResultSchema`

**Files:**
- Modify: `src/schemas/builder.schema.ts`
- Modify: `src/models/builder-job.model.ts`
- Test: `tests/unit/schemas/builder.schema.test.ts`

**Step 1: Write the failing tests**

```typescript
describe('BuilderJobStatus completed_draft', () => {
  it('should accept completed_draft', () => {
    expect(BuilderJobStatusEnum.safeParse('completed_draft').success).toBe(true);
  });
});

describe('BuilderJobResultSchema enriched', () => {
  it('should accept result with validationErrors', () => {
    const result = BuilderJobResultSchema.safeParse({
      files: [],
      validationErrors: ['Type error in foo.ts line 5'],
    });
    expect(result.success).toBe(true);
  });

  it('should accept result with tokenUsage', () => {
    const result = BuilderJobResultSchema.safeParse({
      files: [],
      tokenUsage: { input: 5000, output: 2000 },
    });
    expect(result.success).toBe(true);
  });

  it('should accept result with diffs', () => {
    const result = BuilderJobResultSchema.safeParse({
      files: [{ path: 'src/foo.ts', content: 'export {}', action: 'created' }],
      diffs: [{ path: 'src/foo.ts', diff: '+export {}' }],
    });
    expect(result.success).toBe(true);
  });

  it('should accept result with planCoverage', () => {
    const result = BuilderJobResultSchema.safeParse({
      files: [],
      planCoverage: {
        planned: ['src/a.ts', 'src/b.ts'],
        generated: ['src/a.ts'],
        missing: ['src/b.ts'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept result with impactedFiles', () => {
    const result = BuilderJobResultSchema.safeParse({
      files: [],
      impactedFiles: ['src/index.ts', 'src/routes/user.routes.ts'],
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/schemas/builder.schema.test.ts`
Expected: FAIL

**Step 3: Implement**

In `src/schemas/builder.schema.ts`:

- Add `'completed_draft'` to `BuilderJobStatusEnum` (after `'completed'`):
```typescript
export const BuilderJobStatusEnum = z.enum([
  'queued',
  'planning',
  'plan_ready',
  'reading_context',
  'generating',
  'writing_files',
  'validating',
  'creating_pr',
  'completed',
  'completed_draft',
  'failed',
  'rejected',
]);
```

- Enrich `BuilderJobResultSchema`:
```typescript
export const BuilderJobResultSchema = z.object({
  files: z.array(BuilderGeneratedFileSchema),
  prUrl: z.string().optional(),
  prNumber: z.number().int().positive().optional(),
  branch: z.string().optional(),
  validationPassed: z.boolean().optional(),
  validationErrors: z.array(z.string()).optional(),
  tokenUsage: z.object({ input: z.number(), output: z.number() }).optional(),
  diffs: z.array(z.object({ path: z.string(), diff: z.string() })).optional(),
  planCoverage: z.object({
    planned: z.array(z.string()),
    generated: z.array(z.string()),
    missing: z.array(z.string()),
  }).optional(),
  impactedFiles: z.array(z.string()).optional(),
});
```

In `src/models/builder-job.model.ts`:

- Add `'completed_draft'` to the status enum array in `builderJobSchema` (line 66)
- Add new fields to `jobResultSchema`:
```typescript
const jobResultSchema = new Schema(
  {
    files: { type: [generatedFileSchema], default: [] },
    prUrl: String,
    prNumber: Number,
    branch: String,
    validationPassed: Boolean,
    validationErrors: [String],
    tokenUsage: {
      input: Number,
      output: Number,
    },
    diffs: [{
      path: { type: String, required: true },
      diff: { type: String, required: true },
    }],
    planCoverage: {
      planned: [String],
      generated: [String],
      missing: [String],
    },
    impactedFiles: [String],
  },
  { _id: false }
);
```

- Add `taskType` field and `contextFiles` to `planSchema`:
```typescript
const planSchema = new Schema(
  {
    files: { type: [planFileSchema], required: true },
    summary: { type: String, required: true },
    taskType: { type: String, enum: ['new-resource', 'refactor', 'bugfix', 'schema-migration', 'test-gen', 'doc-gen'] },
    contextFiles: [String],
  },
  { _id: false }
);
```

**Step 4: Run tests**

Run: `npx vitest run tests/unit/schemas/builder.schema.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm run validate`
Expected: lint + typecheck + all tests pass

**Step 6: Commit**

```bash
git add src/schemas/builder.schema.ts src/models/builder-job.model.ts tests/unit/schemas/builder.schema.test.ts
git commit -m "feat(builder): add completed_draft status and enrich result schema with diffs, coverage, impact"
```

---

## Batch 2: File Indexer & Smart Context

### Task 4: Create File Indexer module

**Files:**
- Create: `src/services/builder/file-indexer.ts`
- Create: `tests/unit/services/builder/file-indexer.test.ts`

**Step 1: Write the failing tests**

Create `tests/unit/services/builder/file-indexer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildFileIndex, formatFileIndex, type FileIndexEntry } from '../../../../src/services/builder/file-indexer.js';

// Mock fs
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

describe('buildFileIndex', () => {
  it('should scan src/ and tests/ directories', async () => {
    const { readdir, readFile, stat } = await import('node:fs/promises');
    const mockReaddir = vi.mocked(readdir);
    const mockReadFile = vi.mocked(readFile);
    const mockStat = vi.mocked(stat);

    // Simulate a flat src/schemas directory with one file
    mockReaddir.mockImplementation(async (dirPath: any) => {
      const p = String(dirPath);
      if (p.endsWith('/src')) return [{ name: 'schemas', isDirectory: () => true, isFile: () => false }] as any;
      if (p.endsWith('/src/schemas')) return [{ name: 'user.schema.ts', isDirectory: () => false, isFile: () => true }] as any;
      if (p.endsWith('/tests')) return [] as any;
      return [] as any;
    });

    mockReadFile.mockResolvedValue('export const UserSchema = z.object({});\nexport type User = z.infer<typeof UserSchema>;\n');
    mockStat.mockResolvedValue({ size: 200 } as any);

    const index = await buildFileIndex('/fake/root');
    expect(index.length).toBeGreaterThanOrEqual(1);
    expect(index[0]!.path).toBe('src/schemas/user.schema.ts');
    expect(index[0]!.exports).toContain('UserSchema');
  });
});

describe('formatFileIndex', () => {
  it('should produce a compact text index', () => {
    const entries: FileIndexEntry[] = [
      { path: 'src/schemas/user.schema.ts', exports: ['UserSchema', 'UserCreateSchema'], lineCount: 45 },
      { path: 'src/models/user.model.ts', exports: ['UserModel', 'IUser'], lineCount: 62 },
    ];
    const text = formatFileIndex(entries);
    expect(text).toContain('src/schemas/user.schema.ts');
    expect(text).toContain('UserSchema');
    expect(text).toContain('45 lines');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/services/builder/file-indexer.test.ts`
Expected: FAIL — module not found

**Step 3: Implement**

Create `src/services/builder/file-indexer.ts`:

```typescript
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('fenice', process.env['LOG_LEVEL'] ?? 'info');

export interface FileIndexEntry {
  path: string;
  exports: string[];
  lineCount: number;
}

const SCAN_DIRS = ['src', 'tests'];
const EXPORT_REGEX = /^export\s+(?:const|function|class|type|interface|enum|default)\s+(\w+)/gm;

async function scanDirectory(dirPath: string, basePath: string): Promise<FileIndexEntry[]> {
  const entries: FileIndexEntry[] = [];

  let items: Awaited<ReturnType<typeof readdir>>;
  try {
    items = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const item of items) {
    const fullPath = join(dirPath, item.name);

    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === 'dist' || item.name === '.git') continue;
      const nested = await scanDirectory(fullPath, basePath);
      entries.push(...nested);
    } else if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
      try {
        const content = await readFile(fullPath, 'utf-8');
        const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');
        const exports: string[] = [];

        let match: RegExpExecArray | null;
        const regex = new RegExp(EXPORT_REGEX.source, 'gm');
        while ((match = regex.exec(content)) !== null) {
          if (match[1]) exports.push(match[1]);
        }

        const lineCount = content.split('\n').length;
        entries.push({ path: relativePath, exports, lineCount });
      } catch {
        logger.warn({ path: fullPath }, 'Failed to read file for indexing');
      }
    }
  }

  return entries;
}

export async function buildFileIndex(projectRoot: string): Promise<FileIndexEntry[]> {
  const allEntries: FileIndexEntry[] = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = join(projectRoot, dir);
    const entries = await scanDirectory(dirPath, projectRoot);
    allEntries.push(...entries);
  }

  allEntries.sort((a, b) => a.path.localeCompare(b.path));
  logger.info({ fileCount: allEntries.length }, 'File index built');
  return allEntries;
}

export function formatFileIndex(entries: FileIndexEntry[]): string {
  const lines = entries.map((e) => {
    const exportsStr = e.exports.length > 0 ? e.exports.join(', ') : '(no named exports)';
    return `${e.path} | ${exportsStr} | ${e.lineCount} lines`;
  });

  return `# Project File Index (${entries.length} files)\n\n${lines.join('\n')}`;
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/unit/services/builder/file-indexer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/builder/file-indexer.ts tests/unit/services/builder/file-indexer.test.ts
git commit -m "feat(builder): add file indexer for smart context selection"
```

---

### Task 5: Update context-reader for dynamic context files

**Files:**
- Modify: `src/services/builder/context-reader.ts`
- Create: `tests/unit/services/builder/context-reader.test.ts`

**Step 1: Write the failing tests**

Create `tests/unit/services/builder/context-reader.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDynamicContext, type DynamicContextBundle } from '../../../../src/services/builder/context-reader.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('buildDynamicContext', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should read only the requested contextFiles', async () => {
    const { readFile } = await import('node:fs/promises');
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (p.endsWith('auth.service.ts')) return 'export class AuthService {}';
      if (p.endsWith('CLAUDE.md')) return '## Tech Stack\nNode.js';
      return '';
    });

    const result = await buildDynamicContext('/fake/root', ['src/services/auth.service.ts']);
    expect(result.contextFiles).toHaveLength(1);
    expect(result.contextFiles[0]!.path).toBe('src/services/auth.service.ts');
    expect(result.contextFiles[0]!.content).toContain('AuthService');
    expect(mockReadFile).toHaveBeenCalledTimes(2); // CLAUDE.md + 1 context file
  });

  it('should fall back to default files when contextFiles is empty', async () => {
    const { readFile } = await import('node:fs/promises');
    const mockReadFile = vi.mocked(readFile);
    mockReadFile.mockResolvedValue('export const X = 1;');

    const result = await buildDynamicContext('/fake/root', []);
    // Should read CLAUDE.md + default user.* files
    expect(mockReadFile).toHaveBeenCalled();
    expect(result.conventions).toBeDefined();
  });

  it('should respect token budget and truncate', async () => {
    const { readFile } = await import('node:fs/promises');
    const mockReadFile = vi.mocked(readFile);
    // Return a very long file
    mockReadFile.mockResolvedValue('x'.repeat(50_000));

    const result = await buildDynamicContext('/fake/root', ['src/huge-file.ts'], 1000);
    // Content should be truncated, not 50k chars
    const totalChars = result.contextFiles.reduce((sum, f) => sum + f.content.length, 0);
    expect(totalChars).toBeLessThan(50_000);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/services/builder/context-reader.test.ts`
Expected: FAIL — `buildDynamicContext` not exported

**Step 3: Implement**

Add to `src/services/builder/context-reader.ts` (keep existing functions, add new ones):

```typescript
export interface ContextFileContent {
  path: string;
  content: string;
}

export interface DynamicContextBundle {
  conventions: string;
  contextFiles: ContextFileContent[];
}

const DEFAULT_CONTEXT_FILES = [
  'src/schemas/user.schema.ts',
  'src/models/user.model.ts',
  'src/services/user.service.ts',
  'src/routes/user.routes.ts',
];

const DEFAULT_MAX_CONTEXT_CHARS = 32_000; // ~8000 tokens at ~4 chars/token

export async function buildDynamicContext(
  projectRoot: string,
  contextFiles: string[],
  maxChars: number = DEFAULT_MAX_CONTEXT_CHARS
): Promise<DynamicContextBundle> {
  // Always read conventions
  const conventions = await safeReadFile(join(projectRoot, 'CLAUDE.md'));

  const filesToRead = contextFiles.length > 0 ? contextFiles : DEFAULT_CONTEXT_FILES;
  const result: ContextFileContent[] = [];
  let totalChars = 0;

  for (const filePath of filesToRead) {
    if (totalChars >= maxChars) break;
    const content = await safeReadFile(join(projectRoot, filePath));
    if (!content) continue;

    const remaining = maxChars - totalChars;
    const trimmed = content.length > remaining
      ? content.slice(0, remaining) + '\n... [truncated to fit context budget]'
      : content;

    result.push({ path: filePath, content: trimmed });
    totalChars += trimmed.length;
  }

  return { conventions, contextFiles: result };
}

export function formatDynamicContext(bundle: DynamicContextBundle): string {
  const parts: string[] = [];

  const trimmed = trimConventions(bundle.conventions);
  if (trimmed) {
    parts.push('## Project Conventions (excerpt)\n```\n' + trimmed + '\n```\n');
  }

  for (const file of bundle.contextFiles) {
    parts.push(`## ${file.path}\n\`\`\`typescript\n${file.content}\n\`\`\`\n`);
  }

  return parts.join('\n');
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/unit/services/builder/context-reader.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/builder/context-reader.ts tests/unit/services/builder/context-reader.test.ts
git commit -m "feat(builder): add dynamic context reader with token budget"
```

---

## Batch 3: Task-Specific Prompts & Security

### Task 6: Refactor prompt-templates into task-specific system

**Files:**
- Modify: `src/services/builder/prompt-templates.ts`
- Create: `tests/unit/services/builder/prompt-templates.test.ts`

**Step 1: Write tests**

Create `tests/unit/services/builder/prompt-templates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildPlanPrompt, BUILDER_TOOLS } from '../../../../src/services/builder/prompt-templates.js';
import type { TaskType } from '../../../../src/schemas/builder.schema.js';

describe('buildSystemPrompt', () => {
  it('should include base conventions for all task types', () => {
    const types: TaskType[] = ['new-resource', 'refactor', 'bugfix', 'schema-migration', 'test-gen', 'doc-gen'];
    for (const taskType of types) {
      const prompt = buildSystemPrompt(taskType);
      expect(prompt).toContain('ALL local imports MUST end in .js extension');
      expect(prompt).toContain('Zod v4');
    }
  });

  it('should include task-specific instructions for new-resource', () => {
    const prompt = buildSystemPrompt('new-resource');
    expect(prompt).toContain('CRUD');
    expect(prompt).toContain('schema');
    expect(prompt).toContain('model');
    expect(prompt).toContain('service');
    expect(prompt).toContain('route');
  });

  it('should include refactoring instructions for refactor', () => {
    const prompt = buildSystemPrompt('refactor');
    expect(prompt).toContain('refactor');
  });

  it('should include test generation instructions for test-gen', () => {
    const prompt = buildSystemPrompt('test-gen');
    expect(prompt).toContain('test');
  });
});

describe('buildPlanPrompt', () => {
  it('should include file index when provided', () => {
    const prompt = buildPlanPrompt('src/schemas/user.schema.ts | UserSchema | 45 lines');
    expect(prompt).toContain('user.schema.ts');
    expect(prompt).toContain('UserSchema');
  });

  it('should instruct to output contextFiles', () => {
    const prompt = buildPlanPrompt('');
    expect(prompt).toContain('contextFiles');
    expect(prompt).toContain('taskType');
  });
});

describe('BUILDER_TOOLS', () => {
  it('should still have 3 tools', () => {
    expect(BUILDER_TOOLS).toHaveLength(3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/services/builder/prompt-templates.test.ts`
Expected: FAIL — `buildSystemPrompt` and `buildPlanPrompt` not exported

**Step 3: Implement**

Refactor `src/services/builder/prompt-templates.ts`:

Keep `BUILDER_TOOLS` and `buildPlanConstraint` unchanged. Replace `BUILDER_SYSTEM_PROMPT` and `BUILDER_PLAN_PROMPT` with functions:

```typescript
import type { TaskType } from '../../schemas/builder.schema.js';

const BUILDER_BASE_PROMPT = `You are an expert backend engineer working on the FENICE API platform.

## Project Conventions

### Tech Stack
- Runtime: Node.js 22, TypeScript 5 (strict mode)
- Framework: Hono with @hono/zod-openapi
- Validation: Zod v4 (single source of truth for types + validation + OpenAPI docs)
- Database: MongoDB via Mongoose v9
- Auth: JWT with role-based access control
- Module System: ESM ("type": "module")

### Critical Rules
1. ALL local imports MUST end in .js extension: import { foo } from './bar.js';
2. Use Zod v4 API (.issues not .errors for ZodError)
3. exactOptionalPropertyTypes is enabled — do NOT add | undefined to optional parameters
4. noUncheckedIndexedAccess is enabled — indexed access returns T | undefined
5. Mongoose _id.toString() for string IDs; toJSON transform handles id conversion
6. loadEnv() must NEVER be called at module level — use lazy initialization

### Naming Conventions
- Files: kebab-case (e.g., product.schema.ts, product.routes.ts)
- Classes: PascalCase (e.g., ProductService)
- Variables/functions: camelCase
- Schemas: PascalCase with Schema suffix (e.g., ProductSchema)

## Instructions
- Generate COMPLETE, working code — not scaffolds or placeholders
- Follow ALL conventions above exactly
- Include proper error handling using AppError subclasses from ../utils/errors.js
- Include proper TypeScript types — no \`any\`
- Use the tools provided to write each file
`;

const TASK_PROMPTS: Record<TaskType, string> = {
  'new-resource': `## Task: Create a New Resource (Full CRUD)

Generate a COMPLETE CRUD implementation with ALL standard endpoints:
- GET /api/v1/<resource> — List all (with pagination)
- GET /api/v1/<resource>/:id — Get by ID
- POST /api/v1/<resource> — Create
- PATCH /api/v1/<resource>/:id — Update
- DELETE /api/v1/<resource>/:id — Delete

### File Generation Order
1. Schema (src/schemas/<name>.schema.ts) — Zod schemas + types (List, Create, Update, full resource)
2. Model (src/models/<name>.model.ts) — Mongoose schema + model
3. Service (src/services/<name>.service.ts) — Business logic for ALL CRUD operations
4. Route (src/routes/<name>.routes.ts) — OpenAPI route definitions + handlers for ALL endpoints
5. Tests (tests/unit/schemas/<name>.schema.test.ts) — Schema validation tests

IMPORTANT: Generate ALL 5 endpoints in the route file. Do NOT generate just one endpoint.
`,

  'refactor': `## Task: Refactoring

You are refactoring existing code. Read the target files first to understand the current implementation.

Guidelines:
- Preserve all existing functionality (behavior must not change)
- Update all references/imports affected by the refactoring
- If renaming, find and update ALL usages across the codebase
- Run through the implications: if a type changes, what else uses it?
`,

  'bugfix': `## Task: Bug Fix

You are fixing a bug in existing code. The user will describe the issue or provide a stack trace.

Guidelines:
- Read the relevant files first to understand the current code
- Identify the root cause before making changes
- Make minimal changes to fix the issue
- Add or update tests that would have caught this bug
- Do NOT restructure or refactor code beyond what's needed for the fix
`,

  'schema-migration': `## Task: Schema Migration

You are modifying existing Zod schemas and Mongoose models.

Guidelines:
- Ensure backward compatibility where possible
- Update the Zod schema, Mongoose model, service, and routes to reflect new fields
- Handle optional/required field transitions carefully
- Update existing tests to cover new fields
- Consider what happens to existing documents that don't have the new fields
`,

  'test-gen': `## Task: Test Generation

You are generating comprehensive tests for existing code.

Guidelines:
- Read the target code first to understand what it does
- Generate tests in tests/unit/ or tests/integration/ as appropriate
- Cover: happy path, edge cases, error cases, boundary values
- Use vitest with globals: true
- Use vi.mock() for external dependencies
- Follow existing test patterns in the project
`,

  'doc-gen': `## Task: Documentation Generation

You are updating documentation for the project.

Guidelines:
- Read the current code to understand what has changed or is missing
- Update CLAUDE.md sections as needed (Architecture, Key Commands, etc.)
- Update OpenAPI descriptions in route files
- Be concise and accurate — document what IS, not what should be
`,
};

export function buildSystemPrompt(taskType: TaskType): string {
  return BUILDER_BASE_PROMPT + '\n' + TASK_PROMPTS[taskType];
}

// Keep legacy export for backward compat during migration
export const BUILDER_SYSTEM_PROMPT = buildSystemPrompt('new-resource');

export function buildPlanPrompt(fileIndex: string): string {
  return `You are an expert backend architect analyzing a code generation request for the FENICE API platform.

Your job is to produce a structured JSON plan — NOT the code itself.

## Project Structure

Files follow these conventions:
- Schema: src/schemas/<name>.schema.ts (Zod schemas + types)
- Model: src/models/<name>.model.ts (Mongoose schema + model)
- Service: src/services/<name>.service.ts (Business logic)
- Route: src/routes/<name>.routes.ts (OpenAPI route handlers)
- Test: tests/unit/schemas/<name>.schema.test.ts (Schema tests)

${fileIndex ? `## Project File Index\n\n${fileIndex}\n\n` : ''}## Instructions

1. Analyze the user's request and the project context provided
2. Determine the task type from: new-resource, refactor, bugfix, schema-migration, test-gen, doc-gen
3. Determine which files need to be created or modified
4. Determine which EXISTING files should be read as context during code generation
5. Output ONLY a JSON object with this exact structure:

{
  "summary": "1-2 sentence description of what will be generated",
  "taskType": "new-resource",
  "contextFiles": ["src/schemas/user.schema.ts", "src/models/user.model.ts"],
  "files": [
    {
      "path": "src/schemas/example.schema.ts",
      "type": "schema",
      "action": "create",
      "description": "What this file will contain"
    }
  ]
}

Rules:
- taskType must be one of: new-resource, refactor, bugfix, schema-migration, test-gen, doc-gen
- contextFiles should list EXISTING files the code generator needs to read as reference patterns
- type must be one of: schema, model, service, route, test
- action must be one of: create, modify
- Only include files in src/schemas/, src/models/, src/services/, src/routes/, tests/
- Follow the project's kebab-case naming convention
- Generate files in dependency order: schema → model → service → route → test
- For new-resource: ALWAYS include ALL CRUD endpoints (list, get, create, update, delete)
- Output ONLY the JSON object, no markdown fences, no explanation
`;
}

// Keep legacy export
export const BUILDER_PLAN_PROMPT = buildPlanPrompt('');
```

**Step 4: Run tests**

Run: `npx vitest run tests/unit/services/builder/prompt-templates.test.ts`
Expected: PASS

**Step 5: Run full test suite to verify nothing broke**

Run: `npm run validate`
Expected: PASS

**Step 6: Commit**

```bash
git add src/services/builder/prompt-templates.ts tests/unit/services/builder/prompt-templates.test.ts
git commit -m "feat(builder): refactor prompts into task-specific system with 6 task types"
```

---

### Task 7: Add `read_file` path validation to scope policy

**Files:**
- Modify: `src/services/builder/scope-policy.ts`
- Modify: `src/services/builder/code-generator.ts`
- Create: `tests/unit/services/builder/scope-policy.test.ts`

**Step 1: Write tests**

Create `tests/unit/services/builder/scope-policy.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateFilePath, validateReadPath, scanContentForDangerousPatterns } from '../../../../src/services/builder/scope-policy.js';

describe('validateReadPath', () => {
  it('should allow reading src/ files', () => {
    expect(validateReadPath('src/schemas/user.schema.ts')).toBeNull();
    expect(validateReadPath('src/services/auth.service.ts')).toBeNull();
  });

  it('should allow reading tests/ files', () => {
    expect(validateReadPath('tests/unit/foo.test.ts')).toBeNull();
  });

  it('should allow reading CLAUDE.md', () => {
    expect(validateReadPath('CLAUDE.md')).toBeNull();
  });

  it('should block reading .env', () => {
    expect(validateReadPath('.env')).not.toBeNull();
  });

  it('should block reading node_modules/', () => {
    expect(validateReadPath('node_modules/foo/index.js')).not.toBeNull();
  });

  it('should block path traversal', () => {
    expect(validateReadPath('../../../etc/passwd')).not.toBeNull();
  });

  it('should block reading .git/', () => {
    expect(validateReadPath('.git/config')).not.toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/services/builder/scope-policy.test.ts`
Expected: FAIL — `validateReadPath` not exported

**Step 3: Implement**

In `src/services/builder/scope-policy.ts`, add:

```typescript
const ALLOWED_READ_PREFIXES = [
  'src/',
  'tests/',
  'CLAUDE.md',
  'package.json',
  'tsconfig.json',
];

const FORBIDDEN_READ_PATHS = [
  '.env',
  '.git/',
  'node_modules/',
  'dist/',
  '.github/',
];

export function validateReadPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');

  if (normalized.includes('..')) {
    return 'Path traversal detected';
  }

  for (const forbidden of FORBIDDEN_READ_PATHS) {
    if (normalized === forbidden || normalized.startsWith(forbidden)) {
      return `Forbidden read path: ${forbidden}`;
    }
  }

  const isAllowed = ALLOWED_READ_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!isAllowed) {
    return `Path not in allowed read directories: ${normalized}`;
  }

  return null;
}
```

In `src/services/builder/code-generator.ts`, update the `read_file` handler in `generateCode` (around line 229) and `repairCode` (around line 381):

Add import: `import { validateReadPath } from './scope-policy.js';`

Replace the `read_file` block with:
```typescript
} else if (toolName === 'read_file') {
  const path = input['path'] ?? '';
  const readError = validateReadPath(path);
  if (readError) {
    toolResults.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: `ERROR: ${readError}`,
      is_error: true,
    });
    continue;
  }
  try {
    const fullPath = join(projectRoot, path);
    const content = await readFile(fullPath, 'utf-8');
    const trimmed = content.length > 10_000 ? content.slice(0, 10_000) + '\n... [truncated]' : content;
    toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: trimmed });
  } catch {
    toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `ERROR: File not found: ${path}`, is_error: true });
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/unit/services/builder/scope-policy.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/builder/scope-policy.ts src/services/builder/code-generator.ts tests/unit/services/builder/scope-policy.test.ts
git commit -m "fix(builder): add read_file path validation to scope policy"
```

---

## Batch 4: DRY Tool Loop & Recovery

### Task 8: Extract shared tool loop from code-generator

**Files:**
- Modify: `src/services/builder/code-generator.ts`

**Step 1: Run existing tests as baseline**

Run: `npm run validate`
Expected: PASS (all green before refactor)

**Step 2: Refactor**

Extract a private `runToolLoop()` function that both `generateCode` and `repairCode` call. The function signature:

```typescript
interface ToolLoopConfig {
  client: Anthropic;
  systemPrompt: string;
  userMessage: string;
  projectRoot: string;
  onToolActivity?: ToolActivityCallback;
  allowedPlanPaths?: Set<string>; // hard enforcement of plan files
}

async function runToolLoop(config: ToolLoopConfig): Promise<GenerationResult> {
  // Shared tool dispatch logic (write_file, modify_file, read_file)
  // with scope policy, content scanning, read validation
}
```

Then `generateCode` becomes:
```typescript
export async function generateCode(...) {
  const systemPrompt = plan ? buildSystemPrompt(plan.taskType ?? 'new-resource') : BUILDER_SYSTEM_PROMPT;
  const contextText = ...;
  const allowedPlanPaths = plan ? new Set(plan.files.map(f => f.path)) : undefined;
  return runToolLoop({ client, systemPrompt, userMessage, projectRoot, onToolActivity, allowedPlanPaths });
}
```

And `repairCode` becomes:
```typescript
export async function repairCode(...) {
  return runToolLoop({ client, systemPrompt: BUILDER_SYSTEM_PROMPT, userMessage: repairMessage, projectRoot });
}
```

**Step 3: Run tests to verify nothing broke**

Run: `npm run validate`
Expected: PASS — refactor is behavior-preserving

**Step 4: Commit**

```bash
git add src/services/builder/code-generator.ts
git commit -m "refactor(builder): extract shared runToolLoop from generateCode and repairCode"
```

---

### Task 9: Implement three-level recovery in BuilderService

**Files:**
- Modify: `src/services/builder.service.ts`
- Modify: `src/services/builder/world-notifier.ts`
- Modify: `src/services/builder/git-ops.ts`

**Step 1: Update world-notifier for `completed_draft`**

In `src/services/builder/world-notifier.ts`, add to `STATUS_MESSAGES`:
```typescript
completed_draft: 'Pipeline completed with validation issues (draft PR created)',
```

**Step 2: Update git-ops for draft branches**

In `src/services/builder/git-ops.ts`, add a function:
```typescript
export async function createDraftBranchAndCommit(
  projectRoot: string,
  jobId: string,
  prompt: string,
  filePaths: string[]
): Promise<GitCommitResult> {
  const git: SimpleGit = simpleGit(projectRoot);
  const slug = slugify(prompt);
  const branch = `draft/${jobId}-${slug}`;
  await git.checkoutLocalBranch(branch);
  logger.info({ branch }, 'Created draft branch');
  await git.add(filePaths);
  const shortPrompt = prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt;
  const commitMessage = [
    `draft(builder): ${shortPrompt}`,
    '',
    `Generated by AI Builder (job: ${jobId})`,
    'NOTE: Validation failed — this PR needs manual fixes.',
    '',
    'Files:',
    ...filePaths.map((f) => `  - ${f}`),
    '',
    'Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>',
  ].join('\n');
  const commitResult = await git.commit(commitMessage);
  return { branch, commitHash: commitResult.commit || 'unknown' };
}
```

**Step 3: Implement three-level recovery in builder.service.ts**

Replace the validation + repair section of `executeGeneration()` (lines ~283-318) with:

```typescript
// Step 4: Validate (lint + typecheck + test)
currentStep = 'validating';
await this.updateStatus(jobId, currentStep);
this.notifier?.emitProgress(jobId, currentStep);
let currentFiles = result.files;
let validation = await validateProject(projectRoot);

// Level 1: Repair (up to 2 attempts)
const MAX_REPAIR_ATTEMPTS = 2;
for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS && !validation.passed; attempt++) {
  logger.warn({ jobId, attempt }, 'Validation failed, attempting repair');
  const errorSummary = formatValidationErrors(validation);
  const repairResult = await repairCode(currentFiles, errorSummary, projectRoot, apiKey);

  if (repairResult.violations.length > 0) {
    logger.error({ jobId, violations: repairResult.violations }, 'Repair had scope violations');
    break;
  }

  await writeGeneratedFiles(projectRoot, repairResult.files);
  currentFiles = repairResult.files;
  totalTokens.input += repairResult.tokenUsage.inputTokens;
  totalTokens.output += repairResult.tokenUsage.outputTokens;

  validation = await validateProject(projectRoot);
  if (validation.passed) {
    logger.info({ jobId, attempt }, 'Repair succeeded');
  }
}

if (!validation.passed) {
  // Level 2: Draft PR
  logger.warn({ jobId }, 'Repair exhausted, creating draft PR');
  const residualErrors = formatValidationErrors(validation);

  const { branch: draftBranch } = await createDraftBranchAndCommit(projectRoot, jobId, prompt, writtenPaths);
  const github = this.getGitHubConfig();
  await pushBranch(projectRoot, draftBranch);

  const pr = await createPullRequest(
    draftBranch, prompt, currentFiles, jobId, false,
    github.token, github.owner, github.repo
  );

  await cleanupBranch(projectRoot, draftBranch);

  await this.updateStatus(jobId, 'completed_draft', {
    result: {
      files: currentFiles,
      prUrl: pr.prUrl,
      prNumber: pr.prNumber,
      branch: draftBranch,
      validationPassed: false,
      validationErrors: validation.errors.filter(e => !e.passed).map(e => `${e.step}: ${e.output.slice(0, 500)}`),
      tokenUsage: totalTokens,
    },
  });
  this.notifier?.emitSyntheticDeltas(jobId, currentFiles);
  this.notifier?.emitProgress(jobId, 'completed_draft');
  return;
}
```

Also add token tracking throughout `executeGeneration()`:
```typescript
// At the top of executeGeneration:
const totalTokens = { input: 0, output: 0 };

// After generateCode:
totalTokens.input += result.tokenUsage.inputTokens;
totalTokens.output += result.tokenUsage.outputTokens;

// In the completed state update, add tokenUsage:
result: { ...existing, tokenUsage: totalTokens }
```

**Step 4: Run tests**

Run: `npm run validate`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/builder.service.ts src/services/builder/world-notifier.ts src/services/builder/git-ops.ts
git commit -m "feat(builder): implement three-level recovery with draft PR fallback"
```

---

## Batch 5: Enhanced Dry-Run

### Task 10: Install `diff` package and add diff utility

**Step 1: Install**

```bash
npm install diff
npm install -D @types/diff
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add diff package for unified diff generation"
```

---

### Task 11: Create dry-run enrichment module

**Files:**
- Create: `src/services/builder/dry-run.ts`
- Create: `tests/unit/services/builder/dry-run.test.ts`

**Step 1: Write tests**

Create `tests/unit/services/builder/dry-run.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { computeDiffs, computePlanCoverage, findImpactedFiles } from '../../../../src/services/builder/dry-run.js';
import type { BuilderGeneratedFile, BuilderPlanFile } from '../../../../src/schemas/builder.schema.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

describe('computeDiffs', () => {
  it('should produce diff for modified files', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('const x = 1;\n');

    const files: BuilderGeneratedFile[] = [
      { path: 'src/foo.ts', content: 'const x = 2;\n', action: 'modified' },
    ];
    const diffs = await computeDiffs('/root', files);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.path).toBe('src/foo.ts');
    expect(diffs[0]!.diff).toContain('-const x = 1;');
    expect(diffs[0]!.diff).toContain('+const x = 2;');
  });

  it('should show full content for created files', async () => {
    const files: BuilderGeneratedFile[] = [
      { path: 'src/new.ts', content: 'export const Y = 1;\n', action: 'created' },
    ];
    const diffs = await computeDiffs('/root', files);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.diff).toContain('+export const Y = 1;');
  });
});

describe('computePlanCoverage', () => {
  it('should detect missing files', () => {
    const planned: BuilderPlanFile[] = [
      { path: 'src/a.ts', type: 'schema', action: 'create', description: 'A' },
      { path: 'src/b.ts', type: 'model', action: 'create', description: 'B' },
      { path: 'src/c.ts', type: 'service', action: 'create', description: 'C' },
    ];
    const generated: BuilderGeneratedFile[] = [
      { path: 'src/a.ts', content: '', action: 'created' },
    ];

    const coverage = computePlanCoverage(planned, generated);
    expect(coverage.planned).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    expect(coverage.generated).toEqual(['src/a.ts']);
    expect(coverage.missing).toEqual(['src/b.ts', 'src/c.ts']);
  });

  it('should report full coverage when all files generated', () => {
    const planned: BuilderPlanFile[] = [
      { path: 'src/a.ts', type: 'schema', action: 'create', description: 'A' },
    ];
    const generated: BuilderGeneratedFile[] = [
      { path: 'src/a.ts', content: '', action: 'created' },
    ];
    const coverage = computePlanCoverage(planned, generated);
    expect(coverage.missing).toEqual([]);
  });
});

describe('findImpactedFiles', () => {
  it('should find files that import from modified paths', async () => {
    const { readFile, readdir } = await import('node:fs/promises');
    vi.mocked(readdir).mockImplementation(async (dirPath: any) => {
      const p = String(dirPath);
      if (p.endsWith('/src')) return [{ name: 'index.ts', isDirectory: () => false, isFile: () => true }] as any;
      return [] as any;
    });
    vi.mocked(readFile).mockResolvedValue("import { Foo } from './schemas/foo.schema.js';\n");

    const impacted = await findImpactedFiles('/root', [
      { path: 'src/schemas/foo.schema.ts', content: '', action: 'modified' },
    ]);
    expect(impacted).toContain('src/index.ts');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/services/builder/dry-run.test.ts`
Expected: FAIL

**Step 3: Implement**

Create `src/services/builder/dry-run.ts`:

```typescript
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, basename, dirname } from 'node:path';
import { createTwoFilesPatch } from 'diff';
import type { BuilderGeneratedFile, BuilderPlanFile } from '../../schemas/builder.schema.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('fenice', process.env['LOG_LEVEL'] ?? 'info');

export interface DiffEntry {
  path: string;
  diff: string;
}

export interface PlanCoverage {
  planned: string[];
  generated: string[];
  missing: string[];
}

export async function computeDiffs(
  projectRoot: string,
  files: BuilderGeneratedFile[]
): Promise<DiffEntry[]> {
  const diffs: DiffEntry[] = [];

  for (const file of files) {
    let original = '';
    if (file.action === 'modified') {
      try {
        original = await readFile(join(projectRoot, file.path), 'utf-8');
      } catch {
        // File doesn't exist yet — treat as new
      }
    }

    const diff = createTwoFilesPatch(
      file.path,
      file.path,
      original,
      file.content,
      'original',
      'generated'
    );
    diffs.push({ path: file.path, diff });
  }

  return diffs;
}

export function computePlanCoverage(
  planned: BuilderPlanFile[],
  generated: BuilderGeneratedFile[]
): PlanCoverage {
  const plannedPaths = planned.map((f) => f.path);
  const generatedPaths = generated.map((f) => f.path);
  const generatedSet = new Set(generatedPaths);
  const missing = plannedPaths.filter((p) => !generatedSet.has(p));

  return { planned: plannedPaths, generated: generatedPaths, missing };
}

export async function findImpactedFiles(
  projectRoot: string,
  files: BuilderGeneratedFile[]
): Promise<string[]> {
  const modifiedPaths = files
    .filter((f) => f.action === 'modified')
    .map((f) => f.path);

  if (modifiedPaths.length === 0) return [];

  // Build import patterns to search for
  const importPatterns = modifiedPaths.map((p) => {
    // Convert "src/schemas/foo.schema.ts" to patterns like "./schemas/foo.schema.js" or "../schemas/foo.schema.js"
    const withoutExt = p.replace(/\.ts$/, '.js');
    const fileName = basename(withoutExt, '.js');
    return fileName;
  });

  const impacted = new Set<string>();

  async function scanDir(dirPath: string): Promise<void> {
    let items: Awaited<ReturnType<typeof readdir>>;
    try {
      items = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      const fullPath = join(dirPath, item.name);
      if (item.isDirectory()) {
        if (['node_modules', 'dist', '.git'].includes(item.name)) continue;
        await scanDir(fullPath);
      } else if (item.isFile() && item.name.endsWith('.ts')) {
        const relativePath = relative(projectRoot, fullPath).replace(/\\/g, '/');
        // Skip files that are themselves being modified
        if (modifiedPaths.includes(relativePath)) continue;

        try {
          const content = await readFile(fullPath, 'utf-8');
          for (const pattern of importPatterns) {
            if (content.includes(pattern)) {
              impacted.add(relativePath);
              break;
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  await scanDir(join(projectRoot, 'src'));
  return [...impacted].sort();
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/unit/services/builder/dry-run.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/builder/dry-run.ts tests/unit/services/builder/dry-run.test.ts
git commit -m "feat(builder): add dry-run enrichment — diffs, plan coverage, impact analysis"
```

---

### Task 12: Wire dry-run enrichment into BuilderService

**Files:**
- Modify: `src/services/builder.service.ts`

**Step 1: Import and wire**

In `src/services/builder.service.ts`, add imports:
```typescript
import { computeDiffs, computePlanCoverage, findImpactedFiles } from './builder/dry-run.js';
```

Replace the dry-run block (around line 260-273) with:

```typescript
if (isDryRun) {
  const diffs = await computeDiffs(projectRoot, result.files);
  const planCoverage = plan ? computePlanCoverage(plan.files, result.files) : undefined;
  const impactedFiles = await findImpactedFiles(projectRoot, result.files);

  await this.updateStatus(jobId, 'completed', {
    result: {
      files: result.files,
      validationPassed: true,
      tokenUsage: { input: result.tokenUsage.inputTokens, output: result.tokenUsage.outputTokens },
      diffs,
      planCoverage,
      impactedFiles: impactedFiles.length > 0 ? impactedFiles : undefined,
    },
  });
  this.notifier?.emitSyntheticDeltas(jobId, result.files);
  this.notifier?.emitProgress(jobId, 'completed');
  logger.info({ jobId, diffs: diffs.length, missing: planCoverage?.missing.length ?? 0 }, 'Dry run completed with enrichment');
  return;
}
```

**Step 2: Run tests**

Run: `npm run validate`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/builder.service.ts
git commit -m "feat(builder): wire dry-run enrichment into pipeline — diffs, coverage, impact in job result"
```

---

## Batch 6: Integration — Wire Planning + Generation

### Task 13: Wire file indexer and smart context into planning phase

**Files:**
- Modify: `src/services/builder.service.ts`

**Step 1: Update `executePlanning()`**

Import file indexer:
```typescript
import { buildFileIndex, formatFileIndex } from './builder/file-indexer.js';
```

Update `executePlanning()` to use file index and the new `buildPlanPrompt`:
```typescript
import { buildPlanPrompt } from './builder/prompt-templates.js';

// In executePlanning:
const fileIndex = await buildFileIndex(projectRoot);
const formattedIndex = formatFileIndex(fileIndex);

// Replace the old generatePlan call:
const { plan } = await withTimeout(
  generatePlan(prompt, context, apiKey, formattedIndex),
  PIPELINE_TIMEOUT_MS,
  'Planning'
);
```

**Step 2: Update `generatePlan` in code-generator.ts to accept fileIndex**

```typescript
export async function generatePlan(
  prompt: string,
  context: ContextBundle,
  apiKey: string,
  fileIndex?: string
): Promise<PlanResult> {
  const client = new Anthropic({ apiKey });
  const contextText = formatContextForPrompt(context);
  const planPrompt = fileIndex ? buildPlanPrompt(fileIndex) : BUILDER_PLAN_PROMPT;
  const userMessage = `${contextText}\n\n## User Request\n\n${prompt}`;
  // ... rest unchanged except use planPrompt as system
}
```

**Step 3: Wire dynamic context into `executeGeneration()`**

```typescript
import { buildDynamicContext, formatDynamicContext } from './builder/context-reader.js';

// In executeGeneration, replace context reading:
const contextFiles = plan.contextFiles ?? [];
const dynamicContext = await buildDynamicContext(projectRoot, contextFiles);
```

Then pass `dynamicContext` formatted text to `generateCode` instead of the old `context` bundle.

**Step 4: Run tests**

Run: `npm run validate`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/builder.service.ts src/services/builder/code-generator.ts
git commit -m "feat(builder): wire file indexer and smart context into planning and generation phases"
```

---

### Task 14: Wire task-type-aware system prompt into generation

**Files:**
- Modify: `src/services/builder/code-generator.ts`

**Step 1: Update `generateCode` to use task-type prompt**

```typescript
import { buildSystemPrompt } from './prompt-templates.js';

// In generateCode, replace BUILDER_SYSTEM_PROMPT with:
const taskType = plan?.taskType ?? 'new-resource';
const systemPrompt = buildSystemPrompt(taskType);
```

Apply the same in `runToolLoop` if already extracted (Task 8).

**Step 2: Run tests**

Run: `npm run validate`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/builder/code-generator.ts
git commit -m "feat(builder): use task-type-aware system prompt in code generation"
```

---

### Task 15: Final integration test and validation

**Files:**
- Modify: `tests/integration/builder.test.ts`

**Step 1: Add integration tests for new features**

Add test cases:
```typescript
describe('Builder v2 integration', () => {
  it('should accept taskType in generate request options', async () => {
    // POST /api/v1/builder/generate with { prompt: '...', options: { taskType: 'refactor' } }
    // Verify job is created with taskType stored
  });

  it('should return enriched result for dry run', async () => {
    // Mock a completed dry-run job with diffs, planCoverage, impactedFiles
    // GET /api/v1/builder/jobs/:id
    // Verify all new fields present in response
  });

  it('should accept completed_draft status in job listing', async () => {
    // GET /api/v1/builder/jobs?status=completed_draft
    // Verify it's a valid filter
  });
});
```

**Step 2: Run full validation**

Run: `npm run validate`
Expected: PASS — all lint, typecheck, tests green

**Step 3: Commit**

```bash
git add tests/integration/builder.test.ts
git commit -m "test(builder): add integration tests for task types, dry-run enrichment, draft status"
```

---

## Summary

| Batch | Tasks | Focus |
|-------|-------|-------|
| 1 | Tasks 1-3 | Schema & model foundation (TaskType, contextFiles, completed_draft, enriched result) |
| 2 | Tasks 4-5 | File indexer & smart context reader |
| 3 | Tasks 6-7 | Task-specific prompts & read_file security |
| 4 | Tasks 8-9 | DRY tool loop refactor & three-level recovery |
| 5 | Tasks 10-12 | Enhanced dry-run (diff, plan coverage, impact analysis) |
| 6 | Tasks 13-15 | Integration wiring & final tests |

**Total: 15 tasks across 6 batches. ~900 lines of new/modified server code.**
