# M6: Builder Frontend Design

**Goal:** Expose all M5 Builder v2 backend capabilities in the client UI — task type selection, enriched dry-run display (diffs, plan coverage, impacted files), and completed_draft status handling.

**Approach:** Incremental extraction — split the monolithic `BuilderPromptBar.tsx` (23KB) into focused sub-components, then add M5 features in the new components.

**Constraints:** Client-only milestone. No backend changes. No new dependencies (diff parsing is string splitting, no library needed).

---

## Component Architecture

The existing `BuilderPromptBar.tsx` becomes a lightweight container that orchestrates sub-components. Each receives props wired from the Zustand store.

```
client/src/components/builder/
  BuilderPromptBar.tsx        container: layout, visibility logic, store wiring
  BuilderTaskSelector.tsx     6 pill/chip buttons for taskType selection
  BuilderPromptInput.tsx      text input + generate button + preview/live toggle
  BuilderProgress.tsx         status text + progress bar + activity log
  BuilderPlanReview.tsx       file list (editable) + approve/reject buttons
  BuilderResultPanel.tsx      files + PR link + diffs + coverage + impacted files
  BuilderDiffViewer.tsx       unified diff display with colored +/- lines
  BuilderDraftResult.tsx      amber state for completed_draft: PR link + validation errors
  builder-theme.ts            shared BUILDER_THEME object (extracted from monolith)
```

The old `components/BuilderPromptBar.tsx` is replaced by `components/builder/BuilderPromptBar.tsx`. The import in `App.tsx` changes only the path.

### Component Visibility by Status

| Component | Visible when |
|---|---|
| TaskSelector | Always (disabled during active job) |
| PromptInput | Always |
| Progress | `status` is not null |
| PlanReview | `status === 'plan_ready'` |
| ResultPanel | `status === 'completed'` |
| DiffViewer | Inside ResultPanel, when `diffs` is present (dry-run only) |
| DraftResult | `status === 'completed_draft'` |

---

## Type Updates

File: `types/builder.ts`

New type:
```typescript
type TaskType = 'new-resource' | 'refactor' | 'bugfix' | 'schema-migration' | 'test-gen' | 'doc-gen';
```

Updated interfaces:
```typescript
interface BuilderPlan {
  files: BuilderPlanFile[];
  summary: string;
  taskType?: TaskType;           // NEW
}

interface BuilderJobResult {
  files: BuilderGeneratedFile[];
  prUrl?: string;
  prNumber?: number;
  branch?: string;
  validationPassed?: boolean;
  validationErrors?: string[];   // NEW: for completed_draft
  tokenUsage?: {                 // NEW
    inputTokens: number;
    outputTokens: number;
  };
  diffs?: Array<{                // NEW: unified diff per file
    path: string;
    diff: string;
  }>;
  planCoverage?: {               // NEW
    planned: string[];
    generated: string[];
    missing: string[];
  };
  impactedFiles?: string[];      // NEW
}

interface BuilderOptions {
  dryRun: boolean;
  taskType?: TaskType;           // NEW
  includeModel?: boolean;
  includeTests?: boolean;
}
```

No types removed. Backward-compatible with existing jobs.

---

## Store Updates

File: `stores/builder.store.ts`

New state fields:
```typescript
taskType: TaskType;              // default: 'new-resource'
diffs: DiffEntry[] | null;
planCoverage: PlanCoverage | null;
impactedFiles: string[] | null;
validationErrors: string[] | null;
prUrl: string | null;
prNumber: number | null;
branch: string | null;
```

New actions:
- `setTaskType(type)` — updates task type from pill selector

Modified actions:
- `setResult(result)` — now extracts `diffs`, `planCoverage`, `impactedFiles`, `prUrl`, `prNumber`, `branch`, `validationErrors` from the result object
- `applyProgress(payload)` — handles `completed_draft` status (today only handles `completed` and `failed`)
- `reset()` and `dismiss()` — clear new fields

---

## New Components

### BuilderTaskSelector

Horizontal row of 6 pill buttons above the prompt input.

- Active pill: filled background (blue)
- Inactive pills: outline style
- Default selection: `new-resource`
- Disabled when a job is active
- Labels: "New Resource", "Refactor", "Bugfix", "Migration", "Tests", "Docs"

### BuilderDiffViewer

Receives `Array<{ path, diff }>`. Renders an accordion per file.

- Lines starting with `+`: green text, light green background
- Lines starting with `-`: red text, light red background
- Lines starting with `@@`: gray text (hunk headers)
- Other lines: default color (context)
- Monospace font, horizontal scroll
- All collapsed by default, click to expand one at a time
- No external dependency — parses diff text with `string.split('\n')`

### BuilderDraftResult

Amber-themed panel for `completed_draft` status.

- Border and accents: amber (#f59e0b / #d97706)
- Header: warning icon + "Draft PR Created"
- Message: "Validation failed after repair attempts. A draft PR has been created for manual fixes."
- PR link: opens GitHub in new tab
- Branch name displayed
- Validation errors: collapsible accordion, collapsed by default
- File list with action badges (CREATED/MODIFIED)

### BuilderResultPanel (updated)

For `completed` status. Shows existing file list and PR link, plus new sections visible only in dry-run (when data is present in result):

- **Diffs section**: accordion, delegates to BuilderDiffViewer
- **Plan Coverage**: "4/4 planned files generated" with missing files in red if any
- **Impacted Files**: simple list of paths that import modified files

---

## API Layer

File: `services/builder-api.ts`

Single change: `submitBuilderPrompt` accepts optional `taskType` and passes it in `options`:

```typescript
submitBuilderPrompt(token, prompt, dryRun, taskType?)
  body: { prompt, options: { dryRun, taskType } }
```

All other API calls unchanged. The enriched result data comes from `fetchBuilderJob` which already returns the full job object.

---

## Data Flow

1. User selects task type pill -> `store.setTaskType('refactor')`
2. User writes prompt -> `store.setPrompt(...)`
3. User clicks Generate -> `builderApi.submitBuilderPrompt(token, prompt, dryRun, taskType)`
4. Server responds `{ jobId }` -> `store.startJob(jobId)`
5. WebSocket delivers `builder.progress` events -> `store.applyProgress()`
6. Status reaches `plan_ready` -> UI shows BuilderPlanReview
7. User approves -> `builderApi.approveBuilderJob(token, jobId, plan)`
8. WebSocket delivers progress events through generation pipeline
9. Status reaches `completed` or `completed_draft`:
   - `builderApi.fetchBuilderJob(token, jobId)` -> full result with diffs, coverage, etc.
   - `store.setResult(job.result)` -> extracts all fields
10. UI shows BuilderResultPanel (completed) or BuilderDraftResult (completed_draft)

---

## Theme Additions

Extracted to `builder-theme.ts`, shared across all sub-components. New color tokens:

```typescript
// Amber for completed_draft
draftBg: 'rgba(245, 158, 11, 0.08)',
draftBorder: '#d97706',
draftText: '#f59e0b',

// Diff viewer
diffAdded: '#22c55e',
diffAddedBg: 'rgba(34, 197, 94, 0.1)',
diffRemoved: '#ef4444',
diffRemovedBg: 'rgba(239, 68, 68, 0.1)',
diffHeader: '#6b7280',

// Plan coverage
coverageMissing: '#ef4444',
coverageComplete: '#22c55e',
```

Light/dark variants follow the existing theme pattern.

---

## Testing

| Test file | Coverage |
|---|---|
| `builder.store.test.ts` | Updated: `setTaskType`, `setResult` with M5 fields, `completed_draft` handling, reset of new fields |
| `BuilderTaskSelector.test.tsx` | Render 6 pills, click changes selection, disabled during job |
| `BuilderDiffViewer.test.tsx` | Parse diff text, +/- colors, accordion expand/collapse, empty state |
| `BuilderDraftResult.test.tsx` | Amber styling, PR link, validation errors accordion, file list |
| `BuilderResultPanel.test.tsx` | File list, PR link, diffs/coverage/impacted only when present |

Framework: Vitest + @testing-library/react (already in client).

---

## Out of Scope (noted for future milestones)

- **Job history** — list previous jobs with pagination (backend `listJobs` endpoint ready)
- **Cancel in-flight** — abort a running job
- **File content viewer** — view full generated file content (code viewer)
- **Selective plan approval** — approve/reject individual plan files
- **Token usage display** — show consumed tokens to user
