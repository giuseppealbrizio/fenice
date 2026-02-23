/**
 * Client-side builder types.
 * Mirrors backend Zod schemas in src/schemas/builder.schema.ts.
 */

export type BuilderJobStatus =
  | 'queued'
  | 'reading_context'
  | 'generating'
  | 'writing_files'
  | 'validating'
  | 'creating_pr'
  | 'completed'
  | 'failed';

export interface BuilderGeneratedFile {
  path: string;
  content: string;
  action: 'created' | 'modified';
}

export interface BuilderJobResult {
  files: BuilderGeneratedFile[];
  prUrl?: string | undefined;
  prNumber?: number | undefined;
  branch?: string | undefined;
  validationPassed?: boolean | undefined;
}

export interface BuilderJobError {
  code: string;
  message: string;
  step?: BuilderJobStatus | undefined;
}

export interface BuilderProgressPayload {
  jobId: string;
  status: BuilderJobStatus;
  message: string;
  detail?: string | undefined;
}

export interface BuilderJob {
  id: string;
  prompt: string;
  status: BuilderJobStatus;
  result?: BuilderJobResult | undefined;
  error?: BuilderJobError | undefined;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
