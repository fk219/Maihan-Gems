# 03 REPOSITORY ARCHITECTURE

**Package:** `technical_design/` doc 03 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 10.2, 10.3, 12.2, 29.
**Evidence status:** `[INFERRED]`.

---

## Purpose

Define the exact monorepo layout, the ownership of each package, and the import rules that make the module boundaries in doc 07 real.

## Layout

```
/
├─ apps/
│  ├─ web/                       Next.js: storefront, admin, AR route, route handlers
│  │  ├─ src/app/                file-system routes (doc 08)
│  │  ├─ src/modules/            the 14 domain modules (doc 07)
│  │  ├─ src/integrations/       WhatsApp, payments, email, storage adapters
│  │  ├─ src/components/         design system + feature components (doc 08)
│  │  └─ next.config.ts
│  └─ worker/                    job runner, event dispatcher, schedulers
│     └─ src/
│        ├─ queues/              queue definitions (doc 27)
│        ├─ handlers/            one module per job type
│        ├─ dispatch/            outbox dispatcher (doc 26)
│        └─ schedules/           cron-equivalent sweeps
│
├─ packages/
│  ├─ db/                        Drizzle schema, migrations, repositories, seeders
│  │  ├─ src/schema/             one file per schema subsection
│  │  ├─ migrations/             ordered, forward-only
│  │  ├─ src/repositories/       query layer (doc 04)
│  │  └─ src/seed/               reference data seeders
│  ├─ domain/                    pure logic; NO I/O, NO framework imports
│  │  └─ src/<aggregate>/        entities, invariants, value objects, *.spec.ts
│  ├─ contracts/                 Zod DTOs, event schemas, OpenAPI generation
│  │  ├─ src/dto/<module>/
│  │  ├─ src/events/
│  │  └─ src/generated/          openapi.json (committed, diffed in CI)
│  ├─ config/                    env schema, feature flags, constants
│  ├─ observability/             tracer, logger, metric registry
│  └─ ai/                        ModelGateway, tool registry, orchestrator, guardrails
│     ├─ src/gateway/
│     ├─ src/tools/<toolName>/   one directory per tool
│     ├─ src/orchestrator/
│     ├─ src/guardrails/
│     └─ src/eval/
│
├─ tools/
│  └─ migrate/                   import pipeline CLI (doc 33)
│     ├─ src/stages/             extract, stage, parse, validate, canonical, search, embed, verify
│     ├─ src/parsers/            pure slug/SKU/spec parsers
│     ├─ src/gates/              V1-V22 as executable assertions
│     └─ src/cli.ts
│
├─ docs/
│  ├─ adr/                       ADR markdown (doc 40)
│  └─ evidence/
│     └─ MANIFEST.md             storage location, SHA-256, retention class per dataset
│
├─ e2e/                          E2E specs (runner OPEN, ADR-021)
├─ tests/                        integration, security, load (runner OPEN, ADR-021)
│
├─ pnpm-workspace.yaml
├─ package.json
├─ tsconfig.base.json
└─ .eslintrc / eslint.config.*    boundary rules (doc 01)
```

## Package responsibilities

| Package | Owns | Must never contain |
|---|---|---|
| `db` | Schema, migrations, repositories, seeders, transaction helpers | business rules, HTTP concerns, model calls |
| `domain` | Entities, invariants, value objects, pure algorithms | SQL, HTTP, config, Redis, model SDKs |
| `contracts` | Zod schemas, event payload schemas, OpenAPI generation | logic beyond parsing and coercion |
| `config` | Env schema and parsing, constants, flag defaults | secrets themselves |
| `observability` | Tracer, logger, metric name registry | business logic |
| `ai` | Gateway, tools, orchestrator, guardrails, evaluation | any repository handle, any price or inventory mutation |
| `apps/web` | Rendering, route handlers, feature components, integrations | SQL, business logic |
| `apps/worker` | Job handlers, dispatcher, schedules | business logic outside handlers |
| `tools/migrate` | Import pipeline | any import from `apps/*` |

## Forbidden imports (enforced)

```js
// eslint no-restricted-imports, applied per package
'packages/domain'      : ['packages/db', 'packages/ai', 'packages/config',
                           'apps/*', 'drizzle-orm', 'pg', 'ioredis', 'next/*', 'react', 'node:*']
'packages/contracts'   : ['packages/db', 'apps/*', 'drizzle-orm']
'packages/ai'          : ['packages/db/src/repositories/**']   // queries only, via other modules
'packages/db'          : ['apps/*', 'packages/ai']
'apps/web/src/modules/a': ['apps/web/src/modules/b/infrastructure/**']
```

## Module public surface

Each of the 14 modules exports only through its `index.ts`:

```
src/modules/<module>/
├─ domain/           entities, invariants, value objects, *.spec.ts
├─ application/
│  ├─ commands/      one file per use case: createX.ts, updateX.ts
│  ├─ queries/       read models
│  ├─ services/      orchestration, transactions, event emission
│  ├─ dto/           Zod input and output
│  ├─ policies/      authorization rules
│  └─ events/        event type definitions and handlers
├─ infrastructure/
│  ├─ repositories/  Drizzle queries only
│  ├─ mappers/       row <-> domain object
│  └─ events/        outbox publisher, consumers
└─ index.ts          the ONLY public surface
```

Import rule: `import { getProductBySlug } from '@/modules/catalog'`. Any other path into a module is a lint error. This is what makes "modules communicate through application services" mechanically true rather than a convention.

## Transaction boundary helper

`packages/db` exports a single `withTransaction` helper. Rule: **one transaction per command**, opened by the application service, never by a repository and never by a route handler. Repositories assume they run inside an ambient transaction supplied by the caller.

## Boundary between web and worker

| Concern | web | worker |
|---|---|---|
| Reads | Yes | Yes, via repositories |
| Command execution | Yes, synchronously | Yes, as job handlers |
| Event emission | Writes `domain_events` in-transaction | Dispatches, does not emit business events |
| Transaction scope | One command | One job |
| HTTP concerns | Yes | No |

Both import the same `packages/domain` and `packages/db`. Neither imports the other.

## What is deliberately NOT in the repository

The reverse-engineering datasets. `docs/evidence/MANIFEST.md` records storage location, SHA-256 and retention class for each; `tools/migrate` reads them from a configured path at runtime, never from the repo. Rationale and full disposition are in `INITIAL_IMPLEMENTATION_PLAN.md` section 22.4.

## Dependencies

pnpm workspaces, TypeScript project references, ESLint. All already implied by the locked stack (doc 02). No new tooling.

## Validation rules

1. CI runs the boundary lint as a **blocking** job.
2. CI diffs generated `openapi.json`; drift fails the build.
3. CI asserts `packages/domain` has zero non-type runtime dependencies by reading its `package.json`.
4. CI asserts the workspace dependency graph matches doc 02.

## Outputs

- Workspace that builds with `pnpm install && pnpm build`
- Boundary enforcement that fails the build on violation
- A committed OpenAPI artefact that is diffed on every change

## Observability

Each package emits structured logs with `trace_id`. Package-level span naming convention: `<package>.<module>.<operation>`, for example `db.catalog.getProductBySlug`.

## Testing requirements

| Test | Boundary proven |
|---|---|
| Domain purity | `packages/domain` imports nothing from I/O |
| Module public surface | No deep cross-module imports |
| Dependency graph | Matches doc 02 |
| Transaction helper | Nested `withTransaction` is rejected |
| OpenAPI drift | Contracts match implementation |

## Failure modes

| Failure | Detection | Response |
|---|---|---|
| Forbidden import | CI lint | Block merge |
| Circular package dependency | CI graph check | Block merge |
| Domain gains a runtime dependency | CI package.json check | Block merge |
| Stale OpenAPI | CI diff | Block merge |

## Implementation constraints

1. `packages/domain` must stay pure. Any need for I/O is a signal the logic is in the wrong layer.
2. Module `index.ts` is the contract; changing it is a breaking change requiring an ADR if it alters a published API.
3. No package may read `process.env` except `packages/config`.
4. `tools/migrate` is standalone and must never be imported by a runtime app.

## Evidence status

`[INFERRED]`. The layout implements Source of Truth sections 10.2 and 10.3, which fix the module list, the layer contract and the rule that modules communicate through application services. No new component or package is introduced.