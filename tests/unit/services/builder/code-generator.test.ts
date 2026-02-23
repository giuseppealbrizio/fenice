import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Anthropic SDK
const mockCreate = vi.fn();

class MockAnthropic {
  messages = {
    create: (...args: unknown[]) => mockCreate(...args),
  };
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: MockAnthropic,
}));

// Mock fs for read_file tool
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockImplementation(async (path: string) => {
    if (path === '/project/src/index.ts') {
      return 'export const app = new OpenAPIHono();';
    }
    throw new Error('File not found');
  }),
}));

const { generateCode, repairCode } =
  await import('../../../../src/services/builder/code-generator.js');

const mockContext = {
  openApiSpec: '{"openapi": "3.1.0"}',
  projectConventions: '# CLAUDE.md',
  exampleSchema: 'export const UserSchema = z.object({});',
  exampleModel: 'export const UserModel = mongoose.model("User");',
  exampleService: 'export class UserService {}',
  exampleRoute: 'export const userRouter = new OpenAPIHono();',
};

describe('generateCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return files generated via tool use', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'write_file',
          input: {
            path: 'src/schemas/product.schema.ts',
            content: "import { z } from 'zod';\nexport const ProductSchema = z.object({});",
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done generating files.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const result = await generateCode(
      'Add a products endpoint',
      mockContext,
      '/project',
      'sk-test-key'
    );

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.path).toBe('src/schemas/product.schema.ts');
    expect(result.files[0]?.action).toBe('created');
    expect(result.violations).toHaveLength(0);
    expect(result.tokenUsage.inputTokens).toBe(180);
    expect(result.tokenUsage.outputTokens).toBe(70);
  });

  it('should record violations for forbidden paths', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'write_file',
          input: {
            path: '.env',
            content: 'SECRET=hack',
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const result = await generateCode(
      'Add a products endpoint',
      mockContext,
      '/project',
      'sk-test-key'
    );

    expect(result.files).toHaveLength(0);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.reason).toContain('Forbidden path');
  });

  it('should record violations for dangerous content', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'write_file',
          input: {
            path: 'src/schemas/evil.schema.ts',
            content: 'const x = eval("dangerous");',
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const result = await generateCode(
      'Add a products endpoint',
      mockContext,
      '/project',
      'sk-test-key'
    );

    expect(result.files).toHaveLength(0);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]?.reason).toContain('Dangerous pattern');
  });

  it('should handle read_file tool calls', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'read_file',
          input: { path: 'src/index.ts' },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const result = await generateCode(
      'Read the index file',
      mockContext,
      '/project',
      'sk-test-key'
    );

    expect(result.files).toHaveLength(0);
    expect(result.violations).toHaveLength(0);

    // Verify the second call included the file content as tool result
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const secondCallMessages = (mockCreate.mock.calls[1] as Record<string, unknown>[])[0]?.[
      'messages'
    ] as { role: string; content: unknown }[];
    const lastMessage = secondCallMessages[secondCallMessages.length - 1];
    expect(lastMessage?.role).toBe('user');
  });

  it('should handle modify_file for allowed files', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'modify_file',
          input: {
            path: 'src/index.ts',
            content: 'export const app = new OpenAPIHono();\n// modified',
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const result = await generateCode('Modify index.ts', mockContext, '/project', 'sk-test-key');

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.action).toBe('modified');
    expect(result.files[0]?.path).toBe('src/index.ts');
    expect(result.violations).toHaveLength(0);
  });

  it('should reject modify_file for non-allowed files', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'modify_file',
          input: {
            path: 'src/config/database.ts',
            content: '// modified',
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const result = await generateCode(
      'Modify user service',
      mockContext,
      '/project',
      'sk-test-key'
    );

    expect(result.files).toHaveLength(0);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.reason).toContain('not in allowed modify list');
  });

  it('should handle multiple tool calls in one turn', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'write_file',
          input: {
            path: 'src/schemas/product.schema.ts',
            content: 'export const ProductSchema = z.object({});',
          },
        },
        {
          type: 'tool_use',
          id: 'tool-2',
          name: 'write_file',
          input: {
            path: 'src/models/product.model.ts',
            content: 'export const ProductModel = mongoose.model("Product");',
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 80 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const result = await generateCode(
      'Add a products endpoint',
      mockContext,
      '/project',
      'sk-test-key'
    );

    expect(result.files).toHaveLength(2);
    expect(result.files[0]?.path).toBe('src/schemas/product.schema.ts');
    expect(result.files[1]?.path).toBe('src/models/product.model.ts');
  });

  it('should throw LLM_API_ERROR when Anthropic API fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    await expect(
      generateCode('Add a products endpoint', mockContext, '/project', 'sk-test-key')
    ).rejects.toThrow('Claude API error: Rate limit exceeded');
  });
});

describe('repairCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send validation errors and original files to Claude', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'write_file',
          input: {
            path: 'src/schemas/product.schema.ts',
            content:
              "import { z } from 'zod';\nexport const ProductSchema = z.object({ id: z.string() });",
          },
        },
      ],
      usage: { input_tokens: 200, output_tokens: 100 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Fixed.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const originalFiles = [
      {
        path: 'src/schemas/product.schema.ts',
        content: 'export const ProductSchema = z.object({});',
        action: 'created' as const,
      },
    ];

    const result = await repairCode(
      originalFiles,
      'error TS2345: Type mismatch',
      '/project',
      'sk-test-key'
    );

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.content).toContain('id: z.string()');
    expect(result.violations).toHaveLength(0);

    // Verify the prompt included the error and original files
    const firstCallArgs = mockCreate.mock.calls[0] as Record<string, unknown>[];
    const messages = (firstCallArgs[0] as { messages: { content: string }[] }).messages;
    expect(messages[0]?.content).toContain('TS2345');
    expect(messages[0]?.content).toContain('product.schema.ts');
  });

  it('should reject scope violations during repair', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'write_file',
          input: {
            path: 'package.json',
            content: '{}',
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }],
      usage: { input_tokens: 80, output_tokens: 20 },
    });

    const result = await repairCode([], 'some error', '/project', 'sk-test-key');

    expect(result.files).toHaveLength(0);
    expect(result.violations).toHaveLength(1);
  });
});
