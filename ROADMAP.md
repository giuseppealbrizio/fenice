# FENICE Roadmap

## v0.1.0 — Foundation Layer ✅

The foundation is in place. FENICE provides a fully functional, production-ready backend with:

- Hono + Zod OpenAPI routes (auth, users, health, MCP)
- JWT authentication with access/refresh tokens
- Mongoose v9 User model with bcrypt
- Adapter pattern (email, storage, messaging)
- OpenTelemetry auto-instrumentation
- MCP endpoint for AI agent discovery
- Scalar interactive docs + LLM-readable docs
- Vitest + fast-check testing (35 tests)
- Docker multi-stage build + docker-compose
- GitHub Actions CI pipeline
- Four-script development workflow
- Comprehensive documentation

## v0.2.0 — Advanced Backend Features ✅

All v0.2.0 features are implemented:

- **WebSocket Support** — Real-time communication via Hono WebSocket adapter + rooms + broadcast
- **Rate Limiting** — Request throttling with configurable windows per endpoint
- **RBAC Middleware** — Role-based access control with 6-level hierarchy
- **File Upload** — Chunked upload system (init, chunk, complete, cancel)
- **Pagination** — Cursor-based pagination with Base64-encoded cursors
- **Search & Filtering** — Query parameter support for user listing (email, username, role, date range)
- **Email Verification** — Account verification flow using the email adapter
- **Password Reset** — Reset flow with token generation and SHA-256 hashing
- **Request Validation Middleware** — Generic Zod validation middleware
- **API Versioning Strategy** — Path-based versioning via middleware

## v0.3.0 — Security & Production Adapters ✅

Security hardening and production-ready external service integrations:

- **Security Headers** — via `hono/secure-headers` (X-Content-Type-Options, X-Frame-Options, etc.)
- **CORS** — Configurable via `CLIENT_URL` environment variable
- **Request Timeout** — Configurable `REQUEST_TIMEOUT_MS` middleware
- **Body Size Limit** — Configurable `BODY_SIZE_LIMIT_BYTES` middleware
- **Account Lockout** — Configurable failed login threshold + lockout duration
- **Logout Endpoint** — `POST /auth/logout` with token revocation
- **Graceful Shutdown** — SIGTERM/SIGINT handler with Mongoose disconnect
- **ResendEmailAdapter** — Production email via Resend SDK
- **GcsStorageAdapter** — Production storage via Google Cloud Storage SDK
- **FcmMessagingAdapter** — Production push notifications via Firebase Admin SDK

## Next — Scale & Optimize

Infrastructure and performance improvements for production scale:

- **Redis Caching** — Response caching and session store with Redis adapter
- **Queue Workers** — Background job processing (email sending, data processing)
- **K8s Autoscaling** — Horizontal Pod Autoscaler configuration
- **Database Indexing** — Performance-tuned MongoDB indexes beyond the current email/username index
- **Connection Pooling** — Optimized MongoDB connection management
- **Health Check Enhancements** — Deep dependency checks (Redis, queues, external services)
- **Metrics Endpoint** — Prometheus-compatible metrics export
- **Audit Logging** — Structured audit trail for security-sensitive operations
- **Multi-tenancy** — Tenant isolation at the data layer
- **GraphQL Gateway** — Optional GraphQL layer alongside REST

## v1.0.0 — 3D World

The AI-native 3D city experience (React Three Fiber, AI builder, city metaphor). See [design doc](docs/plans/2026-02-21-fenice-design.md) for details.

### Milestone status

| Milestone | Status | Description |
|-----------|--------|-------------|
| M1 | Done | Static city from OpenAPI |
| M2A | Done | Typed deltas + reducer + resync guard |
| M2B | Done | Semantic contract (ok/degraded/blocked/unknown, zoning, auth gate) |
| M2C | Done | Tron visual language (radial corridors, gate pulse/haze, HUD legend) |
| M2D | Done | Visual clarity + KPI safety pass |
| **M2** | **Closed** | **All sub-milestones complete, demo narrative shipped** |
| **M3** | **Done** | **AI Builder: prompt-to-PR with safety gates, validation, self-repair, 3D world integration** |
| **M3.1** | **Done** | **Two-phase builder: plan-then-generate with user approval, glowy UI, context reduction, timeouts** |
| M4 | Next | Multi-user collaboration |

Execution tracking: [docs/3d-world/FENICE_3D_World_Roadmap_v0.2.md](docs/3d-world/FENICE_3D_World_Roadmap_v0.2.md).

## Contributing

Want to help build the next version? See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
Proposals for new features should be discussed via GitHub Issues before implementation.
