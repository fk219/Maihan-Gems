/**
 * packages/contracts — DTO and event schemas.
 *
 * Owns: Zod DTOs, event payload schemas, OpenAPI generation.
 * Must never contain: logic beyond parsing and coercion.
 *
 * Unknown fields are REJECTED (`.strict()`), not silently ignored. An unknown
 * field is a 400, not a discarded input.
 *
 * Phase 1 Task 1 scope: workspace skeleton only.
 * Zod is an approved Phase 1 dependency (SKILL_MATRIX_AND_TOOLING.md 14.1,
 * "runtime dependency of packages/contracts, packages/config, packages/domain")
 * but is deliberately NOT installed by Task 1: no schema exists to validate yet,
 * and technical_design/03 requires a committed generated/openapi.json that this
 * task does not produce. Zod arrives with the first contract in Phase 1 Task 6+,
 * or earlier if the plan owner directs otherwise.
 *
 * Layout per technical_design/03:
 *   src/dto/<module>/   input and output schemas
 *   src/events/         event payload schemas
 *   src/generated/      openapi.json (committed, diffed in CI)
 */
export {};
