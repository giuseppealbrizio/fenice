import type { WorldDeltaEvent } from '../schemas/world-delta.schema.js';
import type { WorldWsManager } from '../ws/world-manager.js';
import type { ProjectionService } from './projection.service.js';
import type { WorldModel } from '../schemas/world.schema.js';

export interface MockDeltaProducerOptions {
  metricsIntervalMs: number;
  diffIntervalMs: number;
}

type HealthStatus = 'healthy' | 'degraded' | 'down';

function randomMetrics(): { rps: number; p50: number; p95: number; errorRate: number } {
  const rps = Math.round(Math.random() * 500);
  const p50 = Math.round(Math.random() * 100);
  const p95 = p50 + Math.round(Math.random() * 200);
  const errorRate = Math.round(Math.random() * 10) / 100; // 0.00 - 0.10
  return { rps, p50, p95, errorRate };
}

function randomHealth(): HealthStatus {
  const roll = Math.random();
  if (roll < 0.8) return 'healthy';
  if (roll < 0.95) return 'degraded';
  return 'down';
}

export class MockDeltaProducer {
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private diffTimer: ReturnType<typeof setInterval> | null = null;
  private previousModel: WorldModel | null = null;
  private fetchSpec: (() => Promise<WorldModel>) | null = null;

  constructor(
    private readonly manager: WorldWsManager,
    private readonly projection: ProjectionService,
    private readonly options: MockDeltaProducerOptions
  ) {}

  isRunning(): boolean {
    return this.metricsTimer !== null;
  }

  start(fetchSpec?: () => Promise<WorldModel>): void {
    if (this.metricsTimer) return; // singleton guard

    this.fetchSpec = fetchSpec ?? null;
    this.previousModel = this.projection.getCachedModel();

    // Metrics/health synthetic generator
    this.metricsTimer = setInterval(() => {
      this.emitMetricsTick();
    }, this.options.metricsIntervalMs);

    // OpenAPI diff poller for CRUD events
    this.diffTimer = setInterval(() => {
      void this.emitDiffTick();
    }, this.options.diffIntervalMs);
  }

  stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    if (this.diffTimer) {
      clearInterval(this.diffTimer);
      this.diffTimer = null;
    }
  }

  private emitMetricsTick(): void {
    const model = this.projection.getCachedModel();
    if (!model) return;

    const events: WorldDeltaEvent[] = [];

    for (const ep of model.endpoints) {
      events.push({
        type: 'endpoint.metrics.updated',
        entityId: ep.id,
        payload: randomMetrics(),
      });
      events.push({
        type: 'endpoint.health.updated',
        entityId: ep.id,
        payload: { status: randomHealth() },
      });
    }

    if (events.length > 0) {
      this.manager.broadcastDelta(events);
    }
  }

  private async emitDiffTick(): Promise<void> {
    if (!this.fetchSpec) return;

    let newModel: WorldModel;
    try {
      newModel = await this.fetchSpec();
    } catch {
      return; // silently skip on fetch failure
    }

    const prev = this.previousModel;
    if (!prev) {
      this.previousModel = newModel;
      return;
    }

    const events: WorldDeltaEvent[] = [];

    // Diff services
    const prevServiceIds = new Set(prev.services.map((s) => s.id));
    const newServiceIds = new Set(newModel.services.map((s) => s.id));

    for (const svc of newModel.services) {
      if (!prevServiceIds.has(svc.id)) {
        events.push({ type: 'service.upserted', entityId: svc.id, payload: svc });
      }
    }
    for (const svc of prev.services) {
      if (!newServiceIds.has(svc.id)) {
        events.push({ type: 'service.removed', entityId: svc.id });
      }
    }

    // Diff endpoints
    const prevEndpointIds = new Set(prev.endpoints.map((e) => e.id));
    const newEndpointIds = new Set(newModel.endpoints.map((e) => e.id));

    for (const ep of newModel.endpoints) {
      if (!prevEndpointIds.has(ep.id)) {
        events.push({ type: 'endpoint.upserted', entityId: ep.id, payload: ep });
      }
    }
    for (const ep of prev.endpoints) {
      if (!newEndpointIds.has(ep.id)) {
        events.push({ type: 'endpoint.removed', entityId: ep.id });
      }
    }

    // Diff edges
    const prevEdgeIds = new Set(prev.edges.map((e) => e.id));
    const newEdgeIds = new Set(newModel.edges.map((e) => e.id));

    for (const edge of newModel.edges) {
      if (!prevEdgeIds.has(edge.id)) {
        events.push({ type: 'edge.upserted', entityId: edge.id, payload: edge });
      }
    }
    for (const edge of prev.edges) {
      if (!newEdgeIds.has(edge.id)) {
        events.push({ type: 'edge.removed', entityId: edge.id });
      }
    }

    if (events.length > 0) {
      this.manager.broadcastDelta(events);
    }

    this.previousModel = newModel;
  }
}
