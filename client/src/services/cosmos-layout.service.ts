import type { WorldService, WorldEndpoint } from '../types/world';
import { COSMOS_LAYOUT, ENDPOINT_PLANET, seededRandom } from '../utils/cosmos';

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Computation ────────────────────────────────────────────────────────────

export function computeCosmosLayout(
  services: WorldService[],
  endpoints: WorldEndpoint[]
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
    if (ep.hasAuth) protectedIds.add(ep.serviceId);
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
    stars
  );

  // Place public services on outer ring
  placeServicesOnRing(
    publicServices,
    COSMOS_LAYOUT.outerRingRadius,
    'public-perimeter',
    endpointsByService,
    stars
  );

  // Place endpoint planets
  const planets: EndpointPlanetLayout[] = [];
  for (const star of stars) {
    const serviceEndpoints = endpointsByService.get(star.serviceId) ?? [];
    const tilt = (seededRandom(star.serviceId, 1) - 0.5) * COSMOS_LAYOUT.orbitTiltRange * 2;

    serviceEndpoints.forEach((ep, i) => {
      const phase = (i / Math.max(serviceEndpoints.length, 1)) * Math.PI * 2;
      const speed =
        ENDPOINT_PLANET.baseOrbitSpeed +
        (seededRandom(ep.id, 0) - 0.5) * ENDPOINT_PLANET.orbitSpeedVariance * 2;
      const paramCount = ep.parameterCount;
      const sizeRange = ENDPOINT_PLANET.maxSize - ENDPOINT_PLANET.minSize;
      const size = Math.min(
        ENDPOINT_PLANET.minSize + (paramCount / 10) * sizeRange,
        ENDPOINT_PLANET.maxSize
      );

      planets.push({
        endpointId: ep.id,
        serviceId: star.serviceId,
        orbitCenter: { ...star.position },
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

// ── Helpers ────────────────────────────────────────────────────────────────

function placeServicesOnRing(
  services: WorldService[],
  ringRadius: number,
  zone: 'protected-core' | 'public-perimeter',
  endpointsByService: Map<string, WorldEndpoint[]>,
  out: ServiceStarLayout[]
): void {
  const count = Math.max(services.length, 1);
  services.forEach((service, i) => {
    const angle = (i / count) * Math.PI * 2;
    const yOffset = (seededRandom(service.id, 0) - 0.5) * COSMOS_LAYOUT.yVariance * 2;
    const epCount = endpointsByService.get(service.id)?.length ?? 0;
    const orbitRadius = Math.min(
      COSMOS_LAYOUT.minOrbitRadius + epCount * COSMOS_LAYOUT.endpointOrbitGrowth,
      COSMOS_LAYOUT.maxOrbitRadius
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
  tilt: number
): CosmosPosition {
  const xOrbit = Math.cos(angle) * radius;
  const zOrbit = Math.sin(angle) * radius;
  return {
    x: center.x + xOrbit,
    y: center.y + zOrbit * Math.sin(tilt),
    z: center.z + zOrbit * Math.cos(tilt),
  };
}
