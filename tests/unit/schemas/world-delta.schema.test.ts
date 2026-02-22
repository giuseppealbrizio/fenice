import { describe, it, expect } from 'vitest';
import {
  HealthStatusSchema,
  EndpointMetricsPayloadSchema,
  EndpointHealthPayloadSchema,
  WorldDeltaEventSchema,
} from '../../../src/schemas/world-delta.schema.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validService = { id: 'service:auth', tag: 'Auth', endpointCount: 3 };
const validEndpoint = {
  id: 'endpoint:get:/api/v1/health',
  serviceId: 'service:health',
  path: '/api/v1/health',
  method: 'get' as const,
  summary: 'Health check',
  hasAuth: false,
  parameterCount: 0,
};
const validEdge = {
  id: 'edge:a->b',
  sourceId: 'endpoint:get:/a',
  targetId: 'endpoint:post:/b',
  type: 'same_service' as const,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('World delta event schemas', () => {
  describe('HealthStatusSchema', () => {
    it.each(['healthy', 'degraded', 'down'])('should accept "%s"', (status) => {
      const result = HealthStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });

    it('should reject "unhealthy"', () => {
      const result = HealthStatusSchema.safeParse('unhealthy');
      expect(result.success).toBe(false);
    });
  });

  describe('EndpointMetricsPayloadSchema', () => {
    it('should validate valid metrics', () => {
      const result = EndpointMetricsPayloadSchema.safeParse({
        rps: 120.5,
        p50: 12,
        p95: 95,
        errorRate: 0.02,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative rps', () => {
      const result = EndpointMetricsPayloadSchema.safeParse({
        rps: -1,
        p50: 12,
        p95: 95,
        errorRate: 0.02,
      });
      expect(result.success).toBe(false);
    });

    it('should reject errorRate > 1', () => {
      const result = EndpointMetricsPayloadSchema.safeParse({
        rps: 100,
        p50: 12,
        p95: 95,
        errorRate: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should accept errorRate = 0', () => {
      const result = EndpointMetricsPayloadSchema.safeParse({
        rps: 100,
        p50: 12,
        p95: 95,
        errorRate: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept errorRate = 1', () => {
      const result = EndpointMetricsPayloadSchema.safeParse({
        rps: 100,
        p50: 12,
        p95: 95,
        errorRate: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('EndpointHealthPayloadSchema', () => {
    it('should validate valid health payload', () => {
      const result = EndpointHealthPayloadSchema.safeParse({ status: 'healthy' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid health status', () => {
      const result = EndpointHealthPayloadSchema.safeParse({ status: 'unhealthy' });
      expect(result.success).toBe(false);
    });

    it('should reject missing status', () => {
      const result = EndpointHealthPayloadSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('WorldDeltaEventSchema — all 8 event types', () => {
    it('should validate service.upserted', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'service.upserted',
        entityId: 'service:auth',
        payload: validService,
      });
      expect(result.success).toBe(true);
    });

    it('should validate service.removed', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'service.removed',
        entityId: 'service:auth',
      });
      expect(result.success).toBe(true);
    });

    it('should validate endpoint.upserted', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'endpoint.upserted',
        entityId: 'endpoint:get:/api/v1/health',
        payload: validEndpoint,
      });
      expect(result.success).toBe(true);
    });

    it('should validate endpoint.removed', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'endpoint.removed',
        entityId: 'endpoint:get:/api/v1/health',
      });
      expect(result.success).toBe(true);
    });

    it('should validate edge.upserted', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'edge.upserted',
        entityId: 'edge:a->b',
        payload: validEdge,
      });
      expect(result.success).toBe(true);
    });

    it('should validate edge.removed', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'edge.removed',
        entityId: 'edge:a->b',
      });
      expect(result.success).toBe(true);
    });

    it('should validate endpoint.metrics.updated', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'endpoint.metrics.updated',
        entityId: 'endpoint:get:/api/v1/health',
        payload: { rps: 100, p50: 12, p95: 95, errorRate: 0.01 },
      });
      expect(result.success).toBe(true);
    });

    it('should validate endpoint.health.updated', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'endpoint.health.updated',
        entityId: 'endpoint:get:/api/v1/health',
        payload: { status: 'healthy' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('WorldDeltaEventSchema — rejection cases', () => {
    it('should reject unknown event type', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'service.unknown',
        entityId: 'service:auth',
      });
      expect(result.success).toBe(false);
    });

    it('should reject service.upserted without payload', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'service.upserted',
        entityId: 'service:auth',
      });
      expect(result.success).toBe(false);
    });

    it('should reject service.upserted with empty entityId', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'service.upserted',
        entityId: '',
        payload: validService,
      });
      expect(result.success).toBe(false);
    });

    it('should reject endpoint.metrics.updated with negative rps', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'endpoint.metrics.updated',
        entityId: 'endpoint:get:/api/v1/health',
        payload: { rps: -5, p50: 12, p95: 95, errorRate: 0.01 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject endpoint.metrics.updated with errorRate > 1', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'endpoint.metrics.updated',
        entityId: 'endpoint:get:/api/v1/health',
        payload: { rps: 100, p50: 12, p95: 95, errorRate: 2.0 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject endpoint.health.updated with "unhealthy" status', () => {
      const result = WorldDeltaEventSchema.safeParse({
        type: 'endpoint.health.updated',
        entityId: 'endpoint:get:/api/v1/health',
        payload: { status: 'unhealthy' },
      });
      expect(result.success).toBe(false);
    });
  });
});
