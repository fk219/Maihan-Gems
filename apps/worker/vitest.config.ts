// Vitest configuration for apps/worker — the dispatch/email unit layer.
//
// ADR-021 (ACCEPTED 2026-10-07): Vitest is the runner. This config covers the
// colocated *.spec.ts files under src/: the outbox dispatcher, the job runner,
// the notification handlers, and the email transports.
//
// No database. The dispatcher suites use an in-memory executor that emulates
// the SQL surface of `packages/db/src/worker`, so they prove the claim/handle/
// mark lifecycle, not PostgreSQL semantics. The repository statements
// themselves are pinned in packages/db's own specs.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
