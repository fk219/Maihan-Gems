/**
 * packages/contracts — DTO and event schemas.
 *
 * Owns: Zod DTOs, event payload schemas, OpenAPI generation.
 * Must never contain: logic beyond parsing and coercion.
 *
 * Unknown fields are REJECTED (`.strict()`), not silently ignored. An unknown
 * field is a 400, not a discarded input.
 *
 * Phase 3 (tasks 1-5) surface: the catalogue DTO layer — read models for the
 * product / gemstone / setting / taxonomy families, the structured filter
 * contracts, the deterministic keyset-cursor contract, the facet set
 * contract, provenance enforcement, the closed catalogue error registry and
 * the CatalogQueryPort interface (implemented in packages/db, Phase 5 swaps
 * the implementation behind it).
 *
 * Layout remains per technical_design/03:
 *   src/dto/<module>/   input and output schemas
 *   src/events/         event payload schemas
 *   src/generated/      openapi.json (committed, diffed in CI)
 */
export * from './errors.js';
export * from './dto/shared/provenance.js';
export * from './dto/http/envelopes.js';
export * from './dto/http/paths.js';
export * from './dto/catalog/enums.js';
export * from './dto/catalog/filters.js';
export * from './dto/catalog/cursor.js';
export * from './dto/catalog/entities.js';
export * from './dto/catalog/facets.js';
export * from './dto/catalog/taxonomy.js';
export * from './dto/catalog/queries.js';
export * from './dto/catalog/http-query.js';
export * from './dto/catalog/search.js';
export * from './openapi/endpoints.js';
export * from './openapi/generate.js';
export * from './dto/commerce/cart.js';
export * from './dto/commerce/checkout.js';
export * from './dto/commerce/order.js';

