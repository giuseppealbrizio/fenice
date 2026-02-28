# Direct Integration Mode — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `integrationMode: "direct"` to the builder so generated code is committed directly to main, tsx watch reloads, and endpoints appear live — with rollback via git revert.

**Architecture:** Inline branching in `executeGeneration()` after validation. Direct mode writes files to `projectRoot` and commits on main. New rollback endpoint reverts the commit. Fallback to draft PR if validation+repair fails.

**Tech Stack:** Zod schemas, Mongoose model, Hono OpenAPI routes, simple-git, vitest

---

### Task 1: Schema — Add integrationMode, commitHash, new statuses

**Files:**
- Modify: `src/schemas/builder.schema.ts`
- Modify: `src/models/builder-job.model.ts`
- Test: `tests/unit/schemas/builder.schema.test.ts`

**Step 1: Update the schema test file with new expectations**

Add to `tests/unit/schemas/builder.schema.test.ts`:

In `BuilderJobStatusEnum` describe block, add:
```typescript
it('should accept committing status', () => {
  expect(() => BuilderJobStatusEnum.parse('committing')).not.toThrow();
});

it('should accept rolled_back status', () => {
  expect(() => BuilderJobStatusEnum.parse('rolled_back')).not.toThrow();
});
```

In `BuilderOptionsSchema` describe block, add:
```typescript
it('should default integrationMode to pr', () => {
  const result = BuilderOptionsSchema.parse({});
  expect(result.integrationMode).toBe('pr');
});

it('should accept direct integrationMode', () => {
  const result = BuilderOptionsSchema.parse({ integrationMode: 'direct' });
  expect(result.integrationMode).toBe('direct');
});

it('should reject invalid integrationMode', () => {
  expect(() => BuilderOptionsSchema.parse({ integrationMode: 'yolo' })).toThrow();
});
```

In `BuilderJobResultSchema` describe block (find or create one), add:
```typescript
it('should accept commitHash field', () => {
  const result = BuilderJobResultSchema.parse({
    files: [],
    commitHash: 'abc123def456',
  });
  expect(result.commitHash).toBe('abc123def456');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/schemas/builder.schema.test.ts`
Expected: FAIL — 'committing' and 'rolled_back' not in enum, integrationMode not in schema

**Step 3: Update Zod schemas**

In `src/schemas/builder.schema.ts`:

Add `'committing'` and `'rolled_back'` to `BuilderJobStatusEnum`:
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
  'committing',
  'completed',
  'completed_draft',
  'failed',
  'rejected',
  'rolled_back',
]);
```

Add `integrationMode` to `BuilderOptionsSchema`:
```typescript
export const BuilderOptionsSchema = z
  .object({
    dryRun: z.boolean().default(false),
    targetTag: z.string().min(1).max(50).optional(),
    includeModel: z.boolean().default(true),
    includeTests: z.boolean().default(true),
    taskType: TaskTypeEnum.optional(),
    integrationMode: z.enum(['pr', 'direct']).default('pr'),
  })
  .strict();
```

Add `commitHash` to `BuilderJobResultSchema`:
```typescript
// Inside BuilderJobResultSchema, add after `branch`:
commitHash: z.string().optional(),
```

**Step 4: Update Mongoose model**

In `src/models/builder-job.model.ts`:

Add `integrationMode` to the options sub-schema (around line 102-107):
```typescript
options: {
  dryRun: { type: Boolean, default: false },
  targetTag: String,
  includeModel: { type: Boolean, default: true },
  includeTests: { type: Boolean, default: true },
  taskType: { type: String, enum: TaskTypeEnum.options },
  integrationMode: { type: String, enum: ['pr', 'direct'], default: 'pr' },
},
```

Add `commitHash` to `jobResultSchema` (around line 63-77):
```typescript
// After `branch: String,` add:
commitHash: String,
```

Also add `'config'` and `'middleware'` to the `planFileSchema` type enum since they were added to the Zod schema previously but not the Mongoose model:
```typescript
type: { type: String, required: true, enum: ['schema', 'model', 'service', 'route', 'test', 'config', 'middleware'] },
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/schemas/builder.schema.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/schemas/builder.schema.ts src/models/builder-job.model.ts tests/unit/schemas/builder.schema.test.ts
git commit -m "feat(builder): add integrationMode, commitHash, committing/rolled_back statuses"
```

---

### Task 2: Git ops — Add commitToMain and revertCommit

**Files:**
- Modify: `src/services/builder/git-ops.ts`
- Test: `tests/unit/services/builder/git-ops.test.ts`

**Step 1: Add tests for commitToMain and revertCommit**

Add to `tests/unit/services/builder/git-ops.test.ts`:

First, update the import block to include the new functions:
```typescript
const {
  // ... existing imports ...
  commitToMain,
  revertCommit,
} = await import('../../../../src/services/builder/git-ops.js');
```

Then add test blocks:
```typescript
describe('commitToMain', () => {
  it('should stage files and commit on current branch', async () => {
    const hash = await commitToMain('/project', 'job-100', 'Add tasks endpoint', [
      'src/schemas/task.schema.ts',
      'src/models/task.model.ts',
    ]);

    expect(hash).toBe('abc123');
    expect(mockAdd).toHaveBeenCalledWith([
      'src/schemas/task.schema.ts',
      'src/models/task.model.ts',
    ]);
    const commitMsg = mockCommit.mock.calls[0]?.[0] as string;
    expect(commitMsg).toContain('feat(builder):');
    expect(commitMsg).toContain('Add tasks endpoint');
    expect(commitMsg).toContain('Co-Authored-By: Claude Opus 4.6');
    expect(commitMsg).toContain('job-100');
    expect(mockCommit.mock.calls[0]?.[2]).toEqual({ '--no-verify': null });
  });

  it('should truncate long prompts', async () => {
    await commitToMain('/project', 'job-100', 'A'.repeat(100), ['file.ts']);
    const commitMsg = mockCommit.mock.calls[0]?.[0] as string;
    expect(commitMsg).toContain('...');
  });
});

describe('revertCommit', () => {
  it('should revert the specified commit', async () => {
    const hash = await revertCommit('/project', 'abc123');

    expect(hash).toBe('abc123');
    expect(mockRaw).toHaveBeenCalledWith(['revert', 'abc123', '--no-edit', '--no-verify']);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/services/builder/git-ops.test.ts`
Expected: FAIL — commitToMain and revertCommit not exported

**Step 3: Implement commitToMain and revertCommit**

Add to `src/services/builder/git-ops.ts` (after `removeWorktree`):

```typescript
/**
 * Commits files directly on the current branch (main) — used by direct integration mode.
 * No branch creation, no worktree — files are already in the working tree.
 */
export async function commitToMain(
  projectRoot: string,
  jobId: string,
  prompt: string,
  filePaths: string[]
): Promise<string> {
  const git: SimpleGit = simpleGit(projectRoot);
  await git.add(filePaths);

  const shortPrompt = prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt;
  const commitMessage = [
    `feat(builder): ${shortPrompt}`,
    '',
    `Generated by AI Builder (job: ${jobId})`,
    '',
    'Files:',
    ...filePaths.map((f) => `  - ${f}`),
    '',
    'Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>',
  ].join('\n');

  const result = await git.commit(commitMessage, undefined, { '--no-verify': null });
  const commitHash = result.commit || 'unknown';
  logger.info({ jobId, commitHash, fileCount: filePaths.length }, 'Committed directly to main');

  return commitHash;
}

/**
 * Reverts a commit by hash — used by the rollback endpoint.
 * Creates a new revert commit (does not rewrite history).
 */
export async function revertCommit(projectRoot: string, commitHash: string): Promise<string> {
  const git: SimpleGit = simpleGit(projectRoot);
  await git.raw(['revert', commitHash, '--no-edit', '--no-verify']);
  logger.info({ commitHash }, 'Reverted commit');
  return commitHash;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/services/builder/git-ops.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/builder/git-ops.ts tests/unit/services/builder/git-ops.test.ts
git commit -m "feat(builder): add commitToMain and revertCommit git operations"
```

---

### Task 3: Service — Add direct mode branch in executeGeneration

**Files:**
- Modify: `src/services/builder.service.ts`

**Step 1: Add commitToMain and revertCommit imports**

At the top of `src/services/builder.service.ts`, update the git-ops import to include:
```typescript
import {
  // ... existing imports ...
  commitToMain,
  revertCommit,
} from './builder/git-ops.js';
```

**Step 2: Pass integrationMode through the pipeline**

In `executeGeneration()`, extract integrationMode from options (around line 266):
```typescript
const isDirectMode = options?.integrationMode === 'direct';
```

**Step 3: Add direct mode branch after validation passes**

After the validation loop (around line 438, after `if (!validation.passed)` block ends at line 484), replace the existing "Step 5: Push branch and create PR" block (lines 486-520) with a branching structure:

```typescript
if (isDirectMode) {
  // Direct mode: write files to projectRoot and commit on main
  currentStep = 'committing';
  await this.updateStatus(jobId, currentStep);
  this.notifier?.emitProgress(jobId, currentStep);

  // Write files to the real project root (triggers tsx watch reload)
  await writeGeneratedFiles(projectRoot, currentFiles);
  const commitHash = await commitToMain(
    projectRoot,
    jobId,
    prompt,
    currentFiles.map((f) => f.path)
  );
  logger.info({ jobId, commitHash }, 'Direct mode: committed to main');

  await this.updateStatus(jobId, 'completed', {
    result: {
      files: currentFiles,
      commitHash,
      validationPassed: true,
      tokenUsage: { inputTokens: totalTokens.input, outputTokens: totalTokens.output },
    },
  });

  this.notifier?.emitSyntheticDeltas(jobId, currentFiles);
  this.notifier?.emitProgress(jobId, 'completed');
} else {
  // PR mode (existing behavior)
  currentStep = 'creating_pr';
  await this.updateStatus(jobId, currentStep);
  this.notifier?.emitProgress(jobId, currentStep);
  const github = await this.getGitHubConfig();
  await pushFromWorktree(wtPath, branch);
  const pr = await createPullRequest(
    branch,
    prompt,
    currentFiles,
    jobId,
    true,
    github.token,
    github.owner,
    github.repo
  );
  logger.info({ jobId, prUrl: pr.prUrl, prNumber: pr.prNumber }, 'PR created');

  await this.updateStatus(jobId, 'completed', {
    result: {
      files: currentFiles,
      prUrl: pr.prUrl,
      prNumber: pr.prNumber,
      branch,
      validationPassed: true,
      tokenUsage: { inputTokens: totalTokens.input, outputTokens: totalTokens.output },
    },
  });

  this.notifier?.emitSyntheticDeltas(jobId, currentFiles);
  this.notifier?.emitProgress(jobId, 'completed');
}
```

**Step 4: Also handle direct mode in the validation-failed fallback**

In the `if (!validation.passed)` block (around line 440-484), the current code creates a draft PR. For direct mode, we also want to fallback to draft PR (per design decision). The existing code already does this — no change needed since `createDraftWorktree` + draft PR works regardless of integrationMode.

**Step 5: Add rollback method**

Add to `BuilderService` class (after the `reject` method):

```typescript
async rollback(jobId: string): Promise<void> {
  const job = await BuilderJobModel.findById(jobId);
  if (!job) throw new NotFoundError('Builder job not found');
  if (job.status !== 'completed') {
    throw new AppError(
      400,
      'INVALID_STATE',
      `Job is in '${job.status}' state, expected 'completed'`
    );
  }

  const result = job.result as Record<string, unknown> | undefined;
  const commitHash = result?.['commitHash'] as string | undefined;
  if (!commitHash) {
    throw new AppError(
      400,
      'NOT_DIRECT_MODE',
      'Cannot rollback PR-mode jobs. Close the PR instead.'
    );
  }

  const projectRoot = this.getProjectRoot();
  await revertCommit(projectRoot, commitHash);
  await this.updateStatus(jobId, 'rolled_back');
  this.notifier?.emitProgress(jobId, 'rolled_back');
  logger.info({ jobId, commitHash }, 'Job rolled back');
}
```

**Step 6: Run full validation**

Run: `npm run validate`
Expected: PASS (lint + typecheck + all tests)

**Step 7: Commit**

```bash
git add src/services/builder.service.ts
git commit -m "feat(builder): add direct integration mode and rollback to service"
```

---

### Task 4: Route — Add rollback endpoint

**Files:**
- Modify: `src/routes/builder.routes.ts`

**Step 1: Add rollback route definition**

Add after the `rejectRoute` definition (around line 284):

```typescript
const rollbackRoute = createRoute({
  method: 'post',
  path: '/builder/jobs/{id}/rollback',
  tags: ['Builder'],
  summary: 'Rollback a direct-mode builder job (git revert)',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    200: {
      description: 'Job rolled back',
      content: { 'application/json': { schema: z.object({ status: z.literal('rolled_back') }) } },
    },
    400: {
      description: 'Invalid state or not a direct-mode job',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Not authenticated',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Forbidden',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Job not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    503: {
      description: 'Builder disabled',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});
```

**Step 2: Add RBAC and handler**

After the existing RBAC lines (around line 294), add:
```typescript
builderRouter.post('/builder/jobs/:id/rollback', requireRole('admin'));
```

After the reject handler (around line 346), add:
```typescript
builderRouter.openapi(rollbackRoute, async (c) => {
  checkBuilderEnabled();
  const { id } = c.req.valid('param');
  await getBuilderService().rollback(id);
  return c.json({ status: 'rolled_back' as const }, 200);
});
```

**Step 3: Run full validation**

Run: `npm run validate`
Expected: PASS

**Step 4: Commit**

```bash
git add src/routes/builder.routes.ts
git commit -m "feat(builder): add POST /builder/jobs/:id/rollback endpoint"
```

---

### Task 5: Final validation and integration commit

**Step 1: Run full validation**

Run: `npm run validate`
Expected: PASS — lint + typecheck + all tests (should be ~710+ tests)

**Step 2: Verify the complete status enum count**

The BuilderJobStatusEnum should now have 14 values:
`queued, planning, plan_ready, reading_context, generating, writing_files, validating, creating_pr, committing, completed, completed_draft, failed, rejected, rolled_back`

**Step 3: Final commit (if any uncommitted changes remain)**

```bash
git add -A
git commit -m "feat(builder): direct integration mode — complete implementation"
```
