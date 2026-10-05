/**
 * packages/observability — tracing, logging, metric registry.
 *
 * Owns: tracer, logger, metric name registry.
 * Must never contain: business logic.
 *
 * Span naming convention: `<package>.<module>.<operation>`, for example
 * `db.catalog.getProductBySlug` (technical_design/03).
 *
 * Metric labels must never contain user id, email, SKU or URL — cardinality
 * control is a hard rule (technical_design/01, Observability). PII never
 * reaches logs, metric labels, event payloads, embeddings or model context
 * beyond the minimum required (AGENTS.md 10).
 *
 * Phase 1 Task 1 scope: workspace skeleton only. The OpenTelemetry SDK and
 * exporter are approved Phase 1 dependencies (SKILL_MATRIX_AND_TOOLING.md 14.1)
 * but are NOT installed here: a tracer with no instrumented code to trace, and
 * the collector is still unprovisioned.
 */
export {};
