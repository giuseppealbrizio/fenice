# M2D Visual Clarity — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate method identity (building body color) from semantic state (accent ring + edge style) so users can read the city in 5 seconds.

**Architecture:** Add a ground-level accent ring mesh to each building for link-state encoding. Remove emissive glow from building body. Boost blocked/unknown edge opacity. Make auth-gated edges thick (3.0 lineWidth). Update HUD and SidePanel legends for clarity.

**Tech Stack:** TypeScript, React Three Fiber v9, drei v10.7.7, Three.js r173, Vitest

---

### Task 1: Update colors.ts — Opacity Boost + Accent Constants

**Files:**
- Modify: `client/src/utils/colors.ts`
- Modify: `client/src/__tests__/colors.test.ts`

**Step 1: Write the failing tests**

Add to `client/src/__tests__/colors.test.ts`:

```typescript
import {
  METHOD_COLORS,
  METHOD_LABELS,
  LINK_STATE_COLORS,
  ZONE_STYLES,
  ACCENT_RING_HEIGHT,
  ACCENT_EMISSIVE_INTENSITY,
} from '../utils/colors';

// Add after existing LINK_STATE_COLORS tests:

describe('LINK_STATE_COLORS — visual clarity', () => {
  it('blocked opacity is boosted to 0.7', () => {
    expect(LINK_STATE_COLORS.blocked.opacity).toBe(0.7);
  });

  it('unknown opacity is boosted to 0.3', () => {
    expect(LINK_STATE_COLORS.unknown.opacity).toBe(0.3);
  });
});

describe('accent ring constants', () => {
  it('ACCENT_RING_HEIGHT is a positive number', () => {
    expect(ACCENT_RING_HEIGHT).toBeGreaterThan(0);
  });

  it('ACCENT_EMISSIVE_INTENSITY is a positive number', () => {
    expect(ACCENT_EMISSIVE_INTENSITY).toBeGreaterThan(0);
  });
});

describe('color collision safety', () => {
  it('no method hex collides with any link-state hex', () => {
    const methodHexes = Object.values(METHOD_COLORS);
    const stateHexes = Object.values(LINK_STATE_COLORS).map((s) => s.hex);
    for (const mh of methodHexes) {
      for (const sh of stateHexes) {
        expect(mh).not.toBe(sh);
      }
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run client/src/__tests__/colors.test.ts`
Expected: FAIL — blocked opacity is 0.3 (not 0.7), `ACCENT_RING_HEIGHT` doesn't exist.

**Step 3: Update `client/src/utils/colors.ts`**

Change blocked opacity from 0.3 to 0.7:
```typescript
blocked: { hex: '#FF1744', emissiveIntensity: 0.1, opacity: 0.7, edgeStyle: 'dashed' },
```

Change unknown opacity from 0.2 to 0.3:
```typescript
unknown: { hex: '#616161', emissiveIntensity: 0.0, opacity: 0.3, edgeStyle: 'solid' },
```

Add after the `METHOD_LABELS` block:
```typescript
// ─── Building accent ring tokens ─────────────────────────────────────────────

/** Height of the link-state accent ring at building base */
export const ACCENT_RING_HEIGHT = 0.08;

/** Emissive intensity for building accent rings */
export const ACCENT_EMISSIVE_INTENSITY = 0.4;
```

Also update the existing test that checks `blocked opacity is lowest among active states` — the assertion `blocked.opacity <= degraded.opacity` will now fail since 0.7 > 0.6. Change it to:
```typescript
it('unknown opacity is lowest', () => {
  expect(LINK_STATE_COLORS.unknown.opacity).toBeLessThanOrEqual(
    LINK_STATE_COLORS.blocked.opacity
  );
  expect(LINK_STATE_COLORS.unknown.opacity).toBeLessThanOrEqual(
    LINK_STATE_COLORS.degraded.opacity
  );
  expect(LINK_STATE_COLORS.unknown.opacity).toBeLessThanOrEqual(LINK_STATE_COLORS.ok.opacity);
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run client/src/__tests__/colors.test.ts`
Expected: All pass.

**Step 5: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add client/src/utils/colors.ts client/src/__tests__/colors.test.ts
git commit -m "feat(world-client): boost blocked/unknown opacity, add accent ring constants"
```

---

### Task 2: Building.tsx — Add Accent Ring, Remove Emissive Glow

**Files:**
- Modify: `client/src/components/Building.tsx`

**Context:** Currently Building.tsx line 29-34 drives emissive color and opacity from link state. We need to:
1. Make building body always opaque with near-zero emissive
2. Add a thin `<mesh>` at ground level for the accent ring

**Step 1: Modify Building.tsx**

Replace the full component with:

```tsx
import { useRef, useState } from 'react';
import type { Mesh } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { WorldEndpoint } from '../types/world';
import type { BuildingLayout } from '../services/layout.service';
import {
  METHOD_COLORS,
  LINK_STATE_COLORS,
  ACCENT_RING_HEIGHT,
  ACCENT_EMISSIVE_INTENSITY,
} from '../utils/colors';
import { useSelectionStore } from '../stores/selection.store';
import { useWorldStore } from '../stores/world.store';

interface BuildingProps {
  layout: BuildingLayout;
  endpoint: WorldEndpoint;
}

export function Building({ layout, endpoint }: BuildingProps): React.JSX.Element {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const semantics = useWorldStore((s) => s.endpointSemantics[endpoint.id]);
  const isSelected = selectedId === endpoint.id;
  const methodColor = METHOD_COLORS[endpoint.method];

  const linkStyle = semantics ? LINK_STATE_COLORS[semantics.linkState] : LINK_STATE_COLORS.unknown;

  // Visual precedence: selection > method color (body is always method-colored)
  const baseColor = isSelected ? '#ffffff' : methodColor;

  const handleClick = (e: ThreeEvent<MouseEvent>): void => {
    e.stopPropagation();
    setSelected(isSelected ? null : endpoint.id);
  };

  return (
    <group>
      {/* Building body — method color, no semantic glow */}
      <RoundedBox
        ref={meshRef}
        args={[layout.width, layout.height, layout.depth]}
        radius={0.08}
        smoothness={4}
        position={[layout.position.x, layout.height / 2, layout.position.z]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive="#000000"
          emissiveIntensity={0.02}
          roughness={0.6}
          metalness={0.1}
          transparent={false}
          opacity={1.0}
        />
      </RoundedBox>

      {/* Link-state accent ring at base */}
      <mesh
        position={[layout.position.x, ACCENT_RING_HEIGHT / 2, layout.position.z]}
      >
        <boxGeometry args={[layout.width, ACCENT_RING_HEIGHT, layout.depth]} />
        <meshStandardMaterial
          color={linkStyle.hex}
          emissive={linkStyle.hex}
          emissiveIntensity={ACCENT_EMISSIVE_INTENSITY}
          roughness={0.3}
          metalness={0.2}
          transparent={linkStyle.opacity < 1}
          opacity={linkStyle.opacity}
        />
      </mesh>
    </group>
  );
}
```

Key changes:
- Body emissive is now `#000000` with intensity `0.02` (near-zero, no glow)
- Body is always `opacity: 1.0`, `transparent: false`
- Removed: `emissiveColor`, `emissiveIntensity`, `semanticOpacity`, `minimumOpacity` logic
- Removed: hover emissive color change
- Added: `<mesh>` with `boxGeometry` for accent ring at `y = ACCENT_RING_HEIGHT / 2`
- Accent ring color/emissive/opacity driven by `LINK_STATE_COLORS[linkState]`
- Wrapped in `<group>` to contain both meshes

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

**Step 3: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add client/src/components/Building.tsx
git commit -m "feat(world-client): separate method body from link-state accent ring on buildings"
```

---

### Task 3: Edges.tsx — Auth-Gated Prominence + Opacity Fix

**Files:**
- Modify: `client/src/components/Edges.tsx`

**Context:** Lines 84-87 currently reduce auth-gated edge width to 80% and opacity to 70%. We need to invert this: auth-gated edges get full opacity and 3.0 lineWidth.

**Step 1: Modify Edges.tsx**

Replace lines 82-87 (the `isDashed` through `routeOpacity` block):

Before:
```typescript
const isDashed = style.edgeStyle === 'dashed';
const dashProps = isDashed ? { dashSize: 0.5, gapSize: 0.3 } : {};
const lineWidth = isDashed ? 1 : 1.5;
const routeWidth = isAuthGated ? lineWidth * 0.8 : lineWidth;
const baseOpacity = isAuthGated ? Math.max(0.2, style.opacity * 0.7) : style.opacity;
const routeOpacity = isIntraService ? Math.min(baseOpacity, 0.18) : baseOpacity;
```

After:
```typescript
const isDashed = style.edgeStyle === 'dashed';
const dashProps = isDashed ? { dashSize: 0.5, gapSize: 0.3 } : {};
const baseWidth = isDashed ? 1 : 1.5;
const routeWidth = isAuthGated ? 3.0 : baseWidth;
const baseOpacity = style.opacity;
const routeOpacity = isIntraService ? Math.min(baseOpacity, 0.18) : baseOpacity;
```

Changes:
- Auth-gated `lineWidth`: `3.0` (was `lineWidth * 0.8 = 1.2`)
- Auth-gated opacity: `style.opacity` (was `style.opacity * 0.7`)
- Renamed `lineWidth` to `baseWidth` to avoid shadowing

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

**Step 3: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass (edge-routing tests check point geometry, not visual props).

**Step 4: Commit**

```bash
git add client/src/components/Edges.tsx
git commit -m "feat(world-client): auth-gated edges full opacity + 3.0 lineWidth"
```

---

### Task 4: HUD.tsx — Building Visual Guide + Routing Copy Update

**Files:**
- Modify: `client/src/components/HUD.tsx`

**Context:** Add a "Building Visual Guide" section after the link-state legend. Update the routing hint copy to be more explicit.

**Step 1: Modify HUD.tsx**

After the link-state legend `</div>` (line 193), add a new section:

```tsx
{/* Building visual guide */}
<div
  style={{
    marginTop: '14px',
    borderTop: `1px solid ${theme.divider}`,
    paddingTop: '10px',
    fontSize: '10px',
    color: theme.muted,
    lineHeight: 1.5,
  }}
>
  <div
    style={{
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '4px',
    }}
  >
    Building Guide
  </div>
  <div>Body color = HTTP method</div>
  <div>Base ring = link state</div>
  <div>Thick edge = auth-gated route</div>
</div>
```

Then update the routing hint section (lines 206-213). Replace:
```tsx
<div>Lines passing through the center gate are auth-gated routes.</div>
<div style={{ marginTop: '4px' }}>
  Link colors are driven by live telemetry simulation.
</div>
```

With:
```tsx
<div>Edge color shows link state between endpoints.</div>
<div style={{ marginTop: '4px' }}>
  Thick lines route through the auth gate.
</div>
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

**Step 3: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add client/src/components/HUD.tsx
git commit -m "feat(world-client): add building visual guide and explicit routing copy to HUD"
```

---

### Task 5: SidePanel.tsx — Friendly Reasons + Related Endpoint State Dots

**Files:**
- Modify: `client/src/components/SidePanel.tsx`

**Context:** Two changes: (1) translate raw reason codes to friendly labels, (2) add colored state dot to related endpoint buttons.

**Step 1: Add REASON_LABELS map**

At the top of `SidePanel.tsx`, after the `PANEL_THEME` constant, add:

```typescript
const REASON_LABELS: Record<string, string> = {
  auth_required_no_session: 'Auth required — no active session',
  auth_token_expired: 'Auth token has expired',
  policy_denied: 'Access denied by policy',
  dependency_unhealthy_hard: 'Dependency is down',
  service_unhealthy_soft: 'Service partially degraded',
  latency_high: 'High latency detected',
  error_rate_high: 'Error rate above threshold',
  signal_missing: 'No telemetry signal',
};
```

**Step 2: Update the reason display**

Replace lines 225-231 (the reason display):

Before:
```tsx
{semantics.reason && (
  <>
    <span style={{ color: theme.muted }}>Reason</span>
    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
      {semantics.reason}
    </span>
  </>
)}
```

After:
```tsx
{semantics.reason && (
  <>
    <span style={{ color: theme.muted }}>Reason</span>
    <span>
      <div style={{ fontSize: '13px' }}>
        {REASON_LABELS[semantics.reason] ?? semantics.reason}
      </div>
      <div
        style={{
          fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
          fontSize: '10px',
          color: theme.muted,
          marginTop: '2px',
        }}
      >
        {semantics.reason}
      </div>
    </span>
  </>
)}
```

**Step 3: Add state dot to related endpoint buttons**

In the related endpoints `.map()` (line 271-308), add a state dot before the method badge. Replace the `<button>` content:

Before:
```tsx
<button
  key={ep.id}
  onClick={() => handleRelatedClick(ep.id)}
  style={{
    background: theme.chipBg,
    border: `1px solid ${theme.chipBorder}`,
    borderRadius: '4px',
    padding: '8px 10px',
    cursor: 'pointer',
    textAlign: 'left',
    color: theme.subtle,
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }}
>
  <span
    style={{
      backgroundColor: METHOD_COLORS[ep.method],
      color: '#fff',
      fontWeight: 700,
      fontSize: '9px',
      padding: '2px 5px',
      borderRadius: '2px',
      flexShrink: 0,
    }}
  >
    {METHOD_LABELS[ep.method]}
  </span>
  <span
    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
  >
    {ep.path}
  </span>
</button>
```

After (add the state dot as first child inside `<button>`):
```tsx
<button
  key={ep.id}
  onClick={() => handleRelatedClick(ep.id)}
  style={{
    background: theme.chipBg,
    border: `1px solid ${theme.chipBorder}`,
    borderRadius: '4px',
    padding: '8px 10px',
    cursor: 'pointer',
    textAlign: 'left',
    color: theme.subtle,
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }}
>
  {/* Link-state dot */}
  <span
    style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor:
        LINK_STATE_COLORS[endpointSemantics[ep.id]?.linkState ?? 'unknown'].hex,
      flexShrink: 0,
    }}
  />
  <span
    style={{
      backgroundColor: METHOD_COLORS[ep.method],
      color: '#fff',
      fontWeight: 700,
      fontSize: '9px',
      padding: '2px 5px',
      borderRadius: '2px',
      flexShrink: 0,
    }}
  >
    {METHOD_LABELS[ep.method]}
  </span>
  <span
    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
  >
    {ep.path}
  </span>
</button>
```

Note: `LINK_STATE_COLORS` is already imported in SidePanel.tsx (line 5). The `endpointSemantics` is already available (line 39).

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

**Step 5: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add client/src/components/SidePanel.tsx
git commit -m "feat(world-client): friendly reason labels and state dots on related endpoints"
```

---

### Task 6: Validation + PR

**Step 1: Run full validation**

```bash
npm run validate
```

Expected: lint + typecheck + test all pass.

**Step 2: Push and create PR**

```bash
git push -u origin feat/m2d-visual-clarity
gh pr create --base main --title "feat(world): M2D Visual Clarity — separate method from semantic state" --body "$(cat <<'EOF'
## Summary

- **Building body = method color** (stable, always opaque, near-zero emissive glow)
- **Building accent ring at base = link state** (colored + emissive ring at ground level)
- **Auth-gated edges = 3.0 lineWidth** (full opacity, no reduction — thick routing through gate)
- **Blocked edge opacity boosted** from 0.3 to 0.7 (failures visible, not hidden)
- **Unknown edge opacity boosted** from 0.2 to 0.3
- **HUD**: Building visual guide (body=method, ring=state, thick=auth-gated)
- **SidePanel**: Friendly reason labels + state dots on related endpoints

## Before / After

### Buildings
**Before:** Method color body + subtle emissive glow blended together. Link state hard to read.
**After:** Solid method-colored body + distinct accent ring at base in link-state color. Two clear visual channels.

### Edges
**Before:** Auth-gated edges at 70% opacity and 80% width — nearly invisible. Blocked edges at 0.3 opacity — failures disappear.
**After:** Auth-gated edges thick (3.0 width) at full state opacity. Blocked edges at 0.7 opacity — red dashed lines clearly visible.

### SidePanel
**Before:** Raw reason codes like `auth_required_no_session`. Related endpoints show no state.
**After:** Friendly labels ("Auth required — no active session") with raw code below. State dot on each related endpoint.

## State -> Visual Rule -> File

| State | Visual Rule | File(s) |
|-------|------------|---------|
| Method identity | Building body color = `METHOD_COLORS[method]` | `Building.tsx`, `colors.ts` |
| ok | Cyan accent ring, cyan solid edge (0.8) | `Building.tsx`, `Edges.tsx`, `colors.ts` |
| degraded | Amber accent ring, amber solid edge (0.6) | `Building.tsx`, `Edges.tsx`, `colors.ts` |
| blocked | Red accent ring, red dashed edge (0.7) | `Building.tsx`, `Edges.tsx`, `colors.ts` |
| unknown | Gray accent ring, gray solid edge (0.3) | `Building.tsx`, `Edges.tsx`, `colors.ts` |
| auth-gated | 3.0 lineWidth through gate, full state opacity | `Edges.tsx` |
| selected | White body, accent ring unchanged | `Building.tsx` |

## FPS Note

**Impact: negligible.** One additional `<mesh>` (boxGeometry) per building — adds N draw calls where N = endpoint count. Box geometry is the cheapest possible mesh. No shaders, no post-processing.

## Risks + Fallback

| Risk | Mitigation |
|------|------------|
| Accent ring z-fighting with ground plane | Ring at y=0.04 (half of 0.08 height), ground at y=0.01 — no overlap |
| Accent ring hidden by building shadow | EmissiveIntensity 0.4 ensures ring glows through shadows |
| Thick auth-gated edges visually heavy with many routes | Only edges crossing auth boundary are thick; intra-service edges stay hidden |

## Semantic Contract

**Unchanged.** No modifications to types, resolver, store, or backend.

## Test plan

- [ ] All tests pass (including updated opacity assertions)
- [ ] No method hex collides with any link-state hex
- [ ] ACCENT_RING_HEIGHT and ACCENT_EMISSIVE_INTENSITY constants verified
- [ ] Visual: buildings show stable method color + distinct accent ring
- [ ] Visual: auth-gated edges clearly thick through gate
- [ ] Visual: blocked edges visible red dashed (not faint)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
