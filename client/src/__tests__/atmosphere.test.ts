import { describe, it, expect } from 'vitest';
import {
  COSMIC_PALETTE,
  SCENE_FOG,
  BLOOM_CONFIG,
  VIGNETTE_CONFIG,
  CHROMATIC_ABERRATION_CONFIG,
  NOISE_CONFIG,
  GROUND_FOG_CONFIG,
  HAZE_LAYERS_CONFIG,
  GOD_RAYS_CONFIG,
  PULSE_WAVE_CONFIG,
  STATUS_PARTICLES_CONFIG,
  AMBIENT_ANIMATION_CONFIG,
} from '../utils/atmosphere';

describe('COSMIC_PALETTE', () => {
  it('has all required colors as valid hex strings', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    expect(COSMIC_PALETTE.bgDeep).toMatch(hexPattern);
    expect(COSMIC_PALETTE.bgNight).toMatch(hexPattern);
    expect(COSMIC_PALETTE.accentCyan).toMatch(hexPattern);
    expect(COSMIC_PALETTE.accentMagenta).toMatch(hexPattern);
    expect(COSMIC_PALETTE.accentAmber).toMatch(hexPattern);
    expect(COSMIC_PALETTE.neutralGlow).toMatch(hexPattern);
    expect(COSMIC_PALETTE.fogColor).toMatch(hexPattern);
  });
});

describe('SCENE_FOG', () => {
  it('has density in valid range', () => {
    expect(SCENE_FOG.density).toBeGreaterThanOrEqual(0.005);
    expect(SCENE_FOG.density).toBeLessThanOrEqual(0.02);
  });
});

describe('BLOOM_CONFIG', () => {
  it('has positive intensity', () => {
    expect(BLOOM_CONFIG.intensity).toBeGreaterThan(0);
  });
  it('has luminanceThreshold in valid range', () => {
    expect(BLOOM_CONFIG.luminanceThreshold).toBeGreaterThan(0);
    expect(BLOOM_CONFIG.luminanceThreshold).toBeLessThan(1);
  });
});

describe('VIGNETTE_CONFIG', () => {
  it('has darkness between 0 and 1', () => {
    expect(VIGNETTE_CONFIG.darkness).toBeGreaterThan(0);
    expect(VIGNETTE_CONFIG.darkness).toBeLessThanOrEqual(1);
  });
});

describe('CHROMATIC_ABERRATION_CONFIG', () => {
  it('has small offset values for subtle effect', () => {
    expect(CHROMATIC_ABERRATION_CONFIG.offset[0]).toBeLessThan(0.01);
    expect(CHROMATIC_ABERRATION_CONFIG.offset[1]).toBeLessThan(0.01);
  });
});

describe('NOISE_CONFIG', () => {
  it('has low opacity for subtle film grain', () => {
    expect(NOISE_CONFIG.opacity).toBeGreaterThan(0);
    expect(NOISE_CONFIG.opacity).toBeLessThanOrEqual(0.15);
  });
});

describe('M4 atmosphere constants', () => {
  it('should export GROUND_FOG_CONFIG', () => {
    expect(GROUND_FOG_CONFIG.opacity).toBe(0.1);
    expect(GROUND_FOG_CONFIG.driftSpeed).toBe(0.02);
  });

  it('should export HAZE_LAYERS_CONFIG with 3 layers', () => {
    expect(HAZE_LAYERS_CONFIG.layers).toHaveLength(3);
  });

  it('should export GOD_RAYS_CONFIG', () => {
    expect(GOD_RAYS_CONFIG.intensity).toBe(0.3);
    expect(GOD_RAYS_CONFIG.decay).toBe(0.92);
  });

  it('should export PULSE_WAVE_CONFIG', () => {
    expect(PULSE_WAVE_CONFIG.intervalMs).toBe(50000);
  });

  it('should export STATUS_PARTICLES_CONFIG', () => {
    expect(STATUS_PARTICLES_CONFIG.countPerBuilding).toBe(25);
    expect(STATUS_PARTICLES_CONFIG.riseSpeed).toBe(0.3);
  });

  it('should export AMBIENT_ANIMATION_CONFIG', () => {
    expect(AMBIENT_ANIMATION_CONFIG.lightArcDegrees).toBe(5);
  });
});
