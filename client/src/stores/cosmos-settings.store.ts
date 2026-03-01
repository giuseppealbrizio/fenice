import { create } from 'zustand';
import {
  COSMOS_LAYOUT,
  SERVICE_STAR,
  ENDPOINT_PLANET,
  CURVED_ROUTE,
  CAMERA_NAV,
} from '../utils/cosmos';
import {
  BLOOM_CONFIG,
  SSAO_CONFIG,
  DEPTH_OF_FIELD_CONFIG,
  GROUND_FOG_CONFIG,
  VIGNETTE_CONFIG,
  NOISE_CONFIG,
  NEBULA_CONFIG,
  DUST_CONFIG,
} from '../utils/atmosphere';

export interface CosmosSettings {
  // Layout
  innerRingRadius: number;
  outerRingRadius: number;
  ySpread: number;
  // Stars
  starCoreRadius: number;
  starEmissiveIntensity: number;
  starGlowScale: number;
  // Planets
  planetMinSize: number;
  planetMaxSize: number;
  orbitSpeed: number;
  // Routes
  routeArchHeight: number;
  routeOpacity: number;
  // Bloom
  bloomIntensity: number;
  bloomThreshold: number;
  // M4: Post-processing
  ssaoIntensity: number;
  ssaoRadius: number;
  dofBokehScale: number;
  dofFocusDistance: number;
  vignetteDarkness: number;
  noiseOpacity: number;
  // M4: Atmosphere
  fogOpacity: number;
  hazeOpacity: number;
  nebulaOpacity: number;
  dustOpacity: number;
  // Camera
  autoRotateSpeed: number;
  cameraDamping: number;
}

interface CosmosSettingsState extends CosmosSettings {
  set: (partial: Partial<CosmosSettings>) => void;
  resetDefaults: () => void;
}

const DEFAULTS: CosmosSettings = {
  innerRingRadius: COSMOS_LAYOUT.innerRingRadius,
  outerRingRadius: COSMOS_LAYOUT.outerRingRadius,
  ySpread: COSMOS_LAYOUT.yVariance,
  starCoreRadius: SERVICE_STAR.coreRadius,
  starEmissiveIntensity: SERVICE_STAR.emissiveIntensity,
  starGlowScale: SERVICE_STAR.glowScale,
  planetMinSize: ENDPOINT_PLANET.minSize,
  planetMaxSize: ENDPOINT_PLANET.maxSize,
  orbitSpeed: ENDPOINT_PLANET.baseOrbitSpeed,
  routeArchHeight: CURVED_ROUTE.archHeight,
  routeOpacity: CURVED_ROUTE.opacity,
  bloomIntensity: BLOOM_CONFIG.intensity,
  bloomThreshold: BLOOM_CONFIG.luminanceThreshold,
  // M4: Post-processing
  ssaoIntensity: SSAO_CONFIG.intensity,
  ssaoRadius: SSAO_CONFIG.radius,
  dofBokehScale: DEPTH_OF_FIELD_CONFIG.bokehScale,
  dofFocusDistance: DEPTH_OF_FIELD_CONFIG.focusDistance,
  vignetteDarkness: VIGNETTE_CONFIG.darkness,
  noiseOpacity: NOISE_CONFIG.opacity,
  // M4: Atmosphere
  fogOpacity: GROUND_FOG_CONFIG.opacity,
  hazeOpacity: 1.0,
  nebulaOpacity: NEBULA_CONFIG.opacity,
  dustOpacity: DUST_CONFIG.opacity,
  // Camera
  autoRotateSpeed: CAMERA_NAV.autoRotateSpeed,
  cameraDamping: CAMERA_NAV.dampingFactor,
};

export const COSMOS_DEFAULTS = DEFAULTS;

export const useCosmosSettingsStore = create<CosmosSettingsState>((set) => ({
  ...DEFAULTS,
  set: (partial) => set(partial),
  resetDefaults: () => set(DEFAULTS),
}));
