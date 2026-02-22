/**
 * Client-side delta event types.
 * Mirrors backend Zod schemas in src/schemas/world-delta.schema.ts.
 */

import type { WorldService, WorldEndpoint, WorldEdge } from './world';

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface EndpointMetrics {
  rps: number;
  p50: number;
  p95: number;
  errorRate: number;
}

export interface EndpointHealth {
  status: HealthStatus;
}

export type WorldDeltaEvent =
  | { type: 'service.upserted'; entityId: string; payload: WorldService }
  | { type: 'service.removed'; entityId: string }
  | { type: 'endpoint.upserted'; entityId: string; payload: WorldEndpoint }
  | { type: 'endpoint.removed'; entityId: string }
  | { type: 'edge.upserted'; entityId: string; payload: WorldEdge }
  | { type: 'edge.removed'; entityId: string }
  | { type: 'endpoint.metrics.updated'; entityId: string; payload: EndpointMetrics }
  | { type: 'endpoint.health.updated'; entityId: string; payload: EndpointHealth };
