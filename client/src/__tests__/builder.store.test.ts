import { beforeEach, describe, expect, it } from 'vitest';
import { useBuilderStore } from '../stores/builder.store';
import type { BuilderProgressPayload } from '../types/builder';

describe('useBuilderStore', () => {
  beforeEach(() => {
    useBuilderStore.getState().reset();
  });

  it('starts collapsed with empty state', () => {
    const state = useBuilderStore.getState();
    expect(state.expanded).toBe(false);
    expect(state.jobId).toBeNull();
    expect(state.status).toBeNull();
    expect(state.statusMessage).toBeNull();
    expect(state.prompt).toBe('');
    expect(state.dryRun).toBe(true);
    expect(state.files).toEqual([]);
    expect(state.logs).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.submitting).toBe(false);
    expect(state.plan).toBeNull();
    expect(state.summary).toBeNull();
  });

  it('defaults to dry run and toggles', () => {
    expect(useBuilderStore.getState().dryRun).toBe(true);

    useBuilderStore.getState().setDryRun(false);
    expect(useBuilderStore.getState().dryRun).toBe(false);

    useBuilderStore.getState().setDryRun(true);
    expect(useBuilderStore.getState().dryRun).toBe(true);
  });

  it('toggles expanded', () => {
    useBuilderStore.getState().toggleExpanded();
    expect(useBuilderStore.getState().expanded).toBe(true);

    useBuilderStore.getState().toggleExpanded();
    expect(useBuilderStore.getState().expanded).toBe(false);
  });

  it('sets expanded explicitly', () => {
    useBuilderStore.getState().setExpanded(true);
    expect(useBuilderStore.getState().expanded).toBe(true);

    useBuilderStore.getState().setExpanded(false);
    expect(useBuilderStore.getState().expanded).toBe(false);
  });

  it('sets prompt', () => {
    useBuilderStore.getState().setPrompt('Create a product endpoint');
    expect(useBuilderStore.getState().prompt).toBe('Create a product endpoint');
  });

  it('sets submitting state', () => {
    useBuilderStore.getState().setSubmitting(true);
    expect(useBuilderStore.getState().submitting).toBe(true);

    useBuilderStore.getState().setSubmitting(false);
    expect(useBuilderStore.getState().submitting).toBe(false);
  });

  it('starts a job and sets initial status', () => {
    useBuilderStore.getState().setSubmitting(true);
    useBuilderStore.getState().startJob('job-123');

    const state = useBuilderStore.getState();
    expect(state.jobId).toBe('job-123');
    expect(state.status).toBe('queued');
    expect(state.statusMessage).toBe('Job queued');
    expect(state.files).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.submitting).toBe(false);
  });

  describe('applyProgress', () => {
    it('updates status for matching jobId', () => {
      useBuilderStore.getState().startJob('job-123');

      const payload: BuilderProgressPayload = {
        jobId: 'job-123',
        status: 'generating',
        message: 'Generating code via Claude API',
      };
      useBuilderStore.getState().applyProgress(payload);

      const state = useBuilderStore.getState();
      expect(state.status).toBe('generating');
      expect(state.statusMessage).toBe('Generating code via Claude API');
    });

    it('ignores events for different jobId', () => {
      useBuilderStore.getState().startJob('job-123');

      const payload: BuilderProgressPayload = {
        jobId: 'job-other',
        status: 'generating',
        message: 'Wrong job',
      };
      useBuilderStore.getState().applyProgress(payload);

      const state = useBuilderStore.getState();
      expect(state.status).toBe('queued');
      expect(state.statusMessage).toBe('Job queued');
    });

    it('appends detail to logs when present', () => {
      useBuilderStore.getState().startJob('job-123');

      useBuilderStore.getState().applyProgress({
        jobId: 'job-123',
        status: 'generating',
        message: 'Generating code via Claude API',
        detail: 'Creating src/routes/product.routes.ts',
      });
      useBuilderStore.getState().applyProgress({
        jobId: 'job-123',
        status: 'generating',
        message: 'Generating code via Claude API',
        detail: 'Creating src/schemas/product.schema.ts',
      });

      const state = useBuilderStore.getState();
      expect(state.logs).toEqual([
        'Creating src/routes/product.routes.ts',
        'Creating src/schemas/product.schema.ts',
      ]);
    });

    it('does not add log entry when detail is absent', () => {
      useBuilderStore.getState().startJob('job-123');

      useBuilderStore.getState().applyProgress({
        jobId: 'job-123',
        status: 'reading_context',
        message: 'Reading project context',
      });

      expect(useBuilderStore.getState().logs).toEqual([]);
    });

    it('ignores events when no job is active', () => {
      const payload: BuilderProgressPayload = {
        jobId: 'job-123',
        status: 'generating',
        message: 'No active job',
      };
      useBuilderStore.getState().applyProgress(payload);

      expect(useBuilderStore.getState().status).toBeNull();
    });
  });

  it('sets result with files', () => {
    useBuilderStore.getState().startJob('job-123');
    const files = [
      { path: 'src/routes/product.routes.ts', content: '// code', action: 'created' as const },
      { path: 'src/schemas/product.schema.ts', content: '// schema', action: 'created' as const },
    ];
    useBuilderStore.getState().setResult(files);

    const state = useBuilderStore.getState();
    expect(state.files).toEqual(files);
    expect(state.status).toBe('completed');
    expect(state.submitting).toBe(false);
  });

  it('sets error', () => {
    useBuilderStore.getState().startJob('job-123');
    useBuilderStore.getState().setError('Claude API rate limited');

    const state = useBuilderStore.getState();
    expect(state.error).toBe('Claude API rate limited');
    expect(state.status).toBe('failed');
    expect(state.submitting).toBe(false);
  });

  it('dismisses clears job state but keeps prompt', () => {
    useBuilderStore.getState().setPrompt('Create an endpoint');
    useBuilderStore.getState().startJob('job-123');
    useBuilderStore.getState().dismiss();

    const state = useBuilderStore.getState();
    expect(state.jobId).toBeNull();
    expect(state.status).toBeNull();
    expect(state.statusMessage).toBeNull();
    expect(state.files).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.prompt).toBe('Create an endpoint');
  });

  describe('plan actions', () => {
    it('setPlan stores plan and summary', () => {
      const { startJob, setPlan } = useBuilderStore.getState();
      startJob('job-1');
      const plan = [
        {
          path: 'src/schemas/product.schema.ts',
          type: 'schema' as const,
          action: 'create' as const,
          description: 'Schema',
        },
      ];
      setPlan(plan, 'Generate product API');
      const state = useBuilderStore.getState();
      expect(state.plan).toEqual(plan);
      expect(state.summary).toBe('Generate product API');
    });

    it('updatePlanFile modifies a file entry', () => {
      const { startJob, setPlan, updatePlanFile } = useBuilderStore.getState();
      startJob('job-1');
      const plan = [
        {
          path: 'src/schemas/product.schema.ts',
          type: 'schema' as const,
          action: 'create' as const,
          description: 'Old',
        },
      ];
      setPlan(plan, 'Summary');
      updatePlanFile(0, { description: 'New description' });
      expect(useBuilderStore.getState().plan![0]!.description).toBe('New description');
    });

    it('removePlanFile removes a file entry', () => {
      const { startJob, setPlan, removePlanFile } = useBuilderStore.getState();
      startJob('job-1');
      const plan = [
        { path: 'a.ts', type: 'schema' as const, action: 'create' as const, description: 'A' },
        { path: 'b.ts', type: 'model' as const, action: 'create' as const, description: 'B' },
      ];
      setPlan(plan, 'Summary');
      removePlanFile(0);
      expect(useBuilderStore.getState().plan).toHaveLength(1);
      expect(useBuilderStore.getState().plan![0]!.path).toBe('b.ts');
    });

    it('dismiss clears plan and summary', () => {
      const { startJob, setPlan, dismiss } = useBuilderStore.getState();
      startJob('job-1');
      setPlan(
        [{ path: 'a.ts', type: 'schema' as const, action: 'create' as const, description: 'A' }],
        'Summary'
      );
      dismiss();
      const state = useBuilderStore.getState();
      expect(state.plan).toBeNull();
      expect(state.summary).toBeNull();
    });

    it('applyProgress with plan_ready triggers status update but plan stays null', () => {
      const { startJob, applyProgress } = useBuilderStore.getState();
      startJob('job-1');
      applyProgress({ jobId: 'job-1', status: 'plan_ready', message: 'Plan ready' });
      const state = useBuilderStore.getState();
      expect(state.status).toBe('plan_ready');
      // Plan itself comes from REST fetch, not from delta payload
      expect(state.plan).toBeNull();
    });
  });

  describe('taskType', () => {
    it('should default to new-resource', () => {
      expect(useBuilderStore.getState().taskType).toBe('new-resource');
    });

    it('should update via setTaskType', () => {
      const { setTaskType } = useBuilderStore.getState();
      setTaskType('refactor');
      expect(useBuilderStore.getState().taskType).toBe('refactor');
    });

    it('should reset taskType to default', () => {
      const { setTaskType, reset } = useBuilderStore.getState();
      setTaskType('bugfix');
      reset();
      expect(useBuilderStore.getState().taskType).toBe('new-resource');
    });
  });

  describe('setFullResult with M5 fields', () => {
    it('should extract diffs from result', () => {
      const { startJob, setFullResult } = useBuilderStore.getState();
      startJob('job-1');
      setFullResult({
        files: [{ path: 'src/test.ts', content: 'x', action: 'created' }],
        diffs: [{ path: 'src/test.ts', diff: '+hello' }],
      });
      expect(useBuilderStore.getState().diffs).toEqual([{ path: 'src/test.ts', diff: '+hello' }]);
    });

    it('should extract planCoverage from result', () => {
      const { startJob, setFullResult } = useBuilderStore.getState();
      startJob('job-1');
      setFullResult({
        files: [],
        planCoverage: { planned: ['a.ts'], generated: ['a.ts'], missing: [] },
      });
      expect(useBuilderStore.getState().planCoverage).toEqual({
        planned: ['a.ts'],
        generated: ['a.ts'],
        missing: [],
      });
    });

    it('should extract impactedFiles from result', () => {
      const { startJob, setFullResult } = useBuilderStore.getState();
      startJob('job-1');
      setFullResult({
        files: [],
        impactedFiles: ['src/other.ts'],
      });
      expect(useBuilderStore.getState().impactedFiles).toEqual(['src/other.ts']);
    });

    it('should extract prUrl and prNumber from result', () => {
      const { startJob, setFullResult } = useBuilderStore.getState();
      startJob('job-1');
      setFullResult({
        files: [],
        prUrl: 'https://github.com/formray/fenice/pull/42',
        prNumber: 42,
        branch: 'builder/job-1-test',
      });
      const state = useBuilderStore.getState();
      expect(state.prUrl).toBe('https://github.com/formray/fenice/pull/42');
      expect(state.prNumber).toBe(42);
      expect(state.branch).toBe('builder/job-1-test');
    });

    it('should extract validationErrors for completed_draft', () => {
      const { startJob, setFullResult } = useBuilderStore.getState();
      startJob('job-1');
      setFullResult({
        files: [],
        validationPassed: false,
        validationErrors: ['typecheck: TS2345', 'lint: 3 errors'],
      });
      const state = useBuilderStore.getState();
      expect(state.validationErrors).toEqual(['typecheck: TS2345', 'lint: 3 errors']);
    });

    it('should set status to completed_draft when validationPassed is false', () => {
      const { startJob, setFullResult } = useBuilderStore.getState();
      startJob('job-1');
      setFullResult({
        files: [{ path: 'a.ts', content: 'x', action: 'created' }],
        validationPassed: false,
        validationErrors: ['error'],
      });
      expect(useBuilderStore.getState().status).toBe('completed_draft');
    });

    it('should clear M5 fields on dismiss', () => {
      const { startJob, setFullResult, dismiss } = useBuilderStore.getState();
      startJob('job-1');
      setFullResult({
        files: [],
        diffs: [{ path: 'a.ts', diff: '+x' }],
        planCoverage: { planned: ['a.ts'], generated: [], missing: ['a.ts'] },
        impactedFiles: ['b.ts'],
        prUrl: 'url',
        prNumber: 1,
        branch: 'br',
        validationErrors: ['err'],
      });
      dismiss();
      const s = useBuilderStore.getState();
      expect(s.diffs).toBeNull();
      expect(s.planCoverage).toBeNull();
      expect(s.impactedFiles).toBeNull();
      expect(s.prUrl).toBeNull();
      expect(s.prNumber).toBeNull();
      expect(s.branch).toBeNull();
      expect(s.validationErrors).toBeNull();
    });
  });

  describe('applyProgress with completed_draft', () => {
    it('should update status to completed_draft', () => {
      const { startJob, applyProgress } = useBuilderStore.getState();
      startJob('job-1');
      applyProgress({ jobId: 'job-1', status: 'completed_draft', message: 'Draft PR created' });
      expect(useBuilderStore.getState().status).toBe('completed_draft');
    });
  });

  it('reset returns to initial state', () => {
    useBuilderStore.getState().setExpanded(true);
    useBuilderStore.getState().setPrompt('test');
    useBuilderStore.getState().startJob('job-123');
    useBuilderStore.getState().reset();

    const state = useBuilderStore.getState();
    expect(state.expanded).toBe(false);
    expect(state.prompt).toBe('');
    expect(state.jobId).toBeNull();
    expect(state.status).toBeNull();
  });

  it('handles full lifecycle: submit → progress → complete', () => {
    // Start
    useBuilderStore.getState().setExpanded(true);
    useBuilderStore.getState().setPrompt('Add a product CRUD endpoint');
    useBuilderStore.getState().setSubmitting(true);
    useBuilderStore.getState().startJob('job-abc');

    expect(useBuilderStore.getState().status).toBe('queued');

    // Progress through stages
    const stages: BuilderProgressPayload[] = [
      { jobId: 'job-abc', status: 'reading_context', message: 'Reading project context' },
      { jobId: 'job-abc', status: 'generating', message: 'Generating code via Claude API' },
      { jobId: 'job-abc', status: 'writing_files', message: 'Writing generated files to disk' },
      { jobId: 'job-abc', status: 'validating', message: 'Running validation' },
      { jobId: 'job-abc', status: 'completed', message: 'Pipeline completed successfully' },
    ];

    for (const payload of stages) {
      useBuilderStore.getState().applyProgress(payload);
      expect(useBuilderStore.getState().status).toBe(payload.status);
    }

    // Set result
    useBuilderStore
      .getState()
      .setResult([{ path: 'src/routes/product.routes.ts', content: '// code', action: 'created' }]);

    expect(useBuilderStore.getState().files).toHaveLength(1);
    expect(useBuilderStore.getState().status).toBe('completed');
  });
});
