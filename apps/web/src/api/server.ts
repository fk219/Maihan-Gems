/**
 * apps/web/src/api/server.ts
 *
 * Task 8 — the node:http adapter and the composition root.
 *
 * Two responsibilities, deliberately in one file because both are the
 * process edge of the application:
 *
 *   1. ADAPTER: node `IncomingMessage` -> web `Request`, web `Response` ->
 *      node response. GET-only surface, no body handling. Everything the
 *      adapter does is transport; it contains zero catalogue logic.
 *
 *   2. COMPOSITION ROOT: the only place in apps/web that wires the pieces
 *      together — config (@maihan/config, the only process.env reader),
 *      pool (@maihan/db createPool — apps/web may not import `pg`),
 *      CatalogQueryPort, Redis (optional: absent REDIS_URL means configured
 *      bypass, a failed connection means degraded bypass — Task 7), the
 *      cached query service (Tasks 6/7), and the API handler (Task 8).
 *
 * Run: `node dist/api/server.js` (package script `start`), with DATABASE_URL
 * set and REDIS_URL optional.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import type { Server } from 'node:http';
import { loadRuntimeConfig, type RuntimeConfig } from '@maihan/config';
import { createCatalogDatabase, createCatalogQueryPort, createPool } from '@maihan/db';
import { createRedisClient, type RedisHandle } from '../integrations/redis.js';
import {
  MemoryGenerationStore,
  NullCacheStore,
  RedisCacheStore,
  RedisGenerationStore,
  cacheNamespace,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { createCatalogApi, type CatalogApi } from './index.js';
import { createScopedRateLimitGate } from './ratelimit/gate.js';
import type { CacheStore, GenerationStore } from '../modules/catalog/index.js';

async function toRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? '127.0.0.1';
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const item of value) headers.append(name, item);
    else headers.set(name, value);
  }
  // Rate-limit identity (Task 9): the SOCKET address is the trusted client
  // identity for a direct connection — it is set here, last, so a client-
  // supplied `x-client-ip` header can never spoof the bucket. Behind a proxy
  // the deployment fronts this adapter and the XFF path of defaultIdentify
  // applies (which proxy is trusted is a deployment decision, recorded in
  // ratelimit/policy.ts + limiter.ts, never guessed here).
  const remote = req.socket.remoteAddress;
  if (remote !== undefined && remote !== null && remote !== '') {
    headers.set('x-client-ip', remote);
  }
  const method = req.method ?? 'GET';
  const url = `http://${host}${req.url ?? '/'}`;
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers });
  }
  // Request bodies must travel with the Request: POST/PATCH/DELETE handlers
  // (carts, checkout, account, DYO, webhooks) read `request.text()/json()`,
  // and webhook verification needs the exact raw bytes as one buffer.
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer));
  const body = Buffer.concat(chunks);
  const bodyInit = new Uint8Array(body);
  return new Request(url, { method, headers, body: bodyInit });
}

async function writeResponse(response: Response, res: ServerResponse): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, name) => {
    headers[name] = value;
  });
  const body = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.status, headers);
  res.end(body);
}

export function createNodeServer(api: CatalogApi): Server {
  return createServer((req, res) => {
    void (async () => {
      try {
        const response = await api(await toRequest(req));
        await writeResponse(response, res);
      } catch {
        // Transport-level failure only (the API maps all catalogue errors).
        if (!res.headersSent) {
          res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        }
        res.end(JSON.stringify({ error: { code: 'INTERNAL', message: 'Internal error.' } }));
      }
    })();
  });
}

export interface WiredApi {
  api: CatalogApi;
  server: Server;
  config: RuntimeConfig;
  close(): Promise<void>;
}

/** Wire the full application for a given configuration (used by main and tests). */
export async function wireApi(config: RuntimeConfig = loadRuntimeConfig()): Promise<WiredApi> {
  const namespace = cacheNamespace(config.environment);
  // The pool type comes from @maihan/db: apps/web must not import `pg`.
  const pool = createPool(config.databaseUrl);
  const catalogDatabase = createCatalogDatabase(pool);
  const catalogPort = createCatalogQueryPort(catalogDatabase);

  let store: CacheStore = new NullCacheStore();
  let generations: GenerationStore = new MemoryGenerationStore();
  let redis: RedisHandle | null = null;

  if (config.redisUrl !== null) {
    redis = createRedisClient(config.redisUrl);
    // Best-effort connect: on failure the client keeps retrying in the
    // background and every command rejects fast, which the service converts
    // into a bypass (Task 7). Redis being down is never a startup failure.
    await redis.client.connect().catch(() => undefined);
    store = new RedisCacheStore(redis.client);
    generations = new RedisGenerationStore(redis.client, namespace);
  }

  const service = createCatalogQueryService({ port: catalogPort, store, generations, namespace });

  // Task 9: the request-boundary rate limiter (SoT 11.11 full scope table).
  // Backend chain per scope: Redis primary when configured, the LOCKED
  // `rate_limit_counters` table as the documented fallback, in-process
  // counters when neither exists (local runs). Failure modes are per scope
  // (doc 06): reads 'allow'; checkout/AI-stream/certificate-upload 'reject'.
  const rateLimit = createScopedRateLimitGate({
    redis: redis?.client ?? null,
    db: catalogDatabase,
    onDegradation: (event) => {
      process.stdout.write(
        `rate-limit degraded at ${event.stage}: ${(event.error as Error | undefined)?.message ?? 'unknown'}\n`,
      );
    },
  });

  const api = createCatalogApi({ service, rateLimit, db: catalogDatabase });
  const server = createNodeServer(api);

  return {
    api,
    server,
    config,
    async close(): Promise<void> {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (redis !== null) await redis.close();
      await pool.end();
    },
  };
}

export async function main(): Promise<void> {
  const wired = await wireApi();
  wired.server.listen(wired.config.apiPort, () => {
    process.stdout.write(
      `maihan-catalog-api listening on :${wired.config.apiPort} (${wired.config.environment})\n`,
    );
  });
  const shutdown = (): void => {
    void wired.close().then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  void main();
}
