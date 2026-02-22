import { describe, it, expect } from 'vitest';
import {
  resolve,
  assignZone,
  resolveEndpoint,
  resolveAuthGate,
} from '../services/semantic-resolver';
import type { ResolverInput } from '../types/semantic';

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
    input: {
      hasAuth: false,
      sessionState: 'none',
      healthState: 'healthy',
      metricsState: 'normal',
      policyState: 'allow',
    },
    expectedLinkState: 'ok',
    expectedZone: 'public-perimeter',
  },
  {
    id: 'S02',
    input: {
      hasAuth: true,
      sessionState: 'none',
      healthState: 'healthy',
      metricsState: 'normal',
      policyState: 'allow',
    },
    expectedLinkState: 'blocked',
    expectedReason: 'auth_required_no_session',
    expectedZone: 'protected-core',
  },
  {
    id: 'S03',
    input: {
      hasAuth: true,
      sessionState: 'valid',
      healthState: 'healthy',
      metricsState: 'normal',
      policyState: 'allow',
    },
    expectedLinkState: 'ok',
    expectedZone: 'protected-core',
  },
  {
    id: 'S04',
    input: {
      hasAuth: true,
      sessionState: 'expired',
      healthState: 'healthy',
      metricsState: 'normal',
      policyState: 'allow',
    },
    expectedLinkState: 'blocked',
    expectedReason: 'auth_token_expired',
    expectedZone: 'protected-core',
  },
  {
    id: 'S05',
    input: {
      hasAuth: true,
      sessionState: 'valid',
      healthState: 'down',
      metricsState: 'normal',
      policyState: 'allow',
    },
    expectedLinkState: 'blocked',
    expectedReason: 'dependency_unhealthy_hard',
    expectedZone: 'protected-core',
  },
  {
    id: 'S06',
    input: {
      hasAuth: true,
      sessionState: 'valid',
      healthState: 'degraded',
      metricsState: 'normal',
      policyState: 'allow',
    },
    expectedLinkState: 'degraded',
    expectedReason: 'service_unhealthy_soft',
    expectedZone: 'protected-core',
  },
  {
    id: 'S07',
    input: {
      hasAuth: false,
      sessionState: 'valid',
      healthState: 'healthy',
      metricsState: 'latency_high',
      policyState: 'allow',
    },
    expectedLinkState: 'degraded',
    expectedReason: 'latency_high',
    expectedZone: 'public-perimeter',
  },
  {
    id: 'S08',
    input: {
      hasAuth: false,
      sessionState: 'valid',
      healthState: 'healthy',
      metricsState: 'error_rate_high',
      policyState: 'allow',
    },
    expectedLinkState: 'degraded',
    expectedReason: 'error_rate_high',
    expectedZone: 'public-perimeter',
  },
  {
    id: 'S09',
    input: {
      hasAuth: true,
      sessionState: 'valid',
      healthState: 'healthy',
      metricsState: 'normal',
      policyState: 'deny',
    },
    expectedLinkState: 'blocked',
    expectedReason: 'policy_denied',
    expectedZone: 'protected-core',
  },
  {
    id: 'S10',
    input: {
      hasAuth: true,
      sessionState: 'valid',
      healthState: 'unknown',
      metricsState: 'unknown',
      policyState: 'unknown',
    },
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
  it('blocked beats degraded (R1 auth blocked overrides R5 degraded health)', () => {
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

describe('SemanticResolver — resolveEndpoint (composed path)', () => {
  it('resolveEndpoint composes resolve + assignZone correctly', () => {
    const result = resolveEndpoint({
      hasAuth: true,
      sessionState: 'valid',
      healthState: 'healthy',
      metricsState: 'normal',
      policyState: 'allow',
    });
    expect(result.linkState).toBe('ok');
    expect(result.zone).toBe('protected-core');
    expect(result.reason).toBeUndefined();
  });

  it('resolveEndpoint returns zone with blocked state', () => {
    const result = resolveEndpoint({
      hasAuth: true,
      sessionState: 'none',
      healthState: 'healthy',
      metricsState: 'normal',
      policyState: 'allow',
    });
    expect(result.linkState).toBe('blocked');
    expect(result.reason).toBe('auth_required_no_session');
    expect(result.zone).toBe('protected-core');
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
