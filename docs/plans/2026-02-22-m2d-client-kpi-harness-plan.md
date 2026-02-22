# M2D Client KPI Harness Plan

## Goal
Add lightweight client-side instrumentation for M2D so visual improvements do not silently degrade runtime quality.

## KPIs to track
1. `fps_p50` and `fps_p95` on demo scene.
2. `frame_time_p95_ms`.
3. `selection_focus_time_ms` (click to stable camera focus).
4. `quality_tier` transitions (`high`, `medium`, `low`) and reasons.
5. `edge_render_count` and approximate edge render budget per frame.

## Non-goals
1. No backend telemetry pipeline changes.
2. No external metrics infra required for first iteration.
3. No persistent analytics upload in this phase.

## Instrumentation design
1. Add `useKpiMonitor` hook in client renderer layer.
2. Sample frame time with rolling buffer (default 240 samples).
3. Derive FPS from frame time (`1000 / frameTimeMs`) and compute p50/p95.
4. Emit structured logs every `N` seconds in dev mode only.
5. Expose a debug object on `window.__feniceKpi` for manual checks.

## Suggested log payload
```json
{
  "ts": "2026-02-22T22:00:00.000Z",
  "scene": "m2d-demo",
  "fpsP50": 58.3,
  "fpsP95": 51.2,
  "frameTimeP95Ms": 19.5,
  "qualityTier": "medium",
  "edgeCount": 42,
  "cameraFocusMs": 320
}
```

## Implementation slices
1. `Slice A`: metric buffer + percentile helpers (pure functions + unit tests).
2. `Slice B`: renderer hook wiring and dev logging.
3. `Slice C`: quality-tier transition logging and guardrails.
4. `Slice D`: optional lightweight HUD debug panel in dev mode.

## Acceptance criteria
1. KPI hook can run continuously without visible stutter.
2. Percentile calculations are test-covered.
3. Debug logs appear in dev and are silent in production builds.
4. KPI notes can be copied into PR description in under 2 minutes.

## Manual verification script
1. Start demo scene and leave idle for 30 seconds.
2. Orbit camera for 15 seconds.
3. Select 5 endpoints and switch between them.
4. Trigger low-quality fallback path (if available).
5. Capture one KPI snapshot and attach to PR.

## Risks and mitigations
1. `Risk`: logging noise.
   `Mitigation`: throttle output + dev-only default.
2. `Risk`: monitor itself affects FPS.
   `Mitigation`: small buffers, no expensive allocations in frame loop.
3. `Risk`: inconsistent measurements across machines.
   `Mitigation`: define one baseline demo scenario and fixed steps.
