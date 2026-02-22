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
  if (healthState === 'unknown' && metricsState === 'unknown') {
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
