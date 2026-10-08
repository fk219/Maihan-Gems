// Vitest configuration for apps/web — the HTTP/API contract layer.
//
// ADR-021 (ACCEPTED 2026-10-07): Vitest runs the unit, domain, integration
// and contract layers, one config per layer. This config covers the API
// surface specs colocated under src/: route handlers, envelopes, cache keys,
// rate limiting and response headers. Database-backed suites inside
// packages/db keep their own config and their own graceful skip rules.
//
// `server-only` resolves to its empty "react-server" build in tests: the
// package's guard exists to fail CLIENT bundles, and vitest's node
// environment is a server context.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'server-only': new URL('./node_modules/server-only/empty.js', import.meta.url).pathname,
    },
  },
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    environment: 'node',
  },
});
