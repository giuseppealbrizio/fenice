# Direct Integration Mode — Design Document

**Date:** 2026-02-27
**Status:** Approved
**Author:** Giuseppe Albrizio + Claude Opus 4.6

## Problem

The builder always creates PRs on branches. Generated code doesn't appear in the running server or 3D cosmos until someone manually merges the PR and restarts. For demo and rapid development, users want a "type prompt, see API appear live" experience.

## Solution

Add `integrationMode: "pr" | "direct"` to builder options.

- **pr mode** (default, unchanged): branch -> commit -> push -> PR
- **direct mode**: write files to working tree -> commit on main -> tsx watch auto-reloads -> endpoints appear live

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Confirmation before commit | Auto-commit + undo | Zero friction for the magic demo feel |
| Rollback mechanism | `git revert` (new commit) | Clean history, no divergence risk |
| Validation failure behavior | Repair + retry, then fallback to draft PR | Never throw away generated code |
| Architecture | Inline in service (if/else) | Two strategies don't justify a pattern |

## Schema Changes

### BuilderJobStatusEnum

Add two new statuses:
- `committing` — direct mode: writing files to main and committing
- `rolled_back` — job was rolled back via revert

### BuilderOptionsSchema

Add field:
```typescript
integrationMode: z.enum(['pr', 'direct']).default('pr'),
```

### BuilderJobResultSchema

Add field:
```typescript
commitHash: z.string().optional(),  // direct mode only
```

## Pipeline Flow

```
Validation passed?
  |-- YES + mode=pr    -> push branch -> create PR -> completed
  |-- YES + mode=direct -> write to projectRoot -> commit on main -> completed
  |-- NO + repair OK   -> (same as YES, depending on mode)
  |-- NO + repair FAIL + mode=pr     -> draft PR -> completed_draft
  |-- NO + repair FAIL + mode=direct -> fallback: draft PR -> completed_draft
```

### Direct mode detail (after validation passes)

1. Write validated files to `projectRoot` (not worktree)
2. Commit on main via `simple-git` with `--no-verify`
3. tsx watch detects changes, server restarts automatically
4. Save `commitHash` in job result for rollback
5. Emit world deltas (same as PR mode)
6. Clean up validation worktree

### Git ops additions

```typescript
// New function: commit directly to main
export async function commitToMain(
  projectRoot: string, jobId: string, prompt: string, filePaths: string[]
): Promise<string>

// New function: revert a commit
export async function revertCommit(
  projectRoot: string, commitHash: string
): Promise<string>
```

## Rollback Endpoint

`POST /api/v1/builder/jobs/:id/rollback`

Preconditions:
- Job status must be `completed`
- Job must have `result.commitHash` (direct mode only)
- If no commitHash -> 400 "Cannot rollback PR-mode jobs"

Flow:
1. `git revert <commitHash> --no-edit`
2. Update job status to `rolled_back`
3. tsx watch restarts, endpoints disappear
4. Emit world deltas to remove services from cosmos

## Files to Modify

| File | Change |
|------|--------|
| `src/schemas/builder.schema.ts` | Add `integrationMode`, `commitHash`, `committing`, `rolled_back` |
| `src/services/builder.service.ts` | Branch on integrationMode after validation, add `rollback()` method |
| `src/services/builder/git-ops.ts` | Add `commitToMain()`, `revertCommit()` |
| `src/routes/builder.routes.ts` | Add rollback endpoint |
| `tests/unit/schemas/builder.schema.test.ts` | Update for new fields/statuses |
| `tests/unit/services/builder/git-ops.test.ts` | Add commitToMain + revertCommit tests |

## Estimated Scope

~120 lines of new code (excluding tests). No new files needed.
