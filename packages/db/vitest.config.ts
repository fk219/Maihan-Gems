// Vitest configuration for packages/db — the integration test layer.
//
// ADR-021 (ACCEPTED 2026-10-07): Vitest is the runner for the unit, domain,
// integration and contract layers, one test config per layer. This covers
// this package's colocated *.spec.ts files: the reference-data seed gates
// (plan task 9: counts, values, uniqueness, idempotency, rerun behaviour)
// run against a disposable scratch database created from the DATABASE_URL
// server (value selection, never a second variable) and always dropped.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
