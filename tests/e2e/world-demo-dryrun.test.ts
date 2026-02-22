/**
 * W1-T11: Demo Dry Run — End-to-End acceptance criteria verification.
 *
 * This test exercises the complete pipeline:
 *   OpenAPI spec → ProjectionService → WorldModel → CityLayout → Acceptance Checks
 *
 * It validates every M1 acceptance criterion that can be verified programmatically:
 *   AC1: 100% endpoint OpenAPI mappati in building visibili
 *   AC2: Nessun crash con OpenAPI valida
 *   AC3: Tempo load iniziale <= 2s (measured as projection + layout time)
 *   AC5: Building metadata includes path, method, summary, auth requirement
 *
 * AC4 (camera/navigation usabile) is a UX criterion verified manually.
 *
 * KPI checks:
 *   KPI1: Build generation success rate >= 99% (we test 100% on fixture)
 *   KPI2: p95 render init <= 1200ms (measured in build time)
 *   KPI3: Errori runtime bloccanti = 0
 */
import { describe, it, expect, vi } from 'vitest';
import { ProjectionService } from '../../src/services/projection.service.js';
import { WorldModelSchema } from '../../src/schemas/world.schema.js';
import { WorldServerMessageSchema } from '../../src/schemas/world-ws.schema.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

/**
 * Realistic OpenAPI spec matching FENICE's own API surface.
 * Covers multiple services, auth, parameters, requestBody.
 */
const FENICE_OPENAPI_FIXTURE = {
  openapi: '3.1.0',
  info: { title: 'FENICE', version: '0.3.0' },
  paths: {
    '/api/v1/health': {
      get: { tags: ['Health'], summary: 'Health check' },
    },
    '/api/v1/health/ready': {
      get: { tags: ['Health'], summary: 'Readiness probe' },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        requestBody: { content: { 'application/json': {} } },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: { content: { 'application/json': {} } },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        security: [{ bearer: [] }],
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh tokens',
        security: [{ bearer: [] }],
      },
    },
    '/api/v1/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email address',
        requestBody: { content: { 'application/json': {} } },
      },
    },
    '/api/v1/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ bearer: [] }],
      },
      patch: {
        tags: ['Users'],
        summary: 'Update current user profile',
        security: [{ bearer: [] }],
        requestBody: { content: { 'application/json': {} } },
      },
    },
    '/api/v1/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users',
        security: [{ bearer: [] }],
        parameters: [
          { name: 'page', in: 'query' },
          { name: 'limit', in: 'query' },
        ],
      },
    },
    '/api/v1/admin/users/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get user by ID',
        security: [{ bearer: [] }],
        parameters: [{ name: 'id', in: 'path' }],
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete user',
        security: [{ bearer: [] }],
        parameters: [{ name: 'id', in: 'path' }],
      },
    },
  },
};

// Count expected endpoints from fixture
function countFixtureEndpoints(): number {
  let count = 0;
  for (const methods of Object.values(FENICE_OPENAPI_FIXTURE.paths)) {
    count += Object.keys(methods).length;
  }
  return count;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('W1-T11 — Demo Dry Run End-to-End', () => {
  const projection = new ProjectionService();

  // ── AC2: No crash on valid OpenAPI ────────────────────────────────────────

  describe('AC2: No crash on valid OpenAPI', () => {
    it('processes FENICE OpenAPI fixture without error', () => {
      expect(() => projection.buildWorldModel(FENICE_OPENAPI_FIXTURE)).not.toThrow();
    });

    it('produces a valid WorldModel', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      const result = WorldModelSchema.safeParse(model);
      expect(result.success).toBe(true);
    });

    it('handles empty paths gracefully', () => {
      const emptySpec = { openapi: '3.1.0', info: { title: 'Empty', version: '1.0.0' }, paths: {} };
      expect(() => projection.buildWorldModel(emptySpec)).not.toThrow();
      const model = projection.buildWorldModel(emptySpec);
      expect(model.services).toHaveLength(0);
      expect(model.endpoints).toHaveLength(0);
      expect(model.edges).toHaveLength(0);
    });

    it('handles missing paths key gracefully', () => {
      const noPathsSpec = { openapi: '3.1.0', info: { title: 'NoPaths', version: '1.0.0' } };
      expect(() => projection.buildWorldModel(noPathsSpec)).not.toThrow();
    });

    it('handles endpoints without tags (uses Untagged)', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'NoTags', version: '1.0.0' },
        paths: { '/test': { get: { summary: 'Test endpoint' } } },
      };
      const model = projection.buildWorldModel(spec);
      expect(model.services).toHaveLength(1);
      const first = model.services[0];
      expect(first).toBeDefined();
      expect(first?.tag).toBe('Untagged');
    });
  });

  // ── AC1: 100% endpoints mapped to buildings ───────────────────────────────

  describe('AC1: 100% endpoints mapped to buildings', () => {
    it('every endpoint in fixture has a corresponding building in WorldModel', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      const expected = countFixtureEndpoints();
      expect(model.endpoints).toHaveLength(expected);
    });

    it('every endpoint ID is unique', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      const ids = model.endpoints.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every endpoint references a valid service', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      const serviceIds = new Set(model.services.map((s) => s.id));
      for (const ep of model.endpoints) {
        expect(serviceIds.has(ep.serviceId)).toBe(true);
      }
    });

    it('layout produces a building for every endpoint', async () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      // Dynamic import to test client code from backend test context
      const { computeCityLayout } = await import('../../client/src/services/layout.service.js');
      const layout = computeCityLayout(model.services, model.endpoints);

      expect(layout.buildings).toHaveLength(model.endpoints.length);

      // Every endpoint has a building
      const buildingEndpointIds = new Set(layout.buildings.map((b) => b.endpointId));
      for (const ep of model.endpoints) {
        expect(buildingEndpointIds.has(ep.id)).toBe(true);
      }
    });

    it('layout produces a district for every service', async () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      const { computeCityLayout } = await import('../../client/src/services/layout.service.js');
      const layout = computeCityLayout(model.services, model.endpoints);

      expect(layout.districts).toHaveLength(model.services.length);

      const districtServiceIds = new Set(layout.districts.map((d) => d.serviceId));
      for (const svc of model.services) {
        expect(districtServiceIds.has(svc.id)).toBe(true);
      }
    });
  });

  // ── AC3/KPI2: Performance ─────────────────────────────────────────────────

  describe('AC3/KPI2: Performance — projection + layout under 2s', () => {
    it('complete pipeline runs under 2 seconds', async () => {
      const { computeCityLayout } = await import('../../client/src/services/layout.service.js');

      const start = performance.now();
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      computeCityLayout(model.services, model.endpoints);
      const elapsed = performance.now() - start;

      // AC3: <= 2000ms, KPI2: p95 <= 1200ms
      expect(elapsed).toBeLessThan(1200);
    });

    it('layout is deterministic (same input → same output)', async () => {
      const { computeCityLayout } = await import('../../client/src/services/layout.service.js');
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);

      const layout1 = computeCityLayout(model.services, model.endpoints);
      const layout2 = computeCityLayout(model.services, model.endpoints);

      expect(layout1).toEqual(layout2);
    });
  });

  // ── AC5: Building metadata includes path, method, summary, auth ───────────

  describe('AC5: Building metadata includes path, method, summary, auth', () => {
    it('every endpoint has non-empty path', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      for (const ep of model.endpoints) {
        expect(ep.path.length).toBeGreaterThan(0);
      }
    });

    it('every endpoint has a valid HTTP method', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
      for (const ep of model.endpoints) {
        expect(validMethods).toContain(ep.method);
      }
    });

    it('every endpoint has summary string (may be empty)', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      for (const ep of model.endpoints) {
        expect(typeof ep.summary).toBe('string');
      }
    });

    it('hasAuth is boolean for every endpoint', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      for (const ep of model.endpoints) {
        expect(typeof ep.hasAuth).toBe('boolean');
      }
    });

    it('auth endpoints are correctly identified', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      // logout, refresh have security; register, login do not
      const logout = model.endpoints.find((e) => e.path === '/api/v1/auth/logout');
      const register = model.endpoints.find((e) => e.path === '/api/v1/auth/register');

      expect(logout?.hasAuth).toBe(true);
      expect(register?.hasAuth).toBe(false);
    });

    it('parameterCount is correctly computed', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      // GET /admin/users has 2 query params → parameterCount = 2
      const listUsers = model.endpoints.find(
        (e) => e.path === '/api/v1/admin/users' && e.method === 'get'
      );
      expect(listUsers?.parameterCount).toBe(2);

      // POST /auth/register has requestBody → parameterCount = 1
      const register = model.endpoints.find(
        (e) => e.path === '/api/v1/auth/register' && e.method === 'post'
      );
      expect(register?.parameterCount).toBe(1);

      // GET /health has no params → parameterCount = 0
      const health = model.endpoints.find((e) => e.path === '/api/v1/health' && e.method === 'get');
      expect(health?.parameterCount).toBe(0);
    });
  });

  // ── KPI1: Build generation success rate ───────────────────────────────────

  describe('KPI1: Build generation success rate >= 99%', () => {
    it('processes fixture 100 times without failure', () => {
      let successes = 0;
      for (let i = 0; i < 100; i++) {
        try {
          const svc = new ProjectionService();
          const model = svc.buildWorldModel(FENICE_OPENAPI_FIXTURE);
          WorldModelSchema.parse(model);
          successes++;
        } catch {
          // Count as failure
        }
      }
      expect(successes).toBe(100);
    });
  });

  // ── KPI3: Zero runtime blocking errors ────────────────────────────────────

  describe('KPI3: Zero runtime blocking errors', () => {
    it('projection + layout + schema validation all succeed', async () => {
      const { computeCityLayout } = await import('../../client/src/services/layout.service.js');

      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      const validModel = WorldModelSchema.safeParse(model);
      expect(validModel.success).toBe(true);

      const layout = computeCityLayout(model.services, model.endpoints);
      expect(layout.buildings.length).toBeGreaterThan(0);
      expect(layout.districts.length).toBeGreaterThan(0);

      // All buildings have valid positions
      for (const b of layout.buildings) {
        expect(Number.isFinite(b.position.x)).toBe(true);
        expect(Number.isFinite(b.position.y)).toBe(true);
        expect(Number.isFinite(b.position.z)).toBe(true);
        expect(b.height).toBeGreaterThan(0);
        expect(b.width).toBeGreaterThan(0);
        expect(b.depth).toBeGreaterThan(0);
      }

      // All districts have valid bounds
      for (const d of layout.districts) {
        expect(d.bounds.maxX).toBeGreaterThan(d.bounds.minX);
        expect(d.bounds.maxZ).toBeGreaterThan(d.bounds.minZ);
      }

      // No two buildings overlap in XZ plane
      for (let i = 0; i < layout.buildings.length; i++) {
        const a = layout.buildings[i];
        if (!a) continue;
        for (let j = i + 1; j < layout.buildings.length; j++) {
          const b = layout.buildings[j];
          if (!b) continue;
          const overlapX =
            a.position.x < b.position.x + b.width && a.position.x + a.width > b.position.x;
          const overlapZ =
            a.position.z < b.position.z + b.depth && a.position.z + a.depth > b.position.z;
          // If both axes overlap, it's a layout bug
          expect(overlapX && overlapZ).toBe(false);
        }
      }
    });
  });

  // ── Edge invariants ───────────────────────────────────────────────────────

  describe('edge invariants', () => {
    it('all edges connect endpoints within the same service', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      const epMap = new Map(model.endpoints.map((e) => [e.id, e]));

      for (const edge of model.edges) {
        const source = epMap.get(edge.sourceId);
        const target = epMap.get(edge.targetId);
        expect(source).toBeDefined();
        expect(target).toBeDefined();
        if (source && target) {
          expect(source.serviceId).toBe(target.serviceId);
        }
        expect(edge.type).toBe('same_service');
      }
    });

    it('expected number of same_service edges', () => {
      const model = projection.buildWorldModel(FENICE_OPENAPI_FIXTURE);
      // Auth: 5 endpoints → C(5,2) = 10 edges
      // Health: 2 endpoints → C(2,2) = 1 edge
      // Users: 2 endpoints → C(2,2) = 1 edge
      // Admin: 3 endpoints → C(3,2) = 3 edges
      // Total: 10 + 1 + 1 + 3 = 15
      expect(model.edges).toHaveLength(15);
    });
  });

  // ── WS protocol flow simulation ───────────────────────────────────────────

  describe('WS protocol full flow simulation', () => {
    it('simulates: connect → subscribe → subscribed → snapshot → ping → pong', async () => {
      const { handleWorldMessage } = await import('../../src/ws/world-handlers.js');
      const { WorldWsManager } = await import('../../src/ws/world-manager.js');
      const { ProjectionService: PS } = await import('../../src/services/projection.service.js');

      const mgr = new WorldWsManager(50, 300_000);
      const proj = new PS();
      const ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };

      const fetchSpec = async () => proj.buildWorldModel(FENICE_OPENAPI_FIXTURE);

      // Step 1: Client connects
      mgr.addConnection('demo-user', ws);

      // Step 2: Client subscribes
      await handleWorldMessage(
        mgr,
        proj,
        'demo-user',
        JSON.stringify({ type: 'world.subscribe' }),
        fetchSpec
      );

      // Verify: subscribed + snapshot sent
      expect(ws.send).toHaveBeenCalledTimes(2);

      const subscribed = JSON.parse(ws.send.mock.calls[0]?.[0] as string) as Record<
        string,
        unknown
      >;
      const snapshot = JSON.parse(ws.send.mock.calls[1]?.[0] as string) as Record<string, unknown>;

      // Both validate
      expect(WorldServerMessageSchema.safeParse(subscribed).success).toBe(true);
      expect(WorldServerMessageSchema.safeParse(snapshot).success).toBe(true);

      expect(subscribed['type']).toBe('world.subscribed');
      expect(subscribed['mode']).toBe('snapshot');
      expect(snapshot['type']).toBe('world.snapshot');
      const snapshotData = snapshot['data'] as { endpoints: unknown[] };
      expect(snapshotData.endpoints.length).toBe(countFixtureEndpoints());

      // Step 3: Client pings
      await handleWorldMessage(
        mgr,
        proj,
        'demo-user',
        JSON.stringify({ type: 'world.ping' }),
        fetchSpec
      );

      // Verify: pong sent
      expect(ws.send).toHaveBeenCalledTimes(3);
      const pong = JSON.parse(ws.send.mock.calls[2]?.[0] as string) as Record<string, unknown>;
      expect(WorldServerMessageSchema.safeParse(pong).success).toBe(true);
      expect(pong['type']).toBe('world.pong');

      // Step 4: Client disconnects
      mgr.removeConnection('demo-user');
      expect(mgr.isConnected('demo-user')).toBe(false);
    });
  });
});
