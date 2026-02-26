import { create } from 'zustand';
import type {
  BuilderJobStatus,
  BuilderGeneratedFile,
  BuilderProgressPayload,
  BuilderPlanFile,
  TaskType,
  DiffEntry,
  PlanCoverage,
  BuilderJobResult,
} from '../types/builder';

const MAX_LOGS = 50;

interface BuilderState {
  expanded: boolean;
  jobId: string | null;
  status: BuilderJobStatus | null;
  statusMessage: string | null;
  prompt: string;
  dryRun: boolean;
  files: BuilderGeneratedFile[];
  logs: string[];
  error: string | null;
  submitting: boolean;
  plan: BuilderPlanFile[] | null;
  summary: string | null;
  taskType: TaskType;
  diffs: DiffEntry[] | null;
  planCoverage: PlanCoverage | null;
  impactedFiles: string[] | null;
  validationErrors: string[] | null;
  prUrl: string | null;
  prNumber: number | null;
  branch: string | null;

  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setPrompt: (prompt: string) => void;
  setDryRun: (dryRun: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setTaskType: (taskType: TaskType) => void;
  setFullResult: (result: BuilderJobResult) => void;
  startJob: (jobId: string) => void;
  applyProgress: (payload: BuilderProgressPayload) => void;
  setResult: (files: BuilderGeneratedFile[]) => void;
  setError: (error: string) => void;
  dismiss: () => void;
  reset: () => void;
  setPlan: (plan: BuilderPlanFile[], summary: string) => void;
  updatePlanFile: (index: number, changes: Partial<BuilderPlanFile>) => void;
  removePlanFile: (index: number) => void;
}

const initialState = {
  expanded: false,
  jobId: null as string | null,
  status: null as BuilderJobStatus | null,
  statusMessage: null as string | null,
  prompt: '',
  dryRun: true,
  files: [] as BuilderGeneratedFile[],
  logs: [] as string[],
  error: null as string | null,
  submitting: false,
  plan: null as BuilderPlanFile[] | null,
  summary: null as string | null,
  taskType: 'new-resource' as TaskType,
  diffs: null as DiffEntry[] | null,
  planCoverage: null as PlanCoverage | null,
  impactedFiles: null as string[] | null,
  validationErrors: null as string[] | null,
  prUrl: null as string | null,
  prNumber: null as number | null,
  branch: null as string | null,
};

export const useBuilderStore = create<BuilderState>((set, get) => ({
  ...initialState,

  setExpanded: (expanded) => set({ expanded }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  setPrompt: (prompt) => set({ prompt }),
  setDryRun: (dryRun) => set({ dryRun }),
  setSubmitting: (submitting) => set({ submitting }),

  setTaskType: (taskType) => set({ taskType }),

  setFullResult: (result) =>
    set({
      files: result.files,
      status: result.validationPassed === false ? 'completed_draft' : 'completed',
      submitting: false,
      diffs: result.diffs ?? null,
      planCoverage: result.planCoverage ?? null,
      impactedFiles: result.impactedFiles ?? null,
      validationErrors: result.validationErrors ?? null,
      prUrl: result.prUrl ?? null,
      prNumber: result.prNumber ?? null,
      branch: result.branch ?? null,
    }),

  startJob: (jobId) =>
    set({
      jobId,
      status: 'queued',
      statusMessage: 'Job queued',
      files: [],
      logs: [],
      error: null,
      submitting: false,
      plan: null,
      summary: null,
      diffs: null,
      planCoverage: null,
      impactedFiles: null,
      validationErrors: null,
      prUrl: null,
      prNumber: null,
      branch: null,
    }),

  applyProgress: (payload) => {
    const state = get();
    // Only process events for the current job
    if (state.jobId !== payload.jobId) return;

    const updates: Partial<BuilderState> = {
      status: payload.status,
      statusMessage: payload.message,
    };

    // Append detail to logs if present
    if (payload.detail) {
      const newLogs = [...state.logs, payload.detail].slice(-MAX_LOGS);
      updates.logs = newLogs;
    }

    set(updates);
  },

  setResult: (files) => set({ files, status: 'completed', submitting: false }),

  setError: (error) => set({ error, status: 'failed', submitting: false }),

  dismiss: () =>
    set({
      jobId: null,
      status: null,
      statusMessage: null,
      files: [],
      logs: [],
      error: null,
      plan: null,
      summary: null,
      diffs: null,
      planCoverage: null,
      impactedFiles: null,
      validationErrors: null,
      prUrl: null,
      prNumber: null,
      branch: null,
    }),

  reset: () => set(initialState),

  setPlan: (plan, summary) => set({ plan, summary }),

  updatePlanFile: (index, changes) => {
    const plan = get().plan;
    if (!plan) return;
    const updated = [...plan];
    const existing = updated[index];
    if (!existing) return;
    updated[index] = { ...existing, ...changes };
    set({ plan: updated });
  },

  removePlanFile: (index) => {
    const plan = get().plan;
    if (!plan) return;
    set({ plan: plan.filter((_, i) => i !== index) });
  },
}));
