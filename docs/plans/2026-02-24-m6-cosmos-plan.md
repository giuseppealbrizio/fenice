# M6: Cosmos Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the flat Tron City into a navigable 3D cosmic universe where services are glowing stars and endpoints are orbiting planets.

**Architecture:** New `computeCosmosLayout()` replaces `computeCityLayout()` — positions services as stars on concentric rings, endpoints as planets on tilted orbits. New components (ServiceStar, EndpointPlanet, OrbitalPath, CurvedRoute, Wormhole) render the cosmic scene. A Cosmos orchestrator replaces City in Scene.tsx. Camera gains click-to-focus and auto-rotate. All existing types, stores, and semantic logic reused unchanged.

**Tech Stack:** React 19, React Three Fiber 9, Three.js 0.173, @react-three/drei, @react-three/postprocessing (already installed), Zustand 5, Vitest 4, TypeScript strict mode.

**Branch:** `m6-cosmos`

---

## Batch 1: Foundation

### Task 1: Cosmos configuration constants

**Files:**
- Create: `client/src/utils/cosmos.ts`
- Create: `client/src/__tests__/cosmos.test.ts`

**Step 1: Write the tests**

```typescript
// client/src/__tests__/cosmos.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/cosmos.test.ts`
Expected: FAIL (module not found)

**Step 3: Create constants file**

```typescript
// client/src/utils/cosmos.ts

// ─── Seeded random for deterministic layout ─────────────────────────────────

function seededHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

/** Deterministic pseudo-random [0, 1) from a string seed and optional index. */
export function seededRandom(seed: string, index: number = 0): number {
  return (seededHash(seed + ':' + String(index)) % 10000) / 10000;
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export const COSMOS_LAYOUT = {
  innerRingRadius: 15,
  outerRingRadius: 28,
  yVariance: 3,
  minOrbitRadius: 3,
  maxOrbitRadius: 8,
  endpointOrbitGrowth: 0.5,
  orbitTiltRange: 0.3,
} as const;

// ─── Service star ───────────────────────────────────────────────────────────

export const SERVICE_STAR = {
  coreRadius: 1.2,
  glowScale: 6,
  glowOpacity: 0.35,
  coronaScale: 3.5,
  coronaOpacity: 0.15,
  emissiveIntensity: 2.0,
  pulseMin: 0.98,
  pulseMax: 1.02,
  pulseSpeed: 1.5,
  metalness: 0.8,
  roughness: 0.1,
} as const;

// ─── Endpoint planet ────────────────────────────────────────────────────────

export const ENDPOINT_PLANET = {
  minSize: 0.3,
  maxSize: 0.8,
  baseOrbitSpeed: 0.15,
  orbitSpeedVariance: 0.05,
  selfRotationSpeed: 0.003,
  hoverScale: 1.3,
  wireframeOpacity: 0.15,
  emissiveIntensity: 0.3,
  metalness: 0.5,
  roughness: 0.25,
  clearcoat: 0.6,
  clearcoatRoughness: 0.1,
} as const;

export const METHOD_SHAPES = {
  get: 'sphere',
  post: 'icosahedron',
  put: 'torus',
  delete: 'octahedron',
  patch: 'dodecahedron',
} as const;

export type PlanetShape = (typeof METHOD_SHAPES)[keyof typeof METHOD_SHAPES];

// ─── Curved routes ──────────────────────────────────────────────────────────

export const CURVED_ROUTE = {
  tubeRadius: 0.04,
  segments: 48,
  radialSegments: 6,
  opacity: 0.5,
  pulseSpeed: 0.8,
  pulseSize: 0.15,
  archHeight: 3,
} as const;

// ─── Wormhole (auth gate) ───────────────────────────────────────────────────

export const WORMHOLE = {
  ringRadius: 2.5,
  tubeRadius: 0.3,
  ringSegments: 64,
  ringRadialSegments: 16,
  rotationSpeed: 0.5,
  portalRadius: 2.0,
  portalOpacity: 0.15,
  emissiveIntensity: 1.5,
  metalness: 0.7,
  roughness: 0.2,
  clearcoat: 1.0,
} as const;

// ─── Camera navigation ─────────────────────────────────────────────────────

export const CAMERA_NAV = {
  autoRotateSpeed: 0.3,
  autoRotateIdleMs: 5000,
  focusDistance: 8,
  focusLerpSpeed: 0.05,
  minDistance: 2,
  maxDistance: 200,
  defaultPosition: [40, 25, 40] as [number, number, number],
  dampingFactor: 0.05,
} as const;

// ─── Orbital path ───────────────────────────────────────────────────────────

export const ORBITAL_PATH = {
  segments: 96,
  lineWidth: 1,
  opacity: 0.15,
} as const;
```

**Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/__tests__/cosmos.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/utils/cosmos.ts client/src/__tests__/cosmos.test.ts
git commit -m "feat(client): add cosmos configuration constants and seeded random utility"
```

---

### Task 2: Cosmos layout service — types and computation

**Files:**
- Create: `client/src/services/cosmos-layout.service.ts`
- Create: `client/src/__tests__/cosmos-layout.test.ts`

**Step 1: Write the tests**

```typescript
// client/src/__tests__/cosmos-layout.test.ts
import { describe, it, expect } from 'vitest';
import { computeCosmosLayout } from '../services/cosmos-layout.service';
import type { CosmosLayout } from '../services/cosmos-layout.service';
import type { WorldService, WorldEndpoint } from '../types/world';

const SERVICES: WorldService[] = [
  { id: 'auth-svc', tag: 'Auth' },
  { id: 'users-svc', tag: 'Users' },
  { id: 'health-svc', tag: 'Health' },
];

const ENDPOINTS: WorldEndpoint[] = [
  { id: 'ep-login', serviceId: 'auth-svc', method: 'post', path: '/login', summary: 'Login', auth: false, parameters: [] },
  { id: 'ep-signup', serviceId: 'auth-svc', method: 'post', path: '/signup', summary: 'Signup', auth: false, parameters: [] },
  { id: 'ep-me', serviceId: 'users-svc', method: 'get', path: '/me', summary: 'Get me', auth: true, parameters: [] },
  { id: 'ep-update', serviceId: 'users-svc', method: 'patch', path: '/me', summary: 'Update me', auth: true, parameters: [{ name: 'body', in: 'body' }] },
  { id: 'ep-health', serviceId: 'health-svc', method: 'get', path: '/health', summary: 'Health', auth: false, parameters: [] },
];

describe('computeCosmosLayout', () => {
  let layout: CosmosLayout;

  beforeAll(() => {
    layout = computeCosmosLayout(SERVICES, ENDPOINTS);
  });

  it('returns one star per service', () => {
    expect(layout.stars).toHaveLength(3);
    expect(layout.stars.map((s) => s.serviceId).sort()).toEqual(
      ['auth-svc', 'health-svc', 'users-svc']
    );
  });

  it('returns one planet per endpoint', () => {
    expect(layout.planets).toHaveLength(5);
  });

  it('classifies services with auth endpoints as protected-core', () => {
    const usersStar = layout.stars.find((s) => s.serviceId === 'users-svc');
    expect(usersStar?.zone).toBe('protected-core');
  });

  it('classifies services with only public endpoints as public-perimeter', () => {
    const healthStar = layout.stars.find((s) => s.serviceId === 'health-svc');
    expect(healthStar?.zone).toBe('public-perimeter');
  });

  it('places protected stars closer to origin than public ones', () => {
    const protectedStars = layout.stars.filter((s) => s.zone === 'protected-core');
    const publicStars = layout.stars.filter((s) => s.zone === 'public-perimeter');
    for (const p of protectedStars) {
      const pDist = Math.sqrt(p.position.x ** 2 + p.position.z ** 2);
      for (const pub of publicStars) {
        const pubDist = Math.sqrt(pub.position.x ** 2 + pub.position.z ** 2);
        expect(pDist).toBeLessThan(pubDist);
      }
    }
  });

  it('planets reference their parent star position as orbitCenter', () => {
    for (const planet of layout.planets) {
      const parentStar = layout.stars.find((s) => s.serviceId === planet.serviceId);
      expect(parentStar).toBeDefined();
      expect(planet.orbitCenter).toEqual(parentStar!.position);
    }
  });

  it('orbit radius grows with endpoint count', () => {
    const authStar = layout.stars.find((s) => s.serviceId === 'auth-svc')!;
    const healthStar = layout.stars.find((s) => s.serviceId === 'health-svc')!;
    // auth has 2 endpoints, health has 1 — auth orbit should be >= health orbit
    expect(authStar.orbitRadius).toBeGreaterThanOrEqual(healthStar.orbitRadius);
  });

  it('wormhole is at origin', () => {
    expect(layout.wormholePosition).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('is deterministic — same input produces same output', () => {
    const layout2 = computeCosmosLayout(SERVICES, ENDPOINTS);
    expect(layout.stars).toEqual(layout2.stars);
    expect(layout.planets).toEqual(layout2.planets);
  });

  it('planets have orbit phases evenly distributed', () => {
    const authPlanets = layout.planets.filter((p) => p.serviceId === 'auth-svc');
    if (authPlanets.length >= 2) {
      const phases = authPlanets.map((p) => p.orbitPhase);
      const gap = Math.abs(phases[1]! - phases[0]!);
      expect(gap).toBeCloseTo(Math.PI, 0); // 2 planets → ~PI apart
    }
  });

  it('planet sizes are within configured range', () => {
    for (const planet of layout.planets) {
      expect(planet.size).toBeGreaterThanOrEqual(0.3);
      expect(planet.size).toBeLessThanOrEqual(0.8);
    }
  });

  it('handles empty input gracefully', () => {
    const empty = computeCosmosLayout([], []);
    expect(empty.stars).toHaveLength(0);
    expect(empty.planets).toHaveLength(0);
    expect(empty.wormholePosition).toEqual({ x: 0, y: 0, z: 0 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/cosmos-layout.test.ts`
Expected: FAIL (module not found)

**Step 3: Create cosmos layout service**

```typescript
// client/src/services/cosmos-layout.service.ts
import type { WorldService, WorldEndpoint } from '../types/world';
import { COSMOS_LAYOUT, ENDPOINT_PLANET, seededRandom } from '../utils/cosmos';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CosmosPosition {
  x: number;
  y: number;
  z: number;
}

export interface ServiceStarLayout {
  serviceId: string;
  tag: string;
  zone: 'protected-core' | 'public-perimeter';
  position: CosmosPosition;
  orbitRadius: number;
}

export interface EndpointPlanetLayout {
  endpointId: string;
  serviceId: string;
  orbitCenter: CosmosPosition;
  orbitRadius: number;
  orbitSpeed: number;
  orbitTilt: number;
  orbitPhase: number;
  size: number;
}

export interface CosmosLayout {
  stars: ServiceStarLayout[];
  planets: EndpointPlanetLayout[];
  wormholePosition: CosmosPosition;
}

// ─── Computation ────────────────────────────────────────────────────────────

export function computeCosmosLayout(
  services: WorldService[],
  endpoints: WorldEndpoint[],
): CosmosLayout {
  if (services.length === 0) {
    return { stars: [], planets: [], wormholePosition: { x: 0, y: 0, z: 0 } };
  }

  // Group endpoints by service
  const endpointsByService = new Map<string, WorldEndpoint[]>();
  for (const ep of endpoints) {
    const list = endpointsByService.get(ep.serviceId) ?? [];
    list.push(ep);
    endpointsByService.set(ep.serviceId, list);
  }

  // Classify: a service is protected if ANY of its endpoints requires auth
  const protectedIds = new Set<string>();
  for (const ep of endpoints) {
    if (ep.auth) protectedIds.add(ep.serviceId);
  }

  const protectedServices = services.filter((s) => protectedIds.has(s.id));
  const publicServices = services.filter((s) => !protectedIds.has(s.id));

  const stars: ServiceStarLayout[] = [];

  // Place protected services on inner ring
  placeServicesOnRing(
    protectedServices,
    COSMOS_LAYOUT.innerRingRadius,
    'protected-core',
    endpointsByService,
    stars,
  );

  // Place public services on outer ring
  placeServicesOnRing(
    publicServices,
    COSMOS_LAYOUT.outerRingRadius,
    'public-perimeter',
    endpointsByService,
    stars,
  );

  // Place endpoint planets
  const planets: EndpointPlanetLayout[] = [];
  for (const star of stars) {
    const serviceEndpoints = endpointsByService.get(star.serviceId) ?? [];
    const tilt =
      (seededRandom(star.serviceId, 1) - 0.5) * COSMOS_LAYOUT.orbitTiltRange * 2;

    serviceEndpoints.forEach((ep, i) => {
      const phase =
        (i / Math.max(serviceEndpoints.length, 1)) * Math.PI * 2;
      const speed =
        ENDPOINT_PLANET.baseOrbitSpeed +
        (seededRandom(ep.id, 0) - 0.5) * ENDPOINT_PLANET.orbitSpeedVariance * 2;
      const paramCount = ep.parameters.length;
      const sizeRange = ENDPOINT_PLANET.maxSize - ENDPOINT_PLANET.minSize;
      const size = Math.min(
        ENDPOINT_PLANET.minSize + (paramCount / 10) * sizeRange,
        ENDPOINT_PLANET.maxSize,
      );

      planets.push({
        endpointId: ep.id,
        serviceId: star.serviceId,
        orbitCenter: star.position,
        orbitRadius: star.orbitRadius,
        orbitSpeed: speed,
        orbitTilt: tilt,
        orbitPhase: phase,
        size,
      });
    });
  }

  return {
    stars,
    planets,
    wormholePosition: { x: 0, y: 0, z: 0 },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function placeServicesOnRing(
  services: WorldService[],
  ringRadius: number,
  zone: 'protected-core' | 'public-perimeter',
  endpointsByService: Map<string, WorldEndpoint[]>,
  out: ServiceStarLayout[],
): void {
  const count = Math.max(services.length, 1);
  services.forEach((service, i) => {
    const angle = (i / count) * Math.PI * 2;
    const yOffset =
      (seededRandom(service.id, 0) - 0.5) * COSMOS_LAYOUT.yVariance * 2;
    const epCount = endpointsByService.get(service.id)?.length ?? 0;
    const orbitRadius = Math.min(
      COSMOS_LAYOUT.minOrbitRadius + epCount * COSMOS_LAYOUT.endpointOrbitGrowth,
      COSMOS_LAYOUT.maxOrbitRadius,
    );

    out.push({
      serviceId: service.id,
      tag: service.tag,
      zone,
      position: {
        x: Math.cos(angle) * ringRadius,
        y: yOffset,
        z: Math.sin(angle) * ringRadius,
      },
      orbitRadius,
    });
  });
}

/** Compute a point on a tilted orbit at a given angle. */
export function computeOrbitPoint(
  center: CosmosPosition,
  radius: number,
  angle: number,
  tilt: number,
): CosmosPosition {
  const xOrbit = Math.cos(angle) * radius;
  const zOrbit = Math.sin(angle) * radius;
  return {
    x: center.x + xOrbit,
    y: center.y + zOrbit * Math.sin(tilt),
    z: center.z + zOrbit * Math.cos(tilt),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/__tests__/cosmos-layout.test.ts`
Expected: PASS

**Step 5: Run typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add client/src/services/cosmos-layout.service.ts client/src/__tests__/cosmos-layout.test.ts
git commit -m "feat(client): add cosmos layout service with orbital placement algorithm"
```

---

## Batch 2: Service Stars

### Task 3: Glow texture factory + ServiceStar component

**Files:**
- Create: `client/src/components/ServiceStar.tsx`

**Step 1: Create the ServiceStar component**

This renders a service as a glowing star: emissive sphere core + glow sprite + label. Pulsing scale animation.

```typescript
// client/src/components/ServiceStar.tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { ServiceStarLayout } from '../services/cosmos-layout.service';
import { SERVICE_STAR } from '../utils/cosmos';
import { METHOD_COLORS } from '../utils/colors';
import { useWorldStore } from '../stores/world.store';

/** Create a procedural radial glow texture. */
function createGlowTexture(color: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  gradient.addColorStop(0, color + '80');
  gradient.addColorStop(0.4, color + '30');
  gradient.addColorStop(0.7, color + '10');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface ServiceStarProps {
  star: ServiceStarLayout;
}

export function ServiceStar({ star }: ServiceStarProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const endpoints = useWorldStore((s) => s.endpoints);

  // Determine star color from the dominant method of its endpoints
  const starColor = useMemo(() => {
    const serviceEps = endpoints.filter((e) => e.serviceId === star.serviceId);
    const method = serviceEps[0]?.method ?? 'get';
    return METHOD_COLORS[method];
  }, [endpoints, star.serviceId]);

  const glowTexture = useMemo(() => createGlowTexture(starColor), [starColor]);

  // Gentle pulse animation
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime * SERVICE_STAR.pulseSpeed;
    const scale =
      SERVICE_STAR.pulseMin +
      ((SERVICE_STAR.pulseMax - SERVICE_STAR.pulseMin) / 2) * (1 + Math.sin(t));
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group
      ref={groupRef}
      position={[star.position.x, star.position.y, star.position.z]}
    >
      {/* Core star sphere */}
      <mesh>
        <sphereGeometry args={[SERVICE_STAR.coreRadius, 32, 32]} />
        <meshPhysicalMaterial
          color={starColor}
          emissive={starColor}
          emissiveIntensity={SERVICE_STAR.emissiveIntensity}
          roughness={SERVICE_STAR.roughness}
          metalness={SERVICE_STAR.metalness}
        />
      </mesh>

      {/* Large glow sprite */}
      <sprite scale={[SERVICE_STAR.glowScale, SERVICE_STAR.glowScale, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={SERVICE_STAR.glowOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* Corona sprite (smaller, brighter) */}
      <sprite scale={[SERVICE_STAR.coronaScale, SERVICE_STAR.coronaScale, 1]}>
        <spriteMaterial
          color={starColor}
          transparent
          opacity={SERVICE_STAR.coronaOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* Point light to illuminate nearby planets */}
      <pointLight color={starColor} intensity={1.0} distance={20} decay={2} />

      {/* Label */}
      <Html center occlude={false} position={[0, SERVICE_STAR.coreRadius + 1.2, 0]}>
        <div
          style={{
            pointerEvents: 'none',
            fontSize: '13px',
            fontWeight: 600,
            color: '#e0f0ff',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
          }}
        >
          {star.tag}
        </div>
      </Html>
    </group>
  );
}
```

**Step 2: Verify typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/ServiceStar.tsx
git commit -m "feat(client): add ServiceStar component with glow, corona, and pulse animation"
```

---

### Task 4: OrbitalPath component

**Files:**
- Create: `client/src/components/OrbitalPath.tsx`

**Step 1: Create the component**

Renders a semi-transparent elliptical ring showing the orbit path of a planet set.

```typescript
// client/src/components/OrbitalPath.tsx
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { CosmosPosition } from '../services/cosmos-layout.service';
import { computeOrbitPoint } from '../services/cosmos-layout.service';
import { ORBITAL_PATH } from '../utils/cosmos';

interface OrbitalPathProps {
  center: CosmosPosition;
  radius: number;
  tilt: number;
  color: string;
}

export function OrbitalPath({
  center,
  radius,
  tilt,
  color,
}: OrbitalPathProps): React.JSX.Element {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= ORBITAL_PATH.segments; i++) {
      const angle = (i / ORBITAL_PATH.segments) * Math.PI * 2;
      const p = computeOrbitPoint(center, radius, angle, tilt);
      pts.push([p.x, p.y, p.z]);
    }
    return pts;
  }, [center, radius, tilt]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={ORBITAL_PATH.lineWidth}
      opacity={ORBITAL_PATH.opacity}
      transparent
    />
  );
}
```

**Step 2: Verify typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/OrbitalPath.tsx
git commit -m "feat(client): add OrbitalPath component for orbit ring visualization"
```

---

## Batch 3: Endpoint Planets

### Task 5: EndpointPlanet component

**Files:**
- Create: `client/src/components/EndpointPlanet.tsx`

**Step 1: Create the component**

Renders an endpoint as a planet: shape determined by HTTP method, orbits its parent star, self-rotates, hover scales, click selects. PBR material with wireframe overlay.

```typescript
// client/src/components/EndpointPlanet.tsx
import { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { EndpointPlanetLayout } from '../services/cosmos-layout.service';
import type { WorldEndpoint } from '../types/world';
import { ENDPOINT_PLANET, METHOD_SHAPES } from '../utils/cosmos';
import { METHOD_COLORS, LINK_STATE_COLORS } from '../utils/colors';
import { useSelectionStore } from '../stores/selection.store';
import { useWorldStore } from '../stores/world.store';
import { useViewStore } from '../stores/view.store';

interface EndpointPlanetProps {
  planet: EndpointPlanetLayout;
  endpoint: WorldEndpoint;
}

function PlanetGeometry({
  method,
  size,
}: {
  method: WorldEndpoint['method'];
  size: number;
}): React.JSX.Element {
  const shape = METHOD_SHAPES[method];
  switch (shape) {
    case 'sphere':
      return <icosahedronGeometry args={[size, 2]} />;
    case 'icosahedron':
      return <icosahedronGeometry args={[size, 0]} />;
    case 'torus':
      return <torusGeometry args={[size, size * 0.4, 12, 24]} />;
    case 'octahedron':
      return <octahedronGeometry args={[size, 0]} />;
    case 'dodecahedron':
      return <dodecahedronGeometry args={[size, 0]} />;
  }
}

export function EndpointPlanet({
  planet,
  endpoint,
}: EndpointPlanetProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const selectedId = useSelectionStore((s) => s.selectedId);
  const setSelected = useSelectionStore((s) => s.setSelected);
  const semantics = useWorldStore((s) => s.endpointSemantics[endpoint.id]);
  const setFocusTarget = useViewStore((s) => s.setFocusTarget);

  const isSelected = selectedId === endpoint.id;
  const methodColor = METHOD_COLORS[endpoint.method];
  const linkStyle = semantics
    ? LINK_STATE_COLORS[semantics.linkState]
    : LINK_STATE_COLORS.unknown;

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      setSelected(isSelected ? null : endpoint.id);
      // Click-to-focus: camera targets this planet's orbit center
      if (!isSelected) {
        setFocusTarget([
          planet.orbitCenter.x,
          planet.orbitCenter.y,
          planet.orbitCenter.z,
        ]);
      }
    },
    [isSelected, endpoint.id, setSelected, setFocusTarget, planet.orbitCenter],
  );

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = 'pointer';
    },
    [],
  );

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  // Orbit + self-rotation animation
  useFrame(({ clock }) => {
    if (!groupRef.current || !meshRef.current) return;
    const t = clock.elapsedTime * planet.orbitSpeed + planet.orbitPhase;

    // Tilted orbit position
    const xOrbit = Math.cos(t) * planet.orbitRadius;
    const zOrbit = Math.sin(t) * planet.orbitRadius;
    groupRef.current.position.set(
      planet.orbitCenter.x + xOrbit,
      planet.orbitCenter.y + zOrbit * Math.sin(planet.orbitTilt),
      planet.orbitCenter.z + zOrbit * Math.cos(planet.orbitTilt),
    );

    // Self-rotation
    meshRef.current.rotation.y += ENDPOINT_PLANET.selfRotationSpeed;

    // Hover scale
    const targetScale = hovered ? ENDPOINT_PLANET.hoverScale : 1;
    const s = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(s, targetScale, 0.1);
    groupRef.current.scale.setScalar(newScale);
  });

  return (
    <group ref={groupRef}>
      {/* Planet body */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <PlanetGeometry method={endpoint.method} size={planet.size} />
        <meshPhysicalMaterial
          color={isSelected ? '#ffffff' : methodColor}
          emissive={methodColor}
          emissiveIntensity={
            isSelected ? 0.6 : ENDPOINT_PLANET.emissiveIntensity
          }
          roughness={ENDPOINT_PLANET.roughness}
          metalness={ENDPOINT_PLANET.metalness}
          clearcoat={ENDPOINT_PLANET.clearcoat}
          clearcoatRoughness={ENDPOINT_PLANET.clearcoatRoughness}
          transparent={linkStyle.opacity < 1}
          opacity={linkStyle.opacity}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh rotation={meshRef.current?.rotation ?? new THREE.Euler()}>
        <PlanetGeometry method={endpoint.method} size={planet.size * 1.02} />
        <meshBasicMaterial
          color={methodColor}
          wireframe
          transparent
          opacity={
            hovered
              ? ENDPOINT_PLANET.wireframeOpacity * 2
              : ENDPOINT_PLANET.wireframeOpacity
          }
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
```

**Step 2: Verify typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS (if `setFocusTarget` doesn't exist yet in view.store, this will fail — see Task 10. If so, temporarily comment out the `setFocusTarget` call and add it in Task 10.)

**IMPORTANT:** If typecheck fails due to missing `setFocusTarget` on view store, add it now to `client/src/stores/view.store.ts`:

Add to the store interface:
```typescript
focusTarget: [number, number, number] | null;
setFocusTarget: (target: [number, number, number] | null) => void;
```

Add to the store creation:
```typescript
focusTarget: null,
setFocusTarget: (target) => set({ focusTarget: target }),
```

**Step 3: Commit**

```bash
git add client/src/components/EndpointPlanet.tsx
# If view.store.ts was modified:
git add client/src/stores/view.store.ts
git commit -m "feat(client): add EndpointPlanet component with orbit animation and method shapes"
```

---

## Batch 4: Routes + Gate

### Task 6: CurvedRoute component

**Files:**
- Create: `client/src/components/CurvedRoute.tsx`

**Step 1: Create the component**

Renders a curved tube between two service star positions with an animated light pulse traveling along the curve.

```typescript
// client/src/components/CurvedRoute.tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CosmosPosition } from '../services/cosmos-layout.service';
import { CURVED_ROUTE } from '../utils/cosmos';

interface CurvedRouteProps {
  from: CosmosPosition;
  to: CosmosPosition;
  color: string;
  opacity?: number | undefined;
}

export function CurvedRoute({
  from,
  to,
  color,
  opacity,
}: CurvedRouteProps): React.JSX.Element {
  const pulseRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    const start = new THREE.Vector3(from.x, from.y, from.z);
    const end = new THREE.Vector3(to.x, to.y, to.z);
    const mid = start.clone().lerp(end, 0.5);
    // Arch the midpoint upward for visual depth
    mid.y += CURVED_ROUTE.archHeight;
    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [from, to]);

  const tubeGeometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        curve,
        CURVED_ROUTE.segments,
        CURVED_ROUTE.tubeRadius,
        CURVED_ROUTE.radialSegments,
        false,
      ),
    [curve],
  );

  // Animate pulse sphere along the curve
  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const t = (clock.elapsedTime * CURVED_ROUTE.pulseSpeed) % 1;
    const point = curve.getPoint(t);
    pulseRef.current.position.copy(point);
  });

  return (
    <group>
      {/* Tube route */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity ?? CURVED_ROUTE.opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Animated pulse */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[CURVED_ROUTE.pulseSize, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
```

**Step 2: Verify typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/CurvedRoute.tsx
git commit -m "feat(client): add CurvedRoute component with tube geometry and pulse animation"
```

---

### Task 7: Wormhole component

**Files:**
- Create: `client/src/components/Wormhole.tsx`

**Step 1: Create the component**

Replaces AuthGate as the central wormhole/portal. Torus ring with emissive material, inner portal circle, rotation animation, state-based pulse.

```typescript
// client/src/components/Wormhole.tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CosmosPosition } from '../services/cosmos-layout.service';
import { useWorldStore } from '../stores/world.store';
import { LINK_STATE_COLORS } from '../utils/colors';
import { WORMHOLE } from '../utils/cosmos';

/** Create a procedural radial portal texture. */
function createPortalTexture(color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  gradient.addColorStop(0, color + '60');
  gradient.addColorStop(0.3, color + '30');
  gradient.addColorStop(0.6, color + '15');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface WormholeProps {
  position: CosmosPosition;
}

export function Wormhole({ position }: WormholeProps): React.JSX.Element {
  const ringRef = useRef<THREE.Mesh>(null);
  const portalRef = useRef<THREE.Mesh>(null);
  const authGate = useWorldStore((s) => s.authGate);
  const linkStyle = LINK_STATE_COLORS[authGate.linkState];

  const portalTexture = useMemo(
    () => createPortalTexture(linkStyle.hex),
    [linkStyle.hex],
  );

  useFrame(({ clock }) => {
    // Ring rotation
    if (ringRef.current) {
      ringRef.current.rotation.x =
        Math.PI / 2 + Math.sin(clock.elapsedTime * 0.3) * 0.1;
      ringRef.current.rotation.z += WORMHOLE.rotationSpeed * 0.01;
    }

    // Portal opacity pulse
    if (portalRef.current) {
      const mat = portalRef.current.material;
      if (mat instanceof THREE.MeshBasicMaterial) {
        mat.opacity = authGate.open
          ? WORMHOLE.portalOpacity + 0.05 * Math.sin(clock.elapsedTime * 2)
          : WORMHOLE.portalOpacity * 0.3;
      }
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Torus ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry
          args={[
            WORMHOLE.ringRadius,
            WORMHOLE.tubeRadius,
            WORMHOLE.ringRadialSegments,
            WORMHOLE.ringSegments,
          ]}
        />
        <meshPhysicalMaterial
          color={linkStyle.hex}
          emissive={linkStyle.hex}
          emissiveIntensity={
            authGate.open
              ? WORMHOLE.emissiveIntensity
              : WORMHOLE.emissiveIntensity * 0.3
          }
          metalness={WORMHOLE.metalness}
          roughness={WORMHOLE.roughness}
          clearcoat={WORMHOLE.clearcoat}
        />
      </mesh>

      {/* Inner portal surface */}
      <mesh ref={portalRef} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[WORMHOLE.portalRadius, 48]} />
        <meshBasicMaterial
          map={portalTexture}
          transparent
          opacity={WORMHOLE.portalOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glow sprite */}
      <sprite scale={[10, 10, 1]}>
        <spriteMaterial
          color={linkStyle.hex}
          transparent
          opacity={authGate.open ? 0.2 : 0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* Point light */}
      <pointLight
        color={linkStyle.hex}
        intensity={authGate.open ? 1.5 : 0.3}
        distance={25}
        decay={2}
      />
    </group>
  );
}
```

**Step 2: Verify typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/Wormhole.tsx
git commit -m "feat(client): add Wormhole component as cosmic auth gate portal"
```

---

## Batch 5: Integration

### Task 8: Cosmos orchestrator component

**Files:**
- Create: `client/src/components/Cosmos.tsx`

**Step 1: Create the Cosmos component**

This is the main orchestrator that replaces City.tsx. It calls `computeCosmosLayout()`, then renders all cosmic components.

```typescript
// client/src/components/Cosmos.tsx
import { useMemo } from 'react';
import { useWorldStore } from '../stores/world.store';
import {
  computeCosmosLayout,
  type CosmosPosition,
} from '../services/cosmos-layout.service';
import { ServiceStar } from './ServiceStar';
import { EndpointPlanet } from './EndpointPlanet';
import { OrbitalPath } from './OrbitalPath';
import { CurvedRoute } from './CurvedRoute';
import { Wormhole } from './Wormhole';
import { METHOD_COLORS, LINK_STATE_COLORS } from '../utils/colors';
import { seededRandom, COSMOS_LAYOUT } from '../utils/cosmos';

interface ServiceRouteKey {
  fromServiceId: string;
  toServiceId: string;
}

export function Cosmos(): React.JSX.Element | null {
  const services = useWorldStore((s) => s.services);
  const endpoints = useWorldStore((s) => s.endpoints);
  const edges = useWorldStore((s) => s.edges);
  const endpointSemantics = useWorldStore((s) => s.endpointSemantics);

  const layout = useMemo(
    () => computeCosmosLayout(services, endpoints),
    [services, endpoints],
  );

  const endpointMap = useMemo(
    () => new Map(endpoints.map((e) => [e.id, e])),
    [endpoints],
  );

  // Build star position lookup
  const starMap = useMemo(
    () => new Map(layout.stars.map((s) => [s.serviceId, s])),
    [layout.stars],
  );

  // Group edges by (sourceService → targetService) for inter-service routes
  const serviceRoutes = useMemo(() => {
    const routeMap = new Map<string, { from: CosmosPosition; to: CosmosPosition; color: string }>();
    for (const edge of edges) {
      const sourceEp = endpointMap.get(edge.sourceId);
      const targetEp = endpointMap.get(edge.targetId);
      if (!sourceEp || !targetEp) continue;
      if (sourceEp.serviceId === targetEp.serviceId) continue; // skip intra-service

      const key = [sourceEp.serviceId, targetEp.serviceId].sort().join('→');
      if (routeMap.has(key)) continue;

      const fromStar = starMap.get(sourceEp.serviceId);
      const toStar = starMap.get(targetEp.serviceId);
      if (!fromStar || !toStar) continue;

      // Route color from worst link state of constituent edges
      const sourceSem = endpointSemantics[sourceEp.id];
      const linkState = sourceSem?.linkState ?? 'unknown';
      const color = LINK_STATE_COLORS[linkState].hex;

      routeMap.set(key, {
        from: fromStar.position,
        to: toStar.position,
        color,
      });
    }
    return [...routeMap.values()];
  }, [edges, endpointMap, starMap, endpointSemantics]);

  // Compute orbit tilts for orbital paths (same tilt as planets)
  const orbitTilts = useMemo(() => {
    const tilts = new Map<string, number>();
    for (const star of layout.stars) {
      tilts.set(
        star.serviceId,
        (seededRandom(star.serviceId, 1) - 0.5) * COSMOS_LAYOUT.orbitTiltRange * 2,
      );
    }
    return tilts;
  }, [layout.stars]);

  if (endpoints.length === 0) return null;

  return (
    <group>
      {/* Wormhole at origin */}
      <Wormhole position={layout.wormholePosition} />

      {/* Service stars */}
      {layout.stars.map((star) => (
        <ServiceStar key={star.serviceId} star={star} />
      ))}

      {/* Orbital paths */}
      {layout.stars.map((star) => {
        const tilt = orbitTilts.get(star.serviceId) ?? 0;
        const serviceEps = endpoints.filter((e) => e.serviceId === star.serviceId);
        if (serviceEps.length === 0) return null;
        const color = METHOD_COLORS[serviceEps[0]!.method];
        return (
          <OrbitalPath
            key={`orbit-${star.serviceId}`}
            center={star.position}
            radius={star.orbitRadius}
            tilt={tilt}
            color={color}
          />
        );
      })}

      {/* Endpoint planets */}
      {layout.planets.map((planet) => {
        const endpoint = endpointMap.get(planet.endpointId);
        if (!endpoint) return null;
        return (
          <EndpointPlanet
            key={planet.endpointId}
            planet={planet}
            endpoint={endpoint}
          />
        );
      })}

      {/* Inter-service curved routes */}
      {serviceRoutes.map((route, i) => (
        <CurvedRoute
          key={`route-${i}`}
          from={route.from}
          to={route.to}
          color={route.color}
        />
      ))}
    </group>
  );
}
```

**Step 2: Verify typecheck**

Run: `cd client && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/Cosmos.tsx
git commit -m "feat(client): add Cosmos orchestrator component with stars, planets, routes"
```

---

### Task 9: Scene integration — swap City for Cosmos + camera updates

**Files:**
- Modify: `client/src/components/Scene.tsx`

**Step 1: Update Scene.tsx**

Read the current Scene.tsx first. Then:

1. Replace `import { City } from './City';` with `import { Cosmos } from './Cosmos';`
2. Replace `<City />` with `<Cosmos />`
3. Update camera default position from current to `CAMERA_NAV.defaultPosition`
4. Add `autoRotate` and `autoRotateSpeed` to OrbitControls
5. Update zoom limits (minDistance, maxDistance)
6. Import CAMERA_NAV from cosmos config

**Key changes in Scene.tsx:**

Replace the City import and usage:
```typescript
// OLD
import { City } from './City';
// NEW
import { Cosmos } from './Cosmos';
```

Replace `<City />` in JSX with `<Cosmos />`.

Update Canvas camera prop:
```tsx
<Canvas
  camera={{
    position: CAMERA_NAV.defaultPosition,
    fov: 60,
    near: 0.1,
    far: 500,
  }}
  // ... existing gl props
>
```

Update OrbitControls:
```tsx
<OrbitControls
  enableDamping
  dampingFactor={CAMERA_NAV.dampingFactor}
  autoRotate
  autoRotateSpeed={CAMERA_NAV.autoRotateSpeed}
  minDistance={CAMERA_NAV.minDistance}
  maxDistance={CAMERA_NAV.maxDistance}
/>
```

Add import:
```typescript
import { CAMERA_NAV } from '../utils/cosmos';
```

**Step 2: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS (all 170+ existing tests still pass)

**Step 3: Commit**

```bash
git add client/src/components/Scene.tsx
git commit -m "feat(client): integrate Cosmos into Scene with orbital camera defaults"
```

---

### Task 10: Click-to-focus camera animation

**Files:**
- Modify: `client/src/stores/view.store.ts`
- Create: `client/src/components/CameraController.tsx`
- Modify: `client/src/components/Scene.tsx`

**Step 1: Update view store (if not already done in Task 5)**

Add `focusTarget` state to view.store.ts:

```typescript
focusTarget: [number, number, number] | null;
setFocusTarget: (target: [number, number, number] | null) => void;
```

In the store creation, add:
```typescript
focusTarget: null,
setFocusTarget: (target) => set({ focusTarget: target }),
```

**Step 2: Create CameraController component**

```typescript
// client/src/components/CameraController.tsx
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewStore } from '../stores/view.store';
import { CAMERA_NAV } from '../utils/cosmos';

/**
 * Smoothly lerps the OrbitControls target toward focusTarget.
 * Must be placed inside Canvas.
 */
export function CameraController(): null {
  const { controls } = useThree();
  const focusTarget = useViewStore((s) => s.focusTarget);
  const lastInteraction = useRef(Date.now());

  useFrame(() => {
    if (!controls || !('target' in controls)) return;
    const orbitControls = controls as unknown as {
      target: THREE.Vector3;
      autoRotate: boolean;
      update: () => void;
    };

    if (focusTarget) {
      const [tx, ty, tz] = focusTarget;
      orbitControls.target.x = THREE.MathUtils.lerp(
        orbitControls.target.x,
        tx,
        CAMERA_NAV.focusLerpSpeed,
      );
      orbitControls.target.y = THREE.MathUtils.lerp(
        orbitControls.target.y,
        ty,
        CAMERA_NAV.focusLerpSpeed,
      );
      orbitControls.target.z = THREE.MathUtils.lerp(
        orbitControls.target.z,
        tz,
        CAMERA_NAV.focusLerpSpeed,
      );
      orbitControls.update();
      lastInteraction.current = Date.now();
    }

    // Enable auto-rotate after idle
    const idle = Date.now() - lastInteraction.current > CAMERA_NAV.autoRotateIdleMs;
    orbitControls.autoRotate = idle;
  });

  return null;
}
```

**Step 3: Mount CameraController in Scene.tsx**

Add import:
```typescript
import { CameraController } from './CameraController';
```

Add inside `<Canvas>`, after `<OrbitControls>`:
```tsx
<CameraController />
```

Also pass `makeDefault` to OrbitControls so `useThree().controls` works:
```tsx
<OrbitControls makeDefault ... />
```

**Step 4: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/stores/view.store.ts client/src/components/CameraController.tsx client/src/components/Scene.tsx
git commit -m "feat(client): add click-to-focus camera with smooth lerp and auto-rotate"
```

---

## Batch 6: Polish + Validation

### Task 11: View store test updates

**Files:**
- Modify: `client/src/__tests__/view.store.test.ts`

**Step 1: Add tests for new focusTarget state**

Add to the existing test file:

```typescript
describe('focusTarget', () => {
  it('defaults to null', () => {
    expect(useViewStore.getState().focusTarget).toBeNull();
  });

  it('setFocusTarget updates state', () => {
    useViewStore.getState().setFocusTarget([10, 5, 10]);
    expect(useViewStore.getState().focusTarget).toEqual([10, 5, 10]);
  });

  it('setFocusTarget(null) clears target', () => {
    useViewStore.getState().setFocusTarget([10, 5, 10]);
    useViewStore.getState().setFocusTarget(null);
    expect(useViewStore.getState().focusTarget).toBeNull();
  });
});
```

**Step 2: Verify tests pass**

Run: `cd client && npm run test`
Expected: PASS (all tests including new ones)

**Step 3: Commit**

```bash
git add client/src/__tests__/view.store.test.ts
git commit -m "test(client): add view store tests for focusTarget state"
```

---

### Task 12: HUD legend updates for cosmos context

**Files:**
- Modify: `client/src/components/HUD.tsx`

**Step 1: Update building guide section**

In HUD.tsx, find the "Building Guide" section and update the text to reflect the cosmos metaphor:

Replace:
```
Building Guide
Body color = HTTP method
Base ring = endpoint link state
Height = parameter complexity
```

With:
```
Planet Guide
Shape = HTTP method
Color = HTTP method
Size = parameter complexity
Glow = endpoint link state
```

Also update the "Corridors" section text:

Replace:
```
Corridors
Radial roads from auth gate to protected services
Road color = worst link state of service endpoints
Flow markers = data flowing through the gate
Gate closed = all corridors blocked (red)
```

With:
```
Routes
Curved routes connect service stars
Route color = link state of connected endpoints
Pulse = data flowing between services
Wormhole closed = routes dimmed
```

These are simple text-only changes to the legend labels.

**Step 2: Verify typecheck + tests**

Run: `cd client && npm run typecheck && npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add client/src/components/HUD.tsx
git commit -m "feat(client): update HUD legend labels for cosmos metaphor"
```

---

### Task 13: Final validation and lint pass

**Files:** None (validation only)

**Step 1: Run full validation**

Run: `cd client && npm run typecheck && npm run lint && npm run test`
Expected: ALL PASS

**Step 2: Build check**

Run: `cd client && npm run build`
Expected: PASS

**Step 3: Commit any lint fixes if needed**

If lint --fix changes anything:
```bash
cd client && npx eslint --fix src/
git add -u
git commit -m "fix(client): lint auto-fixes for M6 cosmos changes"
```

---

## Summary

| Batch | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | T1-T2 | Cosmos constants + layout engine with orbital placement |
| 2 | T3-T4 | ServiceStar (glow, pulse, label) + OrbitalPath rings |
| 3 | T5 | EndpointPlanet (method shapes, orbit animation, hover, selection) |
| 4 | T6-T7 | CurvedRoute (tube + pulse) + Wormhole (auth portal) |
| 5 | T8-T10 | Cosmos orchestrator + Scene integration + click-to-focus camera |
| 6 | T11-T13 | Store tests + HUD updates + final validation |

**Total:** 13 tasks, 6 batches, ~10 commits of feature work.

**New files created:**
- `client/src/utils/cosmos.ts` — Configuration constants
- `client/src/services/cosmos-layout.service.ts` — Orbital layout engine
- `client/src/components/ServiceStar.tsx` — Star component
- `client/src/components/OrbitalPath.tsx` — Orbit ring
- `client/src/components/EndpointPlanet.tsx` — Planet component
- `client/src/components/CurvedRoute.tsx` — Tube route
- `client/src/components/Wormhole.tsx` — Auth gate portal
- `client/src/components/Cosmos.tsx` — Orchestrator
- `client/src/components/CameraController.tsx` — Focus + auto-rotate
- `client/src/__tests__/cosmos.test.ts` — Constants tests
- `client/src/__tests__/cosmos-layout.test.ts` — Layout tests

**Modified files:**
- `client/src/components/Scene.tsx` — Swap City → Cosmos, camera defaults
- `client/src/stores/view.store.ts` — Add focusTarget state
- `client/src/__tests__/view.store.test.ts` — focusTarget tests
- `client/src/components/HUD.tsx` — Legend text updates

**After completion:** All existing tests pass + new cosmos/layout tests. Old City components remain in codebase (not imported, can be cleaned up later). Visual mode toggle still works. Scene is immersive sci-fi cosmos.
