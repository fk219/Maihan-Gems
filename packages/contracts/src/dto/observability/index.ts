import { z } from 'zod';

/**
 * packages/contracts/src/dto/observability/index.ts
 *
 * Phase 12 contracts for production observability, alerts and operational hardening.
 * Derived from technical_design/28_OBSERVABILITY_ARCHITECTURE.md and NFR-01 through NFR-15.
 */

/**
 * Strict cardinality guard: high-cardinality keys are forbidden in metric labels.
 * User ID, customer email, product SKU, and raw URL with query params are prohibited.
 */
export const FORBIDDEN_METRIC_LABEL_KEYS = [
  'user_id',
  'userId',
  'customer_id',
  'customerId',
  'email',
  'sku',
  'product_sku',
  'url',
  'raw_url',
  'query',
  'password',
  'token',
  'secret',
  'card',
] as const;

export type ForbiddenMetricLabelKey = (typeof FORBIDDEN_METRIC_LABEL_KEYS)[number];

export const MetricTypeSchema = z.enum(['counter', 'gauge', 'histogram']);
export type MetricType = z.infer<typeof MetricTypeSchema>;

/**
 * Metric sample contract.
 */
export const MetricSampleSchema = z.object({
  name: z.string().min(1),
  type: MetricTypeSchema,
  value: z.number(),
  timestamp: z.number().int().positive(),
  labels: z.record(z.string(), z.string()).default({}),
});
export type MetricSample = z.infer<typeof MetricSampleSchema>;

/**
 * Alert severity levels per technical_design/28 §7:
 * - P1: Revenue loss, data loss, security exposure, or trust violation (Immediate page)
 * - P2: Degradation with a workaround (Business-hours ticket)
 * - P3: Detection-only, needs a human decision (Digest)
 */
export const AlertSeveritySchema = z.enum(['P1', 'P2', 'P3']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

/**
 * Alert Rule Definition
 */
export const AlertRuleDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  severity: AlertSeveritySchema,
  owner: z.string().min(1),
  runbookUrl: z.string().min(1),
  sloId: z.string().min(1),
  metricName: z.string().min(1),
  condition: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
  threshold: z.number(),
  windowSeconds: z.number().int().positive(),
  summary: z.string().min(1),
});
export type AlertRuleDefinition = z.infer<typeof AlertRuleDefinitionSchema>;

/**
 * Fired Alert Event
 */
export const AlertIncidentSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  severity: AlertSeveritySchema,
  status: z.enum(['FIRING', 'RESOLVED']),
  currentValue: z.number(),
  threshold: z.number(),
  owner: z.string().min(1),
  runbookUrl: z.string().min(1),
  summary: z.string().min(1),
  timestamp: z.number().int().positive(),
  labels: z.record(z.string(), z.string()).default({}),
});
export type AlertIncident = z.infer<typeof AlertIncidentSchema>;

/**
 * Health check status:
 * - Liveness (/api/v1/health/live): process alive
 * - Readiness (/api/v1/health/ready): process accepting traffic & critical dependencies connected
 */
export const HealthComponentStatusSchema = z.enum(['UP', 'DOWN', 'DEGRADED']);
export type HealthComponentStatus = z.infer<typeof HealthComponentStatusSchema>;

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['HEALTHY', 'UNHEALTHY', 'DEGRADED']),
  timestamp: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  version: z.string(),
  components: z.record(
    z.string(),
    z.object({
      status: HealthComponentStatusSchema,
      latencyMs: z.number().nonnegative(),
      message: z.string().optional(),
    }),
  ),
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
