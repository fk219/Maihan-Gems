# 01 SYSTEM ARCHITECTURE

**Package:** `technical_design/` doc 01 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` (LOCKED). This document implements it; it does not restate or revise it.
**Evidence status of this document:** `[INFERRED]` — a target design derived from locked decisions. Contains no new architecture.

---

## Purpose

Define exactly how the locked architecture is realised as running software: components, boundaries, data flow, and the rules that make the boundaries enforceable rather than aspirational.

## Responsibilities

This document owns: component inventory, boundary definitions, dependency direction, request and event flow, degradation behaviour, and the boundary-enforcement mechanism.

It does **not** own: table definitions (04), module internals (07), API shapes (06, 34), deployment topology (30).

## Components

| Component | Responsibility | Owns state | Scale axis |
|---|---|---|---|
| `apps/web` | Storefront rendering, admin surface, AI streaming, AR route, all HTTP route handlers | none | horizontal, serverless |
| `apps/worker` | Background job execution, event dispatch, scheduled sweeps | none | horizontal, queue-partitioned |
| `packages/db` | Drizzle schema, migrations, repositories, seeders | schema only | n/a |
| `packages/domain` | Pure entities, invariants, value objects | none | n/a |
| `packages/contracts` | Zod DTOs, event schemas, generated OpenAPI | none | n/a |
| `packages/config` | Env parsing, feature flags, constants | none | n/a |
| `packages/observability` | Tracing, logging, metric names | none | n/a |
| `packages/ai` | Model gateway, tool registry, orchestrator, guardrails | none | semaphore-bounded |
| `tools/migrate` | Import pipeline CLI | none | batch |

## Dependency direction (enforced, not conventional)

```
apps/web  ──────────────┐
apps/worker ────────────┤
                        ├──> packages/contracts ──> (zod only)
                        ├──> packages/domain     ──> (no I/O, no framework)
                        ├──> packages/db         ──> packages/domain
                        ├──> packages/ai         ──> packages/domain, packages/contracts
                        ├──> packages/config
                        └──> packages/observability
```

Forbidden, enforced by ESLint `no-restricted-imports`:

| Forbidden | From | To | Reason |
|---|---|---|---|
| any import | `packages/domain` | `packages/db`, `apps/*`, drizzle, pg, redis, node fs/net | domain must stay pure and testable |
| any import | `packages/domain` | `packages/ai` | domain must not know the model exists |
| deep import across modules | `modules/a/**` | `modules/b/infrastructure/**` | modules communicate through application services only |
| deep import | any | `modules/*/` other than `index.ts` | `index.ts` is the enforced public surface |
| import | `tools/migrate` | `apps/web`, `apps/worker` | migration tooling is standalone |
| import | `packages/ai` | `packages/db` repositories directly | AI reaches data only via other modules' query services (ADR-003) |
| `process.env` read | `packages/domain` | any | configuration only via `packages/config` |

The last row of forbidden imports is the structural half of ADR-003: because `packages/ai` cannot import a repository, the AI module has no write path to hold, independent of any prompt.

## Request flow

```
1  Route handler receives request
2  Session resolved                    -> identity or anonymous session id
3  Rate limit checked                  -> Redis, Postgres fallback
4  DTO parsed and validated            -> Zod, reject unknown fields
5  Idempotency-Key resolved            -> replay returns original result
6  Application service invoked         -> exactly one, no logic in handler
7  Authorization policy evaluated      -> in code, outside any model
8  Domain logic invoked                -> pure, returns a decision
9  Repository accessed                 -> SQL only
10 Transaction committed               -> state change + outbox event, one transaction
11 Result serialized                   -> DTO, never raw rows
12 Cache written if cacheable          -> tagged, event-invalidated
13 Audit row written if mutating       -> actor, entity, before, after
14 Trace span closed                   -> trace_id echoed
```

## Event flow

```
Command commits -> domain_events row (same transaction, ADR-020)
                -> dispatcher polls PENDING
                -> PUBLISHED
                -> consumers read, record in event_consumers (idempotent)
                -> cache invalidation / embedding / sitemap / analytics
```

Ordering guarantee is per aggregate, never global. At-least-once delivery with idempotent consumers.

## Degradation matrix

| Failure | Behaviour | Implemented in |
|---|---|---|
| Redis down | Caches bypassed; rate limits fall back to `rate_limit_counters`; catalogue and search stay correct, slower | 25 |
| Postgres down | Hard fail for transactional routes; cached public reads serve marked stale; cart and checkout fail **closed** | 25, 13 |
| Vector index unavailable | Semantic arm disabled; structured plus full-text continues | 12 |
| AI gateway down | Graceful message plus human handoff; catalogue unaffected | 18 |
| CDN down | Origin serves directly | 24 |
| Object storage down | Catalogue imagery degrades to source URL; document access fails closed | 24 |
| Job queue down | Commands still commit; events accumulate in `domain_events` as PENDING | 26, 27 |

The invariant behind every row: **no degradation turns a cache into truth, or a failure into a wrong answer.**

## Dependencies

Locked stack only: Next.js, Neon PostgreSQL with pgvector, Redis, Cloudflare R2, ImageKit, Vercel, Vercel AI Gateway with OpenRouter, Meta WhatsApp Cloud API, Drizzle, MediaPipe, Three.js.

No additional runtime technology is introduced by this design.

## Outputs

- Enforceable boundary rules (ESLint config plus a CI job)
- Component responsibility map
- Request and event flow sequences
- Degradation matrix

## Observability

Every request carries a `trace_id` from edge to repository, propagated into `domain_events.metadata.trace_id` and `jobs.payload`. Metric labels must never contain user id, email, SKU or URL (cardinality control).

## Testing requirements

| Test | Proves |
|---|---|
| Boundary lint | No forbidden import exists |
| Domain purity test | `packages/domain` imports nothing from I/O modules |
| AI write-path test | `packages/ai` exposes zero mutating capabilities and holds no repository handle |
| Degradation tests | Each matrix row behaves as documented |
| Trace propagation test | `trace_id` survives command, job and event |

## Failure modes

| Failure | Detection | Response |
|---|---|---|
| Boundary erosion via direct import | CI lint | Block merge |
| Circular module dependency | CI lint plus import-graph test | Block merge |
| Accidental second AI brain | Tool-registry equality test | Block merge |
| Cache used as truth | Code review plus no-truth-in-Redis test | Block merge |

## Implementation constraints

1. Route handlers contain no business logic. A handler reads a session, validates, calls one service, serializes.
2. One transaction per command. Events are written inside it.
3. `now()` is passed in, never called inside domain logic.
4. No configuration in code.
5. No new technology without an ADR.

## Evidence status

`[INFERRED]`. Every component and boundary traces to `PROJECT_SOURCE_OF_TRUTH.md` sections 8, 10, 12, 29, 30. No new architectural claim is made here.