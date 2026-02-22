import { describe, it, expect } from 'vitest';
import { computeEdgePoints, worstLinkState } from '../components/Edges';
import type { Position3D } from '../services/layout.service';

describe('computeEdgePoints — edge routing', () => {
  const gate: Position3D = { x: 0, y: 0, z: 0 };
  const source: Position3D = { x: -10, y: 0, z: 0 };
  const target: Position3D = { x: 10, y: 0, z: 0 };

  it('auth-gated edge routes through gate center', () => {
    const points = computeEdgePoints(source, target, gate, true);
    expect(points).toHaveLength(3);
    expect(points[1]).toEqual([0, 0.05, 0]);
  });

  it('non-auth-gated edge routes direct', () => {
    const points = computeEdgePoints(source, target, gate, false);
    expect(points).toHaveLength(2);
  });
});

describe('worstLinkState — precedence', () => {
  it('blocked wins over degraded and unknown', () => {
    expect(worstLinkState('blocked', 'degraded')).toBe('blocked');
    expect(worstLinkState('unknown', 'blocked')).toBe('blocked');
  });

  it('degraded wins over ok and unknown', () => {
    expect(worstLinkState('degraded', 'ok')).toBe('degraded');
    expect(worstLinkState('unknown', 'degraded')).toBe('degraded');
  });

  it('ok wins over unknown', () => {
    expect(worstLinkState('ok', 'unknown')).toBe('ok');
  });
});
