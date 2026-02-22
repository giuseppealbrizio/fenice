# M2B Semantic Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement deterministic semantic layer — resolver (R1-R9), metrics classifier with anti-flap, session context, auth-gate virtual node — all client-only, no wire changes.

**Architecture:** Pure function resolver computes `{ linkState, reason, zone }` per endpoint from 5 input signals. MetricsClassifier with 3-sample anti-flap ring buffer feeds metricsState. Store recomputes `endpointSemantics` on every delta or session change.

**Tech Stack:** TypeScript, Zustand 5, Vitest 4 (client: `client/`)

**Branch:** `feat/m2b-semantic-runtime` (from `main`)

---

## Task 1: Semantic types

**Files:**
- Create: `client/src/types/semantic.ts`

**Step 1: Write the types file**

```typescript
/**
 * M2B Semantic Layer types.
 * Source of truth: docs/3d-world/FENICE_3D_World_M2B_SemanticContract_v1.md
 */

// ─── Link states ────────────────────────────────────────────────────────────

export type LinkState = 'ok' | 'degraded' | 'blocked' | 'unknown';

// ─── Reason codes ───────────────────────────────────────────────────────────

export type BlockedReason =
  | 'auth_required_no_session'
  | 'auth_token_expired'
  | 'policy_denied'
  | 'dependency_unhealthy_hard';

export type DegradedReason =
  | 'service_unhealthy_soft'
  | 'latency_high'
  | 'error_rate_high';

export type UnknownReason = 'signal_missing';

export type SemanticReason = BlockedReason | DegradedReason | UnknownReason;

// ─── Zones ──────────────────────────────────────────────────────────────────

export type Zone = 'public-perimeter' | 'protected-core' | 'auth-hub';

// ─── Session state ──────────────────────────────────────────────────────────

export type SessionState = 'none' | 'valid' | 'expired';

// ─── Metrics classification ─────────────────────────────────────────────────

export type MetricsState = 'normal' | 'latency_high' | 'error_rate_high' | 'unknown';

// ─── Health mapping ─────────────────────────────────────────────────────────

export type HealthState = 'healthy' | 'degraded' | 'down' | 'unknown';

// ─── Policy ─────────────────────────────────────────────────────────────────

export type PolicyState = 'allow' | 'deny' | 'unknown';

// ─── Resolver input ─────────────────────────────────────────────────────────

export interface ResolverInput {
  hasAuth: boolean;
  sessionState: SessionState;
  healthState: HealthState;
  metricsState: MetricsState;
  policyState: PolicyState;
}

// ─── Resolver output ────────────────────────────────────────────────────────

export interface SemanticState {
  linkState: LinkState;
  reason?: SemanticReason | undefined;
  zone: Zone;
}

// ─── Auth gate ──────────────────────────────────────────────────────────────

export interface AuthGateState {
  id: string;
  zone: Zone;
  open: boolean;
  linkState: LinkState;
  reason?: SemanticReason | undefined;
}

// ─── Metrics classifier config ──────────────────────────────────────────────

export interface MetricsClassifierConfig {
  latencyThresholdMs: number;
  errorRateThreshold: number;
  antiFlap: number; // consecutive samples needed to change state
}

export const DEFAULT_METRICS_CONFIG: MetricsClassifierConfig = {
  latencyThresholdMs: 500,
  errorRateThreshold: 0.05,
  antiFlap: 3,
};
```

**Step 2: Run client typecheck**

Run: `cd client && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/types/semantic.ts
git commit -m "feat(world-client): add M2B semantic types (LinkState, Zone, Resolver I/O)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: SemanticResolver — pure function + tests

**Files:**
- Create: `client/src/services/semantic-resolver.ts`
- Create: `client/src/__tests__/semantic-resolver.test.ts`

**Step 1: Write failing tests — S01-S10 + precedence + auth gate**

Create `client/src/__tests__/semantic-resolver.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolve, assignZone, resolveAuthGate } from '../services/semantic-resolver';
import type { ResolverInput, SessionState } from '../types/semantic';

// ─── Acceptance Matrix S01-S10 ──────────────────────────────────────────────

const scenarios: {
  id: string;
  input: ResolverInput;
  expectedLinkState: string;
  expectedReason?: string;
  expectedZone: string;
}[] = [
  {
    id: 'S01',
    input: { hasAuth: false, sessionState: 'none', healthState: 'healthy', metricsState: 'normal', policyState: 'allow' },
    expectedLinkState: 'ok',
    expectedZone: 'public-perimeter',
  },
  {
    id: 'S02',
    input: { hasAuth: true, sessionState: 'none', healthState: 'healthy', metricsState: 'normal', policyState: 'allow' },
    expectedLinkState: 'blocked',
    expectedReason: 'auth_required_no_session',
    expectedZone: 'protected-core',
  },
  {
    id: 'S03',
    input: { hasAuth: true, sessionState: 'valid', healthState: 'healthy', metricsState: 'normal', policyState: 'allow' },
    expectedLinkState: 'ok',
    expectedZone: 'protected-core',
  },
  {
    id: 'S04',
    input: { hasAuth: true, sessionState: 'expired', healthState: 'healthy', metricsState: 'normal', policyState: 'allow' },
    expectedLinkState: 'blocked',
    expectedReason: 'auth_token_expired',
    expectedZone: 'protected-core',
  },
  {
    id: 'S05',
    input: { hasAuth: true, sessionState: 'valid', healthState: 'down', metricsState: 'normal', policyState: 'allow' },
    expectedLinkState: 'blocked',
    expectedReason: 'dependency_unhealthy_hard',
    expectedZone: 'protected-core',
  },
  {
    id: 'S06',
    input: { hasAuth: true, sessionState: 'valid', healthState: 'degraded', metricsState: 'normal', policyState: 'allow' },
    expectedLinkState: 'degraded',
    expectedReason: 'service_unhealthy_soft',
    expectedZone: 'protected-core',
  },
  {
    id: 'S07',
    input: { hasAuth: false, sessionState: 'valid', healthState: 'healthy', metricsState: 'latency_high', policyState: 'allow' },
    expectedLinkState: 'degraded',
    expectedReason: 'latency_high',
    expectedZone: 'public-perimeter',
  },
  {
    id: 'S08',
    input: { hasAuth: false, sessionState: 'valid', healthState: 'healthy', metricsState: 'error_rate_high', policyState: 'allow' },
    expectedLinkState: 'degraded',
    expectedReason: 'error_rate_high',
    expectedZone: 'public-perimeter',
  },
  {
    id: 'S09',
    input: { hasAuth: true, sessionState: 'valid', healthState: 'healthy', metricsState: 'normal', policyState: 'deny' },
    expectedLinkState: 'blocked',
    expectedReason: 'policy_denied',
    expectedZone: 'protected-core',
  },
  {
    id: 'S10',
    input: { hasAuth: true, sessionState: 'valid', healthState: 'unknown', metricsState: 'unknown', policyState: 'unknown' },
    expectedLinkState: 'unknown',
    expectedReason: 'signal_missing',
    expectedZone: 'protected-core',
  },
];

describe('SemanticResolver — S01..S10 acceptance matrix', () => {
  for (const s of scenarios) {
    it(`${s.id}: linkState=${s.expectedLinkState}${s.expectedReason ? ` reason=${s.expectedReason}` : ''}`, () => {
      const result = resolve(s.input);
      expect(result.linkState).toBe(s.expectedLinkState);
      if (s.expectedReason) {
        expect(result.reason).toBe(s.expectedReason);
      } else {
        expect(result.reason).toBeUndefined();
      }
    });
  }
});

describe('SemanticResolver — assignZone', () => {
  it('hasAuth=false -> public-perimeter', () => {
    expect(assignZone(false)).toBe('public-perimeter');
  });
  it('hasAuth=true -> protected-core', () => {
    expect(assignZone(true)).toBe('protected-core');
  });
});

describe('SemanticResolver — precedence', () => {
  it('blocked beats degraded (R4 health=down overrides R5 health=degraded is N/A — test auth+degraded)', () => {
    // Auth blocked (R1) should dominate even with degraded health (R5)
    const result = resolve({
      hasAuth: true,
      sessionState: 'none',
      healthState: 'degraded',
      metricsState: 'latency_high',
      policyState: 'allow',
    });
    expect(result.linkState).toBe('blocked');
    expect(result.reason).toBe('auth_required_no_session');
  });

  it('blocked (policy) beats degraded (metrics)', () => {
    const result = resolve({
      hasAuth: false,
      sessionState: 'valid',
      healthState: 'healthy',
      metricsState: 'error_rate_high',
      policyState: 'deny',
    });
    expect(result.linkState).toBe('blocked');
    expect(result.reason).toBe('policy_denied');
  });

  it('degraded (health) beats degraded (metrics) — health checked first', () => {
    const result = resolve({
      hasAuth: false,
      sessionState: 'valid',
      healthState: 'degraded',
      metricsState: 'latency_high',
      policyState: 'allow',
    });
    expect(result.linkState).toBe('degraded');
    expect(result.reason).toBe('service_unhealthy_soft');
  });
});

describe('SemanticResolver — resolveAuthGate', () => {
  it('session=none -> gate closed, blocked', () => {
    const gate = resolveAuthGate('none');
    expect(gate.open).toBe(false);
    expect(gate.linkState).toBe('blocked');
    expect(gate.reason).toBe('auth_required_no_session');
    expect(gate.zone).toBe('auth-hub');
  });

  it('session=expired -> gate closed, blocked', () => {
    const gate = resolveAuthGate('expired');
    expect(gate.open).toBe(false);
    expect(gate.linkState).toBe('blocked');
    expect(gate.reason).toBe('auth_token_expired');
  });

  it('session=valid -> gate open, ok', () => {
    const gate = resolveAuthGate('valid');
    expect(gate.open).toBe(true);
    expect(gate.linkState).toBe('ok');
    expect(gate.reason).toBeUndefined();
  });
});
```

**Step 2: Run test to verify failure**

Run: `cd client && npx vitest run src/__tests__/semantic-resolver.test.ts`
Expected: FAIL — cannot resolve `../services/semantic-resolver`

**Step 3: Implement SemanticResolver**

Create `client/src/services/semantic-resolver.ts`:

```typescript
/**
 * M2B Semantic Resolver — pure deterministic function.
 * Rules follow contract section 8.2, in order.
 * Source: docs/3d-world/FENICE_3D_World_M2B_SemanticContract_v1.md
 */

import type {
  ResolverInput,
  SemanticState,
  Zone,
  AuthGateState,
  SessionState,
} from '../types/semantic';

/**
 * Resolve the semantic state of an endpoint.
 * Rules R1-R9, ordered by precedence (blocked > degraded > ok > unknown).
 */
export function resolve(input: ResolverInput): Omit<SemanticState, 'zone'> {
  const { hasAuth, sessionState, healthState, metricsState, policyState } = input;

  // R1: hasAuth && session=none -> blocked(auth_required_no_session)
  if (hasAuth && sessionState === 'none') {
    return { linkState: 'blocked', reason: 'auth_required_no_session' };
  }

  // R2: hasAuth && session=expired -> blocked(auth_token_expired)
  if (hasAuth && sessionState === 'expired') {
    return { linkState: 'blocked', reason: 'auth_token_expired' };
  }

  // R3: policy=deny -> blocked(policy_denied)
  if (policyState === 'deny') {
    return { linkState: 'blocked', reason: 'policy_denied' };
  }

  // R4: health=down -> blocked(dependency_unhealthy_hard)
  if (healthState === 'down') {
    return { linkState: 'blocked', reason: 'dependency_unhealthy_hard' };
  }

  // R5: health=degraded -> degraded(service_unhealthy_soft)
  if (healthState === 'degraded') {
    return { linkState: 'degraded', reason: 'service_unhealthy_soft' };
  }

  // R6: metrics=latency_high -> degraded(latency_high)
  if (metricsState === 'latency_high') {
    return { linkState: 'degraded', reason: 'latency_high' };
  }

  // R7: metrics=error_rate_high -> degraded(error_rate_high)
  if (metricsState === 'error_rate_high') {
    return { linkState: 'degraded', reason: 'error_rate_high' };
  }

  // R8: core signals missing -> unknown(signal_missing)
  if (healthState === 'unknown' && metricsState === 'unknown' && policyState === 'unknown') {
    return { linkState: 'unknown', reason: 'signal_missing' };
  }

  // R9: else -> ok
  return { linkState: 'ok' };
}

/**
 * Assign zone based on auth requirement.
 */
export function assignZone(hasAuth: boolean): Zone {
  return hasAuth ? 'protected-core' : 'public-perimeter';
}

/**
 * Resolve the full semantic state including zone.
 */
export function resolveEndpoint(input: ResolverInput): SemanticState {
  const { linkState, reason } = resolve(input);
  return { linkState, reason, zone: assignZone(input.hasAuth) };
}

/**
 * Resolve auth gate virtual node state.
 */
export function resolveAuthGate(sessionState: SessionState): AuthGateState {
  if (sessionState === 'none') {
    return {
      id: 'auth-gate:main',
      zone: 'auth-hub',
      open: false,
      linkState: 'blocked',
      reason: 'auth_required_no_session',
    };
  }
  if (sessionState === 'expired') {
    return {
      id: 'auth-gate:main',
      zone: 'auth-hub',
      open: false,
      linkState: 'blocked',
      reason: 'auth_token_expired',
    };
  }
  return {
    id: 'auth-gate:main',
    zone: 'auth-hub',
    open: true,
    linkState: 'ok',
  };
}
```

**Step 4: Run tests**

Run: `cd client && npx vitest run src/__tests__/semantic-resolver.test.ts`
Expected: all PASS

**Step 5: Commit**

```bash
git add client/src/services/semantic-resolver.ts client/src/__tests__/semantic-resolver.test.ts
git commit -m "feat(world-client): add SemanticResolver with S01-S10 coverage (M2B)

Pure deterministic resolver, rules R1-R9 from contract 8.2.
Auth gate virtual node. Zone assignment.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: MetricsClassifier with anti-flap + tests

**Files:**
- Create: `client/src/services/metrics-classifier.ts`
- Create: `client/src/__tests__/metrics-classifier.test.ts`

**Step 1: Write failing tests**

Create `client/src/__tests__/metrics-classifier.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsClassifier } from '../services/metrics-classifier';
import type { EndpointMetrics } from '../types/world-delta';
import type { MetricsClassifierConfig } from '../types/semantic';

const CONFIG: MetricsClassifierConfig = {
  latencyThresholdMs: 500,
  errorRateThreshold: 0.05,
  antiFlap: 3,
};

function makeMetrics(p95: number, errorRate: number): EndpointMetrics {
  return { rps: 100, p50: 50, p95, errorRate };
}

describe('MetricsClassifier', () => {
  let classifier: MetricsClassifier;

  beforeEach(() => {
    classifier = new MetricsClassifier(CONFIG);
  });

  // ── Basic classification ──

  it('returns unknown with no samples', () => {
    expect(classifier.classify('ep:1')).toBe('unknown');
  });

  it('returns normal after 3 normal samples', () => {
    classifier.push('ep:1', makeMetrics(200, 0.01));
    classifier.push('ep:1', makeMetrics(300, 0.02));
    classifier.push('ep:1', makeMetrics(250, 0.01));
    expect(classifier.classify('ep:1')).toBe('normal');
  });

  it('returns latency_high after 3 consecutive high-latency samples', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(550, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');
  });

  it('returns error_rate_high after 3 consecutive high-error samples', () => {
    classifier.push('ep:1', makeMetrics(200, 0.10));
    classifier.push('ep:1', makeMetrics(200, 0.08));
    classifier.push('ep:1', makeMetrics(200, 0.06));
    expect(classifier.classify('ep:1')).toBe('error_rate_high');
  });

  // ── Anti-flap: entry ──

  it('does not trigger latency_high with only 2 high-latency samples', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    expect(classifier.classify('ep:1')).toBe('unknown'); // not enough samples
  });

  it('does not trigger latency_high if 3rd sample is below threshold', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(400, 0.01)); // below
    expect(classifier.classify('ep:1')).toBe('normal');
  });

  // ── Anti-flap: exit ──

  it('stays latency_high until 3 consecutive normal samples', () => {
    // Enter latency_high
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(550, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');

    // 1 normal sample — not enough to exit
    classifier.push('ep:1', makeMetrics(200, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');

    // 2 normal samples — not enough
    classifier.push('ep:1', makeMetrics(200, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');

    // 3 normal samples — now exits
    classifier.push('ep:1', makeMetrics(200, 0.01));
    expect(classifier.classify('ep:1')).toBe('normal');
  });

  // ── Precedence ──

  it('error_rate_high takes precedence when both thresholds exceeded', () => {
    classifier.push('ep:1', makeMetrics(600, 0.10));
    classifier.push('ep:1', makeMetrics(700, 0.08));
    classifier.push('ep:1', makeMetrics(550, 0.06));
    expect(classifier.classify('ep:1')).toBe('error_rate_high');
  });

  // ── Per-endpoint isolation ──

  it('classifies endpoints independently', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(550, 0.01));

    classifier.push('ep:2', makeMetrics(200, 0.01));
    classifier.push('ep:2', makeMetrics(200, 0.01));
    classifier.push('ep:2', makeMetrics(200, 0.01));

    expect(classifier.classify('ep:1')).toBe('latency_high');
    expect(classifier.classify('ep:2')).toBe('normal');
  });

  // ── Reset ──

  it('reset clears all state', () => {
    classifier.push('ep:1', makeMetrics(600, 0.01));
    classifier.push('ep:1', makeMetrics(700, 0.01));
    classifier.push('ep:1', makeMetrics(550, 0.01));
    expect(classifier.classify('ep:1')).toBe('latency_high');

    classifier.reset();
    expect(classifier.classify('ep:1')).toBe('unknown');
  });
});
```

**Step 2: Run to verify failure**

Run: `cd client && npx vitest run src/__tests__/metrics-classifier.test.ts`
Expected: FAIL — cannot resolve `../services/metrics-classifier`

**Step 3: Implement MetricsClassifier**

Create `client/src/services/metrics-classifier.ts`:

```typescript
/**
 * M2B Metrics Classifier with anti-flap.
 * Classifies endpoint metrics into: normal | latency_high | error_rate_high | unknown.
 * Anti-flap: requires N consecutive samples above/below threshold to change state.
 */

import type { EndpointMetrics } from '../types/world-delta';
import type { MetricsClassifierConfig, MetricsState } from '../types/semantic';
import { DEFAULT_METRICS_CONFIG } from '../types/semantic';

interface EndpointBuffer {
  samples: EndpointMetrics[];
  currentState: MetricsState;
}

export class MetricsClassifier {
  private readonly config: MetricsClassifierConfig;
  private readonly buffers = new Map<string, EndpointBuffer>();

  constructor(config: MetricsClassifierConfig = DEFAULT_METRICS_CONFIG) {
    this.config = config;
  }

  push(entityId: string, metrics: EndpointMetrics): void {
    let buffer = this.buffers.get(entityId);
    if (!buffer) {
      buffer = { samples: [], currentState: 'unknown' };
      this.buffers.set(entityId, buffer);
    }

    buffer.samples.push(metrics);
    // Keep only last N samples (antiFlap window)
    if (buffer.samples.length > this.config.antiFlap) {
      buffer.samples.shift();
    }

    // Recompute state if we have enough samples
    if (buffer.samples.length >= this.config.antiFlap) {
      buffer.currentState = this.computeState(buffer);
    }
  }

  classify(entityId: string): MetricsState {
    const buffer = this.buffers.get(entityId);
    if (!buffer) return 'unknown';
    return buffer.currentState;
  }

  reset(): void {
    this.buffers.clear();
  }

  private computeState(buffer: EndpointBuffer): MetricsState {
    const { latencyThresholdMs, errorRateThreshold, antiFlap } = this.config;
    const recent = buffer.samples.slice(-antiFlap);

    const allLatencyHigh = recent.every((m) => m.p95 > latencyThresholdMs);
    const allErrorRateHigh = recent.every((m) => m.errorRate > errorRateThreshold);
    const allLatencyNormal = recent.every((m) => m.p95 <= latencyThresholdMs);
    const allErrorRateNormal = recent.every((m) => m.errorRate <= errorRateThreshold);

    // Precedence: error_rate_high > latency_high
    if (allErrorRateHigh) return 'error_rate_high';
    if (allLatencyHigh && allErrorRateNormal) return 'latency_high';

    // Anti-flap exit: only return to normal if ALL recent are normal
    if (allLatencyNormal && allErrorRateNormal) return 'normal';

    // Otherwise hold current state (anti-flap: don't flip on mixed signals)
    return buffer.currentState === 'unknown' ? 'normal' : buffer.currentState;
  }
}
```

**Step 4: Run tests**

Run: `cd client && npx vitest run src/__tests__/metrics-classifier.test.ts`
Expected: all PASS

**Step 5: Commit**

```bash
git add client/src/services/metrics-classifier.ts client/src/__tests__/metrics-classifier.test.ts
git commit -m "feat(world-client): add MetricsClassifier with anti-flap (M2B)

3-sample ring buffer per endpoint. Configurable thresholds.
error_rate_high > latency_high precedence.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Wire semantics into world.store

**Files:**
- Modify: `client/src/stores/world.store.ts`
- Create: `client/src/__tests__/world-semantic-store.test.ts`

**Step 1: Write failing tests**

Create `client/src/__tests__/world-semantic-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldStore } from '../stores/world.store';
import type { WorldDeltaMessage } from '../types/world-ws';

function makeDelta(seq: number, events: WorldDeltaMessage['events']): WorldDeltaMessage {
  return { type: 'world.delta', schemaVersion: 1, seq, ts: new Date().toISOString(), events };
}

describe('world.store — semantic integration', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
    useWorldStore.getState().setWorldModel(
      {
        services: [{ id: 'service:users', tag: 'Users', endpointCount: 2 }],
        endpoints: [
          { id: 'ep:public', serviceId: 'service:users', path: '/public', method: 'get', summary: '', hasAuth: false, parameterCount: 0 },
          { id: 'ep:protected', serviceId: 'service:users', path: '/protected', method: 'get', summary: '', hasAuth: true, parameterCount: 0 },
        ],
        edges: [],
      },
      10,
      null
    );
  });

  it('has initial session state none', () => {
    expect(useWorldStore.getState().sessionState).toBe('none');
  });

  it('computes semantics for public endpoint as ok with session=none', () => {
    const semantics = useWorldStore.getState().endpointSemantics['ep:public'];
    expect(semantics?.linkState).toBe('ok');
    expect(semantics?.zone).toBe('public-perimeter');
  });

  it('computes semantics for protected endpoint as blocked with session=none', () => {
    const semantics = useWorldStore.getState().endpointSemantics['ep:protected'];
    expect(semantics?.linkState).toBe('blocked');
    expect(semantics?.reason).toBe('auth_required_no_session');
    expect(semantics?.zone).toBe('protected-core');
  });

  it('setSessionState changes session and recomputes semantics', () => {
    useWorldStore.getState().setSessionState('valid');
    const semantics = useWorldStore.getState().endpointSemantics['ep:protected'];
    expect(semantics?.linkState).toBe('ok');
    expect(semantics?.zone).toBe('protected-core');
  });

  it('health delta updates semantics', () => {
    useWorldStore.getState().setSessionState('valid');

    // Push 3 health deltas to confirm anti-flap isn't needed for health (direct signal)
    useWorldStore.getState().applyDelta(
      makeDelta(11, [{ type: 'endpoint.health.updated', entityId: 'ep:protected', payload: { status: 'down' } }])
    );
    const semantics = useWorldStore.getState().endpointSemantics['ep:protected'];
    expect(semantics?.linkState).toBe('blocked');
    expect(semantics?.reason).toBe('dependency_unhealthy_hard');
  });

  it('auth gate reflects session state', () => {
    const gate = useWorldStore.getState().authGate;
    expect(gate.open).toBe(false);
    expect(gate.linkState).toBe('blocked');

    useWorldStore.getState().setSessionState('valid');
    const gate2 = useWorldStore.getState().authGate;
    expect(gate2.open).toBe(true);
    expect(gate2.linkState).toBe('ok');
  });

  it('reset clears semantics and session', () => {
    useWorldStore.getState().setSessionState('valid');
    useWorldStore.getState().reset();
    expect(useWorldStore.getState().sessionState).toBe('none');
    expect(Object.keys(useWorldStore.getState().endpointSemantics)).toHaveLength(0);
  });
});
```

**Step 2: Run to verify failure**

Run: `cd client && npx vitest run src/__tests__/world-semantic-store.test.ts`
Expected: FAIL — `sessionState` and `endpointSemantics` do not exist on store

**Step 3: Update world.store.ts**

Add to `client/src/stores/world.store.ts`:

1. New imports at top:
```typescript
import type { SessionState, SemanticState, AuthGateState, MetricsState, HealthState } from '../types/semantic';
import { DEFAULT_METRICS_CONFIG } from '../types/semantic';
import { resolveEndpoint, resolveAuthGate } from '../services/semantic-resolver';
import { MetricsClassifier } from '../services/metrics-classifier';
```

2. Module-level classifier instance:
```typescript
const metricsClassifier = new MetricsClassifier(DEFAULT_METRICS_CONFIG);
```

3. Add to `WorldState` interface:
```typescript
sessionState: SessionState;
endpointSemantics: Record<string, SemanticState>;
authGate: AuthGateState;
setSessionState: (state: SessionState) => void;
```

4. Helper function to recompute all semantics:
```typescript
function computeAllSemantics(
  endpoints: WorldEndpoint[],
  overlays: Record<string, EndpointOverlay>,
  sessionState: SessionState,
): { endpointSemantics: Record<string, SemanticState>; authGate: AuthGateState } {
  const endpointSemantics: Record<string, SemanticState> = {};
  for (const ep of endpoints) {
    const overlay = overlays[ep.id];
    const healthState: HealthState = overlay?.health?.status ?? 'unknown';
    const metricsState: MetricsState = metricsClassifier.classify(ep.id);
    endpointSemantics[ep.id] = resolveEndpoint({
      hasAuth: ep.hasAuth,
      sessionState,
      healthState,
      metricsState,
      policyState: 'allow', // default until real signal
    });
  }
  return { endpointSemantics, authGate: resolveAuthGate(sessionState) };
}
```

5. Update `initialState`:
```typescript
sessionState: 'none' as SessionState,
endpointSemantics: {} as Record<string, SemanticState>,
authGate: resolveAuthGate('none'),
```

6. Update `setWorldModel` to compute semantics after setting model data.

7. Update `applyDelta` to push metrics to classifier and recompute semantics after applying delta.

8. Add `setSessionState`:
```typescript
setSessionState: (sessionState: SessionState) => {
  const state = get();
  const { endpointSemantics, authGate } = computeAllSemantics(
    state.endpoints, state.endpointOverlays, sessionState
  );
  set({ sessionState, endpointSemantics, authGate });
},
```

9. Update `reset` to also reset classifier and session state.

**Step 4: Run all client tests**

Run: `cd client && npx vitest run`
Expected: all PASS

**Step 5: Commit**

```bash
git add client/src/stores/world.store.ts client/src/__tests__/world-semantic-store.test.ts
git commit -m "feat(world-client): wire semantic resolver into store (M2B)

sessionState, endpointSemantics, authGate derived from resolver.
Recomputed on delta apply and session change.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update Decision Log

**Files:**
- Modify: `docs/3d-world/FENICE_3D_World_Decision_Log.md`

**Step 1: Add M2B decisions**

Append to the `## 2026-02-22` section:

```markdown
5. Decisione: soglie metriche M2B.
   - Valori default: p95 > 500ms = latency_high, errorRate > 0.05 (5%) = error_rate_high.
   - Configurabili via MetricsClassifierConfig.
   - Metriche producono solo stato `degraded`, mai `blocked`.
   - Owner: Giuseppe (approvato)

6. Decisione: anti-flap metriche.
   - Ring buffer 3 campioni per endpoint.
   - Ingresso e uscita dallo stato richiedono 3 campioni consecutivi sopra/sotto soglia.
   - Precedenza: error_rate_high > latency_high.
   - Owner: Giuseppe (approvato)

7. Decisione: policyState default `allow`.
   - Nessun segnale deny reale disponibile in M2B.
   - Sarà integrato quando gateway fornisce 403/deny signals.
   - Owner: Shared
```

**Step 2: Commit**

```bash
git add docs/3d-world/FENICE_3D_World_Decision_Log.md
git commit -m "docs(world): add M2B threshold + anti-flap decisions to log

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Full validation pass

**Step 1: Client lint + typecheck + test**

Run: `cd client && npm run lint && npm run typecheck && npm test`

**Step 2: Backend validate (no regression)**

Run: `npm run validate`

**Step 3: Client build**

Run: `cd client && npm run build`

**Step 4: Backend build**

Run: `npm run build`

**Step 5: Push and create PR**

```bash
git push -u origin feat/m2b-semantic-runtime
gh pr create --base main --title "feat(world): M2B semantic layer — resolver, classifier, auth gate" --body "..."
```

---
