import { describe, it, expect, vi } from 'vitest';

// Mock fs/promises to avoid reading actual files
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockImplementation(async (path: string) => {
    const mockFiles: Record<string, string> = {
      '/project/CLAUDE.md':
        '## Tech Stack\n| Layer | Tech |\n| --- | --- |\n| Runtime | Node.js |\n\n## Code Style & Conventions\n### TypeScript\n- Strict mode\n\n## Architecture\nSome architecture docs\n',
      '/project/src/schemas/user.schema.ts': 'export const UserSchema = z.object({});',
      '/project/src/models/user.model.ts': 'export const UserModel = mongoose.model("User");',
      '/project/src/services/user.service.ts': 'export class UserService {}',
      '/project/src/routes/user.routes.ts': 'export const userRouter = new OpenAPIHono();',
      '/project/src/schemas/common.schema.ts': 'export const ErrorResponseSchema = z.object({});',
      '/project/src/schemas/auth.schema.ts': 'export const LoginSchema = z.object({});',
      '/project/src/routes/health.routes.ts': 'export const healthRouter = new OpenAPIHono();',
    };

    if (path in mockFiles) {
      return mockFiles[path];
    }
    throw new Error(`File not found: ${path}`);
  }),
}));

const { buildContextBundle, formatContextForPrompt, buildDynamicContext, formatDynamicContext } =
  await import('../../../../src/services/builder/context-reader.js');

describe('buildContextBundle', () => {
  it('should build a context bundle from project files', async () => {
    const bundle = await buildContextBundle('/project');

    expect(bundle.projectConventions).toContain('Tech Stack');
    expect(bundle.exampleSchema).toBe('export const UserSchema = z.object({});');
    expect(bundle.exampleModel).toBe('export const UserModel = mongoose.model("User");');
    expect(bundle.exampleService).toBe('export class UserService {}');
    expect(bundle.exampleRoute).toBe('export const userRouter = new OpenAPIHono();');
  });

  it('should include OpenAPI spec summary when no openapi.json exists', async () => {
    const bundle = await buildContextBundle('/project');
    expect(bundle.openApiSpec).toContain('Existing API Schema Summary');
  });
});

describe('formatContextForPrompt', () => {
  it('should format all context sections', () => {
    const bundle = {
      openApiSpec: '{"openapi": "3.1.0"}',
      projectConventions: '# CLAUDE.md',
      exampleSchema: 'export const UserSchema = z.object({});',
      exampleModel: 'export const UserModel = mongoose.model("User");',
      exampleService: 'export class UserService {}',
      exampleRoute: 'export const userRouter = new OpenAPIHono();',
    };

    const result = formatContextForPrompt(bundle);

    expect(result).toContain('OpenAPI Spec');
    expect(result).toContain('Example Schema');
    expect(result).toContain('Example Model');
    expect(result).toContain('Example Service');
    expect(result).toContain('Example Route');
  });

  it('should skip empty sections', () => {
    const bundle = {
      openApiSpec: '',
      projectConventions: '',
      exampleSchema: 'export const UserSchema = z.object({});',
      exampleModel: '',
      exampleService: '',
      exampleRoute: '',
    };

    const result = formatContextForPrompt(bundle);

    expect(result).toContain('Example Schema');
    expect(result).not.toContain('OpenAPI Spec');
    expect(result).not.toContain('Example Model');
  });
});

describe('buildDynamicContext', () => {
  it('should read only requested contextFiles', async () => {
    const bundle = await buildDynamicContext('/project', [
      'src/schemas/user.schema.ts',
      'src/routes/health.routes.ts',
    ]);

    expect(bundle.contextFiles).toHaveLength(2);
    expect(bundle.contextFiles[0]?.path).toBe('src/schemas/user.schema.ts');
    expect(bundle.contextFiles[0]?.content).toBe('export const UserSchema = z.object({});');
    expect(bundle.contextFiles[1]?.path).toBe('src/routes/health.routes.ts');
    expect(bundle.contextFiles[1]?.content).toBe('export const healthRouter = new OpenAPIHono();');
  });

  it('should always include conventions from CLAUDE.md', async () => {
    const bundle = await buildDynamicContext('/project', ['src/schemas/user.schema.ts']);

    expect(bundle.conventions).toBeTruthy();
    expect(bundle.conventions).toContain('Tech Stack');
  });

  it('should fall back to DEFAULT_CONTEXT_FILES when contextFiles is empty', async () => {
    const bundle = await buildDynamicContext('/project', []);

    expect(bundle.contextFiles).toHaveLength(4);
    expect(bundle.contextFiles.map((f) => f.path)).toEqual([
      'src/schemas/user.schema.ts',
      'src/models/user.model.ts',
      'src/services/user.service.ts',
      'src/routes/user.routes.ts',
    ]);
  });

  it('should truncate files when exceeding maxChars budget', async () => {
    // user.schema.ts = 'export const UserSchema = z.object({});' (39 chars)
    // health.routes.ts = 'export const healthRouter = new OpenAPIHono();' (46 chars)
    // Total without truncation = 85 chars
    // Budget = 50 chars: first file fits (39), second gets truncated at remaining (11 chars)
    const bundle = await buildDynamicContext(
      '/project',
      ['src/schemas/user.schema.ts', 'src/routes/health.routes.ts'],
      50 // very small budget
    );

    expect(bundle.contextFiles).toHaveLength(2);
    // First file should be intact
    expect(bundle.contextFiles[0]?.content).toBe('export const UserSchema = z.object({});');
    // Second file should be truncated (truncation marker adds overhead beyond budget)
    expect(bundle.contextFiles[1]?.content).toContain('... [truncated]');
    expect(bundle.contextFiles[1]?.content.length).toBeLessThan(46);
  });

  it('should skip files that do not exist', async () => {
    const bundle = await buildDynamicContext('/project', [
      'src/schemas/user.schema.ts',
      'src/nonexistent.ts',
    ]);

    // Should have the existing file, nonexistent returns empty and is skipped
    const nonEmpty = bundle.contextFiles.filter((f) => f.content.length > 0);
    expect(nonEmpty).toHaveLength(1);
    expect(nonEmpty[0]?.path).toBe('src/schemas/user.schema.ts');
  });

  it('should use trimConventions for the conventions part', async () => {
    const bundle = await buildDynamicContext('/project', []);

    // trimConventions extracts only matching sections — should NOT contain "Architecture"
    expect(bundle.conventions).toContain('Tech Stack');
    expect(bundle.conventions).toContain('Code Style');
    expect(bundle.conventions).not.toContain('Architecture');
  });
});

describe('formatDynamicContext', () => {
  it('should format conventions and context files into text', () => {
    const bundle = {
      conventions: '## Tech Stack\n- Node.js',
      contextFiles: [
        { path: 'src/schemas/user.schema.ts', content: 'export const UserSchema = {};' },
        { path: 'src/models/user.model.ts', content: 'export const UserModel = {};' },
      ],
    };

    const result = formatDynamicContext(bundle);

    expect(result).toContain('Project Conventions');
    expect(result).toContain('Tech Stack');
    expect(result).toContain('src/schemas/user.schema.ts');
    expect(result).toContain('export const UserSchema = {};');
    expect(result).toContain('src/models/user.model.ts');
    expect(result).toContain('export const UserModel = {};');
  });

  it('should skip empty conventions', () => {
    const bundle = {
      conventions: '',
      contextFiles: [{ path: 'src/index.ts', content: 'console.log("hello");' }],
    };

    const result = formatDynamicContext(bundle);

    expect(result).not.toContain('Project Conventions');
    expect(result).toContain('src/index.ts');
  });

  it('should skip empty context files', () => {
    const bundle = {
      conventions: '## Tech Stack\n- Node.js',
      contextFiles: [],
    };

    const result = formatDynamicContext(bundle);

    expect(result).toContain('Project Conventions');
    // No file sections
    expect(result).not.toContain('```typescript');
  });

  it('should wrap file contents in typescript code blocks', () => {
    const bundle = {
      conventions: '',
      contextFiles: [{ path: 'src/index.ts', content: 'const x = 1;' }],
    };

    const result = formatDynamicContext(bundle);

    expect(result).toContain('```typescript');
    expect(result).toContain('const x = 1;');
    expect(result).toContain('```');
  });
});
