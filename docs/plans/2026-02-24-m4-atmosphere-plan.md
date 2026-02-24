# M4: Atmosphere Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the FENICE 3D world from a flat Tron City into a cinematic sci-fi cosmos — same structure, dramatically better visuals.

**Architecture:** Add a post-processing pipeline (bloom, vignette, fog, chromatic aberration), replace the flat ground with a procedural skybox (stars, nebulae, dust particles), upgrade all materials to PBR with emissive glow, and rebalance lighting for a dark cosmic palette. No structural/logic changes — all existing components keep their behavior.

**Tech Stack:** `@react-three/postprocessing` (bloom, vignette, chromatic aberration, noise), Three.js `FogExp2`, `MeshPhysicalMaterial`, `Points`/`BufferGeometry` for star fields and dust, custom shaders for nebula sprites.

**Branch:** `m4-atmosphere`

**Validation command:** `cd client && npm run typecheck && npm run lint && npm run test`

---

## Batch 1: Dependencies + Cosmic Palette

### Task 1: Install post-processing dependency

**Files:**
- Modify: `client/package.json`

**Step 1: Install `@react-three/postprocessing`**

Run:
```bash
cd client && npm install @react-three/postprocessing
```

**Step 2: Verify installation**

Run:
```bash
cd client && npm run typecheck
```
Expected: PASS (no type errors)

**Step 3: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore(client): add @react-three/postprocessing dependency"
```

---

### Task 2: Define cosmic palette constants

**Files:**
- Create: `client/src/utils/atmosphere.ts`
- Test: `client/src/__tests__/atmosphere.test.ts`

**Step 1: Write the failing test**

```typescript
// client/src/__tests__/atmosphere.test.ts
import { describe, it, expect } from 'vitest';
import {
  COSMIC_PALETTE,
  SCENE_FOG,
  BLOOM_CONFIG,
  VIGNETTE_CONFIG,
  CHROMATIC_ABERRATION_CONFIG,
  NOISE_CONFIG,
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
  it('has intensity > 1 for cinematic bloom', () => {
    expect(BLOOM_CONFIG.intensity).toBeGreaterThanOrEqual(1.0);
  });
  it('has luminanceThreshold < 0.5 to catch emissive elements', () => {
    expect(BLOOM_CONFIG.luminanceThreshold).toBeLessThan(0.5);
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
```

**Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/atmosphere.test.ts`
Expected: FAIL (module not found)

**Step 3: Write the implementation**

```typescript
// client/src/utils/atmosphere.ts

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

// ─── Fog ────────────────────────────────────────────────────────────────────

export const SCENE_FOG = {
  density: 0.012,
  color: COSMIC_PALETTE.fogColor,
} as const;

// ─── Post-processing configs ────────────────────────────────────────────────

export const BLOOM_CONFIG = {
  intensity: 1.4,
  luminanceThreshold: 0.2,
  luminanceSmoothing: 0.9,
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

// ─── Star field config ──────────────────────────────────────────────────────

export const STAR_FIELD_CONFIG = {
  count: 3000,
  radius: 150,
  minSize: 0.3,
  maxSize: 2.0,
  twinkleSpeed: 0.8,
  colors: ['#ffffff', '#cce5ff', '#ffe8cc', '#e0f0ff'] as readonly string[],
} as const;

// ─── Nebula config ──────────────────────────────────────────────────────────

export const NEBULA_CONFIG = {
  count: 3,
  minScale: 40,
  maxScale: 80,
  opacity: 0.04,
  rotationSpeed: 0.0001,
  colors: ['#4a00a0', '#a000c8', '#200060'] as readonly string[],
} as const;

// ─── Dust particles config ──────────────────────────────────────────────────

export const DUST_CONFIG = {
  count: 600,
  spread: 60,
  minSize: 0.05,
  maxSize: 0.25,
  driftSpeed: 0.15,
  color: '#e0f0ff',
  opacity: 0.2,
} as const;

// ─── Material presets ───────────────────────────────────────────────────────

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

// ─── Lighting presets ───────────────────────────────────────────────────────

export const COSMIC_LIGHTING = {
  ambientIntensity: 0.15,
  ambientColor: '#1a1a3e',
  keyLightIntensity: 0.6,
  keyLightColor: '#e0f0ff',
  keyLightPosition: [15, 25, 15] as [number, number, number],
} as const;
```

**Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/__tests__/atmosphere.test.ts`
Expected: PASS

**Step 5: Validate all tests still pass**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 6: Commit**

```bash
git add client/src/utils/atmosphere.ts client/src/__tests__/atmosphere.test.ts
git commit -m "feat(client): add cosmic palette and atmosphere configuration constants"
```

---

## Batch 2: Post-Processing Pipeline + Fog

### Task 3: Add post-processing pipeline to Scene

**Files:**
- Modify: `client/src/components/Scene.tsx`

This is the single highest-impact change — adding bloom, vignette, chromatic aberration, noise, fog, and tone mapping to the Canvas.

**Step 1: Update Scene.tsx**

Replace the entire `Scene.tsx` with:

```typescript
// client/src/components/Scene.tsx
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { City } from './City';
import { useViewStore } from '../stores/view.store';
import {
  COSMIC_PALETTE,
  SCENE_FOG,
  BLOOM_CONFIG,
  VIGNETTE_CONFIG,
  CHROMATIC_ABERRATION_CONFIG,
  NOISE_CONFIG,
  COSMIC_LIGHTING,
} from '../utils/atmosphere';

const SCENE_THEME = {
  dark: {
    canvasBg: COSMIC_PALETTE.bgDeep,
    groundColor: '#050510',
    ambientIntensity: COSMIC_LIGHTING.ambientIntensity,
    keyLight: COSMIC_LIGHTING.keyLightIntensity,
    fillLight: 0.2,
    gridMajor: '#1b2440',
    gridMinor: '#131b33',
  },
  light: {
    canvasBg: '#e9f1ff',
    groundColor: '#dce7fb',
    ambientIntensity: 0.75,
    keyLight: 0.95,
    fillLight: 0.42,
    gridMajor: '#9eb3da',
    gridMinor: '#c6d3ef',
  },
} as const;

function SceneEffects({ isDark }: { isDark: boolean }): React.JSX.Element | null {
  if (!isDark) return null;

  return (
    <EffectComposer>
      <Bloom
        intensity={BLOOM_CONFIG.intensity}
        luminanceThreshold={BLOOM_CONFIG.luminanceThreshold}
        luminanceSmoothing={BLOOM_CONFIG.luminanceSmoothing}
        mipmapBlur={BLOOM_CONFIG.mipmapBlur}
      />
      <Vignette offset={VIGNETTE_CONFIG.offset} darkness={VIGNETTE_CONFIG.darkness} />
      <ChromaticAberration
        offset={new THREE.Vector2(...CHROMATIC_ABERRATION_CONFIG.offset)}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={NOISE_CONFIG.opacity} blendFunction={BlendFunction.SOFT_LIGHT} />
    </EffectComposer>
  );
}

export function Scene(): React.JSX.Element {
  const visualMode = useViewStore((s) => s.visualMode);
  const showGrid = useViewStore((s) => s.showGrid);
  const sceneTheme = SCENE_THEME[visualMode];
  const isDark = visualMode === 'dark';

  return (
    <Canvas
      camera={{ position: [20, 20, 20], fov: 50 }}
      style={{ width: '100%', height: '100%', backgroundColor: sceneTheme.canvasBg }}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
    >
      {isDark && <fogExp2 attach="fog" args={[SCENE_FOG.color, SCENE_FOG.density]} />}
      <ambientLight
        intensity={sceneTheme.ambientIntensity}
        color={isDark ? COSMIC_LIGHTING.ambientColor : '#ffffff'}
      />
      <directionalLight
        position={COSMIC_LIGHTING.keyLightPosition}
        intensity={sceneTheme.keyLight}
        color={isDark ? COSMIC_LIGHTING.keyLightColor : '#ffffff'}
      />
      <directionalLight position={[-10, 15, -10]} intensity={sceneTheme.fillLight} />
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={sceneTheme.groundColor} roughness={1} />
      </mesh>
      {showGrid && (
        <gridHelper
          args={[60, 60, sceneTheme.gridMajor, sceneTheme.gridMinor]}
          position={[0, 0.002, 0]}
        />
      )}
      <City />
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={80}
      />
      <SceneEffects isDark={isDark} />
    </Canvas>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 3: Run all tests**

Run: `cd client && npm run test`
Expected: PASS (Scene is not unit-tested, only visual)

**Step 4: Commit**

```bash
git add client/src/components/Scene.tsx
git commit -m "feat(client): add post-processing pipeline — bloom, vignette, chromatic aberration, fog"
```

---

## Batch 3: Skybox — Stars, Nebulae, Dust

### Task 4: Procedural star field component

**Files:**
- Create: `client/src/components/StarField.tsx`
- Create: `client/src/__tests__/star-field.test.ts`

**Step 1: Write the failing test**

Test that the star field geometry generator produces correct buffer sizes.

```typescript
// client/src/__tests__/star-field.test.ts
import { describe, it, expect } from 'vitest';
import { generateStarPositions, generateStarSizes } from '../utils/atmosphere-geometry';

describe('generateStarPositions', () => {
  it('returns Float32Array with 3 values per star', () => {
    const positions = generateStarPositions(100, 50);
    expect(positions).toBeInstanceOf(Float32Array);
    expect(positions.length).toBe(300); // 100 stars * 3 coords
  });

  it('all positions are within radius', () => {
    const radius = 50;
    const positions = generateStarPositions(100, radius);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]!;
      const y = positions[i + 1]!;
      const z = positions[i + 2]!;
      const dist = Math.sqrt(x * x + y * y + z * z);
      expect(dist).toBeLessThanOrEqual(radius * 1.01); // small tolerance
    }
  });
});

describe('generateStarSizes', () => {
  it('returns Float32Array with 1 value per star', () => {
    const sizes = generateStarSizes(100, 0.3, 2.0);
    expect(sizes).toBeInstanceOf(Float32Array);
    expect(sizes.length).toBe(100);
  });

  it('all sizes within min/max range', () => {
    const sizes = generateStarSizes(100, 0.5, 3.0);
    for (let i = 0; i < sizes.length; i++) {
      expect(sizes[i]).toBeGreaterThanOrEqual(0.5);
      expect(sizes[i]).toBeLessThanOrEqual(3.0);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/star-field.test.ts`
Expected: FAIL (module not found)

**Step 3: Create geometry utility**

```typescript
// client/src/utils/atmosphere-geometry.ts

/**
 * Generate star positions distributed on a sphere surface.
 * Uses Fibonacci sphere for even distribution.
 */
export function generateStarPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const r = radius * (0.8 + 0.2 * Math.random()); // slight radius variation

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  return positions;
}

/**
 * Generate random star sizes within a range.
 */
export function generateStarSizes(count: number, min: number, max: number): Float32Array {
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    sizes[i] = min + Math.random() * (max - min);
  }
  return sizes;
}

/**
 * Generate dust particle positions within a cubic volume.
 */
export function generateDustPositions(count: number, spread: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6; // flatter vertical spread
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  return positions;
}
```

**Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/__tests__/star-field.test.ts`
Expected: PASS

**Step 5: Create StarField component**

```typescript
// client/src/components/StarField.tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STAR_FIELD_CONFIG } from '../utils/atmosphere';
import { generateStarPositions, generateStarSizes } from '../utils/atmosphere-geometry';

export function StarField(): React.JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, sizes, colors } = useMemo(() => {
    const pos = generateStarPositions(STAR_FIELD_CONFIG.count, STAR_FIELD_CONFIG.radius);
    const sz = generateStarSizes(
      STAR_FIELD_CONFIG.count,
      STAR_FIELD_CONFIG.minSize,
      STAR_FIELD_CONFIG.maxSize
    );
    const colorArr = new Float32Array(STAR_FIELD_CONFIG.count * 3);
    const palette = STAR_FIELD_CONFIG.colors.map((hex) => new THREE.Color(hex));
    for (let i = 0; i < STAR_FIELD_CONFIG.count; i++) {
      const c = palette[i % palette.length]!;
      colorArr[i * 3] = c.r;
      colorArr[i * 3 + 1] = c.g;
      colorArr[i * 3 + 2] = c.b;
    }
    return { positions: pos, sizes: sz, colors: colorArr };
  }, []);

  // Twinkle: gently oscillate size attribute
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const sizeAttr = geo.getAttribute('size');
    if (!sizeAttr) return;
    const arr = sizeAttr.array as Float32Array;
    const t = clock.elapsedTime * STAR_FIELD_CONFIG.twinkleSpeed;
    for (let i = 0; i < arr.length; i++) {
      arr[i] = sizes[i]! * (0.7 + 0.3 * Math.sin(t + i * 1.37));
    }
    sizeAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
```

**Step 6: Verify typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add client/src/utils/atmosphere-geometry.ts client/src/__tests__/star-field.test.ts client/src/components/StarField.tsx
git commit -m "feat(client): add procedural star field with twinkling animation"
```

---

### Task 5: Nebula sprites and dust particles

**Files:**
- Create: `client/src/components/Nebulae.tsx`
- Create: `client/src/components/DustParticles.tsx`

**Step 1: Create Nebulae component**

```typescript
// client/src/components/Nebulae.tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { NEBULA_CONFIG } from '../utils/atmosphere';

/** Create a procedural nebula texture on a canvas. */
function createNebulaTexture(color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Radial gradient — bright center fading to transparent edges
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color + '40'); // center, ~25% opacity
  gradient.addColorStop(0.3, color + '20');
  gradient.addColorStop(0.7, color + '08');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface NebulaData {
  position: [number, number, number];
  scale: number;
  rotation: number;
  texture: THREE.CanvasTexture;
  rotationSpeed: number;
}

export function Nebulae(): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);

  const nebulae = useMemo<NebulaData[]>(() => {
    return NEBULA_CONFIG.colors.map((color, i) => {
      const angle = (i / NEBULA_CONFIG.count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 80 + Math.random() * 40;
      return {
        position: [
          Math.cos(angle) * dist,
          (Math.random() - 0.5) * 40,
          Math.sin(angle) * dist,
        ] as [number, number, number],
        scale: NEBULA_CONFIG.minScale + Math.random() * (NEBULA_CONFIG.maxScale - NEBULA_CONFIG.minScale),
        rotation: Math.random() * Math.PI * 2,
        texture: createNebulaTexture(color),
        rotationSpeed: NEBULA_CONFIG.rotationSpeed * (0.8 + Math.random() * 0.4),
      };
    });
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    for (let i = 0; i < groupRef.current.children.length; i++) {
      const child = groupRef.current.children[i];
      if (child) {
        child.rotation.z += nebulae[i]!.rotationSpeed;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {nebulae.map((n, i) => (
        <sprite key={`nebula-${i}`} position={n.position} scale={[n.scale, n.scale, 1]} rotation={[0, 0, n.rotation]}>
          <spriteMaterial
            map={n.texture}
            transparent
            opacity={NEBULA_CONFIG.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}
```

**Step 2: Create DustParticles component**

```typescript
// client/src/components/DustParticles.tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DUST_CONFIG } from '../utils/atmosphere';
import { generateDustPositions } from '../utils/atmosphere-geometry';

export function DustParticles(): React.JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const basePositions = useMemo(
    () => generateDustPositions(DUST_CONFIG.count, DUST_CONFIG.spread),
    []
  );

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute('position');
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    const t = clock.elapsedTime * DUST_CONFIG.driftSpeed;

    for (let i = 0; i < DUST_CONFIG.count; i++) {
      const i3 = i * 3;
      arr[i3] = basePositions[i3]! + Math.sin(t + i * 0.73) * 0.3;
      arr[i3 + 1] = basePositions[i3 + 1]! + Math.cos(t + i * 1.17) * 0.2;
      arr[i3 + 2] = basePositions[i3 + 2]! + Math.sin(t + i * 0.91) * 0.3;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[basePositions.slice(), 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={DUST_CONFIG.color}
        size={DUST_CONFIG.maxSize}
        sizeAttenuation
        transparent
        opacity={DUST_CONFIG.opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
```

**Step 3: Verify typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add client/src/components/Nebulae.tsx client/src/components/DustParticles.tsx
git commit -m "feat(client): add nebula sprites and floating dust particles"
```

---

### Task 6: Mount skybox components in Scene

**Files:**
- Modify: `client/src/components/Scene.tsx`

**Step 1: Add StarField, Nebulae, and DustParticles imports and mount them inside Canvas (dark mode only)**

Add imports at the top:
```typescript
import { StarField } from './StarField';
import { Nebulae } from './Nebulae';
import { DustParticles } from './DustParticles';
```

Inside the `<Canvas>`, after the fog and before the ground plane, add:
```tsx
{isDark && (
  <>
    <StarField />
    <Nebulae />
    <DustParticles />
  </>
)}
```

**Step 2: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/Scene.tsx
git commit -m "feat(client): mount skybox components — stars, nebulae, dust in dark mode"
```

---

## Batch 4: Material Upgrade

### Task 7: Upgrade Building materials to PBR + wireframe overlay

**Files:**
- Modify: `client/src/components/Building.tsx`

**Step 1: Update Building.tsx**

Replace the `meshStandardMaterial` on the building body with `meshPhysicalMaterial` using atmosphere presets. Add a wireframe overlay mesh.

Replace the building body material (lines 58-66):
```tsx
<meshPhysicalMaterial
  color={baseColor}
  emissive={methodColor}
  emissiveIntensity={BUILDING_MATERIAL.emissiveIntensity}
  roughness={BUILDING_MATERIAL.roughness}
  metalness={BUILDING_MATERIAL.metalness}
  clearcoat={BUILDING_MATERIAL.clearcoat}
  clearcoatRoughness={BUILDING_MATERIAL.clearcoatRoughness}
/>
```

Add the import at the top:
```typescript
import { BUILDING_MATERIAL, WIREFRAME_OVERLAY } from '../utils/atmosphere';
```

After the closing `</RoundedBox>`, add a wireframe overlay:
```tsx
{/* Wireframe overlay for sci-fi look */}
<mesh position={[layout.position.x, layout.height / 2, layout.position.z]}>
  <boxGeometry args={[layout.width + 0.02, layout.height + 0.02, layout.depth + 0.02]} />
  <meshBasicMaterial
    color={methodColor}
    wireframe
    transparent
    opacity={WIREFRAME_OVERLAY.opacity}
    depthWrite={false}
  />
</mesh>
```

**Step 2: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/Building.tsx
git commit -m "feat(client): upgrade buildings to PBR materials with wireframe overlay"
```

---

### Task 8: Upgrade District floor materials and accent emissives

**Files:**
- Modify: `client/src/components/District.tsx`

**Step 1: Update District.tsx**

Change the floor material to use emissive for subtle glow in dark mode. Import `useViewStore` is already present.

Replace the floor `meshStandardMaterial` (line 85-90) to add emissive in dark mode:
```tsx
<meshStandardMaterial
  color={floorColor}
  transparent
  opacity={ZONE_LAYOUT_CONFIG[layout.zone].groundOpacity}
  roughness={0.9}
  emissive={visualMode === 'dark' ? floorColor : '#000000'}
  emissiveIntensity={visualMode === 'dark' ? 0.05 : 0}
/>
```

**Step 2: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/District.tsx
git commit -m "feat(client): add emissive glow to district floors in dark mode"
```

---

### Task 9: Upgrade AuthGate materials

**Files:**
- Modify: `client/src/components/AuthGate.tsx`

**Step 1: Update AuthGate material**

Replace the `meshStandardMaterial` on the octahedron (line 83-90) with `meshPhysicalMaterial`:

```tsx
<meshPhysicalMaterial
  color={linkStyle.hex}
  emissive={linkStyle.hex}
  emissiveIntensity={authGate.open ? 0.5 : 0.1}
  roughness={0.2}
  metalness={0.5}
  clearcoat={1.0}
  clearcoatRoughness={0.05}
  transparent
  opacity={authGate.open ? 1.0 : 0.4}
/>
```

**Step 2: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/AuthGate.tsx
git commit -m "feat(client): upgrade AuthGate to PBR material with clearcoat"
```

---

## Batch 5: Lighting + Polish + Final Validation

### Task 10: Add per-district point lights

**Files:**
- Modify: `client/src/components/City.tsx`

**Step 1: Add point lights to City**

Import `METHOD_COLORS` and add point lights per district, tinted by the dominant method color of endpoints in that service. Add this inside the `<group>` in City, after the districts map:

```tsx
{/* Per-district point lights for colored ambient glow */}
{layout.districts.map((d) => {
  const serviceEndpoints = endpoints.filter((e) => e.serviceId === d.serviceId);
  const dominantMethod = serviceEndpoints[0]?.method ?? 'get';
  const lightColor = METHOD_COLORS[dominantMethod];
  return (
    <pointLight
      key={`light-${d.serviceId}`}
      position={[d.center.x, 4, d.center.z]}
      color={lightColor}
      intensity={0.5}
      distance={15}
      decay={2}
    />
  );
})}
```

Add import at top:
```typescript
import { METHOD_COLORS } from '../utils/colors';
```

**Step 2: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/City.tsx
git commit -m "feat(client): add per-district point lights for colored ambient glow"
```

---

### Task 11: Update HUD palette for cosmic theme

**Files:**
- Modify: `client/src/components/HUD.tsx`

**Step 1: Read HUD.tsx to understand current styling**

Read the file first to identify style constants that need cosmic palette treatment.

**Step 2: Update background colors**

Replace any flat gray backgrounds (`rgba(0,0,0,...`) with cosmic palette-aligned values. The HUD panel backgrounds should use `rgba(0,0,8,0.85)` (bgDeep with alpha) and borders should use `rgba(0,229,255,0.2)` (accentCyan with alpha).

This is a targeted search-and-replace on the style objects — change backgrounds and borders to match the cosmic palette. Do not change layout or logic.

**Step 3: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 4: Commit**

```bash
git add client/src/components/HUD.tsx
git commit -m "feat(client): align HUD styling with cosmic palette"
```

---

### Task 12: Final validation and lint pass

**Files:** None (validation only)

**Step 1: Run full validation**

Run: `cd client && npm run typecheck && npm run lint && npm run test`
Expected: ALL PASS

**Step 2: Build check**

Run: `cd client && npm run build`
Expected: PASS (verify bundle builds cleanly)

**Step 3: Commit any lint fixes if needed**

If lint:fix changes anything:
```bash
cd client && npm run lint -- --fix
git add -u
git commit -m "fix(client): lint auto-fixes for M4 atmosphere changes"
```

---

## Summary

| Batch | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | T1-T2 | Dependencies + cosmic palette constants |
| 2 | T3 | Post-processing pipeline (bloom, vignette, CA, noise, fog, ACES) |
| 3 | T4-T6 | Skybox: stars, nebulae, dust particles |
| 4 | T7-T9 | PBR materials on buildings, districts, auth gate |
| 5 | T10-T12 | Per-district lighting, HUD palette, final validation |

**Total:** 12 tasks, 5 batches, ~6 commits of feature work.

**After completion:** All existing 159 client tests pass + new atmosphere tests. Visual mode toggle still works (effects only apply in dark mode). No structural/logic changes to existing components.
