/**
 * packages/domain — the pure domain layer.
 *
 * Owns: entities, invariants, value objects, pure algorithms
 *       (Gemstone, GemstonePair, Setting, SettingVariant, Product).
 *
 * Must never contain: SQL, HTTP, config, Redis, model SDKs.
 * Any need for I/O is a signal the logic is in the wrong layer.
 * `now()` is passed in, never called inside domain logic.
 *
 * This package declares ZERO runtime dependencies. Per technical_design/02
 * validation rule 2 it may declare only Zod, and only if types need runtime
 * parsing. CI asserts this by reading this package.json. (Task 6 needs none.)
 *
 * Task 6 surface: the value objects and the INV-01 / INV-02 / INV-03
 * predicates. The SKU grammar parser is Task 7; the configuration-hash
 * function and slug derivation are Task 8; entities for the remaining
 * aggregates arrive with their own tasks.
 *
 * index.ts is the enforced public surface.
 */
export * from './errors.js';
export * from './enums.js';
export * from './value-objects/index.js';
export * from './product/invariants.js';
export * from './sku/grammar.js';
export * from './configuration/index.js';
