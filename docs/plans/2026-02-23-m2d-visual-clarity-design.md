# M2D Visual Clarity Design — Separate Method Identity from Semantic State

Date: 2026-02-23
Status: Approved
Owner: Claude (runtime) + Giuseppe (approval)
Branch: `feat/m2d-visual-clarity`

## Goal

Make the visual grammar unambiguous: building body = what it is (HTTP method), accent ring = how it's doing (link state), edge thickness = auth-gated routing. A user should read the city in 5 seconds without consulting a legend.

## Problem

The current dual-channel model blends method color (base mesh) with link state (emissive glow) on the same surface. The glow is subtle, method color dominates, and users cannot quickly see "this endpoint is degraded." Auth-gated edge routing is nearly invisible at 70% opacity. Blocked edges fade to 0.3 opacity — failures disappear.

## Hard Constraints

1. No backend changes, no protocol/WS schema changes.
2. M2A world model types and M2B semantic resolver untouched.
3. Color hex palette unchanged — only opacity values and structural rendering change.
4. Keep tests green.
5. Deterministic layout preserved.

## Decisions (Giuseppe-approved)

1. **Building accent ring at base**: Separate mesh at ground level, colored by link state. Body stays method color. Emissive glow removed from body.
2. **Auth-gated edges full-opacity + 3.0 lineWidth**: No opacity/width reduction. Thick routing through gate = unmistakable.
3. **Blocked opacity boosted to 0.7**: Failures must be visible, not hidden. Unknown boosted to 0.3.

---

## Design

### 1. Building.tsx — Method Body + Semantic Accent Ring

**Body mesh (existing, modified):**
- Color: `METHOD_COLORS[endpoint.method]` (unchanged)
- Emissive: `#000000`, intensity 0.02 (was: link-state color at varying intensity)
- Opacity: always 1.0 (was: complex min(0.9/0.96, stateOpacity) logic)
- Selection override: white `#ffffff` body (unchanged)
- Roughness/metalness: 0.6/0.1 (unchanged)

**Accent ring (new mesh):**
- Geometry: `boxGeometry [BUILDING_BASE_SIZE, ACCENT_RING_HEIGHT, BUILDING_BASE_SIZE]`
- Position: `[building.x, ACCENT_RING_HEIGHT / 2, building.z]` (sits at ground level)
- Color: `LINK_STATE_COLORS[linkState].hex`
- Emissive: `LINK_STATE_COLORS[linkState].hex`
- Emissive intensity: `ACCENT_EMISSIVE_INTENSITY` (0.4)
- Opacity: `LINK_STATE_COLORS[linkState].opacity`
- Transparent: `opacity < 1`
- When no semantic data: uses `unknown` style (gray, dim)

**Removed from body mesh:**
- Link-state-driven emissive color
- Link-state-driven opacity (the 0.9/0.96 minimum logic)
- Hover emissive color change to method color

### 2. colors.ts — Token Updates

**Opacity adjustments (LINK_STATE_COLORS):**

| State | hex | emissiveIntensity | opacity (before) | opacity (after) | edgeStyle |
|-------|-----|-------------------|-------------------|-----------------|-----------|
| ok | `#00E5FF` | 0.15 | 0.8 | 0.8 | solid |
| degraded | `#FFB300` | 0.3 | 0.6 | 0.6 | solid |
| blocked | `#FF1744` | 0.1 | **0.3** | **0.7** | dashed |
| unknown | `#616161` | 0.0 | **0.2** | **0.3** | solid |

**New constants:**

```typescript
export const ACCENT_RING_HEIGHT = 0.08;
export const ACCENT_EMISSIVE_INTENSITY = 0.4;
```

**No hex changes. No method color changes. No zone style changes.**

### 3. Edges.tsx — State Grammar + Auth-Gated Prominence

**Regular edges (unchanged structure, updated opacity from tokens):**
- Line width: 1.5
- Color/opacity/style: from `LINK_STATE_COLORS[worstLinkState]`
- Blocked now 0.7 opacity (visible red dashed), unknown now 0.3

**Auth-gated edges (updated):**

| Property | Before | After |
|----------|--------|-------|
| Opacity | `stateOpacity * 0.7` | `stateOpacity` (no reduction) |
| Line width | `1.5 * 0.8 = 1.2` | `3.0` |
| Routing | 3-point through gate | 3-point through gate (unchanged) |

**Intra-service edge visibility:** unchanged (hidden unless selected).

### 4. HUD.tsx — Explicit Legend Copy

**Add after link state legend section:**

A "Building visual guide" block with 3 lines:
- Body color = HTTP method
- Base ring = link state
- Thick edge = auth-gated route

**Update routing hint** from "link colors are driven by live telemetry simulation" to: "Edge color shows link state between endpoints. Thick lines route through the auth gate."

### 5. SidePanel.tsx — Friendly Reasons + Related Endpoint State Dots

**Reason labels:** Add a `REASON_LABELS` map translating raw codes to human-readable text:

| Code | Friendly label |
|------|---------------|
| `auth_required_no_session` | Auth required — no active session |
| `auth_token_expired` | Auth token has expired |
| `policy_denied` | Access denied by policy |
| `dependency_unhealthy_hard` | Dependency is down |
| `service_unhealthy_soft` | Service partially degraded |
| `latency_high` | High latency detected |
| `error_rate_high` | Error rate above threshold |
| `signal_missing` | No telemetry signal |

Display: friendly label as primary text, raw code below in smaller monospace.

**Related endpoints:** Add an 8px colored dot using `LINK_STATE_COLORS[relatedEndpointLinkState].hex` before each related endpoint's method badge. Shows dependency health at a glance.

### 6. Tests

**Update:**
- `colors.test.ts`: blocked opacity assertion from 0.3 to 0.7, unknown from 0.2 to 0.3

**Add:**
- `colors.test.ts`: `ACCENT_RING_HEIGHT > 0`, `ACCENT_EMISSIVE_INTENSITY > 0`
- `colors.test.ts`: no exact hex collision between any method color and any link-state color

---

## State -> Visual Rule -> File Mapping

| State | Visual Rule | File(s) |
|-------|------------|---------|
| Method identity | Building body color = `METHOD_COLORS[method]` | `Building.tsx`, `colors.ts` |
| ok | Cyan accent ring, cyan solid edge (0.8 opacity) | `Building.tsx`, `Edges.tsx`, `colors.ts` |
| degraded | Amber accent ring, amber solid edge (0.6 opacity) | `Building.tsx`, `Edges.tsx`, `colors.ts` |
| blocked | Red accent ring, red dashed edge (0.7 opacity) | `Building.tsx`, `Edges.tsx`, `colors.ts` |
| unknown | Gray accent ring, gray solid edge (0.3 opacity) | `Building.tsx`, `Edges.tsx`, `colors.ts` |
| auth-gated route | 3.0 lineWidth, routes through gate, full state opacity | `Edges.tsx` |
| selected | White body, accent ring unchanged | `Building.tsx` |
| hover | Opacity 1.0, accent ring unchanged | `Building.tsx` |

## What Does NOT Change

- `semantic.ts` types
- `world.store.ts` semantic computation
- `semantic-resolver.ts` rules (R1-R9)
- `layout.service.ts` positioning
- Zone assignment logic
- WebSocket protocol
- Backend code
- Color hex values
