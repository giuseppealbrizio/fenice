import { describe, it, expect, vi } from 'vitest';
import {
  buildContextBundle,
  formatContextForPrompt,
} from '../../../../src/services/builder/context-reader.js';

// Mock fs/promises to avoid reading actual files
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockImplementation(async (path: string) => {
    const mockFiles: Record<string, string> = {
      '/project/CLAUDE.md': '# Project conventions',
      '/project/src/schemas/user.schema.ts': 'export const UserSchema = z.object({});',
      '/project/src/models/user.model.ts': 'export const UserModel = mongoose.model("User");',
      '/project/src/services/user.service.ts': 'export class UserService {}',
      '/project/src/routes/user.routes.ts': 'export const userRouter = new OpenAPIHono();',
      '/project/src/schemas/common.schema.ts': 'export const ErrorResponseSchema = z.object({});',
      '/project/src/schemas/auth.schema.ts': 'export const LoginSchema = z.object({});',
    };

    if (path in mockFiles) {
      return mockFiles[path];
    }
    throw new Error(`File not found: ${path}`);
  }),
}));

describe('buildContextBundle', () => {
  it('should build a context bundle from project files', async () => {
    const bundle = await buildContextBundle('/project');

    expect(bundle.projectConventions).toBe('# Project conventions');
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
