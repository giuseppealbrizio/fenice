import { describe, it, expect } from 'vitest';
import {
  COSMOS_LAYOUT,
  SERVICE_STAR,
  ENDPOINT_PLANET,
  METHOD_SHAPES,
  CURVED_ROUTE,
  WORMHOLE,
  CAMERA_NAV,
  seededRandom,
} from '../utils/cosmos';

describe('COSMOS_LAYOUT', () => {
  it('inner ring is closer than outer ring', () => {
    expect(COSMOS_LAYOUT.innerRingRadius).toBeLessThan(COSMOS_LAYOUT.outerRingRadius);
  });

  it('orbit radius range is valid', () => {
    expect(COSMOS_LAYOUT.minOrbitRadius).toBeGreaterThan(0);
    expect(COSMOS_LAYOUT.minOrbitRadius).toBeLessThan(COSMOS_LAYOUT.maxOrbitRadius);
  });
});

describe('SERVICE_STAR', () => {
  it('glow scale is larger than core radius', () => {
    expect(SERVICE_STAR.glowScale).toBeGreaterThan(SERVICE_STAR.coreRadius * 2);
  });

  it('pulse range straddles 1.0', () => {
    expect(SERVICE_STAR.pulseMin).toBeLessThan(1);
    expect(SERVICE_STAR.pulseMax).toBeGreaterThan(1);
  });
});

describe('ENDPOINT_PLANET', () => {
  it('size range is valid', () => {
    expect(ENDPOINT_PLANET.minSize).toBeGreaterThan(0);
    expect(ENDPOINT_PLANET.minSize).toBeLessThan(ENDPOINT_PLANET.maxSize);
  });
});

describe('METHOD_SHAPES', () => {
  it('covers all HTTP methods', () => {
    expect(METHOD_SHAPES).toHaveProperty('get');
    expect(METHOD_SHAPES).toHaveProperty('post');
    expect(METHOD_SHAPES).toHaveProperty('put');
    expect(METHOD_SHAPES).toHaveProperty('delete');
    expect(METHOD_SHAPES).toHaveProperty('patch');
  });

  it('each method maps to a unique shape', () => {
    const shapes = Object.values(METHOD_SHAPES);
    expect(new Set(shapes).size).toBe(shapes.length);
  });
});

describe('seededRandom', () => {
  it('returns value between 0 and 1', () => {
    const val = seededRandom('test-seed');
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it('is deterministic for the same seed', () => {
    expect(seededRandom('abc', 0)).toBe(seededRandom('abc', 0));
    expect(seededRandom('xyz', 5)).toBe(seededRandom('xyz', 5));
  });

  it('produces different values for different seeds', () => {
    expect(seededRandom('seed-a')).not.toBe(seededRandom('seed-b'));
  });

  it('produces different values for different indices', () => {
    expect(seededRandom('same', 0)).not.toBe(seededRandom('same', 1));
  });
});

describe('CAMERA_NAV', () => {
  it('min distance is less than max', () => {
    expect(CAMERA_NAV.minDistance).toBeLessThan(CAMERA_NAV.maxDistance);
  });

  it('default position is outside min distance', () => {
    const [x, y, z] = CAMERA_NAV.defaultPosition;
    const dist = Math.sqrt(x * x + y * y + z * z);
    expect(dist).toBeGreaterThan(CAMERA_NAV.minDistance);
  });
});

describe('CURVED_ROUTE', () => {
  it('tube radius is small', () => {
    expect(CURVED_ROUTE.tubeRadius).toBeLessThan(0.2);
  });
});

describe('WORMHOLE', () => {
  it('portal fits inside ring', () => {
    expect(WORMHOLE.portalRadius).toBeLessThan(WORMHOLE.ringRadius);
  });
});
