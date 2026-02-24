import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReaddir = vi.fn();
const mockReadFile = vi.fn();
const mockStat = vi.fn();

vi.mock('node:fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  stat: (...args: unknown[]) => mockStat(...args),
}));

const { buildFileIndex, formatFileIndex } =
  await import('../../../../src/services/builder/file-indexer.js');

describe('buildFileIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should scan src/ and tests/ directories recursively', async () => {
    // Root readdir returns src/ and tests/
    mockReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/project/src') {
        return [{ name: 'index.ts', isDirectory: () => false }];
      }
      if (dir === '/project/tests') {
        return [{ name: 'app.test.ts', isDirectory: () => false }];
      }
      return [];
    });

    mockReadFile.mockImplementation(async (path: string) => {
      if (path === '/project/src/index.ts') {
        return 'export function main() {}\nexport const APP_NAME = "fenice";\n';
      }
      if (path === '/project/tests/app.test.ts') {
        return 'describe("app", () => {});\n';
      }
      return '';
    });

    const entries = await buildFileIndex('/project');

    expect(entries).toHaveLength(2);
    expect(entries[0]?.path).toBe('src/index.ts');
    expect(entries[0]?.exports).toEqual(['main', 'APP_NAME']);
    expect(entries[0]?.lineCount).toBe(2);

    expect(entries[1]?.path).toBe('tests/app.test.ts');
    expect(entries[1]?.exports).toEqual([]);
    expect(entries[1]?.lineCount).toBe(1);
  });

  it('should recurse into subdirectories', async () => {
    mockReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/project/src') {
        return [{ name: 'schemas', isDirectory: () => true }];
      }
      if (dir === '/project/src/schemas') {
        return [{ name: 'user.schema.ts', isDirectory: () => false }];
      }
      if (dir === '/project/tests') {
        return [];
      }
      return [];
    });

    mockReadFile.mockImplementation(async () => {
      return 'export const UserSchema = z.object({});\nexport type User = z.infer<typeof UserSchema>;\n';
    });

    const entries = await buildFileIndex('/project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.path).toBe('src/schemas/user.schema.ts');
    expect(entries[0]?.exports).toEqual(['UserSchema', 'User']);
  });

  it('should skip .d.ts files', async () => {
    mockReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/project/src') {
        return [
          { name: 'index.ts', isDirectory: () => false },
          { name: 'types.d.ts', isDirectory: () => false },
        ];
      }
      if (dir === '/project/tests') {
        return [];
      }
      return [];
    });

    mockReadFile.mockImplementation(async () => {
      return 'export function main() {}\n';
    });

    const entries = await buildFileIndex('/project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.path).toBe('src/index.ts');
  });

  it('should skip node_modules, dist, and .git directories', async () => {
    mockReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/project/src') {
        return [
          { name: 'index.ts', isDirectory: () => false },
          { name: 'node_modules', isDirectory: () => true },
          { name: 'dist', isDirectory: () => true },
          { name: '.git', isDirectory: () => true },
        ];
      }
      if (dir === '/project/tests') {
        return [];
      }
      return [];
    });

    mockReadFile.mockImplementation(async () => {
      return 'export const x = 1;\n';
    });

    const entries = await buildFileIndex('/project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.path).toBe('src/index.ts');
  });

  it('should handle empty directories gracefully', async () => {
    mockReaddir.mockImplementation(async () => {
      return [];
    });

    const entries = await buildFileIndex('/project');

    expect(entries).toEqual([]);
  });

  it('should handle readdir errors gracefully', async () => {
    mockReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/project/src') {
        throw new Error('ENOENT: no such file or directory');
      }
      if (dir === '/project/tests') {
        return [];
      }
      return [];
    });

    const entries = await buildFileIndex('/project');

    expect(entries).toEqual([]);
  });

  it('should extract all export types', async () => {
    mockReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/project/src') {
        return [{ name: 'all-exports.ts', isDirectory: () => false }];
      }
      if (dir === '/project/tests') {
        return [];
      }
      return [];
    });

    const fileContent = [
      'export const MY_CONST = "value";',
      'export function myFunction() {}',
      'export async function myAsyncFunction() {}',
      'export class MyClass {}',
      'export type MyType = string;',
      'export interface MyInterface {}',
      'export enum MyEnum {}',
      'export default MyDefault;',
    ].join('\n');

    mockReadFile.mockImplementation(async () => fileContent);

    const entries = await buildFileIndex('/project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.exports).toEqual([
      'MY_CONST',
      'myFunction',
      'myAsyncFunction',
      'MyClass',
      'MyType',
      'MyInterface',
      'MyEnum',
      'MyDefault',
    ]);
  });

  it('should return entries sorted by path', async () => {
    mockReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/project/src') {
        return [
          { name: 'schemas', isDirectory: () => true },
          { name: 'routes', isDirectory: () => true },
        ];
      }
      if (dir === '/project/src/schemas') {
        return [{ name: 'user.schema.ts', isDirectory: () => false }];
      }
      if (dir === '/project/src/routes') {
        return [{ name: 'auth.routes.ts', isDirectory: () => false }];
      }
      if (dir === '/project/tests') {
        return [];
      }
      return [];
    });

    mockReadFile.mockImplementation(async () => 'export const x = 1;\n');

    const entries = await buildFileIndex('/project');

    expect(entries).toHaveLength(2);
    expect(entries[0]?.path).toBe('src/routes/auth.routes.ts');
    expect(entries[1]?.path).toBe('src/schemas/user.schema.ts');
  });

  it('should only include .ts files', async () => {
    mockReaddir.mockImplementation(async (dir: string) => {
      if (dir === '/project/src') {
        return [
          { name: 'index.ts', isDirectory: () => false },
          { name: 'readme.md', isDirectory: () => false },
          { name: 'data.json', isDirectory: () => false },
          { name: 'script.js', isDirectory: () => false },
        ];
      }
      if (dir === '/project/tests') {
        return [];
      }
      return [];
    });

    mockReadFile.mockImplementation(async () => 'export const x = 1;\n');

    const entries = await buildFileIndex('/project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.path).toBe('src/index.ts');
  });
});

describe('formatFileIndex', () => {
  it('should format entries into compact text', () => {
    const entries = [
      { path: 'src/index.ts', exports: ['main', 'APP_NAME'], lineCount: 42 },
      { path: 'src/schemas/user.schema.ts', exports: ['UserSchema', 'User'], lineCount: 100 },
    ];

    const result = formatFileIndex(entries);

    expect(result).toContain('src/index.ts | main, APP_NAME | 42 lines');
    expect(result).toContain('src/schemas/user.schema.ts | UserSchema, User | 100 lines');
  });

  it('should handle entries with no exports', () => {
    const entries = [{ path: 'tests/app.test.ts', exports: [], lineCount: 15 }];

    const result = formatFileIndex(entries);

    expect(result).toContain('tests/app.test.ts | (no exports) | 15 lines');
  });

  it('should return empty string for empty entries', () => {
    const result = formatFileIndex([]);

    expect(result).toBe('');
  });

  it('should include a header line', () => {
    const entries = [{ path: 'src/index.ts', exports: ['main'], lineCount: 10 }];

    const result = formatFileIndex(entries);

    expect(result).toContain('# File Index');
  });
});
