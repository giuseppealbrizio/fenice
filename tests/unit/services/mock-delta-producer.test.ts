import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockDeltaProducer } from '../../../src/services/mock-delta-producer.js';
import { WorldWsManager } from '../../../src/ws/world-manager.js';
import { ProjectionService } from '../../../src/services/projection.service.js';
import { WorldDeltaEventSchema } from '../../../src/schemas/world-delta.schema.js';

const OPENAPI_FIXTURE = {
  paths: {
    '/users': {
      get: { tags: ['Users'], summary: 'List users', parameters: [] },
      post: {
        tags: ['Users'],
        summary: 'Create user',
        security: [{ bearer: [] }],
        requestBody: { content: {} },
      },
    },
    '/health': {
      get: { tags: ['Health'], summary: 'Health check' },
    },
  },
};

describe('MockDeltaProducer', () => {
  let manager: WorldWsManager;
  let projection: ProjectionService;
  let producer: MockDeltaProducer;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new WorldWsManager(100, 300_000);
    projection = new ProjectionService();
    projection.buildWorldModel(OPENAPI_FIXTURE);
    producer = new MockDeltaProducer(manager, projection, {
      metricsIntervalMs: 1_000,
      diffIntervalMs: 5_000,
    });
  });

  afterEach(() => {
    producer.stop();
    vi.useRealTimers();
  });

  it('is not running before start', () => {
    expect(producer.isRunning()).toBe(false);
  });

  it('starts and stops cleanly', () => {
    producer.start();
    expect(producer.isRunning()).toBe(true);
    producer.stop();
    expect(producer.isRunning()).toBe(false);
  });

  it('does not start twice (singleton guard)', () => {
    producer.start();
    producer.start(); // should be no-op
    expect(producer.isRunning()).toBe(true);
  });

  it('emits metrics delta events on tick', () => {
    const ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };
    manager.addConnection('u1', ws);
    manager.markSubscribed('u1');

    producer.start();
    vi.advanceTimersByTime(1_000);

    expect(ws.send).toHaveBeenCalled();
    const firstCall = ws.send.mock.calls[0];
    expect(firstCall).toBeDefined();
    const msg = JSON.parse(firstCall[0] as string);
    expect(msg.type).toBe('world.delta');
    expect(msg.events.length).toBeGreaterThan(0);

    // Every event must validate against the schema
    for (const event of msg.events) {
      expect(WorldDeltaEventSchema.safeParse(event).success).toBe(true);
    }
  });

  it('emits only metrics/health events on metrics tick (no CRUD)', () => {
    const ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };
    manager.addConnection('u1', ws);
    manager.markSubscribed('u1');

    producer.start();
    vi.advanceTimersByTime(1_000);

    const firstCall2 = ws.send.mock.calls[0];
    expect(firstCall2).toBeDefined();
    const msg = JSON.parse(firstCall2[0] as string);
    for (const event of msg.events) {
      expect(['endpoint.metrics.updated', 'endpoint.health.updated']).toContain(event.type);
    }
  });

  it('health status is one of healthy/degraded/down', () => {
    const ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };
    manager.addConnection('u1', ws);
    manager.markSubscribed('u1');

    producer.start();
    vi.advanceTimersByTime(10_000);

    for (const call of ws.send.mock.calls) {
      const msg = JSON.parse(call[0] as string);
      for (const event of msg.events) {
        if (event.type === 'endpoint.health.updated') {
          expect(['healthy', 'degraded', 'down']).toContain(event.payload.status);
        }
      }
    }
  });

  it('does not broadcast when no subscribers', () => {
    const ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };
    manager.addConnection('u1', ws);
    // NOT subscribed

    producer.start();
    vi.advanceTimersByTime(1_000);

    expect(ws.send).not.toHaveBeenCalled();
  });
});
