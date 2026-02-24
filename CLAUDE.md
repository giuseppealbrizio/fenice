# CLAUDE.md — FENICE AI Agent Context

## Project Overview

**FENICE** is an AI-native, production-ready backend platform built on the 2026 Golden Stack. It provides a complete foundation for building REST APIs with authentication, user management, and AI agent discovery via the Model Context Protocol (MCP).

- **Repository:** `https://github.com/formray/fenice`
- **Organization:** Formray
- **Version:** 0.1.0 (tagged `v0.1.0` on `main`)
- **License:** MIT
- **Author:** Giuseppe Albrizio

## Tech Stack

| Layer          | Technology                      | Version |
| -------------- | ------------------------------- | ------- |
| Runtime        | Node.js                         | 22 LTS  |
| Framework      | Hono + `@hono/zod-openapi`      | 4.x     |
| Validation     | Zod v4                          | 4.x     |
| Database       | MongoDB via Mongoose v9         | 9.x     |
| Auth           | JWT (jsonwebtoken + bcryptjs)   | -       |
| Logging        | Pino                            | 10.x    |
| Observability  | OpenTelemetry (auto-instrument) | -       |
| Testing        | Vitest + fast-check             | 4.x     |
| API Docs       | Scalar + LLM markdown           | -       |
| AI Discovery   | MCP (Model Context Protocol)    | -       |
| Language       | TypeScript (strict mode)        | 5.x     |
| Module System  | ESM (`"type": "module"`)        | -       |

## Key Commands

```bash
# Development
npm run dev            # Start dev server (tsx watch + OTel instrumentation)
npm run dev:typecheck  # Typecheck in watch mode

# Quality
npm run lint           # ESLint (src + tests)
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier format all
npm run format:check   # Prettier check only
npm run typecheck      # tsc --noEmit
npm run validate       # lint + typecheck + test (run before every PR)

# Testing
npm run test           # Vitest run (single pass)
npm run test:watch     # Vitest interactive watch
npm run test:coverage  # Vitest with v8 coverage

# Build & Production
npm run build          # TypeScript compilation to dist/
npm run start          # Run compiled output (node dist/server.js)

# Shell scripts (four-script pattern)
./setup.sh             # Install deps, create .env, check prerequisites
./dev.sh               # Start MongoDB (Docker) + dev server
./stop.sh              # Stop all Docker services
./reset.sh             # Full clean: node_modules, dist, Docker volumes
```

## Code Style & Conventions

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig.json)
- `exactOptionalPropertyTypes: true` — use `undefined` explicitly for optional props
- `noUncheckedIndexedAccess: true` — indexed access returns `T | undefined`
- `noImplicitReturns: true`
- Target: ES2022, Module: NodeNext

### ESM
- All local imports **must** end in `.js` extension: `import { foo } from './bar.js';`
- `"type": "module"` in package.json
- No CommonJS `require()` — use `import` exclusively

### Naming
- Files: `kebab-case` (e.g., `auth.routes.ts`, `user.model.ts`, `console.adapter.ts`)
- Classes: `PascalCase` (e.g., `AuthService`, `ConsoleEmailAdapter`)
- Variables/functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` for env-derived values
- Schemas: `PascalCase` with `Schema` suffix (e.g., `UserSchema`, `LoginSchema`)

### Commits
- **Conventional Commits** required: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Co-Author line: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Husky + lint-staged pre-commit hooks run ESLint + Prettier automatically

## Architecture

### Request Flow
```
Client Request
  -> Hono Middleware (requestId, requestLogger)
  -> Auth Middleware (JWT verification, applied to /api/v1/users/* only)
  -> OpenAPI Route Handler (Zod validation via @hono/zod-openapi)
  -> Service Layer (business logic)
  -> Mongoose Model (MongoDB operations)
  -> JSON Response (with toJSON transform)
```

### Directory Structure
```
src/
  index.ts              # Hono app setup, route mounting, OpenAPI/Scalar/LLM docs
  server.ts             # Entry point: MongoDB connect, @hono/node-server
  instrumentation.ts    # OpenTelemetry NodeSDK (imported via --import flag)
  config/env.ts         # Zod-validated environment variables
  schemas/              # Zod schemas (single source of truth for types + validation + OpenAPI)
    common.schema.ts    # ErrorResponse, Pagination, SuccessResponse
    user.schema.ts      # User, UserCreate, UserUpdate, RoleEnum
    auth.schema.ts      # Login, Signup, AuthTokens, AuthResponse
  models/
    user.model.ts       # Mongoose schema + bcrypt pre-save hook + comparePassword
  services/
    auth.service.ts     # Signup, login, refresh (JWT generation)
    user.service.ts     # CRUD operations
    builder.service.ts  # AI Builder orchestrator (prompt-to-PR pipeline)
    builder/
      context-reader.ts   # Reads codebase as LLM context bundle
      code-generator.ts   # Claude API tool-use loop (generate + repair)
      scope-policy.ts     # Path whitelist/blacklist + content scanning
      prompt-templates.ts # System prompt + tool definitions
      file-writer.ts      # Writes generated files (scope-validated)
      git-ops.ts          # Branch/commit/push via simple-git
      github-pr.ts        # PR creation via Octokit
      validator.ts        # Runs typecheck/lint/test via child_process
      world-notifier.ts   # Emits builder progress + synthetic deltas via WebSocket
  routes/
    health.routes.ts    # GET /health, /health/detailed (liveness + readiness)
    auth.routes.ts      # POST /auth/signup, /login, /refresh
    user.routes.ts      # GET /users/me, /users/:id, PATCH /users/:id, DELETE /users/:id
    builder.routes.ts   # POST /builder/generate, GET /builder/jobs/:id, GET /builder/jobs
    mcp.routes.ts       # GET /mcp (AI agent discovery)
  middleware/
    auth.ts             # JWT Bearer token verification
    errorHandler.ts     # Centralized error handling (AppError, ZodError)
    requestId.ts        # UUID per request
    requestLogger.ts    # Pino structured request logging
  adapters/
    index.ts            # Adapter factory + type re-exports
    email/              # EmailAdapter interface + ConsoleEmailAdapter + ResendAdapter
    storage/            # StorageAdapter interface + LocalStorageAdapter + GCSAdapter
    messaging/          # MessagingAdapter interface + ConsoleMessagingAdapter + FCMAdapter
  utils/
    errors.ts           # AppError, NotFoundError, NotAuthorizedError, ForbiddenError, ValidationError
    logger.ts           # Pino logger factory
    llm-docs.ts         # OpenAPI-to-Markdown generator for /docs/llm
```

### Zod as Single Source of Truth
Zod schemas define:
1. **Runtime validation** — request bodies, query params
2. **TypeScript types** — via `z.infer<typeof Schema>`
3. **OpenAPI documentation** — via `@hono/zod-openapi` integration

### Adapter Pattern
Vendor-independent abstractions for external services:
- **Email:** `EmailAdapter` interface with `ConsoleEmailAdapter` (dev) and `ResendAdapter` (prod)
- **Storage:** `StorageAdapter` interface with `LocalStorageAdapter` (dev) and `GCSAdapter` (prod)
- **Messaging:** `MessagingAdapter` interface with `ConsoleMessagingAdapter` (dev) and `FCMAdapter` (prod)

### AI Builder (M3 + M3.1)
The builder pipeline generates production-ready API endpoints from natural language prompts using a two-phase approach:

```
POST /api/v1/builder/generate  (JWT + admin + rate limit 5/hour)
  Phase 1 — Planning:
  1. Read context (CLAUDE.md, schemas, models, services, routes)
  2. Generate plan via Claude API (single JSON call, no tools)
  3. Return plan to user for review (status: plan_ready)

  POST /api/v1/builder/jobs/:id/approve  (or /reject)
  Phase 2 — Generation (after user approves plan):
  4. Read context (slimmed for generation: ~40-50% fewer tokens)
  5. Generate code via Claude API (tool-use loop: write_file, modify_file, read_file)
  6. Scope policy validation (path whitelist/blacklist, content scanning)
  7. Write files + create git branch (conventional commit + Co-Authored-By)
  8. Validate (typecheck + lint + test)
  9. Self-repair if validation fails (1 retry via Claude)
  10. Push branch + create PR via Octokit
  11. Emit synthetic deltas to 3D world via WebSocket
```

- **Two-phase:** Plan approval gate between planning and generation (11 pipeline states)
- **Safety:** Scope policy (ALLOWED_WRITE_PREFIXES, FORBIDDEN_PATHS, dangerous pattern scanning), PR-only (never merges)
- **Kill switch:** `BUILDER_ENABLED=false` returns 503
- **Timeouts:** 10-minute guard on both planning and generation phases
- **World integration:** `builder.progress` delta events + synthetic `service.upserted`/`endpoint.upserted` deltas
- **Deps:** `@anthropic-ai/sdk`, `simple-git`, `@octokit/rest`

## Testing

- **Framework:** Vitest v4 with `globals: true`
- **Property testing:** fast-check for schema validation properties
- **Coverage:** v8 provider, thresholds at 60/40/50/60 (stmts/branches/funcs/lines). DB-dependent files (services, models, production adapters) excluded — need MongoDB integration tests.
- **Test structure:** `tests/unit/`, `tests/integration/`, `tests/properties/`
- **Current status:** 719 tests across 73 test files (560 server + 159 client), all passing
- **TDD preferred:** Write tests alongside or before implementation

## Common Gotchas

1. **Zod v4 uses `.issues` not `.errors`** — When working with `ZodError`, access validation issues via `err.issues`, not the v3 `.errors` property.

2. **Mongoose v9 `_id.toString()`** — Always call `_id.toString()` to get the string ID. The `toJSON` transform handles this automatically via `ret['id'] = String(ret['_id'])`.

3. **`resourceFromAttributes()` for OTel** — OpenTelemetry resources now use `resourceFromAttributes()` from `@opentelemetry/resources` instead of the deprecated `Resource` constructor.

4. **Lazy-init pattern** — `loadEnv()` must not be called at module-level in auth middleware or route files, or it will break tests. Use lazy initialization (see `auth.routes.ts` and `middleware/auth.ts`).

5. **`exactOptionalPropertyTypes`** — Optional properties require explicit `undefined` in union types: `refreshToken?: string | undefined` (not just `refreshToken?: string`).

6. **OTel `@opentelemetry/instrumentation-fs` disabled** — The filesystem instrumentation is disabled to avoid excessive noise in traces.

7. **`ATTR_SERVICE_NAME` semantic convention** — Use `ATTR_SERVICE_NAME` from `@opentelemetry/semantic-conventions` (not the old `SemanticResourceAttributes.SERVICE_NAME`).

8. **Scalar `url` not `spec.url`** — `@scalar/hono-api-reference` uses `url: '/openapi'` at top level, not the deprecated `spec: { url: '/openapi' }`.

9. **fast-check `emailAddress()` vs Zod v4** — fast-check generates RFC-compliant emails with special chars that Zod v4 rejects. Filter generated emails through `z.string().email().safeParse()` in property tests.

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`): Lint → Typecheck → Test (with coverage) → Build
- Runs on: push to `main`/`development`, PRs to `main`/`development`
- MongoDB 7 service container for integration tests
- CI env vars: `NODE_ENV=test`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET` set in workflow
- `npm run test:coverage` enforces coverage thresholds in CI (not just `npm test`)

## Environment Variables

Required:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `JWT_REFRESH_SECRET` — Refresh token secret (min 32 chars)

Optional (with defaults):
- `NODE_ENV` — `development` | `production` | `test` (default: `development`)
- `HOST` — Server bind address (default: `0.0.0.0`)
- `PORT` — Server port (default: `3000`)
- `JWT_ACCESS_EXPIRY` — Access token lifetime (default: `15m`)
- `JWT_REFRESH_EXPIRY` — Refresh token lifetime (default: `7d`)
- `LOG_LEVEL` — `error` | `warn` | `info` | `debug` (default: `info`)
- `SERVICE_NAME` — Service identifier for logging/tracing (default: `fenice`)
- `CLIENT_URL` — CORS origin URL

Production adapters (optional):
- `RESEND_API_KEY` — Resend email service API key
- `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` — Google Cloud Storage
- `FCM_PROJECT_ID` — Firebase Cloud Messaging

AI Builder (optional):
- `BUILDER_ENABLED` — Enable builder endpoints (default: `false`)
- `ANTHROPIC_API_KEY` — Claude API key for code generation
- `GITHUB_TOKEN` — GitHub personal access token for PR creation
- `GITHUB_OWNER` — GitHub repository owner
- `GITHUB_REPO` — GitHub repository name
- `BUILDER_RATE_LIMIT_MAX` — Max builder requests per window (default: `5`)
- `BUILDER_RATE_LIMIT_WINDOW_MS` — Rate limit window in ms (default: `3600000` / 1 hour)
