import { describe, it, expect } from 'vitest';
import { computeEdgePoints } from '../components/Edges';
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
