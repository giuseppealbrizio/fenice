import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('fenice', process.env['LOG_LEVEL'] ?? 'info');

export interface FileIndexEntry {
  path: string; // relative path like "src/schemas/user.schema.ts"
  exports: string[]; // top-level export names
  lineCount: number;
}

const EXPORT_REGEX = /^export\s+(?:const|function|class|type|interface|enum|default)\s+(\w+)/gm;

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

const SCAN_ROOTS = ['src', 'tests'];

/**
 * Recursively scans a directory for .ts files (excluding .d.ts),
 * returning FileIndexEntry for each.
 */
async function scanDirectory(dirPath: string, projectRoot: string): Promise<FileIndexEntry[]> {
  const entries: FileIndexEntry[] = [];

  let dirEntries: { name: string; isDirectory: () => boolean }[];
  try {
    dirEntries = (await readdir(dirPath, { withFileTypes: true })) as {
      name: string;
      isDirectory: () => boolean;
    }[];
  } catch {
    logger.warn({ dirPath }, 'Cannot read directory, skipping');
    return entries;
  }

  for (const entry of dirEntries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const subEntries = await scanDirectory(fullPath, projectRoot);
      entries.push(...subEntries);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      try {
        const content = await readFile(fullPath, 'utf-8');
        const exports = extractExports(content);
        const lineCount = content.split('\n').filter((l) => l.length > 0).length;

        entries.push({
          path: relative(projectRoot, fullPath),
          exports,
          lineCount,
        });
      } catch {
        logger.warn({ fullPath }, 'Cannot read file, skipping');
      }
    }
  }

  return entries;
}

/**
 * Extracts top-level export names from TypeScript source using regex.
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex since we reuse the regex
  EXPORT_REGEX.lastIndex = 0;

  while ((match = EXPORT_REGEX.exec(content)) !== null) {
    if (match[1]) {
      exports.push(match[1]);
    }
  }

  return exports;
}

/**
 * Scans src/ and tests/ directories recursively, returns sorted entries.
 */
export async function buildFileIndex(projectRoot: string): Promise<FileIndexEntry[]> {
  const allEntries: FileIndexEntry[] = [];

  for (const root of SCAN_ROOTS) {
    const rootPath = join(projectRoot, root);
    const entries = await scanDirectory(rootPath, projectRoot);
    allEntries.push(...entries);
  }

  // Sort by path for deterministic output
  allEntries.sort((a, b) => a.path.localeCompare(b.path));

  return allEntries;
}

/**
 * Formats entries into compact text: "path | exports | N lines"
 */
export function formatFileIndex(entries: FileIndexEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  const lines = ['# File Index', ''];

  for (const entry of entries) {
    const exportStr = entry.exports.length > 0 ? entry.exports.join(', ') : '(no exports)';
    lines.push(`${entry.path} | ${exportStr} | ${entry.lineCount} lines`);
  }

  return lines.join('\n');
}
