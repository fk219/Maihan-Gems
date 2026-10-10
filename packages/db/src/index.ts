/**
 * packages/db — the ONLY package permitted to touch the database.
 *
 * Owns: Drizzle schema, migrations, repositories, seeders, transaction helpers.
 * Must never contain: business rules, HTTP concerns, model calls.
 *
 * Transaction boundary: this package exports a single `withTransaction`
 * helper. ONE transaction per command, opened by the application service,
 * never by a repository and never by a route handler. Repositories assume
 * they run inside an ambient transaction supplied by the caller
 * (technical_design/03).
 *
 * The schema is LOCKED and validated: 74 tables, 33 enums, 94 foreign keys,
 * 591 CHECK constraints, 263 indexes, 9 named invariant constraints,
 * 6 RLS tables with 6 policies and 0 policy-less gaps, 2 HNSW indexes,
 * 1 trigger, 1 view, 2 functions. Nine invariant constraints are DATABASE
 * constraints, not application checks; application code must not duplicate
 * them, and tests must prove they bite.
 *
 * Drizzle ORM is the only permitted ORM (SKILL_MATRIX_AND_TOOLING.md 13.1;
 * Prisma, TypeORM, Kysely, MikroORM, Sequelize and Knex are rejected).
 *
 * Phase 1 delivered (in implementation order): the DDL migration runner
 * (Task 4, `migrate.ts`), the schema-fidelity toolchain (Task 5), and the
 * reference-data seeder (Task 9, `seed/`).
 *
 * Phase 3 (tasks 1-5) delivered the catalogue READ foundation: the read
 * repositories (products / gemstones / settings / taxonomy), the structured
 * filter + facet + keyset-cursor machinery, and the CatalogQueryPort
 * implementation. Catalogue reads are read-only; no write path exists.
 *
 * index.ts is the enforced public surface of the package. The migration
 * tooling (tools/migrate) consumes the runner and the seeder through this
 * surface only.
 *
 * Layout per technical_design/03:
 *   src/schema/          one file per schema subsection (arrives with the
 *                        Drizzle TS-schema mirror task)
 *   src/repositories/    query layer (technical_design/04, later task)
 *   src/seed/            reference data seeders
 *   migrations/          ordered, forward-only
 */
export {
  runMigrations,
  defaultMigrationsFolder,
  type RunMigrationsOptions,
  type RunMigrationsResult,
} from './migrate.js';
export {
  seedReferenceData,
  type ReferenceSeedCounts,
} from './seed/reference-seed.js';
export {
  EXPECTED_REFERENCE_COUNTS,
  METAL_SEED,
  JEWELLERY_TYPE_SEED,
  SETTING_STYLE_SEED,
  TREATMENT_SEED,
  TREATMENT_LABEL_SEED,
  COLOUR_INTENSITY_SEED,
  CLARITY_SEED,
  CLARITY_LABEL_SEED,
  type MetalSeedRow,
  type JewelleryTypeSeedRow,
  type SettingStyleSeedRow,
  type TreatmentSeedRow,
  type ColourIntensitySeedRow,
  type ClaritySeedRow,
} from './seed/reference-data.js';
export {
  createCatalogDatabase,
  type CatalogDatabase,
} from './catalog/executor.js';
export { createPool, type CreatePoolOptions } from './pool.js';
export {
  incrementRateLimitCounter,
  type RateLimitIncrement,
} from './operations/rate-limit-counter.js';
export {
  createCatalogQueryPort,
} from './catalog/port.js';
export {
  VectorCircuitBreaker,
  defaultVectorCircuitBreaker,
  type CircuitBreakerState,
  type CircuitBreakerOptions,
} from './search/circuit-breaker.js';
export {
  createCart,
  getCartByToken,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  mergeGuestCart,
} from './commerce/cart-repository.js';
export {
  reserveStockForCart,
  releaseStockForSession,
  isGemstoneReserved,
} from './commerce/inventory-reservation.js';
export {
  createCheckoutSession,
  getCheckoutSession,
  saveCheckoutSession,
  submitShippingCheckpoint,
  submitPaymentCheckpoint,
  submitConfirmCheckpoint,
} from './commerce/checkout-session-repository.js';
export type { CatalogQueryPort } from '@maihan/contracts';

