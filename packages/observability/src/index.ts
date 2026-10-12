/**
 * packages/observability/src/index.ts
 *
 * packages/observability — production tracing, logging, metric registry, Sentry client, and SLO evaluation.
 *
 * Conforms to:
 * - technical_design/28_OBSERVABILITY_ARCHITECTURE.md
 * - INITIAL_IMPLEMENTATION_PLAN.md §19 / §27 / §28
 * - NFR-01 through NFR-15
 * - AGENTS.md §8 (Zero direct DB mutation by AI) and §10 (Zero PII in logs, metric labels, or spans)
 */

export * from './tracing/context.js';
export * from './tracing/tracer.js';
export * from './logging/logger.js';
export * from './metrics/registry.js';
export * from './error/sentry.js';
export * from './slo/evaluator.js';
