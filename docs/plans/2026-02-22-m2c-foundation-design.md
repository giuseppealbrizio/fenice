# M2C Foundation Design — Light Tron Semantic Visuals

Date: 2026-02-22
Status: Approved
Owner: Claude (runtime) + Giuseppe (approval)
Branch: `feat/m2c-foundation`

## Goal

Map M2B semantic state to Light Tron visuals: link-state colors on buildings/edges, radial zone layout, auth-gate node, semantic overlays in HUD/SidePanel. Client-only, no wire protocol changes, no backend changes, M2A/M2B KPIs stable.

## Decisions

1. **Light Tron scope** — emissive glow on buildings, colored edges, dashed blocked edges. No bloom, no frame-based animations, no camera animation, no post-processing.
2. **Visual precedence** — selection/hover > linkState > zone styling. Interaction clarity always wins.
3. **Blocked = cut/off** — low emissive (0.10), low opacity (0.3), dashed/broken edge. Blocked must look *off*, not energetic.
4. **Radial zone layout** — auth-hub center, protected-core inner ring, public-perimeter outer ring. Dynamic radii computed from district count/size.
5. **Edge routing** — auth-gated edges (targeting protected endpoints requiring auth) route through auth-gate center. Non-auth-gated cross-zone edges route direct (preserve real topology).
6. **No backend changes** — zero wire protocol changes, zero new WS messages.

## Visual Token System

### Link State Colors

| linkState | Hex | Emissive intensity | Opacity | Edge style |
|---|---|---|---|---|
| `ok` | `#00E5FF` (cyan) | 0.15 | 0.8 | solid |
| `degraded` | `#FFB300` (amber) | 0.30 | 0.6 | solid |
| `blocked` | `#FF1744` (red) | 0.10 | 0.3 | dashed |
| `unknown` | `#616161` (gray) | 0.00 | 0.2 | solid, thin |

Building base color = `METHOD_COLORS[method]` (unchanged). Emissive color = linkState hex. Emissive intensity = linkState value. Opacity = linkState value.

Blocked emissive (0.10) is below degraded (0.30) — blocked looks dimmed/off, degraded looks warm/warning. The dashed edge is the primary blocked cue.

### Zone Styles

| Zone | Floor color | Border | Spacing |
|---|---|---|---|
| `public-perimeter` | `#0a0a1e` (neutral) | none | standard gap |
| `protected-core` | `#0d0a1e` (warm-dark) | thin `#00E5FF` wireframe | compact gap |
| `auth-hub` | `#1a0a2e` (purple-dark) | — | standalone center |

Zone styling is background/context. LinkState always overrides zone coloring on buildings/edges.

### Auth Gate Node

- Position: world origin (0, 0, 0)
- ID: `auth-gate:main`
- Zone: `auth-hub`
- Open (session=valid): cyan emissive (`#00E5FF`), intensity 0.5, full opacity
- Closed (session=none/expired): red emissive (`#FF1744`), intensity 0.10, opacity 0.4
- Mesh: simple box or octahedron (distinctive from buildings)

### Visual Precedence Stack

```
1. Selection/hover highlight   (highest — white color, emissive glow)
2. LinkState styling           (emissive + opacity + edge dash)
3. Zone ground styling         (background only)
4. HTTP method base color      (lowest — building base)
```

## Radial Zone Layout

### Algorithm

Replace grid layout with concentric ring layout:

1. **Classify services by zone**: count endpoints per service, majority `hasAuth` → protected-core, else public-perimeter. Mixed = protected-core (conservative).
2. **Auth-hub**: gate node at (0, 0, 0).
3. **Inner ring (protected-core)**: R1 computed dynamically from inner district count + total size. Services sorted alphabetically, spread evenly at angles `(i / N) * 2PI`.
4. **Outer ring (public-perimeter)**: R2 computed dynamically from outer district count + total size. Same angular distribution.
5. **Dynamic radius formula**: `R = max(minRadius, totalArcWidth / (2 * PI)) + padding`, where `totalArcWidth` = sum of district widths + gaps. This prevents overlap at any service count.
6. **Within-district layout**: same sub-grid as before (sqrt(N) cols, building gap, etc.).

### Determinism

Same input services/endpoints → same output positions. No randomness. Sorted alphabetically within each zone ring. Angle and radius purely from count + size.

### Edge Routing

- **Within-zone edges**: direct line source→target (unchanged).
- **Auth-gated cross-zone edges**: source → auth-gate center → target. The edge bends through (0, 0, 0) with a midpoint waypoint.
- **Non-auth-gated cross-zone edges**: direct line source→target. Preserves real topology.
- **Auth-gated determination**: an edge is auth-gated if the target endpoint has `hasAuth=true` AND the source endpoint has `hasAuth=false`.

## Component Changes

### Modified

| File | Change |
|---|---|
| `client/src/utils/colors.ts` | Add `LINK_STATE_COLORS` and `ZONE_STYLES` token maps |
| `client/src/services/layout.service.ts` | Radial zone layout algorithm, dynamic radii |
| `client/src/components/Building.tsx` | Read `endpointSemantics[id]`, map linkState → emissive/opacity. Selection/hover overrides linkState. |
| `client/src/components/Edges.tsx` | Read semantics, color by worst linkState of pair, dashed for blocked, auth-gated routing through gate. |
| `client/src/components/District.tsx` | Accept zone prop, zone-colored ground, protected-core border wireframe. |
| `client/src/components/City.tsx` | Pass zone to District, render AuthGate, use radial layout. |
| `client/src/components/HUD.tsx` | Add link-state legend below method legend. |
| `client/src/components/SidePanel.tsx` | Show semantic badge: linkState, reason, zone, health, metrics. |

### New

| File | Purpose |
|---|---|
| `client/src/components/AuthGate.tsx` | Auth gate mesh at center, reads store `authGate`, open/closed visual. |

## Testing

### New tests

- **Layout radial determinism**: same input → same output, zones correctly assigned
- **Layout dynamic radii**: no overlap at various service counts (stress test: 1, 5, 10, 20 services)
- **Layout minimum spacing**: buildings never overlap, districts never overlap
- **Visual token completeness**: all 4 linkStates have entries in LINK_STATE_COLORS
- **Zone style completeness**: all 3 zones have entries in ZONE_STYLES
- **Edge routing**: auth-gated edge routes through gate center, non-auth-gated direct
- **Edge routing non-auth**: cross-zone non-auth edge stays direct

### Existing tests (no regression)

- Backend: 415 tests
- Client: 74 tests (M2A reducer + M2B resolver + classifier + store integration)

## KPI

- No wire protocol changes → no delta latency impact
- Semantic resolution already <1ms → no store overhead
- **PR must include**: pre/post FPS note on demo scene, explicit callout on dashed-edge rendering impact
- Before/after screenshots in PR body

## File Plan

### New
- `client/src/components/AuthGate.tsx`

### Modified
- `client/src/utils/colors.ts`
- `client/src/services/layout.service.ts`
- `client/src/__tests__/layout.service.test.ts` (extend)
- `client/src/components/Building.tsx`
- `client/src/components/Edges.tsx`
- `client/src/components/District.tsx`
- `client/src/components/City.tsx`
- `client/src/components/HUD.tsx`
- `client/src/components/SidePanel.tsx`
- `docs/3d-world/FENICE_3D_World_Decision_Log.md`
