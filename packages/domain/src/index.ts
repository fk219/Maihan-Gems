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
 * parsing. CI asserts this by reading this package.json.
 *
 * Phase 1 Task 1 scope: workspace skeleton only. No domain logic exists yet.
 * Value objects and the INV-01 / INV-02 / INV-03 predicates are Phase 1 Task 6.
 *
 * The directory layout inside src/ is defined by technical_design/03:
 *   src/<aggregate>/  entities, invariants, value objects
 */
export {};
