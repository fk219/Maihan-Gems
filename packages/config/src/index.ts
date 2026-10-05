/**
 * packages/config — environment schema, feature flags, constants.
 *
 * Owns: env parsing, feature flags, constants.
 * Must never contain: the secrets themselves.
 *
 * This is the ONLY package permitted to read `process.env`. Per
 * technical_design/03 implementation constraint 3, no other package may read
 * it. The ESLint boundary config enforces that as a lint error.
 *
 * Secrets themselves live in the platform secret manager only: never in the
 * repository, the database, a config table, a log or a trace (AGENTS.md 10).
 *
 * Phase 1 Task 1 scope: workspace skeleton only. The env schema arrives when a
 * runtime dependency first needs configuration.
 */
export {};
