# 29 DEPLOYMENT ARCHITECTURE

**Package:** `technical_design/` doc 29 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 29, charter sections 7, 8, 14.
**Evidence status:** `[INFERRED]`.

---

## Purpose

Define the deployment topology, platform portability boundaries, environment strategy, connection management, release process and secret handling.

## 1. Topology `[INFERRED]` per charter 7, 8 and 14

| Component | Platform | Trigger |
|---|---|---|
| Storefront and API | Vercel | commits to main |
| Background worker | cron plus a long-running worker | scheduled and queue-driven |
| Primary database | Neon PostgreSQL, pooled | always on |
| Read replica | Neon | always on |
| Cache | managed Redis | always on |
| Object storage | Cloudflare R2 | always on |
| Image CDN | ImageKit | always on |
| AI gateway | Vercel AI Gateway with OpenRouter fallback | always on |
| Search | Postgres full text plus pgvector | always on |
| WhatsApp | Meta WhatsApp Cloud API | always on |
| Observability | OpenTelemetry collector plus a metrics backend | always on |
| Secrets | platform environment secrets | always on |
| Email | provider TBD `[UNKNOWN]` | transactional |

Search running inside Postgres is a consequence of the corpus size. At 1,024 products, 10,349 variants and 19,665 stones, an external search cluster adds operational surface without adding capability, and `pg_trgm` plus `tsvector` plus `pgvector` covers doc 12's requirements in one system.

## 2. Portability

Business and domain logic must not depend on Vercel-specific behaviour.

| Rule | Implementation |
|---|---|
| No Vercel-only APIs in domain or application code | Enforced by an architecture test on the import graph |
| Queues behind a port | `QueuePort` with a Vercel implementation and a Postgres-polling fallback |
| Storage behind a port | `ObjectStorePort` |
| Database | The same repository code runs against any Postgres |
| AI behind a port | `ModelGateway` (doc 18) |
| Commerce behind a port | `PaymentProvider` (doc 13) |

Portability is bought with interfaces at the boundary and enforced by a test. Without the architecture test, the first `import { ge } from '@vercel/functions'` in a service file starts an erosion that is invisible until a migration is impossible.

## 3. Environments

| Environment | Database | Data | Purpose |
|---|---|---|---|
| local | local Postgres or a Neon dev branch | seeded subset | development |
| preview | a Neon branch per PR | synthetic | PR validation, migration verification |
| staging | Neon staging | anonymised, production-shaped | load test, AI evaluation, migration rehearsal |
| production | Neon primary with a read replica | real | live |

**Never point production code at a non-production database.** Enforced by a startup environment guard that refuses to boot on a mismatch.

Staging holds anonymised production-shaped data specifically so migration rehearsal and AI evaluation are meaningful. Synthetic-only staging cannot surface a migration failure that depends on real value distributions.

## 4. Connection management

| Concern | Rule |
|---|---|
| Serverless | Neon pooled connections |
| Worker and migrations | a small direct-connection pool |
| Transaction pooling | Unsafe with interactive transactions, so explicit transactions run on a dedicated connection |
| Migrations | a single serialised job; concurrent attempts blocked by an advisory lock |
| Retries | Exponential backoff with jitter |
| Timeouts | `statement_timeout` set per role, not globally |

`statement_timeout` per role rather than global exists so a runaway reporting query cannot exhaust the pool while a checkout transaction still completes. A single global timeout is one bad query away from failing customers' payments.

## 5. Release strategy

Trunk-based with feature flags.

### Migration safety: expand-then-contract

```text
Release 1: add nullable column           (expand)
Release 1: deploy code that dual-writes
Release 2: backfill in batches, resumable
Release 3: read from the new column
Release 4: stop writing the old column
Release 5: drop the old column           (contract)
```

| Rule | Reason |
|---|---|
| Forward-only | Rollback of a migration is unreliable once data has moved |
| Expand-then-contract | Old and new code coexist during a rollout |
| No destructive migration with the code that stops using the column | The old code version is still running somewhere during a rollout |
| Every migration has a tested rollback, or an explicit irreversibility note | Silence about irreversibility is how a mistake becomes an incident |

## 6. CI/CD pipeline

```text
lint -> typecheck -> unit tests -> architecture tests -> build
     -> migration verification on a preview branch
     -> integration tests -> contract tests
     -> deploy preview
     -> staging: smoke + AI evaluation
     -> production: canary -> full
```

| Gate | Fails on |
|---|---|
| Architecture tests | Forbidden imports, PII in metric labels, alert without a runbook, unknown block types |
| Migration verification | A migration that fails or is destructive without a note |
| Contract tests | A breaking API change |
| AI evaluation | A `grounded_ratio` or refusal-accuracy regression |
| Budget checks | Bundle size, AR asset budgets, AR payload sizes |

The AI evaluation gate is included because a model, prompt or retrieval change can silently degrade answer quality while every functional test still passes.

## 7. Secrets

`DATABASE_URL`, `REDIS_URL`, `R2_*`, `IMAGEKIT_*`, `AI_GATEWAY_*`, `OPENROUTER_API_KEY`, `WHATSAPP_*`, `PAYMENT_*`, `OTEL_*`.

| Rule | Detail |
|---|---|
| Never in the repository | Enforced by secret scanning in CI and on commit |
| Never in the database | No secret in a `feature_flags` row or any config table |
| Never in a log line | CI check plus runtime redaction |
| Never in a trace | Span attributes are allow-listed (doc 28) |
| Rotation | Documented per secret; rotation is a rehearsed runbook, not an improvisation |
| Least privilege | Per-environment credentials; production credentials never reach staging |

## 8. Validation rules

1. A startup guard refuses to boot when the environment and database do not match.
2. Domain and application code imports no platform-specific SDK.
3. Every external dependency is reached through a port interface.
4. Migrations are forward-only, serialised by advisory lock, and expand-then-contract.
5. No secret appears in the repository, the database, a log or a trace.
6. A destructive migration ships in a release later than the code that stops using the column.
7. Feature flags gate unfinished work rather than partial deploys.

## 9. Error handling

| Condition | Behaviour |
|---|---|
| Failed migration | Roll the release back; the advisory lock releases; no partial state |
| Canary regression | Automatic rollback on error-rate or latency breach |
| Preview deploy failure | PR marked failed; no production impact |
| Staging drift | Staging rebuilt from migrations, never hand-patched |
| Provider outage | Degradation per doc 25 section 12; no failover to an unvetted path |
| Secret expiry | Runbook-driven rotation with an alert on approaching expiry |

## 10. Security boundaries

- Production credentials exist only in the production environment.
- Production database access is IP-restricted and requires MFA on the console.
- Preview and staging contain no real customer data.
- Secrets are never passed to a browser bundle; no `NEXT_PUBLIC_` secret exists.
- The deployment pipeline has no production write access to the media store beyond its service account.

## 11. Observability

Metrics: deploy frequency, lead time, change failure rate, canary error rate, migration duration, pipeline success rate, environment guard activations. Alerts on a canary breach (auto-rollback also fires) and on any migration that takes longer than its budget, which usually indicates a lock waiting.

## 12. Testing requirements

| Test | Proves |
|---|---|
| Import-graph test | No platform SDK or repository import is reachable from domain code |
| Environment guard | A mismatch refuses to boot |
| Migration rehearsal | Every migration applies and rolls back on a preview branch |
| Expand-then-contract | Old and new code coexist against one schema |
| Secret scan | No secret in the repository, logs or traces |
| Canary | A regression triggers automatic rollback |
| Data-shape test | Staging matches production's distribution well enough for load testing |
| AI evaluation gate | A grounding regression blocks release |

## 13. Failure modes

| Failure | Behaviour |
|---|---|
| Bad migration | Release rolled back; advisory lock released |
| Canary regression | Automatic rollback |
| Platform outage | Cache and CDN absorb reads; transactional routes degrade per doc 25 |
| Secret leaked | Rotate immediately via runbook; audit log review |
| Environment mismatch | Startup guard refuses to boot |
| Long migration | Alert; investigate lock contention before retrying |

## 14. Implementation constraints

1. Domain and application code never imports a platform-specific SDK.
2. Migrations are forward-only, expand-then-contract, serialised and rehearsed.
3. No secret in the repository, database, log or trace.
4. Production credentials never reach a non-production environment.
5. A startup guard enforces the environment-to-database match.
6. Feature flags gate unfinished work.

## Evidence status

`[INFERRED]` throughout. No source artefact describes a deployment pipeline; the source was deployed as a server-rendered Nuxt application. The topology is proposed. Two decisions are worth flagging as genuine choices rather than defaults: keeping search inside Postgres (justified by the observed corpus size of 1,024 products and 19,665 stones) and running Postgres search rather than a dedicated cluster, which would be revisited if the catalogue grows by an order of magnitude. The payment and email providers remain `[UNKNOWN]` and are explicit open decisions (doc 38).