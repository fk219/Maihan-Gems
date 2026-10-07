// Vitest configuration for packages/domain — the unit/domain test layer.
//
// Authority: ADR-021 (ACCEPTED 2026-10-07) — Vitest is the runner for the
// unit, domain, integration and contract layers, with one test config per
// layer. This config covers only this package's colocated *.spec.ts files.
// Integration tests on a real PostgreSQL arrive with a later task's layer.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
