/**
 * packages/db — the ONLY package permitted to touch the database.
 *
 * Owns: Drizzle schema, migrations, repositories, seeders, transaction helpers.
 * Must never contain: business rules, HTTP concerns, model calls.
 *
 * Transaction boundary: this package exports a single `withTransaction`
 * helper. ONE transaction per command, opened by the application service,
 * never by a repository and never by a route handler. Repositories assume they
 * run inside an ambient transaction supplied by the caller
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
 * Phase 1 Task 1 scope: workspace skeleton only. No schema, no migrations, no
 * repositories. Drizzle ORM and Drizzle Kit are approved Phase 1 dependencies
 * (14.1) and arrive with Phase 1 Task 4, which needs a provisioned PostgreSQL
 * target (Task 2). Importing them now would install an ORM against an empty
 * package and could not be validated until a database exists.
 *
 * Layout per technical_design/03:
 *   src/schema/          one file per schema subsection
 *   src/repositories/    query layer (technical_design/04)
 *   src/seed/            reference data seeders
 *   migrations/          ordered, forward-only
 */
export {};
