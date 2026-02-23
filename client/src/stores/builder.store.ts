import { create } from 'zustand';
import type {
  BuilderJobStatus,
  BuilderGeneratedFile,
  BuilderProgressPayload,
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

  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setPrompt: (prompt: string) => void;
  setDryRun: (dryRun: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  startJob: (jobId: string) => void;
  applyProgress: (payload: BuilderProgressPayload) => void;
  setResult: (files: BuilderGeneratedFile[]) => void;
  setError: (error: string) => void;
  dismiss: () => void;
  reset: () => void;
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
};

export const useBuilderStore = create<BuilderState>((set, get) => ({
  ...initialState,

  setExpanded: (expanded) => set({ expanded }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  setPrompt: (prompt) => set({ prompt }),
  setDryRun: (dryRun) => set({ dryRun }),
  setSubmitting: (submitting) => set({ submitting }),

  startJob: (jobId) =>
    set({
      jobId,
      status: 'queued',
      statusMessage: 'Job queued',
      files: [],
      logs: [],
      error: null,
      submitting: false,
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
    set({ jobId: null, status: null, statusMessage: null, files: [], logs: [], error: null }),

  reset: () => set(initialState),
}));
