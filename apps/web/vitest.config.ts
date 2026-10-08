// Vitest configuration for apps/web — the HTTP/API contract layer.
//
// ADR-021 (ACCEPTED 2026-10-07): Vitest runs the unit, domain, integration
// and contract layers, one config per layer. This config covers the API
// surface specs colocated under src/: route handlers, envelopes, cache keys,
// rate limiting and response headers. Database-backed suites inside
// packages/db keep their own config and their own graceful skip rules.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
