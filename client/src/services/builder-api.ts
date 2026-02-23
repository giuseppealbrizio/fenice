import type { BuilderJob } from '../types/builder';

interface SubmitResponse {
  jobId: string;
}

export async function submitBuilderPrompt(
  token: string,
  prompt: string,
  dryRun: boolean
): Promise<SubmitResponse> {
  const res = await fetch('/api/v1/builder/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, options: { dryRun } }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Builder request failed (${res.status})`);
  }

  return (await res.json()) as SubmitResponse;
}

export async function fetchBuilderJob(token: string, jobId: string): Promise<BuilderJob> {
  const res = await fetch(`/api/v1/builder/jobs/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Failed to fetch job (${res.status})`);
  }

  return (await res.json()) as BuilderJob;
}
