import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BuilderWorldNotifier,
  extractTagFromPath,
} from '../../../../src/services/builder/world-notifier.js';
import type { WorldWsManager } from '../../../../src/ws/world-manager.js';

const mockBroadcastDelta = vi.fn().mockReturnValue({ seq: 1, ts: new Date().toISOString() });

function createMockWsManager(): WorldWsManager {
  return {
    broadcastDelta: mockBroadcastDelta,
    broadcastToSubscribed: vi.fn(),
    addConnection: vi.fn(),
    removeConnection: vi.fn(),
    isConnected: vi.fn(),
    getConnection: vi.fn(),
    isCurrentConnection: vi.fn(),
    markSubscribed: vi.fn(),
    setWorldModel: vi.fn(),
    getWorldModel: vi.fn(),
    nextSeq: vi.fn(),
    getCurrentSeq: vi.fn(),
    addToBuffer: vi.fn(),
    getBufferedMessagesFrom: vi.fn(),
    getResumeTtlMs: vi.fn(),
    sendTo: vi.fn(),
  } as unknown as WorldWsManager;
}

describe('BuilderWorldNotifier', () => {
  let notifier: BuilderWorldNotifier;

  beforeEach(() => {
    vi.clearAllMocks();
    const mockWsManager = createMockWsManager();
    notifier = new BuilderWorldNotifier(mockWsManager);
  });

  describe('emitProgress', () => {
    it('should broadcast a builder.progress delta event', () => {
      notifier.emitProgress('job-123', 'generating');

      expect(mockBroadcastDelta).toHaveBeenCalledTimes(1);
      const events = mockBroadcastDelta.mock.calls[0]?.[0] as {
        type: string;
        entityId: string;
        payload: Record<string, string>;
      }[];
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('builder.progress');
      expect(events[0]?.entityId).toBe('job-123');
      expect(events[0]?.payload.status).toBe('generating');
      expect(events[0]?.payload.message).toContain('Generating');
    });

    it('should include human-readable message for each status', () => {
      notifier.emitProgress('job-1', 'queued');
      notifier.emitProgress('job-1', 'completed');

      const calls = mockBroadcastDelta.mock.calls;
      const queuedPayload = (calls[0]?.[0] as { payload: Record<string, string> }[])[0]?.payload;
      const completedPayload = (calls[1]?.[0] as { payload: Record<string, string> }[])[0]?.payload;

      expect(queuedPayload?.message).toBe('Job queued');
      expect(completedPayload?.message).toBe('Pipeline completed successfully');
    });
  });

  describe('emitSyntheticDeltas', () => {
    it('should emit service.upserted and endpoint.upserted for route and schema files', () => {
      const files = [
        { path: 'src/routes/product.routes.ts', content: '// routes', action: 'created' as const },
        {
          path: 'src/schemas/product.schema.ts',
          content: '// schema',
          action: 'created' as const,
        },
        {
          path: 'src/models/product.model.ts',
          content: '// model',
          action: 'created' as const,
        },
        {
          path: 'src/services/product.service.ts',
          content: '// service',
          action: 'created' as const,
        },
      ];

      notifier.emitSyntheticDeltas('job-abc', files);

      expect(mockBroadcastDelta).toHaveBeenCalledTimes(1);
      const events = mockBroadcastDelta.mock.calls[0]?.[0] as {
        type: string;
        entityId: string;
      }[];

      // Should have 1 service.upserted + 1 endpoint.upserted (from the schema file)
      const serviceEvents = events.filter((e) => e.type === 'service.upserted');
      const endpointEvents = events.filter((e) => e.type === 'endpoint.upserted');
      expect(serviceEvents).toHaveLength(1);
      expect(endpointEvents).toHaveLength(1);
      expect(serviceEvents[0]?.entityId).toBe('service:product');
    });

    it('should not emit deltas when no route or schema files', () => {
      const files = [
        {
          path: 'src/services/product.service.ts',
          content: '// service',
          action: 'created' as const,
        },
      ];

      notifier.emitSyntheticDeltas('job-xyz', files);

      expect(mockBroadcastDelta).not.toHaveBeenCalled();
    });

    it('should handle multiple services', () => {
      const files = [
        {
          path: 'src/routes/product.routes.ts',
          content: '// routes',
          action: 'created' as const,
        },
        {
          path: 'src/schemas/product.schema.ts',
          content: '// schema',
          action: 'created' as const,
        },
        { path: 'src/routes/order.routes.ts', content: '// routes', action: 'created' as const },
        { path: 'src/schemas/order.schema.ts', content: '// schema', action: 'created' as const },
      ];

      notifier.emitSyntheticDeltas('job-multi', files);

      const events = mockBroadcastDelta.mock.calls[0]?.[0] as { type: string }[];
      const serviceEvents = events.filter((e) => e.type === 'service.upserted');
      const endpointEvents = events.filter((e) => e.type === 'endpoint.upserted');
      expect(serviceEvents).toHaveLength(2);
      expect(endpointEvents).toHaveLength(2);
    });
  });
});

describe('extractTagFromPath', () => {
  it('should extract tag from route files', () => {
    expect(extractTagFromPath('src/routes/product.routes.ts')).toBe('product');
  });

  it('should extract tag from schema files', () => {
    expect(extractTagFromPath('src/schemas/product.schema.ts')).toBe('product');
  });

  it('should extract tag from model files', () => {
    expect(extractTagFromPath('src/models/product.model.ts')).toBe('product');
  });

  it('should extract tag from service files', () => {
    expect(extractTagFromPath('src/services/product.service.ts')).toBe('product');
  });

  it('should return null for non-matching files', () => {
    expect(extractTagFromPath('src/utils/errors.ts')).toBeNull();
    expect(extractTagFromPath('package.json')).toBeNull();
    expect(extractTagFromPath('src/index.ts')).toBeNull();
  });

  it('should handle hyphenated names', () => {
    expect(extractTagFromPath('src/routes/order-item.routes.ts')).toBe('order-item');
  });
});
