# FENICE 3D World - M2D PR Review Checklist

## Purpose
Use this checklist to review each M2D PR (`PR1`, `PR2`, `PR3`) with the same quality bar across product, UX, and engineering.

## How to use
1. Reviewer runs all "Global gates".
2. Reviewer runs the section for the current PR.
3. PR is mergeable only if all mandatory items pass.

## Global gates (mandatory for every M2D PR)
1. `No backend/protocol changes`: no server routes, WS schema, or event contracts changed.
2. `Semantic contract unchanged`: `blocked > degraded > ok > unknown` still enforced.
3. `Determinism preserved`: same model input produces same city layout output.
4. `Tests green`: client tests green, root `npm run validate` green.
5. `Risk note present`: PR description includes risks + fallback behavior.
6. `Visual evidence present`: before/after screenshots with same camera framing.

## PR1 - City Form + District Identity
### Mandatory
1. Auth hub is a clear visual center and landmark.
2. Ring roads are rendered geometry (not only implied by spacing).
3. District identity is readable:
   public-perimeter and protected-core are distinguishable without selecting nodes.
4. Scene composition avoids large empty dead space.
5. Zone styling stays secondary to semantic overlays.

### Evidence required
1. Screenshot top-down showing ring roads and district boundaries.
2. Screenshot perspective showing auth-hub dominance.
3. Deterministic layout test output for unchanged input snapshot.

## PR2 - Flow Language + Semantic Legibility
### Mandatory
1. Flow edges are curved and direction is readable.
2. Auth-gated paths still pass through auth-hub.
3. Non-auth flows remain topology-accurate (direct where expected).
4. Visual state mapping is unambiguous:
   blocked = broken/cut, degraded = unstable, ok = stable, unknown = dim.
5. Degraded jitter is deterministic (no per-frame random chaos).

### Evidence required
1. Screenshot or clip with each of the 4 link states visible.
2. Test proving auth-gated routing still passes through gate.
3. Note confirming quality fallback mode for lower-end machines.

## PR3 - Camera + Atmosphere + UX Readability
### Mandatory
1. Hero camera improves readability in first 5 seconds.
2. Selection focus works and returns cleanly to overview.
3. Post-processing does not wash out semantic colors.
4. Quality tiers exist with safe low tier (no heavy effects).
5. Auto-fallback prevents persistent FPS degradation.

### Evidence required
1. Before/after FPS note with same demo scenario.
2. Screenshot trio:
   overview, focused endpoint, low-quality fallback.
3. Brief note explaining threshold values used for fallback.

## Merge decision
1. `PASS`: all mandatory checks passed + evidence attached.
2. `CONDITIONAL`: minor visual polish gaps only, no semantic/perf risk.
3. `BLOCK`: any semantic regression, determinism break, or missing fallback.
