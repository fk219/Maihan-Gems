// Vitest configuration for tools/migrate — the migration-tool integration
// layer.
//
// ADR-021 (ACCEPTED 2026-10-07): Vitest is the runner for unit, domain,
// integration and contract layers. This covers only this package's colocated
// src/*.spec.ts files (never the compiled dist/): the manifest parsing
// rules and the three mandatory runner gates (hash-mismatch refusal,
// resumability, idempotency) on disposable fixtures + a disposable scratch
// database.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
