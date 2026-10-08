// Vitest configuration for packages/contracts — the contract layer.
//
// ADR-021 (ACCEPTED): Vitest runs unit/domain/integration/contract suites.
// This config covers the OpenAPI generation tests (plan phase 3 task 8):
// generation, determinism, committed-spec drift, and contract-schema parity.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
