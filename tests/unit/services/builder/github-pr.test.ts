import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPullsCreate = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    pulls = {
      create: (...args: unknown[]) => mockPullsCreate(...args),
    };
  },
}));

const { createPullRequest } = await import('../../../../src/services/builder/github-pr.js');

describe('createPullRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPullsCreate.mockResolvedValue({
      data: {
        number: 42,
        html_url: 'https://github.com/formray/fenice/pull/42',
      },
    });
  });

  it('should create a PR with correct parameters', async () => {
    const result = await createPullRequest(
      'builder/job-123-products',
      'Add a products endpoint',
      [
        { path: 'src/schemas/product.schema.ts', content: 'schema', action: 'created' as const },
        { path: 'src/models/product.model.ts', content: 'model', action: 'created' as const },
      ],
      'job-123',
      true,
      'ghp_test',
      'formray',
      'fenice'
    );

    expect(result.prUrl).toBe('https://github.com/formray/fenice/pull/42');
    expect(result.prNumber).toBe(42);

    expect(mockPullsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'formray',
        repo: 'fenice',
        head: 'builder/job-123-products',
        base: 'main',
      })
    );
  });

  it('should include prompt in PR title', async () => {
    await createPullRequest(
      'builder/job-123-products',
      'Add a products endpoint',
      [],
      'job-123',
      true,
      'ghp_test',
      'formray',
      'fenice'
    );

    const callArgs = mockPullsCreate.mock.calls[0]?.[0] as { title: string };
    expect(callArgs.title).toContain('Add a products endpoint');
    expect(callArgs.title).toContain('feat(builder):');
  });

  it('should truncate long prompts in title', async () => {
    await createPullRequest(
      'builder/job-123-products',
      'A'.repeat(100),
      [],
      'job-123',
      true,
      'ghp_test',
      'formray',
      'fenice'
    );

    const callArgs = mockPullsCreate.mock.calls[0]?.[0] as { title: string };
    expect(callArgs.title).toContain('...');
  });

  it('should include file list in PR body', async () => {
    await createPullRequest(
      'builder/job-123-products',
      'Add products',
      [
        { path: 'src/schemas/product.schema.ts', content: 'schema', action: 'created' as const },
        { path: 'src/index.ts', content: 'modified', action: 'modified' as const },
      ],
      'job-123',
      true,
      'ghp_test',
      'formray',
      'fenice'
    );

    const callArgs = mockPullsCreate.mock.calls[0]?.[0] as { body: string };
    expect(callArgs.body).toContain('src/schemas/product.schema.ts');
    expect(callArgs.body).toContain('src/index.ts');
    expect(callArgs.body).toContain('New Files');
    expect(callArgs.body).toContain('Modified Files');
  });

  it('should show validation status in PR body', async () => {
    await createPullRequest(
      'builder/job-123-products',
      'Add products',
      [],
      'job-123',
      false,
      'ghp_test',
      'formray',
      'fenice'
    );

    const callArgs = mockPullsCreate.mock.calls[0]?.[0] as { body: string };
    expect(callArgs.body).toContain('[ ] TypeScript typecheck');
  });

  it('should include risk checklist in PR body', async () => {
    await createPullRequest(
      'builder/job-123-products',
      'Add products',
      [],
      'job-123',
      true,
      'ghp_test',
      'formray',
      'fenice'
    );

    const callArgs = mockPullsCreate.mock.calls[0]?.[0] as { body: string };
    expect(callArgs.body).toContain('Risk Checklist');
    expect(callArgs.body).toContain('Review generated code');
    expect(callArgs.body).toContain('no hardcoded secrets');
  });

  it('should include job ID in PR body', async () => {
    await createPullRequest(
      'builder/job-123-products',
      'Add products',
      [],
      'job-123',
      true,
      'ghp_test',
      'formray',
      'fenice'
    );

    const callArgs = mockPullsCreate.mock.calls[0]?.[0] as { body: string };
    expect(callArgs.body).toContain('job-123');
  });
});
