# M4: Atmosphere — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add atmospheric depth, living animations, and material refinement to the FENICE 3D world (dark modes only).

**Architecture:** Incremental enhancement of existing R3F + postprocessing stack. New atmosphere components in `client/src/components/atmosphere/`. Quality toggle via view store. All constants in `client/src/utils/atmosphere.ts`.

**Tech Stack:** React Three Fiber 9, @react-three/postprocessing 3, Three.js 0.173, Zustand 5

**Branch:** `feat/m4-atmosphere`

**Design doc:** `docs/plans/2026-03-01-m4-atmosphere-design.md`

---

### Task 1: Quality Store + Atmosphere Constants

**Files:**
- Modify: `client/src/stores/view.store.ts`
- Modify: `client/src/utils/atmosphere.ts`
- Test: `client/src/__tests__/atmosphere.test.ts`

**Step 1: Add quality state to view store**

In `client/src/stores/view.store.ts`, add:

```typescript
export type QualityLevel = 'high' | 'low';

// Add to ViewState interface:
quality: QualityLevel;
setQuality: (quality: QualityLevel) => void;
toggleQuality: () => void;

// Add to initialViewState:
quality: (localStorage.getItem('fenice-quality') as QualityLevel) ?? 'high',

// Add to store:
setQuality: (quality) => { localStorage.setItem('fenice-quality', quality); set({ quality }); },
toggleQuality: () => set((state) => {
  const next = state.quality === 'high' ? 'low' : 'high';
  localStorage.setItem('fenice-quality', next);
  return { quality: next };
}),
```

**Step 2: Add M4 atmosphere constants**

In `client/src/utils/atmosphere.ts`, add after existing constants:

```typescript
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
```

**Step 3: Update atmosphere test**

In `client/src/__tests__/atmosphere.test.ts`, add tests for the new config objects:

```typescript
describe('M4 atmosphere constants', () => {
  it('should export GROUND_FOG_CONFIG', () => {
    expect(GROUND_FOG_CONFIG.opacity).toBe(0.1);
    expect(GROUND_FOG_CONFIG.driftSpeed).toBe(0.02);
  });

  it('should export HAZE_LAYERS_CONFIG with 3 layers', () => {
    expect(HAZE_LAYERS_CONFIG.layers).toHaveLength(3);
  });

  it('should export PULSE_WAVE_CONFIG', () => {
    expect(PULSE_WAVE_CONFIG.intervalMs).toBe(50000);
  });

  it('should export AMBIENT_ANIMATION_CONFIG', () => {
    expect(AMBIENT_ANIMATION_CONFIG.lightArcDegrees).toBe(5);
  });
});
```

**Step 4: Run tests**

Run: `cd client && npx vitest run`
Expected: All tests pass including new atmosphere config tests.

**Step 5: Commit**

```bash
git add client/src/stores/view.store.ts client/src/utils/atmosphere.ts client/src/__tests__/atmosphere.test.ts
git commit -m "feat(3d): add quality store and M4 atmosphere constants"
```

---

### Task 2: Post-Processing Enhancements (SSAO + DoF)

**Files:**
- Modify: `client/src/components/Scene.tsx`
- Modify: `client/package.json` (if SSAO/DoF not in postprocessing already — check first)

**Step 1: Verify available effects**

Check if SSAO and DepthOfField are available in `@react-three/postprocessing`:

```bash
grep -r "SSAO\|DepthOfField" node_modules/@react-three/postprocessing/dist/ 2>/dev/null | head -5
```

Both should be available — they're part of the postprocessing library.

**Step 2: Update SceneEffects with SSAO and DoF**

In `client/src/components/Scene.tsx`, update the imports:

```typescript
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  SSAO,
  DepthOfField,
} from '@react-three/postprocessing';
```

Add quality store import:

```typescript
import type { QualityLevel } from '../stores/view.store';
```

Update `SceneEffects` to accept quality and add new effects:

```typescript
function SceneEffects({
  isDark,
  isStarChart,
  quality,
}: {
  isDark: boolean;
  isStarChart: boolean;
  quality: QualityLevel;
}): React.JSX.Element | null {
  const bloomIntensity = useCosmosSettingsStore((s) => s.bloomIntensity);
  const bloomThreshold = useCosmosSettingsStore((s) => s.bloomThreshold);

  if (!isDark && !isStarChart) return null;

  if (isStarChart) {
    return (
      <EffectComposer>
        <Vignette offset={0.4} darkness={0.5} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.8}
        mipmapBlur
      />
      {quality === 'high' && (
        <SSAO
          radius={0.5}
          intensity={40}
          luminanceInfluence={0.6}
          color={new THREE.Color('#000000')}
        />
      )}
      {quality === 'high' && (
        <DepthOfField
          focusDistance={0.02}
          focalLength={0.05}
          bokehScale={2}
        />
      )}
      <Vignette offset={VIGNETTE_CONFIG.offset} darkness={VIGNETTE_CONFIG.darkness} />
      <ChromaticAberration
        offset={new THREE.Vector2(...CHROMATIC_ABERRATION_CONFIG.offset)}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={NOISE_CONFIG.opacity} blendFunction={BlendFunction.SOFT_LIGHT} />
    </EffectComposer>
  );
}
```

Update the `Scene` component to pass quality:

```typescript
const quality = useViewStore((s) => s.quality);
// ... later in JSX:
<SceneEffects isDark={isDark} isStarChart={isStarChart} quality={quality} />
```

**Step 3: Run tests and verify no regressions**

Run: `cd client && npx vitest run`
Expected: All existing tests pass.

**Step 4: Commit**

```bash
git add client/src/components/Scene.tsx
git commit -m "feat(3d): add SSAO and depth of field post-processing (M4)"
```

---

### Task 3: Atmospheric Effects — Ground Fog + Haze Layers

**Files:**
- Create: `client/src/components/atmosphere/GroundFog.tsx`
- Create: `client/src/components/atmosphere/HazeLayers.tsx`
- Modify: `client/src/components/Scene.tsx`

**Step 1: Create GroundFog component**

Create `client/src/components/atmosphere/GroundFog.tsx`:

```typescript
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GROUND_FOG_CONFIG } from '../../utils/atmosphere';

export function GroundFog(): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // Create noise-like fog pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const noise = Math.random() * 0.3 + 0.7 * Math.sin(x * 0.05) * Math.cos(y * 0.05);
        const alpha = Math.max(0, Math.min(1, noise * 0.5));
        ctx.fillStyle = `rgba(0, 0, 32, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material;
    if (mat instanceof THREE.MeshBasicMaterial && mat.map) {
      mat.map.offset.x = clock.elapsedTime * GROUND_FOG_CONFIG.driftSpeed * 0.3;
      mat.map.offset.y = clock.elapsedTime * GROUND_FOG_CONFIG.driftSpeed * 0.2;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GROUND_FOG_CONFIG.height, 0]}
    >
      <planeGeometry args={[120, 120]} />
      <meshBasicMaterial
        map={texture}
        color={GROUND_FOG_CONFIG.color}
        transparent
        opacity={GROUND_FOG_CONFIG.opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
```

**Step 2: Create HazeLayers component**

Create `client/src/components/atmosphere/HazeLayers.tsx`:

```typescript
import { useMemo } from 'react';
import * as THREE from 'three';
import { HAZE_LAYERS_CONFIG } from '../../utils/atmosphere';

export function HazeLayers(): React.JSX.Element {
  const layers = useMemo(() => {
    return HAZE_LAYERS_CONFIG.layers.map((layer, i) => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
      );
      gradient.addColorStop(0, `rgba(10, 10, 40, 0.4)`);
      gradient.addColorStop(0.5, `rgba(5, 5, 26, 0.2)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      return { ...layer, texture: new THREE.CanvasTexture(canvas), key: i };
    });
  }, []);

  return (
    <group>
      {layers.map((layer) => (
        <mesh
          key={layer.key}
          position={[0, 10, -layer.z]}
          rotation={[0, 0, 0]}
        >
          <planeGeometry args={[100, 60]} />
          <meshBasicMaterial
            map={layer.texture}
            color={layer.color}
            transparent
            opacity={layer.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
```

**Step 3: Mount in Scene.tsx**

In `client/src/components/Scene.tsx`, import and add to dark mode section:

```typescript
import { GroundFog } from './atmosphere/GroundFog';
import { HazeLayers } from './atmosphere/HazeLayers';

// In JSX, after StarField/Nebulae/DustParticles block, conditionally on quality:
{isDark && !isStarChart && quality === 'high' && !isCosmos && <GroundFog />}
{isDark && !isStarChart && quality === 'high' && <HazeLayers />}
```

**Step 4: Run tests**

Run: `cd client && npx vitest run`

**Step 5: Commit**

```bash
git add client/src/components/atmosphere/GroundFog.tsx client/src/components/atmosphere/HazeLayers.tsx client/src/components/Scene.tsx
git commit -m "feat(3d): add ground fog and haze depth layers (M4)"
```

---

### Task 4: Enhanced Particles (StarField, Nebulae, Dust)

**Files:**
- Modify: `client/src/components/StarField.tsx`
- Modify: `client/src/components/Nebulae.tsx`
- Modify: `client/src/components/DustParticles.tsx`
- Modify: `client/src/utils/atmosphere.ts` (update configs)
- Modify: `client/src/utils/atmosphere-geometry.ts` (star classes)
- Modify: `client/src/components/Scene.tsx` (pass quality)

**Step 1: Update StarField for 3 star classes**

In `client/src/utils/atmosphere-geometry.ts`, add star class generation:

```typescript
export function generateStarClasses(count: number): Float32Array {
  // 0 = small (70%), 1 = medium (25%), 2 = large (5%)
  const classes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    classes[i] = r < 0.7 ? 0 : r < 0.95 ? 1 : 2;
  }
  return classes;
}
```

Update `client/src/components/StarField.tsx` to accept quality prop and use star classes:

- Quality `high`: 3000 stars, 3 classes with different twinkle speeds (small: 2-4s, medium: 6-10s, large: near-fixed)
- Quality `low`: 1500 stars, uniform twinkle (current behavior)

In the `useFrame` callback, vary twinkle speed by class:
```typescript
const classVal = starClasses[i]!;
const speed = classVal === 0 ? 2.5 : classVal === 1 ? 0.6 : 0.15;
const brightness = classVal === 0 ? 0.7 : classVal === 1 ? 0.85 : 1.0;
arr[i] = sizes[i]! * (brightness + (1 - brightness) * Math.sin(t * speed + i * 1.37));
```

**Step 2: Enhance Nebulae with drift and breathing**

In `client/src/components/Nebulae.tsx`:

- Add drift: each sprite moves with `sin(time * 0.01 + offset) * 3` on X/Z
- Add breathing opacity: `baseOpacity * (0.7 + 0.3 * sin(time * 0.05 + offset))`
- Add slow rotation: `sprite.rotation += 0.01 * rotationSpeed * delta`
- For quality `high`: add 2 extra smaller nebulae at greater distance
- For quality `low`: keep 3 original, no drift/breathing

**Step 3: Enhance DustParticles with size variation and trails**

In `client/src/components/DustParticles.tsx`:

- Add individual size variation via `generateStarSizes()` reuse (1-3px range)
- Add individual twinkle per particle (not uniform)
- For quality `high`: add 50 trail particles as a second Points group with smaller size and lower opacity
- For quality `low`: 300 particles, no trails

**Step 4: Update Scene.tsx to pass quality to particle components**

```typescript
<StarField quality={quality} />
<Nebulae quality={quality} />
<DustParticles quality={quality} />
```

**Step 5: Run tests**

Run: `cd client && npx vitest run`

**Step 6: Commit**

```bash
git add client/src/components/StarField.tsx client/src/components/Nebulae.tsx client/src/components/DustParticles.tsx client/src/utils/atmosphere-geometry.ts client/src/components/Scene.tsx
git commit -m "feat(3d): enhance starfield, nebulae, and dust particles (M4)"
```

---

### Task 5: Material Upgrades (Buildings, Roads, Auth Gate)

**Files:**
- Modify: `client/src/components/Building.tsx`
- Modify: `client/src/components/AuthGate.tsx`
- Modify: `client/src/components/Wormhole.tsx`
- Modify: `client/src/components/RoadPolyline.tsx`
- Modify: `client/src/components/District.tsx`
- Modify: `client/src/components/Scene.tsx` (pass quality to City/Cosmos)

**Step 1: Building emissive breathing**

In `client/src/components/Building.tsx`:

- Add `useFrame` + ref for the body mesh
- Animate emissive intensity: `0.1 + 0.08 * sin(time * 0.3 + buildingIndex * 0.5)`
- Accept `buildingIndex` prop (passed from City component's map index)
- On quality `low`: skip animation, keep fixed emissive

**Step 2: Road iridescence**

In `client/src/components/RoadPolyline.tsx`:

- When dark mode, add `iridescence={0.3}` and `iridescenceIOR={1.3}` to the road surface material
- Change `meshStandardMaterial` to `meshPhysicalMaterial` for the road surface only
- Only when quality `high`

**Step 3: Auth Gate crystalline material**

In `client/src/components/AuthGate.tsx`:

- Add `transmission={0.4}`, `thickness={1.5}`, `ior={2.0}` to the octahedron material
- Add `iridescence={0.5}` to the haze sphere (change to meshPhysicalMaterial)
- Only when quality `high`; on `low` keep current material

**Step 4: Wormhole crystalline material**

In `client/src/components/Wormhole.tsx`:

- Same treatment: `transmission`, `thickness`, `ior` on torus ring
- `iridescence` on portal circle material
- Only when quality `high`

**Step 5: District ground grid**

In `client/src/components/District.tsx`:

- Generate a procedural grid texture (lines every 2 units, opacity 0.05) in `useMemo`
- Apply as overlay on the ground plane material
- Only in dark mode and quality `high`

**Step 6: Run tests**

Run: `cd client && npx vitest run`

**Step 7: Commit**

```bash
git add client/src/components/Building.tsx client/src/components/AuthGate.tsx client/src/components/Wormhole.tsx client/src/components/RoadPolyline.tsx client/src/components/District.tsx
git commit -m "feat(3d): upgrade materials — emissive breathing, iridescence, crystalline (M4)"
```

---

### Task 6: Ambient Animations (Light Breathing, Color Drift, Pulse Wave)

**Files:**
- Create: `client/src/components/atmosphere/AmbientLight.tsx`
- Create: `client/src/components/atmosphere/PulseWave.tsx`
- Modify: `client/src/components/Scene.tsx`

**Step 1: Create AmbientLight component with breathing + color drift**

Create `client/src/components/atmosphere/AmbientLight.tsx`:

```typescript
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AMBIENT_ANIMATION_CONFIG, COSMIC_LIGHTING } from '../../utils/atmosphere';

interface Props {
  baseIntensity: number;
}

const coolColor = new THREE.Color(AMBIENT_ANIMATION_CONFIG.colorTempCool);
const warmColor = new THREE.Color(AMBIENT_ANIMATION_CONFIG.colorTempWarm);

export function AnimatedKeyLight({ baseIntensity }: Props): React.JSX.Element {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const basePos = COSMIC_LIGHTING.keyLightPosition;

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const t = clock.elapsedTime;

    // Intensity breathing
    const [minI, maxI] = AMBIENT_ANIMATION_CONFIG.lightIntensityRange;
    const intensity = minI + (maxI - minI) * (0.5 + 0.5 * Math.sin(t * (2 * Math.PI / AMBIENT_ANIMATION_CONFIG.lightBreathPeriod)));
    lightRef.current.intensity = intensity;

    // Arc movement (5 degrees)
    const arc = (AMBIENT_ANIMATION_CONFIG.lightArcDegrees * Math.PI) / 180;
    const swing = Math.sin(t * (2 * Math.PI / AMBIENT_ANIMATION_CONFIG.lightBreathPeriod)) * arc;
    lightRef.current.position.x = basePos[0] * Math.cos(swing);
    lightRef.current.position.z = basePos[2] * Math.cos(swing) + basePos[0] * Math.sin(swing);

    // Color temperature drift
    const colorT = 0.5 + 0.5 * Math.sin(t * (2 * Math.PI / AMBIENT_ANIMATION_CONFIG.colorTempPeriod));
    lightRef.current.color.lerpColors(coolColor, warmColor, colorT);
  });

  return (
    <directionalLight
      ref={lightRef}
      position={basePos}
      intensity={baseIntensity}
      color={AMBIENT_ANIMATION_CONFIG.colorTempCool}
    />
  );
}
```

**Step 2: Create PulseWave component**

Create `client/src/components/atmosphere/PulseWave.tsx`:

This is a logic-only component using `useFrame`. It reads building positions from the world store and temporarily boosts their emissive via a shared ref or Zustand atom.

```typescript
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PULSE_WAVE_CONFIG } from '../../utils/atmosphere';

// Shared state for pulse wave — buildings read this to apply boost
export let pulseWaveRadius = -1;

export function PulseWave(): null {
  const lastPulseRef = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const elapsed = t - lastPulseRef.current;

    if (elapsed > PULSE_WAVE_CONFIG.intervalMs / 1000) {
      lastPulseRef.current = t;
    }

    const pulseAge = t - lastPulseRef.current;
    if (pulseAge < PULSE_WAVE_CONFIG.durationSec) {
      pulseWaveRadius = (pulseAge / PULSE_WAVE_CONFIG.durationSec) * PULSE_WAVE_CONFIG.maxRadius;
    } else {
      pulseWaveRadius = -1;
    }
  });

  return null;
}
```

Update `Building.tsx` emissive breathing to read `pulseWaveRadius` and add boost when the wave passes through:

```typescript
import { pulseWaveRadius } from './atmosphere/PulseWave';

// In useFrame:
const distFromCenter = Math.sqrt(layout.position.x ** 2 + layout.position.z ** 2);
const pulseBoost = pulseWaveRadius > 0 && Math.abs(distFromCenter - pulseWaveRadius) < 2
  ? PULSE_WAVE_CONFIG.emissiveBoost
  : 0;
mat.emissiveIntensity = baseEmissive + pulseBoost;
```

**Step 3: Mount in Scene.tsx**

Replace the static `<directionalLight>` key light with `<AnimatedKeyLight>` in dark mode:

```typescript
import { AnimatedKeyLight } from './atmosphere/AmbientLight';
import { PulseWave } from './atmosphere/PulseWave';

// Replace:
// <directionalLight position={COSMIC_LIGHTING.keyLightPosition} intensity={sceneTheme.keyLight} ... />
// With (dark mode only):
{isDark && !isStarChart && quality === 'high' ? (
  <AnimatedKeyLight baseIntensity={sceneTheme.keyLight} />
) : (
  <directionalLight position={COSMIC_LIGHTING.keyLightPosition} intensity={sceneTheme.keyLight}
    color={isStarChart ? '#6090c0' : isDark ? COSMIC_LIGHTING.keyLightColor : '#ffffff'} />
)}

// Add PulseWave:
{isDark && !isStarChart && quality === 'high' && <PulseWave />}
```

**Step 4: Run tests**

Run: `cd client && npx vitest run`

**Step 5: Commit**

```bash
git add client/src/components/atmosphere/AmbientLight.tsx client/src/components/atmosphere/PulseWave.tsx client/src/components/Scene.tsx client/src/components/Building.tsx
git commit -m "feat(3d): add ambient light breathing, color drift, and pulse wave (M4)"
```

---

### Task 7: Status Particles (Degraded/Blocked Buildings)

**Files:**
- Create: `client/src/components/atmosphere/StatusParticles.tsx`
- Modify: `client/src/components/City.tsx`

**Step 1: Create StatusParticles component**

Create `client/src/components/atmosphere/StatusParticles.tsx`:

A component that receives building positions + link states, and renders rising/fading particles around degraded/blocked buildings.

```typescript
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STATUS_PARTICLES_CONFIG } from '../../utils/atmosphere';
import { LINK_STATE_COLORS } from '../../utils/colors';

interface StatusBuilding {
  position: { x: number; z: number };
  height: number;
  linkState: 'degraded' | 'blocked';
}

interface Props {
  buildings: StatusBuilding[];
}

export function StatusParticles({ buildings }: Props): React.JSX.Element | null {
  const pointsRef = useRef<THREE.Points>(null);
  const count = buildings.length * STATUS_PARTICLES_CONFIG.countPerBuilding;

  const { positions, colors, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const ph = new Float32Array(count);

    let idx = 0;
    for (const building of buildings) {
      const color = new THREE.Color(LINK_STATE_COLORS[building.linkState].hex);
      for (let i = 0; i < STATUS_PARTICLES_CONFIG.countPerBuilding; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.5;
        pos[idx * 3] = building.position.x + Math.cos(angle) * radius;
        pos[idx * 3 + 1] = Math.random() * building.height;
        pos[idx * 3 + 2] = building.position.z + Math.sin(angle) * radius;
        col[idx * 3] = color.r;
        col[idx * 3 + 1] = color.g;
        col[idx * 3 + 2] = color.b;
        ph[idx] = Math.random() * Math.PI * 2;
        idx++;
      }
    }
    return { positions: pos, colors: col, phases: ph };
  }, [buildings, count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position');
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    const t = clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      // Rise and loop
      const y = arr[i * 3 + 1]! + STATUS_PARTICLES_CONFIG.riseSpeed * 0.016;
      arr[i * 3 + 1] = y > STATUS_PARTICLES_CONFIG.maxHeight
        ? 0
        : y;
      // Slight horizontal wobble
      arr[i * 3] += Math.sin(t * 2 + phases[i]!) * 0.002;
    }
    posAttr.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={STATUS_PARTICLES_CONFIG.size}
        sizeAttenuation
        transparent
        opacity={STATUS_PARTICLES_CONFIG.opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
```

**Step 2: Mount in City.tsx**

In `client/src/components/City.tsx`, collect buildings with degraded/blocked state and pass to StatusParticles:

```typescript
import { StatusParticles } from './atmosphere/StatusParticles';

// In JSX, conditionally render:
{quality === 'high' && <StatusParticles buildings={degradedBuildings} />}
```

Where `degradedBuildings` is computed from the world store's endpoint semantics.

**Step 3: Run tests**

Run: `cd client && npx vitest run`

**Step 4: Commit**

```bash
git add client/src/components/atmosphere/StatusParticles.tsx client/src/components/City.tsx
git commit -m "feat(3d): add status particles for degraded/blocked buildings (M4)"
```

---

### Task 8: Quality Toggle UI + Final Integration

**Files:**
- Modify: `client/src/components/Scene.tsx` (final wiring)
- Modify: `client/src/components/HUD.tsx` or create quality toggle component
- Test: run full test suite

**Step 1: Add quality toggle to HUD**

Find the existing HUD/toolbar component (likely in `client/src/components/`) and add a quality toggle button:

```typescript
const quality = useViewStore((s) => s.quality);
const toggleQuality = useViewStore((s) => s.toggleQuality);

// Simple toggle button in the toolbar:
<button onClick={toggleQuality}>
  Quality: {quality.toUpperCase()}
</button>
```

Style it to match the existing toolbar aesthetic.

**Step 2: Final Scene.tsx integration check**

Verify all M4 components are properly gated by quality:
- `high`: SSAO, DoF, GroundFog, HazeLayers, AnimatedKeyLight, PulseWave, StatusParticles, enhanced particles, material upgrades
- `low`: Current behavior (bloom, vignette, CA, noise, basic particles, fixed materials)

**Step 3: Run full test suite**

```bash
cd client && npx vitest run
```

Expected: All tests pass.

**Step 4: Visual smoke test**

```bash
cd client && npm run dev
```

- Toggle quality high/low in the UI
- Verify all effects visible in dark Tron City mode
- Verify effects visible in dark Cosmos mode
- Verify Star Chart mode unchanged
- Verify light mode unchanged
- Check FPS stays above 30 in both quality levels

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(3d): add quality toggle UI and finalize M4 atmosphere integration"
```

---

### Task 9: Final Validation + PR

**Step 1: Run full client test suite**

```bash
cd client && npx vitest run
```

**Step 2: Run full server test suite**

```bash
npm run validate
```

**Step 3: Run client typecheck**

```bash
cd client && npx tsc --noEmit
```

**Step 4: Create PR**

```bash
gh pr create --title "feat(3d): M4 Atmosphere — post-processing, materials, living environment" --body "$(cat <<'EOF'
## Summary

M4 Atmosphere milestone for the FENICE 3D world visualization:

- **Post-processing:** SSAO (contact shadows), Depth of Field (bokeh)
- **Atmospheric effects:** Ground fog, haze depth layers
- **Enhanced particles:** 3-class starfield, drifting nebulae, dust trails
- **Material upgrades:** Emissive breathing, road iridescence, crystalline auth gate/wormhole, district grid
- **Living environment:** Light breathing + color temp drift, periodic pulse wave, status particles
- **Quality toggle:** High/Low profiles with localStorage persistence

Dark modes only (Tron City + Cosmos). Star Chart unchanged.

## Design doc
docs/plans/2026-03-01-m4-atmosphere-design.md

## Test plan
- [ ] All client tests pass (vitest)
- [ ] All server tests pass (npm run validate)
- [ ] Visual smoke test: dark Tron City, dark Cosmos, Star Chart, light mode
- [ ] Quality toggle: high/low switch works, effects properly gated
- [ ] FPS stays above 30 on target hardware

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
