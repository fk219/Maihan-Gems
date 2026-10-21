/**
 * apps/web/src/api/health-handlers.ts
 *
 * Operational Health Probes (Phase 12 / NFR-01, NFR-03).
 *
 * Endpoints:
 * - GET /api/v1/health/live: Liveness probe (process running, event loop responsive, returns 200).
 * - GET /api/v1/health/ready: Readiness probe (checks database pool connectivity and optional Redis cache).
 * - GET /api/v1/health/metrics: Low-cardinality Prometheus-compatible metric exposition.
 */
import type { RouteContext, HandlerOutcome } from './handlers.js';
import { globalRegistry, withSpan } from '@maihan/observability';
import { sql } from '@maihan/db';
import { isDevSeamEnabled } from '@maihan/config';
import { ContractError } from '@maihan/contracts';
import type { HealthCheckResponse } from '@maihan/contracts';

const PROCESS_START_TIME = Date.now();

/**
 * Liveness probe: returns 200 as long as the Node process can execute the handler.
 */
export async function healthLiveHandler(_ctx: RouteContext): Promise<HandlerOutcome> {
  const uptimeSeconds = Math.floor((Date.now() - PROCESS_START_TIME) / 1000);

  const body: HealthCheckResponse = {
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    version: '0.0.0',
    components: {
      process: {
        status: 'UP',
        latencyMs: 0,
      },
    },
  };

  return {
    status: 200,
    body,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  };
}

/**
 * Readiness probe: checks database connectivity and pool health.
 */
export async function healthReadyHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const uptimeSeconds = Math.floor((Date.now() - PROCESS_START_TIME) / 1000);
  const components: HealthCheckResponse['components'] = {};
  let overallHealthy = true;

  // 1. Database check
  if (ctx.db) {
    const dbStart = Date.now();
    try {
      await withSpan('health.db_check', { attributes: { 'component': 'database' } }, async () => {
        // ctx.db is the Drizzle read executor — execute takes a SQL object,
        // never a raw { text, values } pair.
        await (ctx.db as unknown as { execute: (query: unknown) => Promise<unknown> }).execute(sql`SELECT 1 AS ping`);
      });
      components['database'] = {
        status: 'UP',
        latencyMs: Date.now() - dbStart,
      };
    } catch (err) {
      overallHealthy = false;
      components['database'] = {
        status: 'DOWN',
        latencyMs: Date.now() - dbStart,
        message: err instanceof Error ? err.message : 'Database ping failure',
      };
    }
  } else {
    // P1-24 honesty: with no pool in this process the database was NOT
    // probed — report DEGRADED rather than unconditionally "UP", and let the
    // readiness verdict reflect that (a probe that cannot verify the
    // dependency must not claim HEALTHY).
    components['database'] = {
      status: 'DEGRADED',
      latencyMs: 0,
      message: 'UNKNOWN — no database handle in this process (embedded mode); database was not probed',
    };
    overallHealthy = false;
  }

  // 2. Memory / Process state
  const mem = process.memoryUsage();
  components['memory'] = {
    status: mem.heapUsed < mem.heapTotal * 0.95 ? 'UP' : 'DEGRADED',
    latencyMs: 0,
  };

  const body: HealthCheckResponse = {
    status: overallHealthy ? 'HEALTHY' : 'UNHEALTHY',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    version: '0.0.0',
    components,
  };

  return {
    status: overallHealthy ? 200 : 503,
    body,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  };
}

/**
 * Metrics exposition endpoint: returns Prometheus/OpenMetrics text format.
 * P1-24: restricted — metric cardinalities are internal operational data
 * (per-route request counters), never public. Loopback and the explicit dev
 * seam only.
 */
export async function metricsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const remoteAddr =
    (ctx.request?.headers.get('x-client-ip') ?? '').trim() ||
    (ctx.request?.headers.get('x-forwarded-for')?.split(',')[0] ?? '').trim();
  const isLoopback =
    remoteAddr === '' || remoteAddr === '127.0.0.1' || remoteAddr === '::1' || remoteAddr.endsWith('127.0.0.1');
  if (!isLoopback && !isDevSeamEnabled()) {
    throw new ContractError('FORBIDDEN', 'Metrics are internal — not exposed beyond loopback.');
  }
  const samples = globalRegistry.collectAll();
  const lines: string[] = [];

  for (const sample of samples) {
    const labelEntries = Object.entries(sample.labels);
    const labelStr = labelEntries.length > 0
      ? `{${labelEntries.map(([k, v]) => `${k}="${v}"`).join(',')}}`
      : '';
    lines.push(`${sample.name}${labelStr} ${sample.value} ${sample.timestamp}`);
  }

  return {
    status: 200,
    body: lines.join('\n') + '\n',
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store, no-cache',
    },
  };
}
