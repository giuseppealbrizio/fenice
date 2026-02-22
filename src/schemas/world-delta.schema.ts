import { z } from 'zod';
import { WorldServiceSchema, WorldEndpointSchema, WorldEdgeSchema } from './world.schema.js';

// ─── Health status (aligned M2B) ─────────────────────────────────────────────

export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'down']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// ─── Metrics & health payloads ───────────────────────────────────────────────

export const EndpointMetricsPayloadSchema = z.object({
  rps: z.number().nonnegative(),
  p50: z.number().nonnegative(),
  p95: z.number().nonnegative(),
  errorRate: z.number().min(0).max(1),
});
export type EndpointMetricsPayload = z.infer<typeof EndpointMetricsPayloadSchema>;

export const EndpointHealthPayloadSchema = z.object({
  status: HealthStatusSchema,
});
export type EndpointHealthPayload = z.infer<typeof EndpointHealthPayloadSchema>;

// ─── Event variants ──────────────────────────────────────────────────────────

export const ServiceUpsertedEventSchema = z.object({
  type: z.literal('service.upserted'),
  entityId: z.string().min(1),
  payload: WorldServiceSchema,
});

export const ServiceRemovedEventSchema = z.object({
  type: z.literal('service.removed'),
  entityId: z.string().min(1),
});

export const EndpointUpsertedEventSchema = z.object({
  type: z.literal('endpoint.upserted'),
  entityId: z.string().min(1),
  payload: WorldEndpointSchema,
});

export const EndpointRemovedEventSchema = z.object({
  type: z.literal('endpoint.removed'),
  entityId: z.string().min(1),
});

export const EdgeUpsertedEventSchema = z.object({
  type: z.literal('edge.upserted'),
  entityId: z.string().min(1),
  payload: WorldEdgeSchema,
});

export const EdgeRemovedEventSchema = z.object({
  type: z.literal('edge.removed'),
  entityId: z.string().min(1),
});

export const EndpointMetricsUpdatedEventSchema = z.object({
  type: z.literal('endpoint.metrics.updated'),
  entityId: z.string().min(1),
  payload: EndpointMetricsPayloadSchema,
});

export const EndpointHealthUpdatedEventSchema = z.object({
  type: z.literal('endpoint.health.updated'),
  entityId: z.string().min(1),
  payload: EndpointHealthPayloadSchema,
});

// ─── Discriminated union of all 8 event types ────────────────────────────────

export const WorldDeltaEventSchema = z.discriminatedUnion('type', [
  ServiceUpsertedEventSchema,
  ServiceRemovedEventSchema,
  EndpointUpsertedEventSchema,
  EndpointRemovedEventSchema,
  EdgeUpsertedEventSchema,
  EdgeRemovedEventSchema,
  EndpointMetricsUpdatedEventSchema,
  EndpointHealthUpdatedEventSchema,
]);

export type WorldDeltaEvent = z.infer<typeof WorldDeltaEventSchema>;
