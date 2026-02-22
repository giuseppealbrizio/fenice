# M2B Semantic Layer Design

Date: 2026-02-22
Status: Approved
Owner: Claude (runtime) + Giuseppe (approval)
Branch: `feat/m2b-semantic-runtime`

## Goal

Implement the deterministic semantic layer for the 3D world: resolver, metrics classifier with anti-flap, session context, and auth-gate virtual node. Client-only, no wire protocol changes.

## Decisions

1. **Client-only** — semantic state computed in client store from snapshot + deltas + session context
2. **Resolver rules** — exact order from contract 8.2 (R1-R9)
3. **Health status** — `healthy | degraded | down` (from M2A)
4. **Metrics thresholds** — configurable: p95 > 500ms = latency_high, errorRate > 0.05 = error_rate_high
5. **Anti-flap** — ring buffer 3 samples/endpoint, symmetric entry/exit
6. **Policy state** — default `allow` until real deny signal exists
7. **Precedence** — blocked > degraded > ok > unknown
8. **Metrics only degraded** — metrics signals never produce `blocked`

## Resolver Rules (contract 8.2)

| # | Condition | linkState | reason |
|---|---|---|---|
| R1 | hasAuth && session=none | blocked | auth_required_no_session |
| R2 | hasAuth && session=expired | blocked | auth_token_expired |
| R3 | policy=deny | blocked | policy_denied |
| R4 | health=down | blocked | dependency_unhealthy_hard |
| R5 | health=degraded | degraded | service_unhealthy_soft |
| R6 | metrics=latency_high | degraded | latency_high |
| R7 | metrics=error_rate_high | degraded | error_rate_high |
| R8 | core signals missing | unknown | signal_missing |
| R9 | else | ok | — |

## MetricsClassifier

- Ring buffer: 3 samples per endpoint
- Thresholds: `{ latencyThresholdMs: 500, errorRateThreshold: 0.05 }`
- Anti-flap: 3 consecutive samples above/below threshold to enter/exit state
- Output: `normal | latency_high | error_rate_high | unknown`
- Both exceeded: `error_rate_high` takes precedence

## Zones

- `hasAuth=false` → `public-perimeter`
- `hasAuth=true` → `protected-core`
- Auth gate → `auth-hub`

## Auth Gate Virtual Node

- ID: `auth-gate:main`
- Session none/expired → gate closed (blocked)
- Session valid → gate open (pass-through)
- Render-only, no backend wire changes

## File Plan

### New (client)
- `client/src/types/semantic.ts` — types
- `client/src/services/semantic-resolver.ts` — pure resolver
- `client/src/services/metrics-classifier.ts` — classifier + anti-flap
- `client/src/__tests__/semantic-resolver.test.ts` — S01-S10 + precedence + auth gate
- `client/src/__tests__/metrics-classifier.test.ts` — thresholds + anti-flap

### Modified (client)
- `client/src/stores/world.store.ts` — sessionState + endpointSemantics + recompute

### Docs
- `docs/3d-world/FENICE_3D_World_Decision_Log.md` — thresholds + anti-flap decision

## Mapping Table

| Rule | Contract ref | File | Function |
|---|---|---|---|
| R1 | 8.2.1 | semantic-resolver.ts | resolve() |
| R2 | 8.2.2 | semantic-resolver.ts | resolve() |
| R3 | 8.2.3 | semantic-resolver.ts | resolve() |
| R4 | 8.2.4 | semantic-resolver.ts | resolve() |
| R5 | 8.2.5 | semantic-resolver.ts | resolve() |
| R6 | 8.2.6 | semantic-resolver.ts + metrics-classifier.ts | resolve() + classify() |
| R7 | 8.2.7 | semantic-resolver.ts + metrics-classifier.ts | resolve() + classify() |
| R8 | 8.2.8 | semantic-resolver.ts | resolve() |
| R9 | 8.2.9 | semantic-resolver.ts | resolve() |
| Zone | 5.3 | semantic-resolver.ts | assignZone() |
| Anti-flap | decision | metrics-classifier.ts | MetricsClassifier class |
| Thresholds | decision | metrics-classifier.ts | config object |
| Auth gate | 5.1.3 + 5.2.3 | semantic-resolver.ts | resolveAuthGate() |
