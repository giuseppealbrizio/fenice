import type { BuilderGeneratedFile } from '../../schemas/builder.schema.js';

const ALLOWED_WRITE_PREFIXES = [
  'src/schemas/',
  'src/models/',
  'src/services/',
  'src/routes/',
  'src/utils/',
  'tests/',
];

const ALLOWED_MODIFY_FILES = ['src/index.ts', 'src/routes/mcp.routes.ts'];

const ALLOWED_MODIFY_PREFIXES = [
  'src/schemas/',
  'src/models/',
  'src/services/',
  'src/routes/',
  'src/utils/',
  'tests/',
];

const FORBIDDEN_PATHS = [
  'src/middleware/auth.ts',
  'src/middleware/errorHandler.ts',
  'src/config/env.ts',
  '.env',
  '.github/',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'node_modules/',
  'dist/',
];

const DANGEROUS_PATTERNS = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bfs\.\w+Sync\b/,
  /\bfs\.(?:readFile|writeFile|unlink|rmdir|mkdir)\b/,
  /require\s*\(\s*['"](?:child_process|fs|path|os|net|http|https|crypto)['"]\s*\)/,
  /import\s+.*from\s+['"](?:child_process|net|os)['"]/,
  /(?<!\.\s*)\bexec\s*\(/,
  /\bexecSync\s*\(/,
  /\bspawn\s*\(/,
  /sk-ant-[a-zA-Z0-9]+/,
  /ghp_[a-zA-Z0-9]+/,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
  /AKIA[0-9A-Z]{16}/,
];

export interface ScopePolicyViolation {
  file: string;
  reason: string;
}

const ALLOWED_READ_PREFIXES = ['src/', 'tests/', 'CLAUDE.md', 'package.json', 'tsconfig.json'];

const FORBIDDEN_READ_PATHS = ['.env', '.git/', 'node_modules/', 'dist/', '.github/'];

export function validateReadPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');

  if (normalized.includes('..')) {
    return 'Path traversal detected';
  }

  for (const forbidden of FORBIDDEN_READ_PATHS) {
    if (normalized === forbidden || normalized.startsWith(forbidden)) {
      return `Forbidden read path: ${forbidden}`;
    }
  }

  const isAllowed = ALLOWED_READ_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!isAllowed) {
    return `Path not in allowed read directories: ${normalized}`;
  }

  return null;
}

export function validateFilePath(filePath: string, action: 'created' | 'modified'): string | null {
  const normalized = filePath.replace(/\\/g, '/');

  if (normalized.includes('..')) {
    return 'Path traversal detected';
  }

  for (const forbidden of FORBIDDEN_PATHS) {
    if (normalized === forbidden || normalized.startsWith(forbidden)) {
      return `Forbidden path: ${forbidden}`;
    }
  }

  if (action === 'modified') {
    const inExactList = ALLOWED_MODIFY_FILES.includes(normalized);
    const inPrefixList = ALLOWED_MODIFY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
    if (!inExactList && !inPrefixList) {
      return `File not in allowed modify list: ${normalized}`;
    }
    return null;
  }

  const isAllowed = ALLOWED_WRITE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!isAllowed) {
    return `Path not in allowed write directories: ${normalized}`;
  }

  return null;
}

export function scanContentForDangerousPatterns(content: string): string[] {
  const violations: string[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`Dangerous pattern detected: ${pattern.source}`);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Code pattern checker — catches common LLM mistakes DURING the tool loop
// so Claude can fix them immediately (same turn, zero cost)
// ---------------------------------------------------------------------------

interface PatternRule {
  /** Regex to detect the anti-pattern */
  pattern: RegExp;
  /** Human-readable fix instruction returned to Claude */
  fix: string;
  /** Optional: only apply to files matching this glob-like prefix */
  filePrefix?: string;
}

const CODE_PATTERN_RULES: PatternRule[] = [
  // Zod v4 API mistakes
  {
    pattern: /z\.string\(\)\.email\(\)/,
    fix: 'Use z.email() instead of z.string().email() — this is Zod v4',
  },
  {
    pattern: /z\.string\(\)\.url\(\)/,
    fix: 'Use z.url() instead of z.string().url() — this is Zod v4',
  },
  {
    pattern: /z\.string\(\)\.datetime\(\)/,
    fix: 'Use z.iso.datetime() instead of z.string().datetime() — this is Zod v4',
  },
  {
    pattern: /z\.string\(\)\.isoDatetime\(\)/,
    fix: 'Use z.iso.datetime() instead of z.string().isoDatetime() — this is Zod v4',
  },
  // Import extension check — local imports must end in .js
  {
    pattern: /from\s+['"]\.\.?\/.+\.ts['"]/,
    fix: "Local imports must use .js extension, not .ts: import { foo } from './bar.js'",
  },
  {
    pattern: /from\s+['"]\.\.?\/[^'"]+(?<!\.js)['"]/,
    fix: "Local imports must end in .js extension: import { foo } from './bar.js'",
  },
  // Route-specific patterns
  {
    pattern: /import\s+.*authMiddleware/,
    fix: "Do NOT import authMiddleware in route files. Auth is applied globally in src/index.ts. Access auth context via c.get('userId'), c.get('email'), c.get('role').",
    filePrefix: 'src/routes/',
  },
  {
    pattern: /\btry\s*\{[\s\S]*?\bcatch\s*\(/,
    fix: 'Do NOT use try/catch in route handlers. Errors thrown from services are caught by the global error handler in src/index.ts.',
    filePrefix: 'src/routes/',
  },
  // Missing newline at end of file
  {
    pattern: /[^\n]$/,
    fix: 'File must end with a newline character.',
  },
];

/**
 * Checks generated file content against known anti-patterns.
 * Returns an array of fix instructions — empty if content is clean.
 * Called inside the write_file tool handler so Claude gets immediate feedback.
 */
export function checkCodePatterns(filePath: string, content: string): string[] {
  const issues: string[] = [];

  for (const rule of CODE_PATTERN_RULES) {
    if (rule.filePrefix && !filePath.startsWith(rule.filePrefix)) {
      continue;
    }
    if (rule.pattern.test(content)) {
      issues.push(rule.fix);
    }
  }

  return issues;
}

export function validateGeneratedFiles(files: BuilderGeneratedFile[]): ScopePolicyViolation[] {
  const violations: ScopePolicyViolation[] = [];

  for (const file of files) {
    const pathError = validateFilePath(file.path, file.action);
    if (pathError) {
      violations.push({ file: file.path, reason: pathError });
    }

    const contentViolations = scanContentForDangerousPatterns(file.content);
    for (const reason of contentViolations) {
      violations.push({ file: file.path, reason });
    }
  }

  return violations;
}
