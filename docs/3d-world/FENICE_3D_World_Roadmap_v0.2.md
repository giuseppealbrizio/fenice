# FENICE 3D World
## Roadmap v0.2 (Execution)

Date: 2026-02-23
Owner: Shared (Giuseppe + Claude + Codex)
Status: Active

## 1) Current state

1. `M1`: DONE
   - Static city from OpenAPI shipped and validated.
2. `M2A`: DONE
   - Typed deltas + producer + reducer + resync guard integrated.
3. `M2B`: DONE
   - Semantic contract implemented (`ok/degraded/blocked/unknown`, zoning, auth gate rules).
4. `M2C`: IN_PROGRESS
   - Tron visual language is partially implemented; readability/consistency still open.
5. `M2D`: IN_PROGRESS (internal track under M2)
   - Visual clarity + performance hardening for the M2C output.

## 2) What remains before closing M2

1. Freeze a stable visual language for corridors/links/gate.
2. Reduce central-node visual noise (no overdraw artifacts, no ambiguous overlap).
3. Make route layers explicit and usable:
   - `City Corridors` for service-level reachability.
   - `Endpoint Debug` only as secondary diagnostic layer.
4. Pass visual QA rubric + KPI gates together:
   - semantic readability maintained
   - FPS target respected
   - no regressions in M2A/M2B behavior
5. Ship a deterministic demo narrative for auth gate + public/private topology.

## 3) 7-day execution plan

### P0 (must close first)

1. `M2D-T01` Corridor rendering cleanup
   - Owner: Claude
   - Output: clean corridor geometry, no artifact center, consistent link-state styling
   - Gate: visual QA pass on 3 canonical camera views
2. `M2D-T02` Route layer separation and defaults
   - Owner: Claude
   - Output: UX defaults + toggles (`City Corridors` default, debug isolated)
   - Gate: reviewers can explain scene in < 30s
3. `M2D-T03` KPI safety pass
   - Owner: Codex
   - Output: validate no regressions (`typecheck/test/lint` + KPI notes)
   - Gate: p95 latency/render constraints unchanged from M2A

### P1 (close M2 quality)

1. `M2C-T04` Gate presentation polish
   - Owner: Claude
   - Output: gate pulse/haze tuned to be informative, non-intrusive
2. `M2C-T05` Semantic legend + side panel coherence
   - Owner: Codex
   - Output: HUD and panel labels strictly aligned with M2B contract
3. `M2C-T06` Demo script finalization
   - Owner: Giuseppe + Codex
   - Output: deterministic 5-minute walkthrough (auth open/closed + degraded path)

### P2 (after M2 sign-off)

1. `M3-T00` AI Builder pre-work
   - Owner: Shared
   - Output: prompt-to-PR boundaries and safety gates baseline

## 4) Role split (working mode)

1. Giuseppe
   - Product/creative direction, final visual acceptance, merge decision.
2. Claude
   - Three.js/R3F implementation and iteration on rendering/perf tradeoffs.
3. Codex
   - Roadmap/docs alignment, QA gates, acceptance tracking, regression control.

## 5) M2 done definition (hard gate)

1. M2A and M2B behavior unchanged and test-green.
2. M2C/M2D visual pass approved by product on canonical views:
   - wide city
   - center gate close
   - district close
3. Route semantics are understandable without verbal explanation.
4. KPI and perf guardrails pass.
5. Demo narrative reproducible end-to-end.

## 6) Next milestones after M2

1. `M3` AI Builder PR-only
   - Entry gate: M2 closed + stable semantic/visual contract.
2. `M4` Multi-user collaboration
   - Entry gate: M3 prompt->PR loop reliable and auditable.
