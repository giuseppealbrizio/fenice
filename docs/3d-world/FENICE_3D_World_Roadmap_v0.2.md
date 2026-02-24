# FENICE 3D World
## Roadmap v0.2 (Execution)

Date: 2026-02-24
Owner: Shared (Giuseppe + Claude + Codex)
Status: **M3.1 DONE**

## 1) Current state

1. `M1`: DONE
   - Static city from OpenAPI shipped and validated.
2. `M2A`: DONE
   - Typed deltas + producer + reducer + resync guard integrated.
3. `M2B`: DONE
   - Semantic contract implemented (`ok/degraded/blocked/unknown`, zoning, auth gate rules).
4. `M2C`: DONE
   - Tron visual language: radial corridors, auth gate pulse/haze, HUD legend aligned to semantic contract.
5. `M2D`: DONE
   - Visual clarity hardened: radial routing algorithm (no center pile-up), halo glow, marking improvements, 8 docking guides, route layer separation.

## 2) M2 closure summary

All items resolved:

1. Stable visual language for corridors/links/gate — radial fan-out algorithm with distributor ring.
2. Central-node noise eliminated — corridors radiate outward, no overdraw at gate.
3. Route layers explicit and usable — City Corridors default, Endpoint Debug secondary, Both overlay.
4. KPI gates passed — 137/137 tests, typecheck clean, lint clean, test suite < 600ms.
5. Demo narrative shipped — deterministic 5-minute walkthrough (auth open/closed + degraded path).

## 3) Execution log

### P0 — All closed

1. `M2D-T01` Corridor rendering cleanup — **DONE**
   - Owner: Claude
   - Radial corridor algorithm replacing naive L-shaped routing. PR #73 merged.
2. `M2D-T02` Route layer separation and defaults — **DONE**
   - Owner: Claude
   - City Corridors default, toggle in HUD, clear routing text per mode.
3. `M2D-T03` KPI safety pass — **DONE**
   - Owner: Claude
   - 137/137 tests pass, typecheck clean, lint clean. No M2A/M2B regressions.

### P1 — All closed

1. `M2C-T04` Gate presentation polish — **DONE**
   - Owner: Claude
   - Pulse animation (useFrame), 8 accent/docking lines, atmospheric haze sphere.
2. `M2C-T05` Semantic legend + side panel coherence — **DONE**
   - Owner: Claude
   - HUD Corridors section, Building Guide updated, routing descriptions per mode.
3. `M2C-T06` Demo script finalization — **DONE**
   - Owner: Giuseppe + Claude
   - 5-minute walkthrough: city overview, visual language, corridors + auth gate, degraded path, route layers, forward vision.

### P2 — All closed

1. `M3-T00` AI Builder pipeline — **DONE**
   - Owner: Claude
   - Prompt-to-PR with scope policy, self-repair, validation, 3D world integration. PR #75 merged.
2. `M3.1-T00` Two-phase builder — **DONE**
   - Owner: Claude
   - Plan-then-generate pipeline with user approval gate. 15 tasks across 5 batches.
   - Plan review UI, glowy loading bar, context reduction (~40-50% fewer tokens), 10-min timeouts.
   - Approve/reject endpoints, plan field on job model, 719 total tests. PR #76 merged.

### P3 — Next

1. `M4-T00` Multi-user collaboration
   - Owner: Shared
   - Entry gate: M3 prompt→PR loop reliable and auditable. **ENTRY GATE MET.**

## 4) Role split (working mode)

1. Giuseppe
   - Product/creative direction, final visual acceptance, merge decision.
2. Claude
   - Three.js/R3F implementation and iteration on rendering/perf tradeoffs.
3. Codex
   - Roadmap/docs alignment, QA gates, acceptance tracking, regression control.

## 5) M2 done definition (hard gate) — ALL PASSED

1. M2A and M2B behavior unchanged and test-green. — **137/137 tests pass.**
2. M2C/M2D visual pass approved by product on canonical views. — **Radial corridors, gate polish, HUD legend shipped.**
3. Route semantics are understandable without verbal explanation. — **HUD legend self-explanatory.**
4. KPI and perf guardrails pass. — **typecheck + lint + test clean, suite < 600ms.**
5. Demo narrative reproducible end-to-end. — **DemoNarrative_5min.md updated.**

## 6) M3/M3.1 done definition — ALL PASSED

1. Builder pipeline generates code from prompt. — **Claude API tool-use loop with write_file/modify_file/read_file.**
2. Scope policy prevents unsafe writes. — **Path whitelist/blacklist, forbidden paths, content scanning.**
3. Self-repair on validation failure. — **One retry via Claude, then fail.**
4. PR created on GitHub. — **Octokit integration, structured PR body.**
5. 3D world shows builder progress. — **builder.progress deltas + synthetic service/endpoint deltas.**
6. Two-phase pipeline with plan approval. — **plan_ready state with approve/reject endpoints.**
7. Plan review UI in 3D world. — **Editable manifest, type badges, approve/reject buttons.**
8. Context reduction for faster generation. — **~40-50% fewer tokens when plan constrains scope.**
9. All tests pass. — **719 tests (560 server + 159 client), 73 test files.**

## 7) Next milestones

1. `M4` Multi-user collaboration
   - Entry gate: M3 prompt→PR loop reliable and auditable. **ENTRY GATE MET.**
