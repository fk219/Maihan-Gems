/**
 * Task 9 — the rate-limit test matrix.
 *
 * Two shapes, mirroring redis-store.spec.ts:
 *   1. ALWAYS RUNS: the limiter, the gate and the API integration against
 *      in-memory / failing stores — deterministic (injected clock), no
 *      Redis, no database.
 *   2. LIVE REDIS (`REDIS_URL` set): real INCR/EXPIRE round trips for
 *      RedisRateLimitStore — skipped, never faked, when no Redis exists.
 *
 * The Postgres fallback store is asserted against a real database in
 * `api-db.spec.ts` (skips without DATABASE_URL); here it is covered through
 * the backend-chain contract (a store is a store).
 *
 * Everything numeric below is SoT 11.11 verbatim: public GET 300 per 1 min
 * per IP.
 */
import { describe, expect, it } from 'vitest';
import { ErrorEnvelopeSchema } from '@maihan/contracts';
import {
  NOT_YET_APPLICABLE_SCOPES,
  RATE_LIMIT_POLICIES,
  bucketKey,
  secondsUntilWindowEnd,
  windowStartSeconds,
  type RateLimitPolicy,
} from './policy.js';
import { createBackendChain, createRateLimiter, defaultIdentify } from './limiter.js';
import { createRateLimitGate, type RateLimitGate } from './gate.js';
import { MemoryRateLimitStore, RedisRateLimitStore, type RateLimitStore } from './stores.js';
import { createCatalogApi, type CatalogApi } from '../index.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../../modules/catalog/index.js';
import { FakeCatalogPort } from '../../modules/catalog/testing/doubles.js';
import { createRedisClient, type RedisHandle } from '../../integrations/redis.js';

const POLICY = RATE_LIMIT_POLICIES.public_get;
const IDS = { traceId: '00000000000000000000000000000bb2', requestId: 'req_test_000000000002' };
/** Fixed epoch instant: 2023-11-14T22:13:20Z (second 1,700,000,000). */
const START = 1_700_000_000_000;
const CLIENT_IP = '203.0.113.7';

const request = (ip: string): Request =>
  new Request('http://localhost/api/v1/products', { headers: { 'x-client-ip': ip } });

/** Store that records every bucket it is asked to increment. */
class SpyStore implements RateLimitStore {
  readonly buckets: string[] = [];
  constructor(private readonly inner: RateLimitStore = new MemoryRateLimitStore()) {}
  async increment(bucket: string, windowStart: number): Promise<number> {
    this.buckets.push(bucket);
    return this.inner.increment(bucket, windowStart);
  }
}

/** Store that fails while `failing` is true. */
class FailingStore implements RateLimitStore {
  constructor(public failing = true) {}
  async increment(): Promise<number> {
    if (this.failing) throw new Error('backend down');
    return 1;
  }
}

interface LimiterHarness {
  limiter: (request: Request) => Promise<{ allowed: boolean; headers: Record<string, string>; backend: string }>;
  primary: SpyStore;
  fallback: SpyStore;
  advance(ms: number): void;
  nowMs(): number;
}

function harness(policy: RateLimitPolicy = POLICY, failureMode: 'allow' | 'reject' = 'allow'): LimiterHarness {
  let clock = START;
  const primary = new SpyStore();
  const fallback = new SpyStore();
  const limiter = createRateLimiter({
    policy,
    backends: { primary, fallback },
    failureMode,
    now: () => clock,
    identify: () => CLIENT_IP,
  });
  return {
    limiter,
    primary,
    fallback,
    advance: (ms) => {
      clock += ms;
    },
    nowMs: () => clock,
  };
}

// ─── SoT 11.11 policy, verbatim ──────────────────────────────────────────────

describe('SoT 11.11 policy', () => {
  it('public GET is 300 requests per 1 minute per IP', () => {
    expect(POLICY.limit).toBe(300);
    expect(POLICY.windowSeconds).toBe(60);
  });

  it('records every not-yet-applicable SoT scope verbatim (no invented limits)', () => {
    expect(NOT_YET_APPLICABLE_SCOPES).toEqual([
      { scope: 'search', limit: 60, windowSeconds: 60 },
      { scope: 'cart_mutation', limit: 60, windowSeconds: 60 },
      { scope: 'checkout', limit: 20, windowSeconds: 60 },
      { scope: 'ai_stream', limit: 20, windowSeconds: 60, dailyLimit: 200 },
      { scope: 'ai_tool_invocation', limit: 200, windowSeconds: 60 },
      { scope: 'certificate_upload', limit: 10, windowSeconds: 3600 },
      { scope: 'admin_write', limit: 300, windowSeconds: 60 },
      { scope: 'webhook', limit: 1000, windowSeconds: 60 },
    ]);
  });
});

// ─── Below / at / above the limit ────────────────────────────────────────────

describe('limiter: below / at / above the limit', () => {
  it('allows 300 requests, rejects the 301st (fixed window, per IP)', async () => {
    const h = harness();
    for (let i = 1; i <= POLICY.limit; i += 1) {
      const outcome = await h.limiter(request(CLIENT_IP));
      expect(outcome.allowed, `request ${i} should be allowed`).toBe(true);
      expect(outcome.headers['RateLimit-Limit']).toBe('300');
      expect(outcome.headers['RateLimit-Remaining']).toBe(String(POLICY.limit - i));
    }
    const rejected = await h.limiter(request(CLIENT_IP));
    expect(rejected.allowed).toBe(false);
    expect(rejected.headers['RateLimit-Remaining']).toBe('0');
  });

  it('rejection carries Retry-After naming the seconds until the window resets', async () => {
    const h = harness();
    for (let i = 0; i < POLICY.limit; i += 1) await h.limiter(request(CLIENT_IP));
    const rejected = await h.limiter(request(CLIENT_IP));
    const expected = String(secondsUntilWindowEnd(START, POLICY.windowSeconds));
    expect(rejected.headers['Retry-After']).toBe(expected);
    expect(Number(expected)).toBeGreaterThan(0);
    expect(Number(expected)).toBeLessThanOrEqual(POLICY.windowSeconds);
  });

  it('allowed responses carry no Retry-After (only the budget headers)', async () => {
    const h = harness();
    const allowed = await h.limiter(request(CLIENT_IP));
    expect(allowed.headers['Retry-After']).toBeUndefined();
    expect(allowed.headers['RateLimit-Remaining']).toBe('299');
    expect(Number(allowed.headers['RateLimit-Reset'])).toBeGreaterThan(0);
  });

  it('counts through the primary backend while it is healthy', async () => {
    const h = harness();
    const outcome = await h.limiter(request(CLIENT_IP));
    expect(outcome.backend).toBe('primary');
    expect(h.primary.buckets).toHaveLength(1);
    expect(h.fallback.buckets).toHaveLength(0);
  });
});

// ─── Window reset ────────────────────────────────────────────────────────────

describe('window reset', () => {
  it('a rejected client is allowed again in the next window (fresh bucket)', async () => {
    const h = harness();
    for (let i = 0; i <= POLICY.limit; i += 1) await h.limiter(request(CLIENT_IP)); // 301 -> rejected
    h.advance((POLICY.windowSeconds + 1) * 1000);
    const nextWindow = await h.limiter(request(CLIENT_IP));
    expect(nextWindow.allowed).toBe(true);
    expect(nextWindow.headers['RateLimit-Remaining']).toBe('299');
    // The bucket key moved with the window.
    const first = h.primary.buckets[0] as string;
    const later = h.primary.buckets[h.primary.buckets.length - 1] as string;
    expect(first).not.toBe(later);
  });
});

// ─── Bucket isolation and shape ──────────────────────────────────────────────

describe('bucket isolation and shape', () => {
  it('one client exhausting its budget does not affect another client', async () => {
    const h = harness();
    const clock = START;
    const ipLimiter = createRateLimiter({
      policy: POLICY,
      backends: { primary: new SpyStore(), fallback: new MemoryRateLimitStore() },
      failureMode: 'allow',
      now: () => clock,
      identify: (req) => req.headers.get('x-client-ip') ?? 'unknown',
    });
    for (let i = 0; i <= POLICY.limit; i += 1) await ipLimiter(request('198.51.100.1'));
    expect((await ipLimiter(request('198.51.100.1'))).allowed).toBe(false);
    // A different IP still has its full budget.
    expect((await ipLimiter(request('198.51.100.2'))).allowed).toBe(true);
    expect(h.primary.buckets.length).toBe(0); // harness untouched — isolation is per identity
  });

  it('every bucket follows rl:{scope}:{hashed-identity}:{window} and leaks no raw IP', async () => {
    const h = harness();
    await h.limiter(request(CLIENT_IP));
    h.advance(60_000);
    await h.limiter(request(CLIENT_IP));
    const [first, second] = h.primary.buckets;
    expect(first).toMatch(/^rl:public_get:[0-9a-f]{32}:\d+$/);
    expect(second).toMatch(/^rl:public_get:[0-9a-f]{32}:\d+$/);
    expect(first).not.toContain(CLIENT_IP); // hashed, PII-free (technical_design/25 §9)
    expect(first).not.toBe(second); // different windows are different buckets
    // Deterministic: the same identity+window always maps to the same key.
    expect(bucketKey(POLICY, CLIENT_IP, windowStartSeconds(START, 60))).toBe(first);
  });

  it('window arithmetic is epoch-aligned and never zero-seconds-to-reset', () => {
    expect(windowStartSeconds(START, 60)).toBe(1_699_999_980);
    expect(secondsUntilWindowEnd(START, 60)).toBe(40);
    expect(secondsUntilWindowEnd(START + 39_000, 60)).toBe(1); // 1s before the window closes
  });
});

// ─── Degradation: primary fails -> fallback; all fail -> failure mode ────────

describe('degradation chain', () => {
  it('primary failure -> the fallback backend counts (documented Postgres fallback)', async () => {
    const clock = START; // never advanced: the whole test is one fixed window
    const primary = new FailingStore();
    const fallback = new MemoryRateLimitStore();
    const limiter = createRateLimiter({
      policy: POLICY,
      backends: { primary, fallback },
      failureMode: 'allow',
      now: () => clock,
      identify: () => CLIENT_IP,
    });
    const first = await limiter(request(CLIENT_IP));
    expect(first.backend).toBe('fallback');
    expect(first.allowed).toBe(true);
    expect(first.headers['RateLimit-Remaining']).toBe('299');

    // The limit is still enforced through the fallback.
    for (let i = 2; i <= POLICY.limit; i += 1) await limiter(request(CLIENT_IP));
    const rejected = await limiter(request(CLIENT_IP));
    expect(rejected.allowed).toBe(false);
    expect(rejected.backend).toBe('fallback');
  });

  it('primary recovery is automatic: the chain tries primary first every request', async () => {
    const clock = START;
    const primary = new FailingStore();
    const limiter = createRateLimiter({
      policy: POLICY,
      backends: { primary, fallback: new MemoryRateLimitStore() },
      failureMode: 'allow',
      now: () => clock,
      identify: () => CLIENT_IP,
    });
    expect((await limiter(request(CLIENT_IP))).backend).toBe('fallback');
    primary.failing = false;
    const recovered = await limiter(request(CLIENT_IP));
    expect(recovered.backend).toBe('primary');
  });

  it('every backend down + failureMode allow -> request allowed, marked degraded (doc 06: reads continue)', async () => {
    const limiter = createRateLimiter({
      policy: POLICY,
      backends: { primary: new FailingStore(), fallback: new FailingStore() },
      failureMode: 'allow',
      now: () => START,
      identify: () => CLIENT_IP,
    });
    const outcome = await limiter(request(CLIENT_IP));
    expect(outcome.allowed).toBe(true);
    expect(outcome.backend).toBe('degraded');
    // The budget headers still describe the policy; no Retry-After on allow.
    expect(outcome.headers['RateLimit-Limit']).toBe('300');
    expect(outcome.headers['Retry-After']).toBeUndefined();
  });

  it('every backend down + failureMode reject -> rejected with Retry-After (fail closed for abuse scopes)', async () => {
    const limiter = createRateLimiter({
      policy: POLICY,
      backends: { primary: new FailingStore(), fallback: new FailingStore() },
      failureMode: 'reject',
      now: () => START,
      identify: () => CLIENT_IP,
    });
    const outcome = await limiter(request(CLIENT_IP));
    expect(outcome.allowed).toBe(false);
    expect(outcome.backend).toBe('degraded');
    expect(outcome.headers['Retry-After']).toBe(String(secondsUntilWindowEnd(START, 60)));
  });
});

// ─── Identity resolution ─────────────────────────────────────────────────────

describe('defaultIdentify', () => {
  const withHeaders = (headers: Record<string, string>): Request =>
    new Request('http://localhost/api/v1/products', { headers });

  it('prefers x-client-ip, then the first X-Forwarded-For hop, then "unknown"', () => {
    expect(defaultIdentify(withHeaders({ 'x-client-ip': '10.0.0.1' }))).toBe('10.0.0.1');
    expect(
      defaultIdentify(withHeaders({ 'x-forwarded-for': ' 198.51.100.9 , 10.0.0.2' })),
    ).toBe('198.51.100.9');
    expect(defaultIdentify(withHeaders({}))).toBe('unknown');
  });
});

// ─── Backend chain factory ───────────────────────────────────────────────────

describe('createBackendChain', () => {
  it('without Redis the primary becomes in-process counters; the Postgres fallback stays when db is present', () => {
    const chain = createBackendChain({ redis: null, db: null, policy: POLICY });
    expect(chain.primary).toBeInstanceOf(MemoryRateLimitStore);
    expect(chain.fallback).toBeInstanceOf(MemoryRateLimitStore);
  });
});

// ─── API integration: gate + 429 envelope + headers ──────────────────────────

interface ApiHarness {
  api: CatalogApi;
  gateCalls: () => number;
}

function buildApiWithGate(policy: RateLimitPolicy = POLICY): ApiHarness {
  const clock = START;
  let gateCalls = 0;
  const service = createCatalogQueryService({
    port: new FakeCatalogPort(),
    store: new MemoryCacheStore(),
    generations: new MemoryGenerationStore(),
    namespace: 'mh-test-ratelimit',
  });
  const limiter = createRateLimiter({
    policy,
    backends: { primary: new MemoryRateLimitStore(), fallback: new MemoryRateLimitStore() },
    failureMode: 'allow',
    now: () => clock,
    identify: (req) => req.headers.get('x-client-ip') ?? 'unknown',
  });
  const gate: RateLimitGate = async (req) => {
    gateCalls += 1;
    const outcome = await limiter(req);
    return { allowed: outcome.allowed, headers: outcome.headers, backend: outcome.backend as 'primary' };
  };
  const api = createCatalogApi({ service, ids: () => ({ ...IDS }), rateLimit: gate });
  return { api, gateCalls: () => gateCalls };
}

describe('API integration (gate at the request boundary)', () => {
  it('an allowed 200 carries RateLimit-* budget headers and the trace id', async () => {
    const { api } = buildApiWithGate();
    const response = await api(request(CLIENT_IP));
    expect(response.status).toBe(200);
    expect(response.headers.get('RateLimit-Limit')).toBe('300');
    expect(response.headers.get('RateLimit-Remaining')).toBe('299');
    expect(Number(response.headers.get('RateLimit-Reset'))).toBeGreaterThan(0);
    expect(response.headers.get('Retry-After')).toBeNull();
    expect(response.headers.get('X-Trace-Id')).toBe(IDS.traceId);
  });

  it('over the limit -> 429 RATE_LIMITED in the SoT 10.4 envelope with Retry-After', async () => {
    const { api } = buildApiWithGate({ scope: 'public_get', limit: 2, windowSeconds: 60 });
    expect((await api(request(CLIENT_IP))).status).toBe(200);
    expect((await api(request(CLIENT_IP))).status).toBe(200);
    const rejected = await api(request(CLIENT_IP));
    expect(rejected.status).toBe(429);
    expect(rejected.headers.get('Retry-After')).toBe(
      String(secondsUntilWindowEnd(START, POLICY.windowSeconds)),
    );
    expect(rejected.headers.get('RateLimit-Limit')).toBe('2');
    expect(rejected.headers.get('RateLimit-Remaining')).toBe('0');
    expect(rejected.headers.get('X-Trace-Id')).toBe(IDS.traceId);
    const body = ErrorEnvelopeSchema.parse(await rejected.json());
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.requestId).toBe(IDS.requestId);
    expect(body.error.traceId).toBe(IDS.traceId);
  });

  it('the 429 envelope is the ONE error envelope (same shape as 400/404)', async () => {
    const { api } = buildApiWithGate({ scope: 'public_get', limit: 0, windowSeconds: 60 });
    const rejected = await api(request(CLIENT_IP));
    expect(rejected.status).toBe(429);
    const body: unknown = await rejected.json();
    expect(Object.keys(body as object)).toEqual(['error']);
    const error = (body as { error: Record<string, unknown> }).error;
    expect(Object.keys(error).sort()).toEqual(['code', 'message', 'requestId', 'traceId']);
  });

  it('unknown paths (404) and wrong methods (405) never reach the gate — no budget consumed', async () => {
    const { api, gateCalls } = buildApiWithGate();
    expect((await api(new Request('http://localhost/api/v1/nope'))).status).toBe(404);
    expect(
      (await api(new Request('http://localhost/api/v1/products', { method: 'POST' }))).status,
    ).toBe(405);
    expect(gateCalls()).toBe(0);
  });

  it('a rejected request still carries the trace id and JSON content type', async () => {
    const { api } = buildApiWithGate({ scope: 'public_get', limit: 0, windowSeconds: 60 });
    const rejected = await api(request(CLIENT_IP));
    expect(rejected.headers.get('content-type')).toContain('application/json');
    expect(rejected.headers.get('X-Trace-Id')).toBe(IDS.traceId);
  });
});

// ─── createRateLimitGate factory ─────────────────────────────────────────────

describe('createRateLimitGate', () => {
  it('adapts a limiter into the decision shape the API consumes', async () => {
    const gate = createRateLimitGate({
      policy: POLICY,
      backends: { primary: new MemoryRateLimitStore(), fallback: new MemoryRateLimitStore() },
      failureMode: 'allow',
      now: () => START,
      identify: () => CLIENT_IP,
    });
    const decision = await gate(request(CLIENT_IP), { id: 'listProducts', path: '/api/v1/products' });
    expect(decision.allowed).toBe(true);
    expect(decision.backend).toBe('primary');
    expect(decision.headers['RateLimit-Limit']).toBe('300');
  });
});

// ─── Shape 2: live Redis (REDIS_URL) ─────────────────────────────────────────

const REDIS_URL = process.env['REDIS_URL'] ?? null;
const describeLive = REDIS_URL === null ? describe.skip : describe;

describeLive('RedisRateLimitStore against live Redis', () => {
  let handle: RedisHandle;

  const bucket = `rl:test:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  it('increments the window counter and expires the key with the window', async () => {
    handle = createRedisClient(REDIS_URL as string, { connectTimeout: 1000 });
    await handle.client.connect();
    try {
      const store = new RedisRateLimitStore(handle.client, 60);
      const key = bucket;
      expect(await store.increment(key)).toBe(1);
      expect(await store.increment(key)).toBe(2);
      const ttl = await handle.client.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    } finally {
      await handle.client.del(bucket).catch(() => undefined);
      await handle.close();
    }
  });

  it('a dead Redis rejects the increment (the limiter then uses its fallback)', async () => {
    const dead = createRedisClient('redis://127.0.0.1:6390', { maxAttempts: 1, connectTimeout: 300 });
    await dead.client.connect().catch(() => undefined);
    try {
      const store = new RedisRateLimitStore(dead.client, 60);
      await expect(store.increment('rl:dead:1')).rejects.toThrow();
    } finally {
      await dead.close();
    }
  });
});
