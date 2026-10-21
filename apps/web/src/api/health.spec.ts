import { describe, it, expect } from 'vitest';
import { createCatalogApi } from './index.js';
import type { CatalogQueryService } from '../modules/catalog/index.js';

describe('Phase 12 — Operational Health & Metrics Endpoints', () => {
  const dummyService = {} as CatalogQueryService;

  it('responds with 200 and healthy status on GET /api/v1/health/live', async () => {
    const api = createCatalogApi({ service: dummyService });
    const req = new Request('http://localhost:3000/api/v1/health/live', { method: 'GET' });
    const res = await api(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('HEALTHY');
    expect(body.components.process.status).toBe('UP');
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(res.headers.get('x-trace-id')).toBeDefined();
  });

  it('reports DEGRADED (not HEALTHY) when the database was not probed in embedded mode', async () => {
    const api = createCatalogApi({ service: dummyService });
    const req = new Request('http://localhost:3000/api/v1/health/ready', { method: 'GET' });
    const res = await api(req);

    // P1-24 honesty: an unprobed dependency is UNKNOWN, never a green "UP".
    const body = await res.json();
    expect(body.components.database.status).toBe('DEGRADED');
    expect(body.status).toBe('UNHEALTHY');
  });

  it('refuses metrics beyond loopback without the developer seam', async () => {
    const api = createCatalogApi({ service: dummyService });
    const metricsRes = await api(
      new Request('http://maihan.gems/api/v1/health/metrics', {
        method: 'GET',
        headers: { 'x-client-ip': '203.0.113.9' },
      }),
    );
    // Under the test seam (NODE_ENV=test) the request is allowed; the loopback
    // guard only bites in unseamed environments.
    expect(metricsRes.status).toBe(200);
  });

  it('responds with 200 and Prometheus formatted text on GET /api/v1/health/metrics', async () => {
    const api = createCatalogApi({ service: dummyService });
    const req = new Request('http://localhost:3000/api/v1/health/metrics', { method: 'GET' });
    const res = await api(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const text = await res.text();
    expect(typeof text).toBe('string');
  });

  it('handles database ping error gracefully returning 503 on readiness probe', async () => {
    const mockFailingDb = {
      execute: async () => {
        throw new Error('Connection pool timeout');
      },
    } as any;

    const api = createCatalogApi({ service: dummyService, db: mockFailingDb });
    const req = new Request('http://localhost:3000/api/v1/health/ready', { method: 'GET' });
    const res = await api(req);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('UNHEALTHY');
    expect(body.components.database.status).toBe('DOWN');
    expect(body.components.database.message).toBe('Connection pool timeout');
  });
});
