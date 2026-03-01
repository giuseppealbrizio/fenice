// ─── Cosmic palette ─────────────────────────────────────────────────────────

export const COSMIC_PALETTE = {
  bgDeep: '#000008',
  bgNight: '#0a0a2e',
  accentCyan: '#00e5ff',
  accentMagenta: '#ff00aa',
  accentAmber: '#ff8800',
  neutralGlow: '#e0f0ff',
  fogColor: '#000015',
} as const;

export const SCENE_FOG = {
  density: 0.012,
  color: COSMIC_PALETTE.fogColor,
} as const;

export const BLOOM_CONFIG = {
  intensity: 1.0,
  luminanceThreshold: 0.45,
  luminanceSmoothing: 0.8,
  mipmapBlur: true,
} as const;

export const VIGNETTE_CONFIG = {
  offset: 0.3,
  darkness: 0.6,
} as const;

export const CHROMATIC_ABERRATION_CONFIG = {
  offset: [0.0008, 0.0008] as [number, number],
} as const;

export const NOISE_CONFIG = {
  opacity: 0.06,
} as const;

export const STAR_FIELD_CONFIG = {
  count: 3000,
  radius: 150,
  minSize: 0.3,
  maxSize: 2.0,
  twinkleSpeed: 0.8,
  colors: ['#ffffff', '#cce5ff', '#ffe8cc', '#e0f0ff'] as readonly string[],
} as const;

export const NEBULA_CONFIG = {
  count: 3,
  minScale: 40,
  maxScale: 80,
  opacity: 0.04,
  rotationSpeed: 0.0001,
  colors: ['#4a00a0', '#a000c8', '#200060'] as readonly string[],
} as const;

export const DUST_CONFIG = {
  count: 600,
  spread: 60,
  minSize: 0.02,
  maxSize: 0.1,
  driftSpeed: 0.15,
  color: '#e0f0ff',
  opacity: 0.15,
} as const;

export const BUILDING_MATERIAL = {
  metalness: 0.45,
  roughness: 0.3,
  clearcoat: 0.8,
  clearcoatRoughness: 0.1,
  emissiveIntensity: 0.15,
} as const;

export const WIREFRAME_OVERLAY = {
  opacity: 0.12,
  lineWidth: 1,
} as const;

export const DISTRICT_LIGHT = {
  height: 4,
  intensity: 0.5,
  distance: 15,
  decay: 2,
} as const;

export const COSMIC_LIGHTING = {
  ambientIntensity: 0.15,
  ambientColor: '#1a1a3e',
  keyLightIntensity: 0.6,
  keyLightColor: '#e0f0ff',
  keyLightPosition: [15, 25, 15] as [number, number, number],
} as const;

export const SSAO_CONFIG = {
  radius: 0.5,
  intensity: 40,
  luminanceInfluence: 0.6,
} as const;

export const DEPTH_OF_FIELD_CONFIG = {
  focusDistance: 0.02,
  focalLength: 0.05,
  bokehScale: 2,
} as const;

// ─── M4: Atmosphere constants ───────────────────────────────────────────────

export const GROUND_FOG_CONFIG = {
  opacity: 0.1,
  driftSpeed: 0.02,
  color: '#000020',
  height: 0.5,
} as const;

export const HAZE_LAYERS_CONFIG = {
  layers: [
    { z: 40, opacity: 0.06, color: '#000015' },
    { z: 80, opacity: 0.04, color: '#05051a' },
    { z: 120, opacity: 0.03, color: '#0a0a2e' },
  ],
} as const;

export const GOD_RAYS_CONFIG = {
  intensity: 0.3,
  decay: 0.92,
  density: 0.5,
} as const;

export const PULSE_WAVE_CONFIG = {
  intervalMs: 50000,
  durationSec: 3,
  emissiveBoost: 0.1,
  maxRadius: 30,
} as const;

export const STATUS_PARTICLES_CONFIG = {
  countPerBuilding: 25,
  riseSpeed: 0.3,
  maxHeight: 3,
  size: 0.04,
  opacity: 0.6,
} as const;

export const AMBIENT_ANIMATION_CONFIG = {
  lightArcDegrees: 5,
  lightBreathPeriod: 120,
  lightIntensityRange: [0.5, 0.7] as [number, number],
  colorTempCool: '#e0f0ff',
  colorTempWarm: '#f0e8ff',
  colorTempPeriod: 90,
} as const;
