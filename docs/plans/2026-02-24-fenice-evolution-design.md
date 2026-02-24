# FENICE Evolution — Design Document

> **Date:** 2026-02-24
> **Status:** Approved
> **Author:** Giuseppe Albrizio + Claude Opus 4.6

---

## 1. Vision

FENICE evolves from a backend template with a 3D visualization into a **visual AI-native development platform** where a cosmic 3D universe and autonomous AI agents are complementary pillars. Neither makes sense without the other.

The 3D world is not a dashboard -- it's the primary interface. Agents are not tools -- they're visible collaborators that operate inside the world. The user doesn't just see their API; they watch it being built, tested, monitored, and evolved in real-time by a swarm of AI agents moving through a sci-fi cosmos.

### Design Principles

1. **Complementary pillars** -- every 3D feature should have agent awareness, every agent feature should have visual presence
2. **Gradual evolution** -- the current Tron City evolves into the cosmos; nothing gets thrown away
3. **Shippable increments** -- each milestone is self-contained and demoable
4. **Two-track flexibility** -- the 3D and agent tracks can be worked independently in early phases, converging at bridge milestones

---

## 2. Current State (Post-M3.1)

### Backend (v0.3.0)
- Hono + Zod OpenAPI, Mongoose v9, JWT + RBAC, rate limiting
- Chunked file upload, email verification, password reset
- WebSocket (generic + world projection with ring buffer + resume tokens)
- AI Builder: two-phase pipeline (plan -> approve -> generate -> PR)
- OpenTelemetry auto-instrumentation, Pino structured logging
- Adapter pattern (email, storage, messaging) with dev/prod implementations
- 560 server tests, zero type/lint errors

### 3D World Client
- React 19 + R3F + Three.js + Zustand
- Tron City: flat grid, radial corridors, box buildings, auth gate octahedron
- Semantic layer: link states (ok/degraded/blocked/unknown), zone coloring
- Builder UI: prompt bar with plan review, approve/reject, progress animation
- WebSocket world stream with delta reducer and resync
- 159 client tests

### What's Missing
- Visual quality gap between current Tron City and original cosmic vision (fenice-3d-prompt.md)
- Builder is single-agent, single-task-type (new endpoints only)
- MCP endpoint is a static discovery manifest, not an operational server
- No live data visualization (OTel data doesn't reach the 3D world)
- No multi-agent orchestration
- No interactive design (read-only visualization)

---

## 3. Architecture: Two-Track with Bridges

```
Track A (3D Visual)            Track B (Agent)

  M4: Atmosphere                 M5: Builder v2
       |                              |
  M6: Cosmos  ──────────────── M7: MCP Live        ← first bridge
       |             ╲                |
  M8: Observability ──────── M9: Agent Swarm       ← full integration
       |                              |
  M10: Interactive Design      M11: Team Enterprise
```

### Why Two Tracks

The two pillars (3D + agents) have different codebases (client vs server/services), different skill domains (Three.js/R3F vs LLM orchestration), and no hard dependencies in the early phases. Two tracks enable:

- **Flexibility** -- work on whichever track suits the day
- **Parallelism** -- M4 and M5 are completely independent
- **Focused milestones** -- each milestone has a clear scope
- **Natural convergence** -- bridges (M7, M8, M9) are where the magic happens

### Dependency Graph

```
M3.1 (DONE)
  ├── M4: Atmosphere ──── M6: Cosmos ──┐
  │                                     ├── M7: MCP Live ── M8: Observability ── M9: Agent Swarm ──┐
  └── M5: Builder v2 ─────────────────┘                                           │                ├── M11: Team
                                                                                   │                │
                                                                                   └── M10: Interactive Design
```

Parallelism windows:
- **M4 ‖ M5**: fully independent (different codebases, different concerns)
- **M6 → M7**: M6 (client) and M5 (server) can overlap; M7 needs both done
- **M7 onward**: sequential (each layer builds on the previous)

---

## 4. Milestone Details

### M4: Atmosphere (3D — Visual Foundation)

**Dependencies:** M3.1
**Codebase:** client only
**Goal:** Cinematic look without structural changes. Same city, dramatically better visuals.

#### Scope

Post-processing pipeline:
- Bloom (UnrealBloomPass): intensity 1.2-1.8, luminanceThreshold 0.2, radius 0.8
- Vignette: darkness 0.5-0.7
- ChromaticAberration: offset [0.001, 0.001]
- Film grain: opacity 0.05-0.1
- Fog: FogExp2, density 0.008-0.015, color #000015
- Tone mapping: ACESFilmicToneMapping

Skybox:
- Procedural star field (2000-4000 points, varied colors and sizes, twinkling)
- 2-3 nebula sprites (large scale, low opacity, slow rotation)
- Dust particles (500-1000, floating with sin/cos drift)

Materials:
- Buildings: MeshPhysicalMaterial (metalness 0.3-0.6, roughness 0.2-0.4, clearcoat 0.8, emissive)
- Wireframe overlay on buildings (opacity 0.15)
- Glow sprites behind key elements (additive blending)

Lighting:
- Point lights per service district (tinted by service color)
- Ambient light rebalanced for dark scene

Palette:
- Background: #000008 → #0a0a2e gradient
- Primary accent: cyan (#00f5ff, #00e5ff)
- Secondary: magenta (#ff00aa, #ff3399)
- Tertiary: amber (#ff8800, #ffaa00)
- Neutral glow: #e0f0ff
- No flat grays -- every neutral has blue/violet undertone

#### Non-goals
- No structural changes (buildings stay buildings for now)
- No new data flows or backend changes
- No new components -- existing ones get visual upgrades

#### Done Definition
- Post-processing active and visually impactful
- Star field + nebulae + dust visible
- Materials are physically-based with emissive glow
- Bloom makes emissive elements shine
- Fog creates atmospheric depth
- Framerate >= 30fps on mid-range hardware
- All existing tests pass (no logic changes)

---

### M5: Builder v2 (Agent — Enhancement)

**Dependencies:** M3.1
**Codebase:** server only (src/services/builder/)
**Goal:** Builder handles 90% of reasonable development requests, not just new endpoint CRUD.

#### Scope

Task type expansion:
- Refactoring (rename, extract, move)
- Bug fixes (from error description or stack trace)
- Schema migrations (add/modify fields, handle backward compat)
- Test generation (given a service/route, generate comprehensive test suite)
- Documentation generation (update CLAUDE.md, OpenAPI descriptions)

Smarter context reading:
- Analyze prompt to determine which files are relevant
- Dependency graph awareness: if editing a service, include its model and schema
- Configurable context budget (token limit per phase)

Better recovery:
- Multi-retry with different strategies (fix lint, fix types, fix logic separately)
- Fallback: if generation fails, produce a detailed error report with suggestions
- Partial success: commit what works, report what failed

Enhanced dry-run:
- Full file preview with syntax highlighting (frontend support in future milestone)
- Diff view against current codebase
- Impact analysis: which tests would be affected

#### Non-goals
- No multi-agent (single builder agent, single task at a time)
- No new API endpoints (existing builder routes are sufficient)
- No 3D changes

#### Done Definition
- Builder successfully handles refactoring prompts (rename, extract)
- Builder generates test suites from existing code
- Context reader selects relevant files (not everything)
- Recovery handles at least 2 retry strategies
- All existing + new builder tests pass

---

### M6: Cosmos (3D — Planetary Transformation)

**Dependencies:** M4 (Atmosphere)
**Codebase:** client only
**Goal:** Transform the flat city into a navigable cosmic universe.

#### Scope

Service stars:
- Each service becomes a star: emissive sphere with glow sprite + corona sprite
- Color based on service type (auth=cyan, users=magenta, payments=amber, etc.)
- Pulsing animation (scale oscillation 0.98-1.02)
- Orbital rings: semi-transparent ellipses around the star

Endpoint planets:
- Shape by HTTP method: GET=sphere, POST=icosahedron, PUT=torus, DELETE=octahedron, PATCH=dodecahedron
- Size by complexity/parameter count
- Material: MeshPhysicalMaterial with wireframe overlay + atmospheric glow sprite
- Orbit around service star (variable speed, elliptical paths)
- Self-rotation (slow, 0.002-0.005 rad/frame)
- Hover: scale up + glow intensify + wireframe more visible

Route connections:
- CatmullRomCurve3 (curved, not straight lines)
- TubeGeometry with emissive material, additive blending
- Animated pulse of light running along the curve
- Gradient color from source to destination endpoint
- Selection highlights connected routes

Auth Gate transformation:
- From octahedron to wormhole/portal effect
- Protected services orbit beyond the gate's ring
- Visual transit effect when tracing auth-required routes

Navigation:
- OrbitControls with smooth damping (dampingFactor 0.05)
- Auto-rotate when idle (autoRotateSpeed 0.3)
- Click-to-focus: camera smoothly animates to clicked planet (lerp over ~60 frames)
- Zoom limits (minDistance 2, maxDistance 200)

Layout engine:
- Upgrade layout service: from grid to orbital placement
- Service stars positioned in 3D space (not flat plane)
- Endpoint positions computed as orbital points around their service
- Edge routing follows curved paths between orbits

#### Non-goals
- No new data (same WorldModel, same deltas)
- No backend changes
- No agent visibility yet (that's M7)

#### Done Definition
- Services render as glowing stars with orbits
- Endpoints orbit as correctly-shaped planets
- Connections are curved luminous routes with animation
- Navigation is smooth with click-to-focus
- Auth gate is a portal/wormhole effect
- Scene is immersive ("film sci-fi" feel, not "Three.js demo")
- Layout engine produces non-overlapping planetary systems
- All existing + new client tests pass
- Framerate >= 30fps

---

### M7: MCP Live (Agent — Platform) — First Bridge

**Dependencies:** M5 (Builder v2) + M6 (Cosmos)
**Codebase:** server + client
**Goal:** FENICE becomes a platform AI agents can connect to and operate on. First milestone where both tracks merge.

#### Scope

MCP server implementation:
- Replace static MCP manifest with operational MCP server (using `@modelcontextprotocol/sdk`)
- Tool definitions with executable handlers:
  - `create_endpoint` — triggers builder pipeline for a new endpoint
  - `modify_endpoint` — triggers builder for modification
  - `run_tests` — executes test suite, returns results
  - `check_health` — calls health endpoints, returns status
  - `get_schema` — returns Zod/OpenAPI schema for an endpoint
  - `list_endpoints` — returns current API surface
  - `query_logs` — searches recent Pino logs by pattern
  - `get_metrics` — returns OTel metrics summary
- Tool execution goes through the same safety gates as builder (scope policy, validation)

Agent connection:
- Agent registers on connection (name, capabilities, role)
- Session management: track connected agents, their activity, connection health
- WebSocket channel for agent status updates to 3D world

Agent presence in 3D:
- Each connected agent rendered as a distinct entity in the cosmos (probe/drone/ship shape)
- Agent color based on role or identity
- Position near the planet it's currently operating on
- Activity trail: when an agent calls a tool, a luminous beam connects agent to target planet
- Idle animation: agent orbits slowly near its last-interacted service

HUD updates:
- Agent panel: list of connected agents with name, role, status, last action
- Agent activity feed: real-time log of tool calls in the cosmos

#### Non-goals
- No multi-agent orchestration (agents work independently, no coordination)
- No A2A communication
- No agent-to-agent awareness

#### Done Definition
- MCP server accepts connections and executes tools
- At least 5 tools are operational (create_endpoint, run_tests, check_health, get_schema, list_endpoints)
- Connected agents visible as entities in the 3D cosmos
- Tool calls produce visible activity trails in the world
- HUD shows agent list and activity feed
- Security: tools respect RBAC, scope policy, rate limits
- Integration tests for MCP tool execution
- Client tests for agent rendering

---

### M8: Observability (Bridge — Live Data)

**Dependencies:** M6 (Cosmos) + M7 (MCP Live)
**Codebase:** server + client
**Goal:** The cosmos shows live operational data, not just structure.

#### Scope

OTel to 3D pipeline:
- Server-side: aggregate trace/span data into delta events (new delta type: `metrics.updated`)
- Periodic metrics emission: latency percentiles, error rates, throughput per endpoint
- WebSocket delivery via existing world-ws channel

Traffic visualization:
- Particles (small luminous dots) that travel along route curves between planets
- Particle rate proportional to actual request throughput
- Particle color indicates response status (success=green, error=red, slow=amber)

Planet heatmaps:
- Endpoint planet aura changes based on health:
  - Healthy: cool blue/cyan glow
  - Elevated latency: warm amber glow
  - High error rate: red pulse
  - No traffic: dim, low opacity
- Aura intensity proportional to throughput

Anomaly detection:
- Threshold-based: p95 latency > 2x baseline, error rate > 5%
- Visual alert: planet emits warning pulse, aura flickers
- HUD notification: anomaly card with endpoint, metric, current vs baseline
- Anomaly history: timeline of recent anomalies in side panel

Agent-aware observability:
- MCP tools `get_metrics` and `query_logs` serve real data
- Agents can subscribe to anomaly events
- Foundation for M9: agents that react to what they observe

#### Non-goals
- No APM-grade metrics (this is visualization, not Datadog)
- No historical data storage (real-time only, last N minutes in ring buffer)
- No custom dashboard builder

#### Done Definition
- Metrics delta events flow from server to client
- Traffic particles visible on routes
- Planet aura reflects endpoint health
- Anomalies trigger visual + HUD alerts
- MCP metrics tools return real data
- Tests for metrics aggregation and delta emission

---

### M9: Agent Swarm (Agent — Multi-Agent Orchestration)

**Dependencies:** M7 (MCP Live) + M8 (Observability)
**Codebase:** server + client
**Goal:** Multiple agents collaborate on tasks with defined roles. Level 3 agent integration.

#### Scope

Agent roles:
- **Generator**: writes code (evolved builder)
- **Reviewer**: reads generated code, provides feedback, requests changes
- **Tester**: writes and executes tests for generated code
- **Monitor**: watches observability data, flags issues, suggests fixes

Orchestrator service:
- New service: `src/services/orchestrator.service.ts`
- Task decomposition: user prompt → subtasks assigned to agent roles
- Dependency graph: Reviewer waits for Generator, Tester waits for Reviewer approval
- Conflict resolution: if agents modify the same file, orchestrator manages merge order
- Pipeline states: `decomposing → assigning → executing → reviewing → testing → completing`

A2A communication:
- Agents communicate through FENICE as hub (not peer-to-peer)
- Message types: `code_ready`, `review_complete`, `tests_passed`, `issue_found`
- Messages are delta events visible in the 3D world

Swarm visualization in 3D:
- Multiple agent entities in the cosmos, each with role-specific shape/color
- Formation: agents working on the same task cluster near the relevant planets
- Communication beams: visible connections between agents when they exchange messages
- Progress indicators: task pipeline state shown as orbital progress ring

Swarm HUD:
- Task board: active tasks with assigned agents and pipeline state
- Agent roster: all agents with role, current task, status
- Communication log: inter-agent messages

#### Non-goals
- No custom agent creation (predefined roles only)
- No persistent agent memory across sessions
- No agent marketplace

#### Done Definition
- 4 agent roles operational (Generator, Reviewer, Tester, Monitor)
- Orchestrator decomposes prompts into multi-agent tasks
- Agents communicate through FENICE hub
- Swarm visible in 3D with role-specific entities
- Inter-agent messages produce visual effects
- Pipeline completes end-to-end: prompt → decompose → generate → review → test → PR
- Integration tests for orchestration pipeline

---

### M10: Interactive Design (3D — Visual API Design)

**Dependencies:** M6 (Cosmos) + M9 (Agent Swarm)
**Codebase:** client + server
**Goal:** The 3D cosmos becomes a bidirectional design surface.

#### Scope

Visual creation:
- Drag planet templates from a palette into the cosmos to create endpoints
- Connect planets by drawing routes (click source → click target)
- Place near a service star to auto-assign service grouping
- Form picker: select HTTP method, shape updates in real-time

Inline schema editor:
- Click planet → side panel shows Zod schema in editable form
- Modify fields, types, validation rules
- Changes trigger agent-assisted code regeneration
- Live preview: planet properties update as schema changes

Agent-assisted design:
- User sketches structure (planets + routes), agent fills in implementation
- "Suggest connections": agent analyzes schemas and proposes likely relationships
- "Complete service": given 1-2 endpoints, agent suggests the rest of the CRUD

Undo/redo:
- Visual timeline of world modifications
- Step back/forward through design states
- Each state is a snapshot of the WorldModel

Template gallery:
- Pre-built patterns: CRUD service, auth flow, payment flow, notification service
- Drag template into cosmos → fully formed planetary system appears
- Agent customizes template based on existing codebase context

#### Non-goals
- No visual code editor (code stays in files, not in the 3D world)
- No real-time collaboration on design (that's M11)

#### Done Definition
- Can create endpoints by dragging into the cosmos
- Can connect endpoints visually
- Inline schema editor modifies Zod schemas
- Agent generates code from visual design
- Undo/redo works across design operations
- At least 2 templates available
- Tests for design operations and agent integration

---

### M11: Team Enterprise (Multi-user Workspace)

**Dependencies:** M9 (Agent Swarm)
**Codebase:** server + client
**Goal:** Multiple humans and their agent teams collaborate in the same cosmos.

#### Scope

Multi-user presence:
- Multiple authenticated users see the same cosmos in real-time
- User avatars/cursors visible in 3D space (camera indicator or small marker)
- "Follow" mode: see through another user's camera

Agent teams:
- Each user can spawn their own agent swarm
- Agent entities colored/tagged by owning user
- Shared agents: some agents (Monitor) can be shared across team

Permission model:
- Roles: Owner, Admin, Developer, Observer
- Scoped permissions: who can launch agents, approve PRs, modify schemas
- Audit trail: all actions attributed to user + agent

Shared sessions:
- Builder tasks visible to all users
- Code review in 3D: pending PRs shown as "construction zones" around affected planets
- Approval flow: multiple users can review and approve

#### Non-goals
- No multi-tenancy (single FENICE instance, single team)
- No billing or usage tracking
- No SSO (JWT auth is sufficient for now)

#### Done Definition
- Multiple users see the same world simultaneously
- User presence visible in 3D
- Agent teams scoped to users
- Permission model enforced
- Shared builder sessions with multi-user approval
- WebSocket handles multiple concurrent users efficiently
- Integration tests for multi-user scenarios

---

## 5. Technical Considerations

### Performance Budget
- Target: 60fps on desktop, 30fps minimum on mid-range hardware
- Three.js triangle budget: ~100k for cosmos scene
- Use InstancedMesh for stars, dust, particles (never individual meshes)
- LOD for distant planets (simpler geometry at distance)
- Shader uniforms for animations (not React state)

### WebSocket Protocol Extensions
- New delta types needed: `agent.connected`, `agent.disconnected`, `agent.activity`, `metrics.updated`, `anomaly.detected`, `design.changed`
- Existing ring buffer + resume token architecture handles these naturally
- Consider message priority: anomaly events > metrics > agent activity

### MCP Server Architecture
- Built on `@modelcontextprotocol/sdk` (reinstall as needed)
- Tools registered dynamically based on available services
- Tool execution sandboxed through existing scope policy
- Rate limiting per-agent (reuse existing rate limiter infrastructure)

### Agent Communication Protocol
- Hub-based (all messages flow through FENICE orchestrator)
- Message format: `{ from: agentId, to: agentId | 'orchestrator', type: string, payload: object }`
- Messages persisted as delta events for 3D visualization
- Backpressure: agent message rate limited to prevent flood

---

## 6. What's NOT in Scope (Explicit Exclusions)

- **Mobile client** -- desktop-first, mobile is out of scope
- **Self-hosting infrastructure** -- no managed hosting, FENICE runs locally or on user's infra
- **Plugin marketplace** -- no third-party extensions
- **Non-TypeScript backends** -- FENICE generates TypeScript only
- **Historical analytics** -- real-time observability only, no data warehouse
- **Billing/monetization** -- build first, monetize later (Formray philosophy)

---

## 7. Success Criteria (End State)

When all milestones are complete, this is the experience:

1. User opens FENICE → immersive sci-fi cosmos with their API as planetary systems
2. User types "add a notification service with push, email, and in-app channels"
3. A swarm of agents appears in the cosmos: Generator plans, Reviewer validates, Tester prepares
4. User watches planets forming in real-time as agents work
5. Routes connect automatically between new and existing services
6. Reviewer agent flags a potential issue → user sees a visual alert on a planet
7. Tester agent runs the suite → green particles flow through all routes
8. PR appears → user approves in the HUD
9. Traffic starts flowing through the new planets as the service goes live
10. Monitor agent keeps watch, aura glowing steady cyan

This is what "AI-native backend platform" means. Not AI as a tool. AI as a visible, collaborative presence in a world you can see, touch, and shape.
