/**
 * Task 9 — the node adapter over REAL HTTP.
 *
 * The one property only a real socket can prove: the rate-limit bucket
 * identity is the SOCKET address set by the adapter (`x-client-ip`), never a
 * client-supplied header. Two requests with two different spoofed
 * `x-client-ip` headers share one bucket; the third request from the same
 * socket is rejected 429 with Retry-After.
 *
 * The per-IP/bucket/window matrix itself lives in limiter.spec.ts (pure,
 * deterministic); this file covers the transport edge only.
 */
import { afterAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createNodeServer } from './server.js';
import { createCatalogApi } from './index.js';
import { createRateLimitGate } from './ratelimit/gate.js';
import { MemoryRateLimitStore } from './ratelimit/stores.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { FakeCatalogPort } from '../modules/catalog/testing/doubles.js';

interface TestServer {
  server: Server;
  base: string;
}

const servers: Server[] = [];

/** Start a real node server with its own limiter budget (long window: no mid-test roll). */
async function startServer(limit: number): Promise<TestServer> {
  const service = createCatalogQueryService({
    port: new FakeCatalogPort(),
    store: new MemoryCacheStore(),
    generations: new MemoryGenerationStore(),
    namespace: 'mh-test-server',
  });
  const gate = createRateLimitGate({
    policy: { scope: 'public_get', limit, windowSeconds: 3600 },
    backends: { primary: new MemoryRateLimitStore(), fallback: new MemoryRateLimitStore() },
    failureMode: 'allow',
  });
  const api = createCatalogApi({ service, rateLimit: gate });
  const server = createNodeServer(api);
  servers.push(server);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('server not listening');
  return { server, base: `http://127.0.0.1:${address.port}` };
}

afterAll(async () => {
  for (const server of servers) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

describe('node adapter (real HTTP)', () => {
  it('buckets by the socket address: a spoofed x-client-ip header changes nothing', async () => {
    const { base } = await startServer(2);
    const first = await fetch(`${base}/api/v1/products?limit=1`, {
      headers: { 'x-client-ip': '1.1.1.1' },
    });
    expect(first.status).toBe(200);
    expect(first.headers.get('ratelimit-remaining')).toBe('1');

    // Different spoofed identity, SAME socket -> same bucket -> budget keeps
    // draining. If the header were trusted this would reset to 1.
    const second = await fetch(`${base}/api/v1/products?limit=1`, {
      headers: { 'x-client-ip': '9.9.9.9' },
    });
    expect(second.status).toBe(200);
    expect(second.headers.get('ratelimit-remaining')).toBe('0');

    const rejected = await fetch(`${base}/api/v1/products?limit=1`);
    expect(rejected.status).toBe(429);
    expect(rejected.headers.get('retry-after')).toBeTruthy();
    expect(rejected.headers.get('x-trace-id')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('serves the documented headers over real HTTP (Cache-Control + Surrogate-Key + RateLimit)', async () => {
    const { base } = await startServer(5);
    const response = await fetch(`${base}/api/v1/taxonomy/metals`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('max-age=3600');
    expect(response.headers.get('surrogate-key')).toContain('catalog.scope.taxonomy');
    expect(response.headers.get('ratelimit-limit')).toBe('5');
  });
});
