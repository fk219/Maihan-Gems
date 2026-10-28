# SKILL MATRIX AND TOOLING

**Stage:** Planning artifact for the next coding stage. Not an implementation document.
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md`; `INITIAL_IMPLEMENTATION_PLAN.md`; `technical_design/01-40`; validated reverse-engineering package; architecture-lock validation results.

**This document does not redesign the architecture, does not select tooling the authoritative documents leave open, and does not install anything.**

> **UPDATE 2026-10-28 (ADR-035):** the migration tooling rows in this matrix
> (corpus-import skills, `tools/migrate` approvals) are **descoped** for future
> schema work — the fresh clean database uses a one-off cleaning script with an
> acceptance gate (`technical_design/41` §6). No new tools are approved by this
> note; existing approvals are unchanged.

---

## 1. EXECUTIVE SUMMARY

### Purpose

Define exactly which skills, tools, libraries, SDKs, CLIs and external integrations are required to implement the locked architecture, in which phase each is needed, whether it is approved, and what remains undecided. This document becomes the authority for the coding stage.

### Current architecture status

| Dimension | Status |
|---|---|
| Architecture lock | **LOCKED.** Validated by live execution against a disposable PostgreSQL 16.2 instance |
| Schema validation | 16 SQL blocks, 262 statements, 16/16 OK. 74 tables, 33 enums, 94 FKs, 59 UNIQUE, 591 CHECK, 263 indexes (12 GIN), 2 HNSW, 1 trigger, 1 view, 2 functions, 6 RLS tables with 6 policies and 0 policy-less gaps |
| Extension availability | `vector` 0.6.2 executed. `citext`, `pg_trgm`, `unaccent`, `btree_gin` **statically validated only** (absent from the validation build; standard on Neon) |
| Phase 0 defects | 11 found and fixed, all genuine |
| Technical design | 40/40 documents written and internally validated |
| Implementation plan | 13 phases, dependency graph, MVP chain 1 to 6 |
| ADRs | 20 Accepted and inherited unchanged; 4 Proposed (021 to 024) |

### Current implementation status

**Zero application code exists.** No repository, no migrations, no packages, no tests, no infrastructure. Nothing has been built.

### Validated numbers that constrain implementation

These are the figures every skill in this matrix must satisfy. They come from `INITIAL_IMPLEMENTATION_PLAN.md` section 2.1 and are not negotiable.

| Fact | Value | Tag |
|---|---|---|
| Total source URLs | 44,218 | `[OBSERVED]` |
| Commerce URLs absent from `products.jsonl` | 33,934 | `[VERIFIED][EXTRACTED]` |
| `products.jsonl` records | 1,245, which is 2.4% of commerce URLs and **not** the catalogue | `[OBSERVED]` |
| Setting design cores | 951 | `[VERIFIED]` |
| **Setting variants (design x metal)** | **10,349** | `[VERIFIED]` |
| Distinct stone references | 19,665 loose stones + 3,072 pairs | `[VERIFIED]` |
| DYO configurations | 9,812 URLs, of which 1,024 have an observed SKU and 221 a derived SKU only | `[OBSERVED]` |
| Ready-made products | 88 | `[OBSERVED]` |
| Media records | 241,961, of which roughly 44,480 are product media | `[VERIFIED]` |
| Recovered prices | 1,024, range $1,074 to $17,599 | `[VERIFIED]` |
| `price == weight x per_carat` | **0 of 1,024** | `[VERIFIED]` |
| Schema objects | 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes | Validated |

### Skill and tooling status

| Area | Status |
|---|---|
| Locked technology stack (22 items) | **APPROVED** in `technical_design/02` |
| Core engineering, database, migration, backend, frontend skills | **APPROVED** |
| Test runner, E2E driver | **APPROVED — ADR-021 ACCEPTED 2026-10-07** (Vitest; Playwright for E2E when its phase requires it) |
| Load-test tool | **OPEN** — not covered by ADR-021's decision; needed at Phase 13 |
| Design-system primitives | **OPEN — ADR-022** |
| AI evaluation harness | **OPEN — ADR-023** |
| Provenance storage design | **OPEN — ADR-024** |
| Payment, tax, shipping, discount, refund providers | **UNKNOWN** — client decisions |
| Vision/OCR model | **UNKNOWN** — client decision within the locked `ModelGateway` |
| Email provider | **DEFERRED** |

### Is coding allowed yet

**NOT YET.** ~~Four gates block the first coding task~~ **Update 2026-10-07: coding is under way (Tasks 1, 2, 4, 5 complete; Task 6 authorised). The gate list below is the record of the pre-coding state; only the ADR-021 entry changed status:**

1. **~~ADR-021 (test tooling) is unresolved~~ RESOLVED 2026-10-07: ADR-021 ACCEPTED by explicit user authorization** (Vitest for unit/domain/integration/contract; Playwright for E2E, not installed until required). Unit tests may be written on Vitest from Task 6 onward.
2. **ADR-022 (design system)** is unresolved. Not required for Phase 1, required for Phase 4.
3. **Migration-critical evidence retention** is not yet secured. Plan task 3 requires `docs/evidence/MANIFEST.md` with verified checksums, and it has no dependency, so it can be done immediately.
4. **Extension availability on the target Neon instance** is structurally validated only. This is the first technical unknown for Phase 1.

No architectural contradiction blocks Phase 1. What blocks it is a set of approvals and verifications, not design.

### Binding prohibitions for the coding stage

```
NO APPLICATION CODE                          until Phase 1 gate approval
NO DATABASE MIGRATIONS                       until the coding phase is authorised
NO MANAGED / PRODUCTION DATABASE ACCESS      at any point without explicit authorisation
NO SOURCE-EVIDENCE MODIFICATION              crawler.sqlite and raw HTML are read-only, permanently
NO TOOL OR DEPENDENCY INSTALLATION           until the installation policy in Section 14 permits it
NO SILENT ADR RESOLUTION                     Proposed ADRs are not Accepted
```

### Remaining approval gates

| Gate | Blocks | Owner |
|---|---|---|
| ~~ADR-021 test tooling~~ **RESOLVED 2026-10-07 — ACCEPTED by explicit user authorization** | ~~Phase 1 task 6 onward~~ — | — |
| ADR-022 design system | Phase 4 | Client / `ADMIN_SUPER` |
| ADR-023 evaluation harness | Phase 9 | Client / `ADMIN_SUPER` |
| ADR-024 provenance storage | Phase 2 | Client / `ADMIN_SUPER` |
| Evidence retention manifest | Phase 1 task 3 | `MIGRATION_ENGINEER` |
| Neon dev branch provisioning | Phase 1 task 2 | Engineering |
| Extension availability confirmation | Phase 1 migrations | Engineering |
| Payment provider | Phase 6 | Client |
| Vision/OCR model | Phase 8 | Client |
| Email provider | Phase 6 | Client |

---

## 2. LOCKED TECHNOLOGY INVENTORY

Extracted from `technical_design/02_TECH_STACK.md` and confirmed against `PROJECT_SOURCE_OF_TRUTH.md` sections 8, 10, 11, 16 and 29. No additions. No alternatives.

### 2.1 Classification key

| Class | Meaning |
|---|---|
| **APPROVED** | Named in the locked architecture; may be installed at the phase named |
| **PHASE-ENTRY DEPENDENCY** | Approved, but the account, credential or instance must exist before the phase can start |
| **OPEN** | The architecture deliberately left it undecided; requires an ADR |
| **DEFERRED** | Deliberately postponed; not required for MVP |
| **REJECTED** | Explicitly excluded; introduction requires an ADR superseding the named one |

### 2.2 The inventory

| # | Technology | Version target | Role | Class | Phase |
|---|---|---|---|---|---|
| 1 | Next.js App Router | current LTS | Storefront, admin, AR route, route handlers | APPROVED | 4 |
| 2 | TypeScript | 5.x | All application and tooling code | APPROVED | 1 |
| 3 | Neon PostgreSQL | 16+ | Transactional truth, full text, vectors | APPROVED | 1 |
| 4 | pgvector | 0.6+ | `vector(1024)`, HNSW | APPROVED | 1 |
| 5 | pg_trgm | contrib | Typo tolerance | APPROVED | 5 |
| 6 | unaccent | contrib | Search normalisation | APPROVED | 5 |
| 7 | citext | contrib | `customers.email` | APPROVED | 1 |
| 8 | btree_gin | contrib | Scalar columns inside composite GIN | APPROVED, **deferred use** | 5 |
| 9 | Redis | 7.x | Cache, rate limits, sessions, locks | APPROVED | 1 |
| 10 | Drizzle ORM | current | Schema, migrations, typed queries | APPROVED | 1 |
| 11 | Drizzle Kit | current | Migration generation | APPROVED | 1 |
| 12 | Zod | 3.x/4.x | DTOs, event schemas, config parsing | APPROVED | 1 |
| 13 | Vercel (hosting, cron, env secrets) | - | Deployment target | APPROVED, **phase-entry dependency** | 1 |
| 14 | Cloudflare R2 | - | Originals, renditions, private documents | APPROVED, **phase-entry dependency** | 2 |
| 15 | ImageKit | - | Format negotiation, resizing, delivery | APPROVED, **phase-entry dependency** | 4 |
| 16 | Vercel AI Gateway | - | Model routing behind `ModelGateway` | APPROVED, **phase-entry dependency** | 9 |
| 17 | OpenRouter | - | Fallback provider | APPROVED, **phase-entry dependency** | 9 |
| 18 | Meta WhatsApp Cloud API | - | WhatsApp channel | APPROVED, **phase-entry dependency** | 10 |
| 19 | MediaPipe HandLandmarker (WASM) | - | 21 hand landmarks | APPROVED | 11 |
| 20 | Three.js + WebGL2 | - | PBR scene rendering | APPROVED | 11 |
| 21 | Draco GLB + KTX2 | - | AR geometry and textures | APPROVED | 11 |
| 22 | OpenTelemetry + Sentry-compatible | - | Traces, metrics, logs, errors | APPROVED | 1 |
| 23 | pnpm workspaces | - | Workspace management | APPROVED | 1 |
| 24 | ESLint `no-restricted-imports` | - | Boundary enforcement | APPROVED | 1 |
| 25 | TypeScript project references | - | Cross-package build | APPROVED | 1 |

### 2.3 Extension availability: the one verification gap

| Extension | Validation status | Required by | Action |
|---|---|---|---|
| `vector` 0.6.2 | **Executed** | Phase 1 | None |
| `citext` | Static only | Phase 1 (`customers.email`) | Confirm on target before migrations |
| `pg_trgm` | Static only | Phase 5 | Confirm on target before Phase 5 |
| `unaccent` | Static only | Phase 5 | Confirm on target before Phase 5 |
| `btree_gin` | Static only | Deferred; plan forbids adding it unless facet storage moves to arrays | No action unless that condition arises |

The four statically-validated extensions are standard on the Neon image. This is a verification task, not a design risk, and it belongs to Phase 1 task 2.

### 2.4 Rejected and deferred technologies

| Technology | Class | Reason |
|---|---|---|
| Elasticsearch, Algolia, Typesense, Meilisearch | **REJECTED** | ADR-006. ~33,000 searchable entities; Postgres meets NFR-03 |
| External vector database (Pinecone, Weaviate, Qdrant, pgvector-hosted service) | **REJECTED** | ADR-001, ADR-018. Vectors live with transactional data |
| Microservices | **REJECTED** | ADR-019. Modular monolith; extraction requires a named trigger |
| Event broker (Kafka, RabbitMQ, NATS) | **REJECTED** | ADR-020. Transactional outbox in Postgres is sufficient |
| ORM beyond Drizzle (Prisma, TypeORM, Kysely, MikroORM) | **REJECTED** | Source of Truth section 10.3 names Drizzle as the repository layer |
| GraphQL | **DEFERRED** | No over-fetching problem observed |
| Redis as a write-through store for orders | **REJECTED** | ADR-002. Never truth |
| CDN/vendor migration-runner for raw HTML re-fetch | **DEFERRED** | Only if a later phase requires re-fetching the 502 shells |

**Nothing in this table may be introduced without a new ADR superseding the referenced decision.**

---

## 3. SKILL MATRIX

Every implementation skill required by the locked architecture, grouped A to R. Priority definitions are in Section 10.

### A. Core Engineering

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| TypeScript monorepo authoring | TypeScript 5.x, project references | Every file in the system | 1 | repo root | P0 | APPROVED | - | Yes |
| pnpm workspace management | pnpm | Dependency graph, `pnpm install && pnpm build` | 1 | repo root | P0 | APPROVED | - | Yes |
| Layer and module boundary enforcement | ESLint `no-restricted-imports` | ADR-019 structural guarantee | 1 | repo root | P0 | APPROVED | ADR-019 | Yes |
| Static type checking | `tsc --noEmit` | Strict types across all packages | 1 | repo root | P0 | APPROVED | - | Yes |
| Pure domain logic authoring | TypeScript, zero I/O | Invariants, value objects, parsers | 1 | `packages/domain` | P0 | APPROVED | - | Yes |
| Canonical JSON and SHA-256 hashing | Node `crypto` | Configuration hash | 1 | `packages/domain` | P0 | APPROVED | - | Yes |
| Deterministic serialisation discipline | Canonical JSON with sorted keys | Hash reproducibility | 1 | `packages/domain` | P0 | APPROVED | - | Yes |

### B. Database

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| PostgreSQL DDL authoring | PostgreSQL 16 | 74 tables, 33 enums, constraints | 1 | `packages/db` | P0 | APPROVED | ADR-001 | Yes |
| Constraint modelling (PK, UNIQUE, CHECK, FK) | PostgreSQL | 94 FK, 59 UNIQUE, 591 CHECK | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| Row-level security | PostgreSQL RLS | 6 tables, 6 policies | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| Index design and verification | PostgreSQL, 263 indexes incl. 12 GIN, 2 HNSW | NFR-03 | 1, 5 | `packages/db` | P0 | APPROVED | - | Yes |
| Extension management | `vector`, `citext`, `pg_trgm`, `unaccent` | Schema function | 1 | `packages/db` | P0 | APPROVED, verify on target | - | Yes |
| Trigger and generated-column authoring | `gemstones_search_document_fn` | Search document population | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| View-level enforcement | `certificate_public` | INV-07 unbypassable read model | 1 | `packages/db` | P0 | APPROVED | ADR-012 | Yes |
| Schema introspection testing | `pg_catalog` queries | 74/33/94/591/263 fidelity assertion | 1 | `tests` | P0 | **Depends on ADR-021** | ADR-021 | Yes |
| Connection pooling | Neon pooled + direct pool for worker | Serverless safety, PG-13 | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| Transaction scope discipline | Explicit transactions, per-role `statement_timeout` | Correctness under load | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| Migration authoring | Drizzle Kit | Ordered, forward-only, expand-then-contract | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| Schema-drift detection | Drizzle schema vs migrations | CI gate | 1 | `tests` | P0 | **Depends on ADR-021** | ADR-021 | Yes |

### C. Backend / API

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Zod schema authoring | Zod | Every DTO, event schema, tool input/output | 1 | `packages/contracts` | P0 | APPROVED | - | Yes |
| OpenAPI generation from Zod | Zod-to-OpenAPI | Contract surface | 3 | `packages/contracts` | P1 | APPROVED | - | No |
| Standard error envelope and error registry | Zod-enforced codes | Every endpoint | 1 | `packages/contracts` | P0 | APPROVED | - | Yes |
| Next.js route handlers | Next.js App Router | HTTP boundary | 3 | `apps/web` | P1 | APPROVED | - | No |
| Application-service orchestration | Command pattern | Use cases, transactions | 1 | modules | P0 | APPROVED | - | Yes |
| Policy-based authorisation | Code, outside the LLM | Every privileged path | 1 | modules `policies/` | P0 | APPROVED | ADR-003, ADR-019 | Yes |
| Idempotency key handling | Postgres unique constraint | Every mutating endpoint | 3, 6 | `packages/db`, modules | P1 | APPROVED | - | No |
| Keyset pagination | Deterministic sort tuple | Catalogue lists | 3 | modules `queries/` | P1 | APPROVED | - | No |
| Transactional outbox | Postgres outbox + dispatcher | Reliable events | 1 | `packages/db`, `apps/worker` | P0 | APPROVED | ADR-020 | Yes |
| Idempotent event consumption | `event_consumers` | At-least-once delivery safety | 1 | `apps/worker` | P0 | APPROVED | ADR-020 | Yes |
| Webhook HMAC verification | Raw-body HMAC over `X-Hub-Signature-256` | Every webhook | 6, 10 | `integrations` | P1 | APPROVED | - | No |
| Job queue with leases | `FOR UPDATE SKIP LOCKED`, `locked_until` | 8 named queues | 2 | `apps/worker` | P1 | APPROVED | ADR-020 | No |
| Job idempotency keys | `job_key` natural keys | Retry safety | 2 | `apps/worker` | P1 | APPROVED | ADR-020 | No |
| Redis caching discipline | Redis 7.x, SWR, single-flight | 20-entry cache inventory | 3 | `apps/web`, `apps/worker` | P1 | APPROVED | ADR-002 | No |
| Generation-bump invalidation | Monotonic counter in search keys | Cache safety net | 3, 5 | modules | P1 | APPROVED | ADR-002 | No |

### D. Frontend

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Next.js App Router rendering | RSC, streaming, route groups | All public routes | 4 | `apps/web` | P1 | APPROVED | - | No |
| Server Components and client boundary discipline | RSC | Bundle budget PG-5 | 4 | `apps/web` | P1 | APPROVED | - | No |
| Typed block renderer registry | One component per `content_block_type` | CMS and data-driven pages | 4, 12 | `apps/web` | P2 | APPROVED | - | No |
| Design-system primitives | **UNDECIDED** | Every UI surface | 4 | `apps/web` | P1 | **OPEN** | ADR-022 | No |
| Responsive image delivery | ImageKit, `srcset`, AVIF/WebP | LCP p75 under 2.5s | 4 | `apps/web` | P1 | APPROVED, **phase-entry dependency** | - | No |
| Web Vitals capture | `web-vitals` reporting | PG-1, PG-2 | 4 | `apps/web` | P1 | APPROVED | - | No |
| Structured data emission | JSON-LD Product, BreadcrumbList, Organization | SEO | 4 | `apps/web` | P1 | APPROVED | - | No |
| Sitemap generation | Sharded, generated not migrated | 44 shards | 4 | `apps/web` | P1 | APPROVED | - | No |
| Keyboard and focus management | Native semantics, focus trap and restore | WCAG 2.2 AA | 4, 7 | `apps/web` | P1 | APPROVED | - | No |
| Colour-independent meaning | Text labels on every swatch and badge | Accessibility and disclosure | 4 | `apps/web` | P1 | APPROVED | - | No |
| `Intl`-based formatting | Dates, numbers, currency | Locale readiness | 4 | `apps/web` | P2 | APPROVED | - | No |
| Reduced-motion handling | `prefers-reduced-motion` | AR and page transitions | 4, 11 | `apps/web` | P2 | APPROVED | - | No |

### E. Commerce

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Cart lifecycle | Postgres cart and cart items | `/cart` | 6 | modules `commerce` | P1 | APPROVED | - | No |
| Four-step checkout with server checkpoints | Observed 4-route funnel | Checkout | 6 | modules `commerce` | P1 | APPROVED | - | No |
| Money arithmetic discipline | `NUMERIC(12,2)`, decimal strings, no floats | SG-3 | 1 | `packages/domain`, `packages/db` | P0 | APPROVED | - | Yes |
| Price component model | Six-component breakdown | Pricing | 2, 6 | modules `pricing` | P1 | APPROVED | ADR-010 | No |
| Immutable price snapshots | Append-only, rule-versioned | Price reproducibility | 6 | `packages/db` | P1 | APPROVED | ADR-010 | No |
| Payment provider adapter | `PaymentProvider` interface | Payment | 6 | `integrations` | P1 | **Provider UNKNOWN**, port APPROVED | - | No |
| Webhook verification and reconciliation | HMAC plus idempotent receipt | Payment correctness | 6 | `integrations` | P1 | APPROVED | - | No |
| Order immutability | Frozen snapshots at placement | Order integrity | 6 | modules `commerce` | P1 | APPROVED | - | No |
| Inventory reservation | Postgres, 30-minute TTL | Oversell prevention | 6 | modules `commerce` | P1 | APPROVED | ADR-002 | No |
| Atomic pair reservation | All-or-nothing | Earrings | 6 | modules `commerce` | P1 | APPROVED | - | No |
| Discount and refund validation | Scope, window, limits, approval | Policy | 6 | modules `commerce` | P1 | APPROVED, **policy UNKNOWN** | - | No |
| Add-on modelling | `product_addons` as separate lines | Financing, protection | 6 | modules `commerce` | P1 | APPROVED, **mechanism UNKNOWN** | - | No |
| Customer accounts and addresses | `/account` routes | Accounts | 6 | modules `commerce` | P1 | APPROVED, **auth mechanism UNKNOWN** | - | No |

### F. Catalogue / Search

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Full-text search | `websearch_to_tsquery`, `ts_rank_cd` | Lexical arm | 5 | modules `catalog` | P1 | APPROVED | ADR-006 | No |
| Trigram fuzzy matching | `pg_trgm` GIN | Typo tolerance | 5 | modules `catalog` | P1 | APPROVED | ADR-006 | No |
| Diacritic folding | `unaccent` | Search normalisation | 5 | modules `catalog` | P1 | APPROVED | ADR-006 | No |
| Facet computation | Single grouped pass | Filter UI | 3, 5 | modules `catalog` | P1 | APPROVED | - | No |
| Disjunctive colour facet handling | Colour tokens | Facet correctness | 5 | modules `catalog` | P1 | APPROVED | - | No |
| Versioned ranking function | Weighted, deterministic | Business ranking | 5 | modules `catalog` | P1 | APPROVED | - | No |
| Synonym seeding | Observed vs curated separation | Recall | 5 | `packages/db` | P1 | APPROVED | - | No |
| Vector similarity search | `pgvector`, HNSW | Semantic arm | 5 | modules `catalog` | P2 | APPROVED | ADR-006, ADR-018 | No |
| Vector-arm circuit breaker | Degradation to structured plus FTS | NFR-14 | 5 | modules `catalog` | P1 | APPROVED | - | No |
| Provenance exposure | `evidence_status`, `source_url`, `import_batch_id` on responses | NFR-08 | 3 | modules `catalog` | P1 | APPROVED | ADR-024 | No |

### G. DYO

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Configuration state machine | DRAFT to EXPIRED, 8 states | Configurator | 7 | modules `dyo` | P2 | APPROVED | ADR-005 | No |
| Configuration hash | SHA-256 over canonical JSON with `hash_version` | Resume, share, dedupe | 1, 7 | `packages/domain` | P0 | APPROVED | - | Yes |
| Deterministic compatibility engine | Rule registry, per-aggregate ordering | Compatibility | 7 | modules `dyo` | P2 | APPROVED, **rules INFERRED** | - | No |
| Unknown-means-unknown semantics | `UNKNOWN` never becomes compatible | Honesty | 7 | modules `dyo` | P2 | APPROVED | - | No |
| Rule seeding from evidence | 1,024 observed pairs, `EXTRACTED` | Compatibility | 2, 7 | `packages/db` | P2 | APPROVED | - | No |
| Quote and snapshot lifecycle | `quoteToken`, single-use | Pricing | 7 | modules `pricing` | P2 | APPROVED | - | No |
| Cart conversion with re-validation | Re-evaluate rules, re-price | Anti-staleness | 7 | modules `commerce` | P2 | APPROVED | - | No |
| Share and resume | Opaque short code, no price or gem ref | Privacy | 7 | modules `dyo` | P2 | APPROVED | - | No |

### H. Certificate Intelligence

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Presigned upload with content sniffing | R2 presigned PUT | Certificate intake | 8 | modules `certificates` | P2 | APPROVED, **phase-entry dependency** | - | No |
| Virus scanning and EXIF stripping | Scan plus strip before variants | SG-5, privacy | 8 | `apps/worker` | P2 | APPROVED | - | No |
| Vision/OCR extraction | Vision model via `ModelGateway` | Field extraction | 8 | modules `certificates` | P2 | **Model UNKNOWN**, gateway APPROVED | - | No |
| Strict extraction schema | Zod, bbox capture | Malformed-output rejection | 8 | `packages/contracts` | P2 | APPROVED | - | No |
| Per-field confidence persistence | `certificate_extractions` | NFR-07 | 8 | `packages/db` | P2 | APPROVED | ADR-012 | No |
| Confidence banding | 0.90 / 0.85 / 0.70 / 0.50 | Promotion policy | 8 | modules `certificates` | P2 | APPROVED | ADR-012 | No |
| Cross-check engine | Nine rules incl. D9 pair weight sum | Anomaly detection | 8 | modules `certificates` | P2 | APPROVED | - | No |
| Verification ledger | Append-only `verification_events` | Trust audit | 8 | `packages/db` | P2 | APPROVED | - | No |
| View-level read enforcement | `certificate_public` | INV-07 | 1, 8 | `packages/db` | P0 | APPROVED | ADR-012 | Yes (view), No (workflow) |

### I. AI / RAG

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Model gateway abstraction | `ModelGateway` interface | Provider isolation | 9 | `packages/ai` | P2 | APPROVED, **phase-entry dependency** | - | No |
| Fallback chain and budget control | Primary then alternative, max 1 retry | Cost and resilience | 9 | `packages/ai` | P2 | APPROVED | - | No |
| Tool registry with schemas | Zod input and output per tool | Capability control | 9 | `packages/ai` | P2 | APPROVED | ADR-003 | No |
| Deterministic tool authorisation | `authorization()` before `execute()` | AI safety | 9 | `packages/ai` | P2 | APPROVED | ADR-003 | No |
| Grounding and citation gate | Strip unverifiable claims | NFR-06 | 9 | `packages/ai` | P2 | APPROVED | - | No |
| Refusal behaviour for NULL fields | 113/1,024 typed stones | NFR-06 | 9 | `packages/ai` | P2 | APPROVED | - | No |
| Prompt-injection defence | Delimited labelled untrusted blocks | Security | 9 | `packages/ai` | P2 | APPROVED | - | No |
| Import-graph enforcement of AI isolation | No repository reachable from AI | SG-10 | 9 | repo root | P2 | APPROVED | ADR-003 | No |
| Document chunking and embedding | Heading-boundary chunking, 400 to 800 tokens | RAG ingestion | 9 | `apps/worker` | P2 | APPROVED | ADR-018 | No |
| Hybrid retrieval with trust tiers | Weighted cosine plus FTS plus metadata | RAG | 9 | modules `ai` | P2 | APPROVED | - | No |
| Query-time ACL predicates | Filter inside SQL, never post-retrieval | Security | 9 | modules `ai` | P2 | APPROVED | - | No |
| Structured vs semantic routing | Code-enforced, not prompt | Honesty | 9 | modules `ai` | P2 | APPROVED | - | No |
| Human handoff state machine | 9 triggers, `AWAITING_HUMAN` | Escalation | 9 | modules `ai` | P2 | APPROVED | - | No |
| SSE streaming with typed frames | Route-handler SSE | Perceived latency | 9 | `apps/web` | P2 | APPROVED | - | No |
| AI evaluation harness | 14 dimensions | Release gate | 9 | `tests` | P2 | **OPEN** | ADR-023 | No |

### J. WhatsApp

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Inbound webhook verification | `X-Hub-Signature-256` over raw body | SG-4 | 10 | `apps/web` | P2 | APPROVED, **phase-entry dependency** | - | No |
| Idempotent receipt | `(provider, external_event_id)` | Dedupe | 10 | `packages/db` | P2 | APPROVED | - | No |
| Channel adapter with capabilities | `ChannelCapabilities` | Correct rendering | 10 | modules `integrations` | P2 | APPROVED | ADR-013 | No |
| Message chunking | 4,096-char limit with `(1/2)` markers | Format compliance | 10 | modules `integrations` | P2 | APPROVED | - | No |
| Template registry and 24-hour window | Meta templates | Outbound outside window | 10 | modules `integrations` | P2 | APPROVED | - | No |
| MSISDN to customer binding | `customers.phone` | Identity unification | 10 | modules `integrations` | P2 | APPROVED | - | No |
| Consent enforcement | Opt-in for marketing | Compliance | 10 | modules `integrations` | P2 | APPROVED | - | No |
| Shared-brain equality test | `toolsFor('WEB')` equals `toolsFor('WHATSAPP')` | ADR-013 | 10 | `tests` | P2 | **Depends on ADR-021** | ADR-013, ADR-021 | No |

### K. WebAR

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| 3D asset production pipeline | Retopology, decimation, UV, PBR bake | GLB source | 11 | `tools/` | P3 | APPROVED, **no source assets exist** | ADR-004 | No |
| Draco geometry compression | Draco-compressed GLB | Transfer budget | 11 | `tools/` | P3 | APPROVED | - | No |
| KTX2 texture packing | Basis Universal, max 1024px | Memory and transfer | 11 | `tools/` | P3 | APPROVED | - | No |
| Hand tracking | MediaPipe HandLandmarker, WASM plus GPU delegate | 21 landmarks | 11 | `apps/web` | P3 | APPROVED | ADR-004 | No |
| PBR scene rendering | Three.js, HDR environment | Visual quality | 11 | `apps/web` | P3 | APPROVED | ADR-004 | No |
| Finger placement maths | Axis, clamp, critically damped spring | Fit | 11 | `apps/web` | P3 | APPROVED | - | No |
| Hand occlusion pass | Depth-only proxy render | Realism | 11 | `apps/web` | P3 | APPROVED | - | No |
| Device-tier governor | Frame-rate adaptation | Low-end devices | 11 | `apps/web` | P3 | APPROVED | - | No |
| Seven-condition fallback matrix | No camera, no WebGL2, no WASM, low power, tracking lost, asset pending, slow network | Honest degradation | 11 | `apps/web` | P3 | APPROVED | - | No |
| QR handoff tokens | Hashed, single-use, 10-minute expiry | Desktop to mobile | 11 | modules | P3 | APPROVED | - | No |
| Camera-frame privacy proof | Zero egress assertion | Privacy | 11 | `tests` | P3 | **Depends on ADR-021** | ADR-004, ADR-021 | No |
| Bundle splitting for AR | `next/dynamic` `ssr:false`, Intersection Observer | PG-6 | 11 | `apps/web` | P3 | APPROVED | - | No |

### L. Media / Assets

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Path-stem classification | Deterministic rule table, 3,749 stems | Asset ingest | 2 | `tools/migrate` | P1 | APPROVED | ADR-016 | No |
| Terminal-state disposition | READY, FAILED, SKIPPED with reason | Explicit discard | 2 | `tools/migrate` | P1 | APPROVED | ADR-016 | No |
| SHA-256 deduplication | Checksum before fetch | Cost control | 2 | `tools/migrate` | P1 | APPROVED | - | No |
| Content sniffing | Real type, not extension or header | Error-shell rejection | 2 | `apps/worker` | P1 | APPROVED | - | No |
| Variant generation | thumb-200, card-400, hero-750, zoom-1500, WebP, AVIF | LCP | 2, 4 | `apps/worker` | P1 | APPROVED, **phase-entry dependency** | - | No |
| Focal-point handling | Per-entity crop anchor | Visual correctness | 4 | modules `assets` | P1 | APPROVED | - | No |
| Private bucket management | R2 private plus short-lived signed URLs | SG-6 | 2, 8 | modules `assets` | P1 | APPROVED, **phase-entry dependency** | - | No |
| Asset usage tracking | `asset_usages` many-to-many | Deduplicated serving | 2 | `packages/db` | P1 | APPROVED | - | No |

### M. Infrastructure

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Environment provisioning | Local Postgres 16, Neon dev branch | Development | 1 | infra | P0 | APPROVED, **phase-entry dependency** | - | Yes |
| Branch-per-PR database | Neon branching | Preview validation | 1, 2 | infra | P1 | APPROVED, **phase-entry dependency** | - | No |
| Secret management | Vercel env secrets | SG-7 | 1 | infra | P0 | APPROVED, **phase-entry dependency** | - | Yes |
| Startup environment guard | Refuse to boot on mismatch | Safety | 1 | `apps/web`, `apps/worker` | P1 | APPROVED | - | No |
| Port abstraction for external deps | `QueuePort`, `ObjectStorePort`, `PaymentProvider`, `ModelGateway` | Portability | 1 | `packages/*` | P0 | APPROVED | ADR-019 | Yes |
| Connection pooling for serverless | Neon pooled plus direct pool | Reliability | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| Backfill batching and cursor state | Batches of 1,000, resumable | Long operations | 2 | `apps/worker`, `tools/migrate` | P1 | APPROVED | - | No |
| Canary and rollback | Auto-rollback on regression | Release safety | 13 | infra | P3 | APPROVED | - | No |

### N. Security

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Row-level security policy authoring | PostgreSQL RLS | Customer data isolation | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| `BYPASSRLS` role containment | Admin-only grant | Privilege containment | 12 | `packages/db` | P2 | APPROVED | - | No |
| Role and policy matrix | 10 roles | Authorization | 12 | modules `policies/` | P2 | APPROVED | - | No |
| Secret scanning | CI scan plus runtime redaction | SG-7 | 1 | repo root, `tests` | P0 | **Depends on ADR-021** | - | Yes |
| HMAC webhook verification | Raw body, before parse | SG-4 | 6, 10 | `integrations` | P1 | APPROVED | - | No |
| SQL injection defence | Parameterisation plus fuzzing | SG-13 | 1 | `packages/db` | P0 | APPROVED | - | Yes |
| XSS defence | Restricted markup subset, no raw HTML | Security | 4, 12 | `apps/web` | P1 | APPROVED | - | No |
| SSRF defence | Private-range and metadata-endpoint block | Security | 2 | `apps/worker` | P1 | APPROVED | - | No |
| PII redaction layer | Before logging | SG-14, NFR-09 | 1 | `packages/observability` | P0 | APPROVED | - | Yes |
| Metric cardinality control | No id, email, SKU or URL labels | Cost and safety | 13 | `packages/observability` | P3 | APPROVED | - | No |
| Signed-URL authorization | Check before signing | SG-6 | 2, 8 | modules `assets` | P1 | APPROVED | - | No |
| Open-redirect prevention | Target validated at insert time | Security | 4 | modules `content` | P1 | APPROVED | - | No |

### O. Observability

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| OpenTelemetry tracing | `trace_id` propagation | Per-phase instrumentation | 1 | `packages/observability` | P0 | APPROVED, **phase-entry dependency** | - | Yes |
| Structured logging | JSON with `trace_id` | Correlation | 1 | `packages/observability` | P0 | APPROVED | - | Yes |
| Error reporting | Sentry-compatible | Frontend and server errors | 1 | `packages/observability` | P0 | APPROVED, **phase-entry dependency** | - | Yes |
| Domain span instrumentation | Spans, not only logs | Diagnosis | 1 | modules | P0 | APPROVED | - | Yes |
| Alert authoring with owner and runbook | SLO-derived thresholds | Operability | 13 | infra | P3 | APPROVED | - | No |
| Business metric emission | ~22 named metrics | Product visibility | 3, 13 | modules | P2 | APPROVED | - | No |
| Import batch accounting | Seen, accepted, rejected, quarantined | Migration audit | 2 | `tools/migrate` | P1 | APPROVED | - | No |

### P. Testing

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Unit and domain testing | **Vitest** | Every phase | 1 | `tests` | P0 | **APPROVED — ADR-021 ACCEPTED 2026-10-07** | ADR-021 | **Yes** |
| Property-based testing | **Vitest** (property extensions as needed) | SKU parser, hash | 1 | `tests` | P0 | **APPROVED — ADR-021 ACCEPTED 2026-10-07** | ADR-021 | **Yes** |
| Integration testing on real Postgres | **Vitest** | Repositories, RLS, outbox | 1 | `tests` | P0 | **APPROVED — ADR-021 ACCEPTED 2026-10-07** | ADR-021 | **Yes** |
| Schema introspection assertions | **Vitest** / framework-free scripts | Schema fidelity | 1 | `tests` | P0 | **APPROVED** — implemented framework-free at Task 5; ADR-021 ACCEPTED 2026-10-07 | ADR-021 | **Yes** |
| API contract testing | **Vitest** | Endpoint schemas | 3 | `tests` | P1 | **APPROVED — ADR-021 ACCEPTED 2026-10-07**; not installed until Phase 3 | ADR-021 | No |
| End-to-end browser testing | **Playwright** | Critical journeys | 4, 6 | `e2e` | P1 | **APPROVED — ADR-021 ACCEPTED 2026-10-07**; NOT installed until its phase requires it | ADR-021 | No |
| Accessibility automated audit | Playwright + axe-core implied by WCAG method | Zero critical issues | 4 | `e2e` | P1 | Playwright APPROVED (ADR-021 ACCEPTED 2026-10-07), axe wiring still touches ADR-022 scope | ADR-021, ADR-022 | No |
| Load testing | **UNDECIDED** | NFR targets, NFR-15 | 13 | `tools/` | P3 | **OPEN** — the load-test tool was never decided by ADR-021 | ADR-021 | No |
| Security matrix testing | **Vitest** | 15 security gates | 13 | `tests` | P3 | **APPROVED — ADR-021 ACCEPTED 2026-10-07**; not installed until its phase | ADR-021 | No |
| Migration gate runner | **Vitest** | V1 to V22 | 2 | `tests` | P1 | **APPROVED — ADR-021 ACCEPTED 2026-10-07**; not installed until Phase 2 | ADR-021 | No |
| Evidence-linked test fixtures | Committed corpus samples | NFR-13 | 1 | `tests` | P0 | APPROVED, runner ACCEPTED (ADR-021, 2026-10-07) | ADR-021 | **Yes** |

### Q. CI/CD

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Lint and typecheck gate | ESLint plus `tsc --noEmit` | Every push | 1 | CI | P0 | APPROVED | - | Yes |
| Boundary rule enforcement | ESLint `no-restricted-imports` | ADR-019 | 1 | CI | P0 | APPROVED | ADR-019 | Yes |
| Schema drift gate | Drizzle vs migrations | Every push | 1 | CI | P0 | APPROVED | - | Yes |
| Migration gate execution | V1 to V22 on real Postgres | Every PR | 2 | CI | P1 | APPROVED, runner ACCEPTED (ADR-021, 2026-10-07) | ADR-021 | No |
| Bundle budget enforcement | PG-5, AR budget | Every PR | 4, 11 | CI | P1 | APPROVED | - | No |
| Dependency drift detection | Declared sets vs doc 02 | Every push | 1 | CI | P1 | APPROVED | - | No |
| Secret scanning gate | SG-7 | Every push | 1 | CI | P0 | **APPROVED — ADR-021 ACCEPTED 2026-10-07** (CI secrets scan is toolchain work for a later task) | ADR-021 | Yes |
| PII scan gate | SG-14 | Every push | 1 | CI | P0 | **APPROVED — ADR-021 ACCEPTED 2026-10-07** (implementation later task) | ADR-021 | Yes |
| Alert-without-runbook gate | Every alert names an owner | Every push | 13 | CI | P3 | APPROVED | - | No |
| Preview and staging deploy | Neon branch per PR | Continuous | 1 | CI/CD | P1 | APPROVED, **phase-entry dependency** | - | No |

### R. Data Migration

| Skill | Technology | Required For | Phase | Package/App | Priority | Status | ADR | Required Before Coding |
|---|---|---|---|---|---|---|---|---|
| Line-oriented JSONL streaming | Node streams | 468 MB `pages_analyzed.jsonl` | 2 | `tools/migrate` | P1 | APPROVED | - | No |
| Read-only artefact access | File open read-only | Evidence integrity | 2 | `tools/migrate` | P0 | APPROVED | ADR-007 | Yes |
| Per-artefact SHA-256 gating | `import_batches.source_sha256` | Refuse on mismatch | 2 | `tools/migrate` | P1 | APPROVED | - | No |
| Verbatim staging load | `staging_source_pages`, no normalisation | Provenance | 2 | `tools/migrate` | P1 | APPROVED | - | No |
| Five-family slug parser | Deterministic regex parsers | Gates V1, V2, V14 | 2 | `tools/migrate` | P1 | APPROVED | ADR-007 | No |
| SKU grammar parser | `JS{design}{metal}-{gemRef}` | Gates V3, V19 | 1 | `packages/domain`, `tools/migrate` | P0 | APPROVED | ADR-007 | Yes |
| D9 multi-value tokenizer | Doubled spec strings to `gemstone_stones` | Gates V8, V9 | 1, 2 | `packages/domain`, `tools/migrate` | P0 | APPROVED | ADR-009 | Yes |
| Provenance capture | `evidence_status`, `source_url`, `import_batch_id`, `raw_spec` | NFR-08 | 2 | `tools/migrate`, `packages/db` | P0 | APPROVED | ADR-024 | Yes |
| Canonical upsert in dependency order | Taxonomy then stones then settings then products | Referential integrity | 2 | `tools/migrate` | P1 | APPROVED | - | No |
| Derived-identity write path | `source_sku_derived`, `INFERRED`, `DRAFT`, nulls | Gate V18 | 2 | `tools/migrate` | P1 | APPROVED | ADR-008 | No |
| Price recovery and residual derivation | JSON-LD `offers.price`; residual into `price_model_observations` | ADR-010 | 2 | `tools/migrate` | P1 | APPROVED | ADR-010 | No |
| Compatibility rule seeding | 1,024 observed pairs, `EXTRACTED` | DYO | 2 | `tools/migrate` | P2 | APPROVED | - | No |
| Conflict ledger | `staging_conflicts`, never auto-resolved | Data integrity | 2 | `tools/migrate` | P1 | APPROVED | - | No |
| Quarantine with reason | Counted, never silently dropped | Data integrity | 2 | `tools/migrate` | P1 | APPROVED | - | No |
| Idempotent stage execution | Cursor state, `ON CONFLICT` | Gate V17 | 2 | `tools/migrate` | P1 | APPROVED | - | No |
| Certificate artefact extraction from paths | `cert`, `sarin`, `appraisal` | ADR-011 | 2 | `tools/migrate` | P1 | APPROVED | ADR-011 | No |
| Redirect generation | 44,218 rows from the route map | ADR-015 | 2 | `tools/migrate` | P1 | APPROVED | ADR-015 | No |
| Validation gate runner | V1 to V22 as executable assertions | Migration gate | 2 | `tests` | P1 | **Depends on ADR-021** | ADR-021 | No |
| Catalogue completeness guard | Five families, section 2.1 counts | D1 defence | 2 | `tests` | P1 | APPROVED, **runner OPEN** | ADR-021, ADR-007 | No |
| Evidence manifest | `docs/evidence/MANIFEST.md`, SHA-256 per artefact | Retention | 1 | `docs/evidence/` | P0 | APPROVED | - | Yes |
---

## 4. REPOSITORY-TO-SKILL MAPPING

Repository structure per `INITIAL_IMPLEMENTATION_PLAN.md` section 5 and `technical_design/03_REPOSITORY_ARCHITECTURE.md`. No new packages are introduced.

### 4.1 Package dependency direction

```
contracts  <- domain  <- db
config     <- everything
observability <- everything
ai         <- contracts, domain
```

`packages/domain` depends on no runtime package. This is what keeps invariants unit-testable without infrastructure.

### 4.2 Skills required by each package

#### `apps/web` — Next.js storefront, API, admin, AR route

| Skill group | Skills | First phase |
|---|---|---|
| Core | TypeScript, pnpm workspace member, ESLint boundaries | 1 |
| Backend | Route handlers, Zod parsing, error envelope, idempotency keys | 3 |
| Security | Authorisation policies, XSS defence, open-redirect prevention, PII-safe logging | 3, 4 |
| Observability | Tracing, structured logs, Web Vitals, error reporting | 1, 4 |
| Frontend | App Router rendering, RSC boundaries, typed block registry, design-system primitives, responsive images, structured data, sitemaps, keyboard and focus management, colour-independent meaning, `Intl` formatting, reduced motion | 4 |
| Commerce | Cart and checkout routes, accounts, webhook endpoints | 6 |
| Search | Search and suggestion routes | 5 |
| DYO | Configurator UI flow | 7 |
| Certificates | Upload and presign flow, review UI | 8 |
| AI | SSE streaming endpoints | 9 |
| WhatsApp | Inbound webhook endpoint | 10 |
| WebAR | AR route with `ssr:false`, MediaPipe and Three.js runtime, QR handoff route | 11 |
| Admin | Admin modules, RBAC UI, audit viewer | 12 |
| Infrastructure | Startup environment guard, port consumption | 1 |

**Never in `apps/web`:** any repository import outside `packages/db`; MediaPipe or Three.js in any server bundle; a repository handle reachable from AI code.

#### `apps/worker` — background job runner and event dispatcher

| Skill group | Skills | First phase |
|---|---|---|
| Core | TypeScript, ESLint boundaries | 1 |
| Backend | Transactional outbox dispatch, idempotent event consumption, job queue with leases, `job_key` idempotency | 1, 2 |
| Backend | Redis caching and generation bumps, single-flight | 3 |
| Media | Content sniffing, variant generation, EXIF stripping, virus scanning | 2 |
| AI | Embedding generation, document chunking | 9 |
| Observability | Tracing, structured logs, queue metrics, dead-letter alerting | 1 |
| Security | PII redaction, SSRF defence on outbound fetch | 1, 2 |
| Infrastructure | Startup environment guard, direct-connection pool | 1 |

#### `packages/db` — Drizzle schema, migrations, repositories, seeders

| Skill group | Skills | First phase |
|---|---|---|
| Database | DDL authoring, constraint modelling, RLS, index design, extension management, triggers, views, pooling, transaction scope | 1 |
| Database | Migration authoring with Drizzle Kit, expand-then-contract | 1 |
| Backend | Repository layer (SQL only), no transactions opened by repositories | 1 |
| Core | Pure TypeScript, no framework dependency | 1 |

**Hard rule:** the only place SQL exists. No repository opens a transaction; the application service owns transaction scope.

#### `packages/domain` — pure domain logic and invariants, no I/O

| Skill group | Skills | First phase |
|---|---|---|
| Domain | Value objects for `Gemstone`, `GemstonePair`, `Setting`, `SettingVariant`, `Product` | 1 |
| Domain | INV-01, INV-02, INV-03 as pure predicates | 1 |
| Domain | SKU grammar parser with the validated regex | 1 |
| Domain | Configuration hash with `hash_version` | 1 |
| Domain | Slug derivation and normalisation | 1 |
| Domain | D9 multi-value tokenizer | 1, 2 |
| Domain | Money value type, decimal strings only | 1 |
| Domain | DYO state machine as a pure function | 7 |
| Domain | Compatibility evaluation as a pure function | 7 |

**Hard rule:** may declare only Zod if runtime parsing is needed, and nothing else. Imports nothing from `infrastructure/`. Enforced by lint.

#### `packages/contracts` — Zod DTOs, generated OpenAPI, event schemas

| Skill group | Skills | First phase |
|---|---|---|
| Backend | Zod schema authoring for every DTO, event schema and tool input/output | 1 |
| Backend | Standard error envelope and error-code registry | 1 |
| Backend | OpenAPI generation from Zod DTOs | 3 |
| Certificates | Strict extraction schema with bbox capture | 8 |
| AI | Tool registry schemas | 9 |

#### `packages/config` — env parsing, feature flags, constants

| Skill group | Skills | First phase |
|---|---|---|
| Core | Zod-based environment parsing | 1 |
| Infrastructure | Secret reference resolution, never secret values in code | 1 |
| Security | Environment-to-database mismatch guard | 1 |

#### `packages/observability` — OpenTelemetry setup, logger, metric names

| Skill group | Skills | First phase |
|---|---|---|
| Observability | Tracing setup with `trace_id` propagation, span conventions | 1 |
| Observability | Structured JSON logging, level discipline | 1 |
| Observability | Error reporting integration | 1 |
| Security | PII redaction before log emission, `content_redacted` only for AI content | 1 |
| Observability | Metric name registry, cardinality rules | 13 |

#### `packages/ai` — orchestrator, tools, RAG, guardrails

| Skill group | Skills | First phase |
|---|---|---|
| AI | `ModelGateway` abstraction, fallback chain, budget enforcement | 9 |
| AI | Tool registry with strict schemas, deterministic `authorization()` | 9 |
| AI | Orchestrator nine-stage pipeline | 9 |
| AI | Grounding and citation gate, refusal rules | 9 |
| AI | Guardrail engine, injection defence with delimited untrusted blocks | 9 |
| AI | RAG ingestion and hybrid retrieval with trust-tier weighting | 9 |
| AI | Structured versus semantic routing in code | 9 |
| AI | Human handoff state machine | 9 |
| Security | No repository import; read tools only; no mutating tool for price, inventory, orders, payments, certificates or permissions | 9 |

#### `tools/migrate` — import pipeline CLI

| Skill group | Skills | First phase |
|---|---|---|
| Migration | Read-only artefact access, SHA-256 gating, verbatim staging load | 2 |
| Migration | Five-family slug parser, SKU parser, D9 tokenizer | 2 |
| Migration | Canonical upsert in dependency order, derived-identity write path | 2 |
| Migration | Price recovery and residual derivation | 2 |
| Migration | Media classification and disposition, certificate artefact extraction | 2 |
| Migration | Redirect generation | 2 |
| Migration | Conflict ledger, quarantine, idempotent stage execution | 2 |
| Observability | Import batch accounting: seen, accepted, rejected, quarantined | 2 |

**Hard rule:** never writes to the source package. Never modifies `crawler.sqlite` or `raw_html`. Development dependency surface only.

#### `e2e` — browser end-to-end specs

| Skill group | Skills | First phase |
|---|---|---|
| Testing | Browser automation (**runner OPEN**, ADR-021) | 4 |
| Testing | Four-step checkout journey | 6 |
| Testing | Accessibility audit and keyboard walkthrough | 4 |
| Testing | WhatsApp channel parity assertion | 10 |
| Testing | WebAR fallback matrix and no-frame-upload assertion | 11 |

#### `tests` — integration, security, load, migration gates

| Skill group | Skills | First phase |
|---|---|---|
| Testing | Unit and domain suite (**runner OPEN**, ADR-021) | 1 |
| Testing | Property tests over the 1,024-record SKU corpus | 1 |
| Testing | Integration on real PostgreSQL: repositories, RLS, outbox | 1 |
| Testing | Schema introspection: 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 9 named invariants, 6 RLS policies, 2 HNSW, 1 trigger, 1 view, 2 functions | 1 |
| Testing | Migration gate runner V1 to V22 | 2 |
| Testing | Catalogue completeness guard across the five source families | 2 |
| Testing | Security matrix: 15 gates | 13 |
| Testing | Load tests against NFR-03 and the NFR-15 measurement rule | 13 |
| Testing | AI evaluation across 14 dimensions (**harness OPEN**, ADR-023) | 9 |

#### `docs/adr` and `docs/evidence`

| Skill group | Skills | First phase |
|---|---|---|
| Core | ADR authoring in the decision/context/alternatives/reason/consequences/evidence/status format | 1 |
| Migration | `docs/evidence/MANIFEST.md`: storage location, SHA-256 and retention class per artefact | 1 |

---

## 5. PHASE-TO-SKILL MATRIX

Thirteen phases per `INITIAL_IMPLEMENTATION_PLAN.md` sections 7 to 20. MVP chain: 1 to 6.

### Phase 1 — Database + Domain Foundation (MVP)

| Aspect | Detail |
|---|---|
| Required skills | A (all), B (all), C (Zod, error envelope, application services, policies, outbox), M (environment, secrets, ports, pooling), N (RLS, SQLi, PII), O (tracing, logs, spans, errors), P (unit, domain, property, integration, introspection — **runner OPEN**), Q (lint, boundaries, schema drift, secret scan, PII scan), R (SKU parser, D9 tokenizer, provenance, evidence manifest) |
| Required tools | TypeScript 5.x, pnpm, ESLint, Drizzle ORM, Drizzle Kit, Zod, PostgreSQL 16 local, Neon dev branch, OpenTelemetry |
| External accounts | Neon dev branch; Vercel project (env secrets); Sentry-compatible error reporting; OpenTelemetry collector endpoint. **All four are phase-entry dependencies.** |
| Prerequisites | None architecturally. ADR-021 resolved before the first test is written. |
| Unresolved decisions | ADR-021 (blocks task 6 onward). Extension availability on the target Neon instance. Auth provider choice is Phase 6, not Phase 1. |
| Deferrable skills | Everything in D, E, F, G, I, J, K, L, and the whole of M beyond environment and secrets |
| Exit gate | 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes present; 9 named invariants exist; 6 RLS enabled with 0 policy-less; both HNSW indexes exist and `vector(1024)` accepts a row; trigger populates `search_document`; domain layer imports nothing from `infrastructure/`; SKU parser reproduces 1,024/1,024 |

### Phase 2 — Migration + Catalog (MVP)

| Aspect | Detail |
|---|---|
| Required skills | R (all), L (classification, dedupe, disposition), C (queue, job keys, idempotent consumption), O (import accounting), P (migration gates — **runner OPEN**) |
| Required tools | Everything from Phase 1, plus R2 credentials for asset fetch, Node streaming for the 468 MB file |
| External accounts | Cloudflare R2. **Phase-entry dependency.** |
| Prerequisites | Phase 1 exit gate. Migration-critical files reachable at recorded paths. `docs/evidence/MANIFEST.md` complete. |
| Unresolved decisions | ADR-024 (provenance storage design) affects schema-adjacent tooling. ADR-021 blocks the gate runner. |
| Deferrable skills | OCR, confidence scoring, pricing engine, discount logic, compatibility engine, AI, asset binary downloads beyond metadata |
| Exit gate | V1, V2 at 100% parse rate; V3 and V19 at 1,024/1,024; V4 through V14 green; V16 zero JS-derived assets; V17 zero row changes on re-run; V18 and V20 correct for the 221; V21, V22 resolve; every migrated row answers "where did this value come from?" |

### Phase 3 — Catalog APIs (MVP)

| Aspect | Detail |
|---|---|
| Required skills | C (route handlers, OpenAPI, idempotency, keyset pagination, Redis caching, generation bumps), F (facets, provenance exposure), O (API latency, cache hit rate, degradation events) |
| Required tools | Phase 1 and 2 tools plus Redis |
| External accounts | Redis instance |
| Prerequisites | Phase 2 exit gate |
| Unresolved decisions | None new. Redis client library is an implementation detail of the approved Redis dependency, not a new technology. |
| Deferrable | Cart, checkout, pricing quotes, DYO, AI, certificate endpoints, catalogue write endpoints, semantic search |
| Exit gate | Documented envelope on every endpoint; unknown filters return `rejectedFilters` with reasons; p95 under 400 ms on staging; no response exposes a field without declaring its evidence status; Redis-down behaviour verified |

### Phase 4 — Storefront (MVP)

| Aspect | Detail |
|---|---|
| Required skills | D (all), C (redirect handling), N (XSS, open redirect), M (CDN), O (Web Vitals) |
| Required tools | Phase 1 to 3 tools plus ImageKit |
| External accounts | ImageKit; Vercel production-equivalent preview |
| Prerequisites | Phase 3 exit gate. **ADR-022 resolved.** |
| Unresolved decisions | **ADR-022 (design system)** is the blocker for this phase. |
| Deferrable | Semantic search refinement, cart, DYO, AR route content |
| Exit gate | Lighthouse and accessibility budgets met; 44,218 redirects resolve; sitemap sharded to 44; JSON-LD for Product, BreadcrumbList and Organization |

### Phase 5 — Search + Filters (MVP)

| Aspect | Detail |
|---|---|
| Required skills | F (all), C (cache, generation bump), O (search latency, zero-result rate, strategy mix, facet timing) |
| Required tools | Phase 1 to 4 tools plus `pg_trgm` and `unaccent` confirmed on target |
| External accounts | None new |
| Prerequisites | Phase 4 exit gate. Contrib extensions confirmed available. |
| Unresolved decisions | None new. Embedding model selection is a `ModelGateway` configuration choice, not a technology decision. |
| Deferrable | Personalised ranking, AI-generated result explanations. `btree_gin` is explicitly forbidden unless facet storage moves to arrays. |
| Exit gate | NFR-03 met on staging load test; zero-result queries return zero with an explanation; treated stones never demoted; deterministic ranking; degrades with the vector index disabled; the LLM is proven absent from the search request path |

### Phase 6 — Cart + Checkout + Commerce (MVP)

| Aspect | Detail |
|---|---|
| Required skills | E (all), C (webhook verification, idempotency), N (authorization matrix), O (order conversion, funnel, payment success, refund rate), P (E2E four-step, price tampering, replay) |
| Required tools | Phase 1 to 5 tools plus a payment provider SDK behind the adapter |
| External accounts | **Payment provider. Email provider.** Both phase-entry dependencies and both client decisions. |
| Prerequisites | Phase 5 exit gate. Payment provider decision. |
| Unresolved decisions | **Payment provider** (blocks phase). **Email provider** (blocks notifications). Tax, shipping rates, discount policy, refund policy are all `[UNKNOWN]`; where unknown, surface as a configuration gap rather than inventing policy. |
| Deferrable | DYO configurator, certificate issuance from OCR, any provider beyond the single adapter chosen |
| Exit gate | Four distinct server checkpoints; tampered price rejected with 409 `PRICE_CHANGED`; webhook replay deduplicated; orders immutable after placement; every state change writes an audit row; RLS prevents cross-customer access |

**MVP completes here.** Phases 1 to 6 deliver a migrated configured product bought end to end on staging with a test payment adapter.

### Phases 7 to 13 — post-MVP

| Phase | Required skills | External accounts | Unresolved decisions | Deferrable |
|---|---|---|---|---|
| 7 DYO | G (all), E (cart conversion), D (configurator UI) | None new | Rules are `[INFERRED]`; seeded `ALLOW` only. Ring sizing, engraving workflow and side stones have **no source evidence** and stay unimplemented | Preview render job detail |
| 8 Certificates | H (all), L (private buckets), P (confidence boundary, per-cross-check, view withholding) | **Vision/OCR model** (client decision) | Vision model choice. Lab API integration deferred. No automated verification without human approval | Lab integration, automated verification |
| 9 AI Concierge | I (all), N (AI isolation), O (tokens, cost, grounded ratio, handoffs), P (evaluation) | **AI gateway credentials; OpenRouter key** | **ADR-023 (evaluation harness)**. Knowledge corpus depends on Phase 12 content | Admin assist, autonomous action |
| 10 WhatsApp | J (all) | **Meta WhatsApp Business credentials, templates** | None new | Broadcast campaigns, autonomous ordering |
| 11 WebAR | K (all), D (AR route, reduced motion) | R2 for GLB, CDN | Asset production is the largest cost risk. Scoped to rings first. | Necklace and bracelet anchors; per-stone models |
| 12 Admin + CMS | D (block registry, approval UI), N (RBAC, `BYPASSRLS`, audit), E (order and refund surfaces), O (audit trail, job health) | None new | **Thin slice may be needed before Phase 8** per the plan's dependency note | CRM or ERP integration; destructive bulk without typed confirmation |
| 13 Hardening | M (canary, rollback), N (full security matrix), O (SLOs, error budgets, runbooks), P (load, security suite) | None new | **ADR-021** must be resolved by now for the load tool | Nothing. This phase proves the NFRs. |

### MVP chain summary

```
P1 Database+Domain -> P2 Migration+Catalog -> P3 Catalog APIs
   -> P4 Storefront -> P5 Search -> P6 Cart+Checkout = MVP
```

Phases 7 and 8 both depend on 3; 7 additionally depends on 6. Phase 9 depends on 3, 8 and 6. Phase 10 depends on 9. **Phase 11 depends only on 3 and 4, so it can run in parallel with 8, 9 and 10.** Phase 12 depends on 2, 3, 7 and 8. Phase 13 depends on all.

---
## 6. ADR / OPEN DECISION REGISTER

### 6.1 Accepted ADRs, inherited unchanged

The 21 accepted ADRs in `PROJECT_SOURCE_OF_TRUTH.md` section 35 are binding. `INITIAL_IMPLEMENTATION_PLAN.md` section 35 states: "This plan implements them; it does not reopen them." Phase of first impact is taken from that plan. (ADR-021 was Proposed at planning time and ACCEPTED 2026-10-07 by explicit user authorization; `technical_design/40` is the decision register of record.)

| ADR | Decision | First bites |
|---|---|---|
| ADR-001 | PostgreSQL is the transactional source of truth | P1 |
| ADR-002 | Redis is cache and transient state only | P1, P3 |
| ADR-003 | The AI cannot mutate transactional state | P9 |
| ADR-004 | WebAR is client-side only | P11 |
| ADR-005 | DYO is a configuration domain, not a product table | P2, P7 |
| ADR-006 | No dedicated search engine at launch | P5 |
| ADR-007 | Migrate from the URL inventory, not `products.jsonl` | P2 |
| ADR-008 | Derived identifiers are stored separately and gated | P2, P12 |
| ADR-009 | Per-stone measurements are modelled, not concatenated | P1, P2 |
| ADR-010 | The unknown component of price is modelled explicitly | P2, P6 |
| ADR-011 | Certificate artefacts ingested; schema treated as unknown | P2, P8 |
| ADR-012 | Low-confidence OCR never becomes verified truth | P8 |
| ADR-013 | Web and WhatsApp share one AI brain | P9, P10 |
| ADR-014 | The source product-type taxonomy is rejected as a target model | P2 |
| ADR-015 | Source routes preserved through redirects | P2, P4 |
| ADR-016 | Media classification re-derived from path stem | P2 |
| ADR-017 | Generation-A artefacts excluded from migration inputs | P2 |
| ADR-018 | A single embedding dimension and model | P5 |
| ADR-019 | Modular monolith with explicit extraction triggers | All |
| ADR-020 | Transactional outbox rather than direct publishing | P1, P2 |
| ADR-021 | Test runner is Vitest, with Playwright for end-to-end (**ACCEPTED 2026-10-07 by explicit user authorization**) | P1 onward |

### 6.2 Proposed ADRs — NOT accepted

Three ADRs remain recorded in `technical_design/40` with status **Proposed**. Proposed means a reasoned recommendation exists and no approval has been given. None may be treated as a decision. (A fourth, ADR-021, was ACCEPTED 2026-10-07 by explicit user authorization and moved to the accepted register above.)

| ADR | Proposed decision | Status | Phase blocked | Notes |
|---|---|---|---|---|
| **ADR-022** | Design-system primitives built in-repo, composed of unstyled accessible libraries | **Proposed** | P4 | `technical_design/02` line 54 lists it OPEN with a recommendation. The proposal names no specific library; it also must not be read as authorising shadcn, Radix, MUI, Chakra or Tailwind, none of which is named in any authoritative document. |
| **ADR-022** | Design-system primitives built in-repo, composed of unstyled accessible libraries | **Proposed** | P4 | `technical_design/02` line 54 lists it OPEN with a recommendation. The proposal names no specific library; it also must not be read as authorising shadcn, Radix, MUI, Chakra or Tailwind, none of which is named in any authoritative document. |
| **ADR-023** | AI evaluation harness is first-party, versioned against the prompt registry | **Proposed** | P9 | Requires a domain-specific assertion set, so a general framework is argued insufficient. Still a tooling choice requiring approval. |
| **ADR-024** | Field-level provenance is a first-class relational table, not a framework | **Proposed** | P2 | Argues an explicit column plus table beats a framework and beats JSON blobs. Affects migration tooling shape. |

### 6.3 Open decisions owned by the client

Not technology choices; business decisions that no engineering judgement can supply.

| Decision | Blocks | Latest phase | Current handling |
|---|---|---|---|
| Payment provider | P6 | Before P6 starts | `PaymentProvider` port; one adapter once chosen |
| Tax treatment | P6 | Before production | Zero-return stub permitted in P6; fails closed in production |
| Shipping carriers and rates | P6 | Before production | Flat placeholder permitted |
| Discount policy | P6 | Before production | Configuration gap surfaced, never invented |
| Refund policy | P6 | Before production | Configuration gap surfaced |
| Vision model for OCR | P8 | Before P8 starts | Chosen within the locked `ModelGateway` |
| Email and transactional provider | P6 notifications | Before P6 starts | Deferred decision per `technical_design/02` |
| Jurisdiction and statutory retention | Data compliance | Before relying on the retention table | Retention table in `technical_design/31` marked conditional |

### 6.4 Deferred decisions

| Item | Status | Condition to revisit |
|---|---|---|
| GraphQL | Deferred | Only if measured over-fetching appears |
| Migration-runner for raw HTML re-fetch | Deferred | Only if a phase requires re-fetching the 502 shells |
| Lab API integration for certificates | Deferred | Only if a lab integration requirement appears |
| CRM / ERP integration | Out of scope entirely | Would require a new requirement and an ADR |
| Loyalty and review subsystem | Out of scope entirely | Observed as testimonials only, with no source behaviour |
| Multi-language | Deferred | Locale prefix reserved; slugs never localised |
| Micro-frontends | Deferred | Would require an ADR superseding ADR-019 |

### 6.5 ADR reference verification across technical_design/01-40

Every ADR reference was extracted from all 40 documents and checked against the register.

| Finding | Result |
|---|---|
| ADR references found across docs 01 to 40 | ADR-001 through ADR-024, no other numbers |
| References pointing to a non-existent ADR | **None** |
| References pointing at the wrong decision | **One corrected during this stage** (see below) |
| Doc 39 known-unknowns numbering | **One corrected during this stage** (see below) |

**Correction 1.** `technical_design/39_GLOSSARY_AND_EVIDENCE_LEDGER.md` known-unknowns row 20 previously cited **ADR-022** for AI evaluation tooling. After ADR-022 was assigned to the design system and the evaluation harness became ADR-023, that row was renumbered to ADR-023, and a design-system row was inserted at 20. The known-unknowns list was renumbered to a continuous 1 to 24. `technical_design/38` and `36` referenced the same unknowns generically and needed no change.

**Correction 2.** `technical_design/02_TECH_STACK.md` line 54 labels the component library "OPEN - ADR-022 candidate". This is now accurate, because ADR-022 is the design-system decision. The earlier mismatch, where ADR-022 did not yet exist, is resolved.

**Residual inconsistency, reported not fixed.** `INITIAL_IMPLEMENTATION_PLAN.md` section 34 calls the design-system decision "ADR-022 candidate" while `technical_design/02` line 54 uses the same wording, and neither document was updated after ADR-022 was formally drafted in `technical_design/40`. The wording is now consistent with reality, but the plan was authored before ADR-022 existed and was deliberately not edited, because this stage is planning-only and must not modify the authoritative plan. **Flagged for the plan owner.**

**Second residual inconsistency, reported not fixed.** `INITIAL_IMPLEMENTATION_PLAN.md` section 35.2 states "ADR-021 (open): test tooling stack" and explicitly says "No technology has been chosen in this plan." `technical_design/40` ADR-021 now names Vitest and Playwright as a *proposed* decision. These are not contradictory in substance, because the plan says nothing is chosen and the ADR says something is proposed but not approved, and `technical_design/02` still lists it OPEN. The risk is a reader treating the ADR's named candidates as selected. **Flagged so that no agent installs a test runner on the strength of ADR-021 alone.**

**Third residual inconsistency, reported not fixed.** Metal and jewellery-type seed counts. `INITIAL_IMPLEMENTATION_PLAN.md` Phase 1 task 9 requires seeding "15 metals, 8 jewellery types". `PROJECT_SOURCE_OF_TRUTH.md` section 4.2 records **14 metal codes** observed and verified, and section 7.2 lists **5 jewellery types**. The `metal_code` enum in section 8.1 has 15 members including `R10`, which section 4.2 explicitly records as absent from all evidence. So: 15 enum members, 14 observed codes, `R10` enum-only. And 8 jewellery-type enum members, 5 observed types. Both are reconcilable as enum-superset versus observed-subset, and the seeders must insert the full enum, but the counts must not be described as observed. **Flagged; not resolved here, since resolving it requires editing the plan.**

**Fourth residual inconsistency, reported not fixed.** AI evaluation dimension count. `INITIAL_IMPLEMENTATION_PLAN.md` says "all thirteen dimensions" in three places (sections 16, 23.1, 24.1). `PROJECT_SOURCE_OF_TRUTH.md` section 34.5 and `technical_design/32` both enumerate **fourteen**: `factuality`, `no_invention_null`, `tool_selection`, `price_safety`, `inventory_safety`, `certificate_safety`, `treatment_disclosure`, `dyo_quality`, `refusal`, `citation`, `escalation`, `injection_resistance`, `grounded_ratio`, `cost`. The plan's "thirteen" is an undercount. **Flagged.**

No other contradiction was found between the plan, the source of truth and the technical design.

---

## 7. TEST TOOLING DECISION (ADR-021)

### 7.1 The architectural position

The architecture deliberately left four things open. `PROJECT_SOURCE_OF_TRUTH.md` section 34 specifies what each layer must prove and what evidence it must trace to, and names no tool. `INITIAL_IMPLEMENTATION_PLAN.md` section 23.4 states: "No runner has been selected in this plan, because selecting one is a technology decision the Source of Truth does not make." `technical_design/02` lists the runner, the E2E driver and the load tool all as OPEN under ADR-021.

| Area | Requirement | Candidate | Evidence/Reason | Decision |
|---|---|---|---|---|
| Unit and domain test runner | Pure domain functions, invariants, parsers, pricing, ranking, with property-based testing over the 1,024-record SKU corpus | Vitest (proposed in ADR-021); Jest; node:test | `[INFERRED]` Candidate reasoning only: shares TypeScript and ESM configuration with the application, so one transform pipeline and one config file rather than two; supports in-process Postgres setup, which this architecture requires because tests must run against a real database, not a mock, since the schema depends on RLS, `tsvector`, `pg_trgm`, HNSW, `LEFT JOIN LATERAL`, advisory locks, `NUMERIC` semantics and `SKIP LOCKED` | **OPEN — REQUIRES APPROVAL** |
| Property-based testing | Generative coverage of the SKU parser, configuration hash, money arithmetic and slug normalisation | fast-check (implied by the property-test requirement); none named | `[INFERRED]` The plan requires property tests; no library is named anywhere | **OPEN — REQUIRES APPROVAL** |
| Integration test tooling | Repositories, RLS, outbox and job queues against real PostgreSQL | Runner-provided database container; testcontainers | `[INFERRED]` Depends entirely on the unit-runner decision; may be the same dependency | **OPEN — REQUIRES APPROVAL** |
| Migration gate runner | V1 to V22 as executable assertions against a real database | Same as integration | `[INFERRED]` The gates are SQL assertions over live counts; no separate tool is needed or authorised | **OPEN — REQUIRES APPROVAL** |
| E2E driver | Critical journeys in a real browser; keyboard walkthrough; no-frame-upload assertion; WhatsApp tool-registry parity | Playwright (proposed in ADR-021); Cypress; WebdriverIO | `[INFERRED]` Candidate reasoning only: a real browser is required for the accessibility keyboard walkthrough and for the bundle-inspection assertion; multi-context support is needed for camera-permission scenarios in the AR fallback matrix | **OPEN — REQUIRES APPROVAL** |
| Load testing tool | NFR-03 p95 targets, NFR-01 concurrency profile, NFR-15 measurement artefact | k6; Artillery; JMeter; autocannon | `[INFERRED]` Candidate reasoning only: a scriptable HTTP-driven tool producing percentile metrics and a dated artefact | **OPEN — REQUIRES APPROVAL** |
| Lighthouse / Web Vitals | PG-1, PG-2 LCP p75 budgets per PR | Lighthouse CI | `[INFERRED]` Named in the plan's gate list as a mechanism, but not versioned or approved as a dependency | **OPEN — REQUIRES APPROVAL** |
| Accessibility audit | Zero critical automated issues on every public route | axe-core or equivalent | `[INFERRED]` The WCAG 2.2 AA target is approved; the auditing tool is not named | **OPEN — REQUIRES APPROVAL** |
| AI evaluation harness | 14 dimensions, CI-blocking, nightly against production samples, versioned by prompt | First-party writing to `ai_evaluations` (proposed in ADR-023); hosted platform; open framework | `[INFERRED]` ADR-023 argues first-party because the assertions are domain-specific: refusing a NULL stone type, citing a `CertificateApproved` field, and proving that "set inventory to 0" changed zero rows | **OPEN — REQUIRES APPROVAL** |
| Secret scanning | SG-7 | Not named | `[INFERRED]` Required by a security gate; no tool authorised | **OPEN — REQUIRES APPROVAL** |
| PII scanning in logs | SG-14 | Not named | `[INFERRED]` Required by a security gate; no tool authorised | **OPEN — REQUIRES APPROVAL** |

### 7.2 Binding constraint

**No test framework may be installed and no test may be written until ADR-021 is resolved.** `INITIAL_IMPLEMENTATION_PLAN.md` task 6 completion criterion is "Unit tests green; no infrastructure imports", and section 24 rule 3 states "Deploy is blocked by tests, not by convention." Writing tests on an unselected runner creates exactly the ad-hoc choice the ADR exists to prevent, and it is irreversible in practice once a suite exists.

### 7.3 What is *not* blocked by ADR-021

Test **fixtures** and test **data** may be prepared, because they are data, not framework. Specifically, plan task 7's requirement to prove the SKU parser against the 1,024-record corpus implies committing the observed SKU corpus as a fixture. That fixture is required regardless of which runner is chosen, and preparing it does not require a runner.

### 7.4 Proposed decision, unchanged

`technical_design/40` ADR-021 remains **Proposed**: Vitest for unit, domain, integration and contract layers; Playwright for end-to-end. This document does not select them, does not install them, and does not treat them as approved.

---

## 8. DESIGN SYSTEM DECISION (ADR-022)

### 8.1 What the authoritative documents actually say

| Document | Statement |
|---|---|
| `PROJECT_SOURCE_OF_TRUTH.md` | Section 12.4 specifies a component **inventory**. It does not name a library. |
| `INITIAL_IMPLEMENTATION_PLAN.md` section 11 | Phase 4 inputs list "design-system inventory" as an input. No library is named. |
| `INITIAL_IMPLEMENTATION_PLAN.md` section 35.1 | Records ADR-021 as the only new ADR required. No design-system ADR is required by the plan. |
| `technical_design/02` line 54 | "Component library / design system primitives — **OPEN — ADR-022 candidate** ... Recommend building primitives in-repo rather than adopting one, but that is a decision to record" |
| `technical_design/40` ADR-022 | **Proposed**: build the primitive layer in-repo, composed of unstyled accessible libraries where they exist |

### 8.2 Determination

The technical design **does not require an external component library**, and it **proposes in-repo primitives**. It does **not** close the question.

### 8.3 Named prohibition

The following are **not approved** by any authoritative document and must not be installed on the strength of ADR-022 alone:

| Library | Status |
|---|---|
| shadcn/ui | **NOT APPROVED** |
| Radix UI | **NOT APPROVED.** ADR-022 mentions "unstyled accessible libraries" generically; that is not a selection. |
| MUI | **NOT APPROVED** |
| Chakra UI | **NOT APPROVED** |
| Tailwind CSS | **NOT APPROVED** |
| Any other component or utility framework | **NOT APPROVED** |

Introducing any of them requires ADR-022 to be resolved with the specific library named, or a further ADR.

### 8.4 What ADR-022 must settle when approved

1. In-repo primitives versus an adopted library, with the specific library named if adopted.
2. Which unstyled accessible behaviour library, if any, is used for dialog focus trapping, combobox keyboard models and disclosure semantics.
3. The accessibility test obligation per primitive, since a hand-built primitive carries the a11y burden a library would otherwise carry.
4. The visual-regression baseline requirement if a full design system is later adopted.

Phase 4 is blocked by this decision, not Phase 1.

---

## 9. EXTERNAL SERVICES AND ACCOUNTS

No provider is invented where the architecture leaves it open. Credentials are named by environment-variable prefix per `PROJECT_SOURCE_OF_TRUTH.md` section 29.6.

| Service | Phase | Purpose | Required credentials | Blocks phase | Status |
|---|---|---|---|---|---|
| Local PostgreSQL 16 | 1 | Development and migration target | `DATABASE_URL` local | **Yes** | APPROVED, must be provisioned |
| Neon dev branch | 1 | Migration rehearsal target | `DATABASE_URL` branch | **Yes** | APPROVED, **phase-entry dependency.** Not production |
| Vercel (preview, env secrets) | 1 | Secret storage and deploy target | `AI_GATEWAY_*`, `WHATSAPP_*`, `PAYMENT_*`, `OTEL_*` and all others as env secrets | **Yes** for secrets | APPROVED, **phase-entry dependency** |
| OpenTelemetry collector | 1 | Trace and metric export | `OTEL_*` | **Yes** for tracing | APPROVED, **phase-entry dependency** |
| Sentry-compatible error reporting | 1 | Frontend and server error reporting | provider token | **Yes** for error reporting | APPROVED, **phase-entry dependency** |
| Redis | 3 | Cache, rate limits, sessions, locks | `REDIS_URL` | **Yes** for Phase 3 | APPROVED, **phase-entry dependency.** Never truth (ADR-002) |
| Cloudflare R2 | 2 | Media originals, renditions, private documents, GLB assets | `R2_*` | **Yes** for Phase 2 asset ingest | APPROVED, **phase-entry dependency** |
| ImageKit | 4 | Image format negotiation, resizing, delivery | `IMAGEKIT_*` | **Yes** for Phase 4 | APPROVED, **phase-entry dependency** |
| Vercel AI Gateway | 9 | Model routing behind `ModelGateway` | `AI_GATEWAY_*` | **Yes** for Phase 9 | APPROVED, **phase-entry dependency** |
| OpenRouter | 9 | Fallback model provider | `OPENROUTER_API_KEY` | **Yes** for fallback | APPROVED, **phase-entry dependency** |
| Vision/OCR model | 8 | Certificate field extraction | via `ModelGateway` | **Yes** for Phase 8 | **UNKNOWN — client decision.** No provider named |
| Meta WhatsApp Cloud API | 10 | WhatsApp channel | `WHATSAPP_*` plus templates | **Yes** for Phase 10 | APPROVED, **phase-entry dependency** |
| Payment provider | 6 | Authorise, capture, refund, webhook verification | `PAYMENT_*` | **Yes** for Phase 6 | **UNKNOWN — client decision.** Port approved, provider not named |
| Email / transactional provider | 6 | Order confirmation, notifications | provider credentials | **Yes** for Phase 6 notifications | **DEFERRED.** No provider named |

### 9.1 Account-free phases

**Phase 1 requires four external accounts or services** (Neon dev branch, Vercel env secrets, OpenTelemetry collector, error reporting) and one local install (PostgreSQL 16). None of these is the payment provider, the vision model or WhatsApp, and none of them is a production database.

### 9.2 Never permitted

- Connecting to a production or managed production database during Phases 1 and 2. Migrations run on a Neon **dev branch** and are destroyed after.
- Committing any credential. Verified by a CI scan.
- Storing a secret in a `feature_flags` row or any config table.
- Reaching a production customer-data copy for preview or staging.

---
## 10. SKILL PRIORITY

Priority exists to prevent learning, installing or building capability before it is needed.

| Priority | Meaning | Consequence of violating it |
|---|---|---|
| **P0** | Required immediately for Phase 1 | Phase 1 cannot start |
| **P1** | Required for the MVP (Phases 1 to 6) | MVP cannot complete |
| **P2** | Required after MVP (Phases 7 to 13) | Early investment in unneeded capability |
| **P3** | Specialised or future-facing | Premature optimisation, or an unjustifiable cost |

### P0 — required immediately for Phase 1

TypeScript monorepo authoring; pnpm workspace management; ESLint boundary enforcement; `tsc --noEmit`; pure domain logic; canonical JSON and SHA-256; PostgreSQL DDL, constraints, RLS, indexes, extensions, triggers, views, pooling, transaction scope; Drizzle ORM and Drizzle Kit; Zod schema authoring; standard error envelope; application-service orchestration; policy-based authorisation; transactional outbox; idempotent event consumption; Redis caching discipline; money arithmetic discipline; configuration hash; SKU grammar parser; D9 tokenizer; provenance capture; read-only artefact access; evidence manifest; OpenTelemetry tracing; structured logging; error reporting; domain span instrumentation; environment provisioning; secret management; port abstraction; connection pooling; PII redaction; secret scanning; lint and typecheck CI gate; boundary rule enforcement; schema drift gate; PII scan gate; evidence-linked test fixtures.

**Eleven of these thirty P0 items depend on ADR-021 and cannot proceed without it:** the testing rows in group P and the two CI gates that need a scanner. That is why ADR-021 is the single blocking decision.

### P1 — required for the MVP

OpenAPI generation; route handlers; idempotency keys; keyset pagination; job queue with leases; job idempotency keys; generation-bump invalidation; App Router rendering; Server Components and client boundaries; design-system primitives (**ADR-022**); responsive image delivery; Web Vitals; structured data; sitemap generation; keyboard and focus management; colour-independent meaning; cart lifecycle; four-step checkout; price component model; immutable price snapshots; payment provider adapter; webhook verification and reconciliation; order immutability; inventory reservation; atomic pair reservation; discount and refund validation; add-on modelling; customer accounts; full-text search; trigram matching; diacritic folding; facet computation; disjunctive colour facets; versioned ranking; synonym seeding; vector circuit breaker; provenance exposure; path-stem classification; terminal-state disposition; SHA-256 deduplication; content sniffing; variant generation; focal points; private bucket management; asset usage tracking; branch-per-PR database; backfill batching; canary inputs; webhook HMAC; SQL injection defence; XSS defence; SSRF defence; signed-URL authorisation; open-redirect prevention; business metric emission; import batch accounting; all Phase 2 migration skills; API contract testing; E2E driver; accessibility audit; migration gate runner; catalogue completeness guard; migration gate CI execution; bundle budget; dependency drift detection; preview and staging deploy.

### P2 — required after MVP

Typed block renderer registry; `Intl` formatting; reduced-motion handling; DYO state machine, compatibility engine, unknown semantics, rule seeding, quote lifecycle, cart conversion, share and resume; the full certificate pipeline (upload, scanning, OCR, schema, confidence, cross-checks, ledger); the full AI and RAG pipeline (gateway, tool registry, authorisation, grounding, refusal, injection defence, import-graph enforcement, chunking, hybrid retrieval, query-time ACL, routing, handoff, SSE); the full WhatsApp pipeline; admin RBAC, `BYPASSRLS`, block approval UI, audit UI, catalogue admin, bulk operations; canary and rollback; alerts with owners and runbooks; metric cardinality enforcement.

### P3 — specialised or future-facing

All WebAR skills (K group); all load, security-matrix and AI-evaluation testing; embedding and vector similarity search as distinct from the required circuit breaker; reduced-motion handling specific to AR; micro-frontends, multi-language, GraphQL, CRM/ERP, lab API integration, necklace and bracelet AR anchors, per-stone 3D models.

**P3 does not mean low value.** WebAR is a substantial capability. It is P3 because it is entirely deferrable: `INITIAL_IMPLEMENTATION_PLAN.md` section 21.2 records that Phase 11 depends only on Phases 3 and 4 and can run in parallel with 8, 9 and 10, and `technical_design/21` section 16 records it as the largest cost risk with no source precedent. Nothing else depends on it.

---

## 11. LEARNING AND IMPLEMENTATION ORDER

Ordered so that each step is verifiable before the next begins. Every step is supported by the implementation plan's dependency graph; no step is invented here.

| # | Capability | Why here | Plan reference |
|---|---|---|---|
| 1 | Repository skeleton, TypeScript project references, pnpm, ESLint boundaries | Every other package depends on the boundary rules existing first. Task 1 has no dependency | Section 5, task 1 |
| 2 | Local PostgreSQL 16 and Neon dev branch; evidence manifest | Needed before any migration. Task 3 has no dependency and can run in parallel with task 1 | Tasks 2, 3 |
| 3 | Drizzle schema mirroring the validated DDL; ordered migrations; 9 invariant constraints; trigger; view; 6 RLS policies | The schema is the root of everything. Tasks 4 and 5 | Tasks 4, 5 |
| 4 | Reference-data seeders | Domain logic needs stable reference data to be testable | Task 9 |
| 5 | Domain value objects and INV-01/02/03 | Pure logic, zero infrastructure. Must precede the SKU parser because the parser validates domain shapes | Task 6 |
| 6 | SKU grammar parser proven against the 1,024-record corpus | Gates V3 and V19. Highest-value single test in the plan | Task 7 |
| 7 | Configuration hash and slug derivation | Pure functions, pure property tests | Task 8 |
| 8 | Error envelope, error registry, OpenTelemetry tracing, schema-drift CI | Cross-cutting primitives every later phase consumes | Tasks 12, 14, 15 |
| 9 | `tools/migrate`: resumable idempotent stages with SHA-256 gating | All of Phase 2 hangs off this | Task 10 |
| 10 | Extract stage: verbatim load of `urls.jsonl` | Staging never normalises; load must be provably unchanged | Task 11 |
| 11 | Parse stage: five-family classifier with per-field confidence | Gates V1, V2, V14 | Task 12 |
| 12 | D9 tokenizer producing `gemstone_stones` | Gates V8, V9. Depends on the stage harness, not on the parser | Task 13 |
| 13 | Canonical upserts in dependency order | Referential integrity demands taxonomy before stones before settings before products | Task 14 |
| 14 | The 221 derived-identity write path | Gate V18, V20. Must land before the gate runner, so the runner can assert it | Task 15 |
| 15 | Price recovery and residual derivation | 1,024 prices, residual non-zero everywhere | Task 16 |
| 16 | Media classification with JavaScript and chrome skip | Gate V16 | Task 17 |
| 17 | Certificate artefact extraction from paths | Creates rows only, no fields | Task 18 |
| 18 | Redirect generation for 44,218 URLs | ADR-015 | Task 19 |
| 19 | Gate runner V1 to V22 plus idempotency check | Gate V17 is the proof the whole pipeline is deterministic | Task 20 |
| 20 | Catalogue read repositories, `CatalogQueryPort`, facets, keyset pagination | Phase 3. Provenance must be exposed from the first response | Phase 3 tasks 1 to 5 |
| 21 | Redis caching, generation bumps, Redis-down degradation | Cache before endpoints, so no endpoint ships uncached | Phase 3 tasks 6, 7 |
| 22 | OpenAPI generation, rate limits, response headers | Contract surface before consumers | Phase 3 tasks 8 to 10 |
| 23 | Design-system primitives | Blocks all storefront work | ADR-022, Phase 4 task 2 |
| 24 | Next.js shell, layout, navigation, states | App shell precedes pages | Phase 4 |
| 25 | Catalogue pages, product detail, redirects, sitemap, structured data | The SEO-critical surface | Phase 4 |
| 26 | Accessibility and performance budgets enforced in CI | Budgets must be enforced from the first page, not retrofitted | Phase 4 epic 4.7 |
| 27 | Full-text arm, trigram fallback, facet consistency | Before semantic, because structured must be correct first | Phase 5 tasks 2 to 4 |
| 28 | Versioned ranking, synonyms, caching, vector circuit breaker | Ranking needs the structured arm to be correct | Phase 5 tasks 7 to 11 |
| 29 | Semantic arm with gating and embedding generation | Last, because it is the arm that may be disabled | Phase 5 tasks 5, 6 |
| 30 | Cart lifecycle and server-side re-pricing | Before checkout | Phase 6 tasks 1, 2 |
| 31 | `PaymentProvider` interface and one adapter | The port must exist before any provider can be chosen | Phase 6 task 5 |
| 32 | Four-step checkout, order placement, snapshots, webhook reconciliation | The observed funnel is the requirement | Phase 6 tasks 3, 4, 6 |
| 33 | Accounts, wishlist, compare, add-ons, discounts, refunds, reservations, order timeline | Remaining Phase 6 scope | Phase 6 tasks 7 to 13 |
| 34 | DYO configuration aggregate, state machine, compatibility evaluator | Pure logic first, UI second | Phase 7 tasks 1 to 4 |
| 35 | Pricing components, snapshots, cart conversion, compatible-settings lookup | Then the configurator UI | Phase 7 tasks 5 to 7 |
| 36 | Multi-step DYO UI, share codes, preview render | User-facing last | Phase 7 tasks 8 to 11 |
| 37 | Certificate upload, private storage, extraction schema, confidence policy | Security and trust before automation | Phase 8 tasks 1 to 4 |
| 38 | Cross-checks, state machine, anomalies, review queue, view enforcement, ledger | Trust workflow before presentation | Phase 8 tasks 5 to 10 |
| 39 | Thin admin slice for certificate review | The plan notes Phase 8 depends on a Phase 12 review UI, so a thin slice may be needed earlier | Phase 12 dependency note |
| 40 | `ModelGateway`, tool registry, deterministic authorisation | ADR-003 before any model call | Phase 9 tasks 1 to 3 |
| 41 | Orchestrator stages, grounding gate, refusal rules | Grounding before synthesis | Phase 9 tasks 4 to 6 |
| 42 | Guardrails, injection defence, RAG ingestion and retrieval, routing, citations, handoff | Evaluation needs all of it | Phase 9 tasks 7 to 11 |
| 43 | AI evaluation harness, import-graph CI proof | Release gate | Phase 9 tasks 12, 13 |
| 44 | WhatsApp webhook, idempotent receipt, conversation binding, capabilities | Adapter before formatting | Phase 10 tasks 1 to 4 |
| 45 | Templates, attachments, handoff, opt-in, shared-brain test | Correctness of the shared guarantee | Phase 10 tasks 5 to 9 |
| 46 | 3D asset pipeline and budgets | Long pole; can start any time after Phase 3, in parallel | Phase 11 tasks 1 to 3 |
| 47 | AR route, MediaPipe, Three.js, placement, occlusion | Runtime after assets exist | Phase 11 tasks 4 to 7 |
| 48 | Device governor, fallback matrix, QR handoff, privacy | Honesty and privacy before polish | Phase 11 tasks 8 to 12 |
| 49 | CMS typed blocks, revisions, approval workflow | Content foundation | Phase 12 tasks 1 to 5 |
| 50 | Catalogue admin, bulk operations, derived-reference approval, migration console | Operability of the 221 and the catalogue | Phase 12 tasks 6 to 9 |
| 51 | Trust review console, AI console, RBAC, audit | Governance last | Phase 12 tasks 10 to 13 |
| 52 | Full NFR measurement, security matrix, SLOs, alerting, runbooks | Proves everything else | Phase 13 |

### 11.1 Parallelisable windows

| Window | Parallel work | Rationale |
|---|---|---|
| After task 3 (Phase 1) | Phase 2 harness build | No shared write paths with Phase 1 |
| After Phase 3 | 3D asset pipeline (Phase 11 groundwork) | Asset production is the long pole and needs no other phase |
| Phases 4 and 5 | Storefront pages not depending on search refinement | Search sits behind the same port |
| Phases 6 and 8 | Commerce flows versus certificate upload | No shared write paths |
| Phases 8 and 9 | Certificate pipeline versus AI build | AI only reads the verification model |

### 11.2 Unambiguous ordering rules, restated

1. A phase may not begin until every dependency has **passed its exit gate**, not merely started.
2. Phase 5 must not change storefront call sites. If it does, the port abstraction has failed and that is a defect.
3. Phase 7 may not begin cart or checkout work. Phase 6 may not begin configurator work.
4. Phase 9 may not begin before Phase 8, because the AI must be able to answer certificate questions safely.
5. Phase 13 is last. No phase may be declared done by pointing at future hardening work.

---

## 12. REQUIRED DOCUMENTATION

**This is a requirements list. No external documentation source was consulted, browsed or fetched in producing this document, and no claim is made that any of it has been read.** Each entry states what must be available when the corresponding skill is first used.

| Skill | Documentation required | Needed by | Availability |
|---|---|---|---|
| Next.js App Router | Official App Router documentation: routing, rendering modes, caching and revalidation, route handlers, streaming, `next/dynamic` with `ssr:false`, cache tags, image optimisation | Phase 4 | To be consulted at Phase 4 |
| React and Server Components | Official React documentation: RSC model, client boundary rules, streaming, error and loading boundaries | Phase 4 | To be consulted at Phase 4 |
| TypeScript | Official handbook: project references, composite builds, strict mode, declaration emit | Phase 1 | To be consulted at Phase 1 |
| PostgreSQL 16 | Official documentation: DDL, constraints, RLS, `NUMERIC`, `tsvector` and `ts_rank_cd`, `pg_trgm`, `unaccent`, generated columns, triggers, views with `LATERAL`, advisory locks, `FOR UPDATE SKIP LOCKED`, `COPY`, JSON operators | Phase 1 | To be consulted at Phase 1 |
| pgvector | Official documentation: `vector` type, distance operators, HNSW index build and operator classes, query planning, index maintenance | Phase 1 for the type, Phase 5 for HNSW tuning | To be consulted at Phase 1 |
| Drizzle ORM and Drizzle Kit | Official documentation: schema definition, migration generation, typed query builder, transaction API, seeding | Phase 1 | To be consulted at Phase 1 |
| Zod | Official documentation: schema definition, discriminated unions, refinement, error formatting, JSON Schema and OpenAPI generation | Phase 1 | To be consulted at Phase 1 |
| Neon | Official documentation: branching, pooled connections, transaction pooling limitations, connection pooling behaviour, environment variables | Phase 1 | To be consulted at Phase 1 |
| Redis | Official documentation: key expiry, `SCAN`, pub/sub, Lua scripting for single-flight, client behaviour on failure | Phase 3 | To be consulted at Phase 3 |
| Vercel | Official documentation: deployment, cron, environment secrets and their scoping, preview deployments, function limits | Phase 1 | To be consulted at Phase 1 |
| Cloudflare R2 | Official documentation: buckets, presigned URLs, public-access disablement, lifecycle rules, S3-compatible API | Phase 2 | To be consulted at Phase 2 |
| ImageKit | Official documentation: URL-based transformation parameters, responsive delivery, focal points, formats | Phase 4 | To be consulted at Phase 4 |
| OpenTelemetry | Official documentation: traces, metrics, context propagation, semantic conventions | Phase 1 | To be consulted at Phase 1 |
| Meta WhatsApp Cloud API | Official documentation: webhook setup and `X-Hub-Signature-256` verification, message types, templates, the 24-hour customer service window, media handling, Graph API error semantics | Phase 10 | To be consulted at Phase 10 |
| MediaPipe | Official documentation: HandLandmarker, WASM and GPU delegate, the 21-landmark set, handedness, performance | Phase 11 | To be consulted at Phase 11 |
| Three.js | Official documentation: GLTFLoader, DRACOLoader, KTX2Loader, PBR materials, renderer configuration, tone mapping | Phase 11 | To be consulted at Phase 11 |
| Draco | Official compression tooling and encoder documentation | Phase 11 | To be consulted at Phase 11 |
| KTX2 / Basis Universal | Official transcoder documentation and texture format constraints | Phase 11 | To be consulted at Phase 11 |
| Vercel AI Gateway | Official documentation: model routing, streaming, tool calling, fallback configuration | Phase 9 | To be consulted at Phase 9 |
| OpenRouter | Official API documentation: model listing, request format, error and rate-limit semantics | Phase 9 | To be consulted at Phase 9 |
| pnpm | Official documentation: workspaces, `pnpm-workspace.yaml`, filters, lockfile behaviour | Phase 1 | To be consulted at Phase 1 |
| ESLint | Official documentation: flat config, `no-restricted-imports`, plugins, monorepo configuration | Phase 1 | To be consulted at Phase 1 |
| WCAG 2.2 | The W3C WCAG 2.2 specification: success criteria, conformance levels, sufficient techniques and failures | Phase 4 | To be consulted at Phase 4 |
| MDN | Reference for browser platform capabilities: WebGL2, WebAssembly, `getUserMedia`, `prefers-reduced-motion`, `IntersectionObserver`, `Intl` | Phases 4, 11 | To be consulted at Phase 4 |
| Payment provider | Provider-specific API documentation | Phase 6 | **Cannot be listed until the provider is chosen.** This is a direct consequence of the provider being `[UNKNOWN]` |
| Vision/OCR model | Provider-specific model documentation | Phase 8 | **Cannot be listed until the model is chosen** |
| Email provider | Provider-specific API documentation | Phase 6 | **Cannot be listed until the provider is chosen** |

### 12.1 Documentation gaps that cannot be closed yet

Three documentation requirements are undefined because the underlying decision is undefined. Filling them in would require inventing a provider, which is prohibited.

| Gap | Blocked by | Consequence |
|---|---|---|
| Payment integration guide | Payment provider `[UNKNOWN]` | Phase 6 adapter implementation cannot be fully specified |
| Vision extraction accuracy guidance | Vision model `[UNKNOWN]` | Phase 8 confidence thresholds are architecture-mandated (0.90 / 0.85 / 0.70 / 0.50) but their calibration against a specific model is not |
| Transactional email integration | Email provider deferred | Phase 6 notification templates cannot be finalised |

---

## 13. PROHIBITED AND UNAPPROVED TOOLS

### 13.1 Explicitly rejected by a locked ADR

Introducing any of these requires a new ADR **superseding** the named decision.

| Technology | Supersedes | Reason |
|---|---|---|
| Elasticsearch, OpenSearch | ADR-006 | ~33,000 searchable entities; Postgres meets NFR-03 |
| Algolia, Typesense, Meilisearch | ADR-006 | Same |
| Any hosted search API | ADR-006 | Same |
| Pinecone, Weaviate, Qdrant, Chroma, any external vector database | ADR-001, ADR-018 | Vectors live with transactional data |
| Kafka, RabbitMQ, NATS, AWS SQS as event backbone | ADR-020 | Transactional outbox in Postgres is sufficient at this scale |
| Redis Streams or Redis Pub/Sub as durable event transport for business events | ADR-020 | Outbox plus `event_consumers` is the durability mechanism |
| Microservice decomposition, per-domain deployables | ADR-019 | Modular monolith; extraction requires a named trigger |
| Prisma, TypeORM, Kysely, MikroORM, Sequelize, Knex | Section 10.3 layer contract | Drizzle is the named repository layer |
| Redis as a write-through store for orders, payments or prices | ADR-002 | Never truth |
| Redis Pub/Sub as a correctness dependency for cache invalidation | ADR-002 | The generation bump is the safety net; Pub/Sub is a hint |

### 13.2 Explicitly not approved, and not ADR-covered

| Technology | Status |
|---|---|
| GraphQL, any GraphQL server or client | **DEFERRED**, not approved |
| shadcn/ui | **NOT APPROVED.** No authoritative document names it |
| Radix UI | **NOT APPROVED.** ADR-022 refers generically to "unstyled accessible libraries" |
| MUI | **NOT APPROVED** |
| Chakra UI | **NOT APPROVED** |
| Tailwind CSS | **NOT APPROVED** |
| Any CSS framework | **NOT APPROVED** |
| Any state-management library (Redux, Zustand, Jotai, MobX) | **NOT APPROVED.** Not required by any authoritative document; React Server Components plus URL state cover the identified needs |
| Any component or utility kit beyond the ADR-022 outcome | **NOT APPROVED**, except Agentation 3.1.2 as development-only feedback tooling under ADR-025 |
| Any ORM or query builder beyond Drizzle | **REJECTED** |
| Any event broker beyond the outbox | **REJECTED** |
| Any authentication library or provider | **NOT APPROVED.** The source auth mechanism is `[UNKNOWN]`; Phase 6 needs a decision |
| Any payment SDK beyond the chosen adapter | **NOT APPROVED** |
| Any AI SDK beyond the locked `ModelGateway` surface | **NOT APPROVED.** Business logic must never import a provider SDK directly |
| Any vector client library | **NOT APPROVED.** `pgvector` inside Postgres per ADR-001 |
| Any queue client beyond `QueuePort` | **NOT APPROVED** |
| Any object-storage client beyond `ObjectStorePort` | **NOT APPROVED** |
| Any charting or analytics library | **NOT APPROVED.** Web Vitals reporting and OTel cover the identified needs |
| Any i18n framework | **NOT APPROVED.** Multi-language is a deferred decision |

### 13.3 Runtime-scope prohibitions

| Prohibition | Reason |
|---|---|
| MediaPipe or Three.js in any server bundle | Browser-only libraries; the AR route enforces `ssr: false` |
| Any provider SDK outside `packages/ai`, `integrations` and `packages/db` | Layer contract |
| Any repository import in `packages/domain` | Pure domain layer; lint-enforced |
| Any repository import reachable from `packages/ai` | ADR-003 structural guarantee |
| `packages/domain` depending on any runtime package except Zod | Invariants must be testable without infrastructure |
| Any import across module `infrastructure/` boundaries | Modules reach each other only through application services |

### 13.4 Test-tooling prohibitions

No test framework may be installed until ADR-021 is resolved. This includes the unit runner, the property-testing library, the E2E driver, the load tool, the accessibility auditor, the secret scanner, the PII scanner and the AI evaluation harness. Installing any of them now is the specific failure ADR-021 exists to prevent.

---

## 14. TOOLING INSTALLATION POLICY

**Nothing is installed by this document.** This section defines the policy for the coding stage.

### 14.1 What may be installed now

Nothing, until the coding phase is authorised and ADR-021 is resolved.

Once coding is authorised, and only for Phase 1:

| Item | Scope | Justification |
|---|---|---|
| TypeScript 5.x | devDependencies, root | Plan section 5 states TypeScript is implied by the locked Next.js choice |
| pnpm | developer tool, not a project dependency | Named in plan section 5 |
| ESLint plus the flat-config plugins for TypeScript and `no-restricted-imports` | devDependencies, root | Named in `technical_design/02` |
| Drizzle ORM and Drizzle Kit | `packages/db` devDependencies and dependencies | Named in Source of Truth section 10.3 and `technical_design/02` |
| Zod | runtime dependency of `packages/contracts`, `packages/config`, `packages/domain` | Named in section 10.3 |
| OpenTelemetry SDK and exporter | runtime dependency of `packages/observability` | Named in `technical_design/02` |
| Redis client | runtime dependency of the caching layer | Redis is an approved dependency; the client library is its implementation detail and is chosen at implementation time, recorded in `technical_design/02` |

### 14.2 What must wait

| Item | Wait until |
|---|---|
| Next.js and React | Phase 4 |
| Cloudflare R2 SDK | Phase 2 |
| ImageKit SDK | Phase 4 |
| AI gateway and OpenRouter SDKs | Phase 9 |
| Meta WhatsApp SDK | Phase 10 |
| MediaPipe and Three.js | Phase 11 |
| Draco and KTX2 tooling | Phase 11 |
| Payment provider SDK | Phase 6, and only after the provider is chosen |
| ~~Any test framework~~ **ADR-021 RESOLVED 2026-10-07:** Vitest may be installed for the unit/domain/integration/contract layers as each layer's tests require it; **Playwright waits** until a phase requires browser testing | — |

### 14.3 What requires ADR approval before installation

Every item in Section 13, plus:

| Item | ADR |
|---|---|
| ~~Any test runner, E2E driver, load tool, property-testing library, accessibility auditor, secret scanner, PII scanner~~ **ADR-021 ACCEPTED 2026-10-07** for the runner + E2E driver (Vitest/Playwright). The load-test tool, property-testing extensions, accessibility auditor, secret and PII scanners remain individual installation decisions | ADR-021 (partially resolved as above) |
| Any component, CSS or state-management library | ADR-022 |
| Agentation visual-feedback component, development-only | ADR-025 (accepted 2026-10-12) |
| Any AI evaluation framework | ADR-023 |
| Any provenance or lineage framework | ADR-024 |
| Any technology in the rejected list | New ADR superseding the referenced decision |

### 14.4 Dependency-scope classification

| Scope | What belongs | Rationale |
|---|---|---|
| `dependencies` | Zod, the Redis client, the OTel SDK, Drizzle ORM, and integration SDKs in their own modules | Required at runtime |
| `devDependencies` | TypeScript, pnpm tooling, ESLint and plugins, Drizzle Kit, approved test tooling, Lighthouse tooling once approved, load tooling once approved, Agentation for local development only | Build-time or test-time only |
| `tools/migrate` only | Migration-only libraries, for example a streaming JSONL parser if one proves necessary | Must never reach a runtime bundle |
| Never in a production bundle | Test runners, E2E drivers, load tools, axe-core, Playwright, Cypress, Agentation, any seeding library, `tools/migrate` itself, any devDependency of `apps/web` | Bundle budget PG-5 and the AR bundle isolation requirement |
| Never in any bundle | Secret values, the evidence package, migration staging data | Security and evidence integrity |

### 14.5 Bundle budget enforcement

| Budget | Limit | Enforced by |
|---|---|---|
| Storefront initial JS | 180 KB gzipped | CI bundle check, gate PG-5 |
| Route chunk | 90 KB gzipped | CI bundle check |
| WebAR chunk | 120 KB gzipped, lazily loaded | CI bundle check |
| Admin bundle | Not in the storefront graph | Architecture test |
| GLB per jewellery type | Ring 1.8 MB, earrings 1.5 MB, pendant 1.2 MB, necklace 2.6 MB, bracelet 2.4 MB | Asset pipeline validation |

Budgets are enforced in CI so a WebAR or AI regression cannot land silently.

### 14.6 Lockfile and version policy

| Rule | Detail |
|---|---|
| Lockfile | Committed |
| Application packages | Exact versions |
| Extensions | Pinned to versions known available on Neon |
| Embedding model | Single model, single dimension 1024; a change is a versioned re-embed job, not a schema change |
| Dependency drift | A CI job asserts declared dependency sets match `technical_design/02`; drift fails the build |
| Undeclared dependency | CI dependency-drift job fails |

---
## 15. SECURITY AND BOUNDARY SKILLS

| Boundary | Skill required | Enforcement mechanism | Gate | Phase |
|---|---|---|---|---|
| **Row-level security** | RLS policy authoring; `BYPASSRLS` role containment | PostgreSQL policies; schema introspection test proving no RLS-enabled table lacks a policy | SG-1, SG-9 | 1, 12 |
| **Authorization** | Policy-based authorisation outside the LLM; role matrix across 10 roles; resource-level scoping | `authorization()` in code before `execute()`; role x endpoint matrix test where anything not explicitly allowed returns 403 | SG-1 | 1, 12 |
| **Authentication** | Managed identity provider; session handling; password and email-verification flows | Observed `/auth` and `/verify-email` routes exist. The mechanism is `[UNKNOWN]` and is a **client decision** | SG-1 | 6 |
| **Secrets management** | Environment secret storage; secret reference resolution; rotation | Platform secret manager; CI secret scan; runtime redaction | SG-7 | 1 |
| **Webhook verification** | HMAC over the raw body **before parsing**; idempotent receipt; replay suppression | Signature check precedes any parse; `(provider, external_event_id)` uniqueness | SG-4 | 6, 10 |
| **Idempotency** | Client-supplied keys on every mutating endpoint; `job_key` on every job; `event_consumers` on every delivery | Postgres unique constraint as the authority; Redis is a mirror only | SG-2 | 1, 3, 6 |
| **Audit logging** | Every privileged action recorded with before and after state; append-only; no delete path | `audit_logs`; audit-completeness test; privileged action fails closed if the audit write fails | SG-8 | 12 |
| **AI tool restrictions** | Registry with no mutating tool for price, inventory, orders, payments, certificates or permissions; no repository in the AI import graph | Import-graph architecture test plus the behavioural mutation test: "set inventory to 0" produces a guardrail event and zero row changes | SG-10 | 9 |
| **Certificate verification** | Per-field confidence; confidence bands; whole-document human approval; view-level enforcement | `certificate_public` view; below-0.50 withheld; `field_status='VERIFIED'` required to render as fact | SG-12 | 1, 8 |
| **Provenance handling** | `evidence_status` per field; `source_url`; `import_batch_id`; `raw_spec` | Provenance-coverage assertion over all migrated rows; ADR-024 pending on storage design | FR-CAT-02, NFR-08 | 1, 2 |
| **PII protection** | Redaction before logging; no PII in metric labels; no PII in events; no PII in embeddings; EXIF stripped | Automated PII scan in CI; allow-listed span attributes; `content_redacted` as the only retained AI content | SG-14 | 1, 13 |
| **Price integrity** | Server-side computation only; decimal strings end to end; no floats in any price path | Price-tampering test asserting 409 `PRICE_CHANGED` | SG-3 | 1, 6 |
| **SQL injection** | Parameterised queries only; fuzzed inputs | Fuzzing across every endpoint with no query-shape change | SG-13 | 1, 13 |
| **File upload** | Content sniffing; size and dimension caps; virus scan; EXIF strip | Upload security tests | SG-5 | 2, 8 |
| **Document privacy** | Private buckets; short-lived signed URLs; authorization checked before signing | Public-URL probe test | SG-6 | 2, 8 |
| **Rate limiting** | Per-scope limits; burst behaviour; `rate_limit_counters` fallback | Burst tests | SG-15 | 3, 13 |
| **Prompt injection** | Delimited, labelled untrusted blocks for descriptions, retrieved chunks and OCR output; per-intent tool allow-lists; request-level nonce binding a turn to its tool results | Injection suite using real product copy and certificate text | SG-11 | 9 |
| **Open redirect** | Target validated against known internal route patterns at insert time | Insert-time validation; `is_external` requires an allow-list | — | 4 |
| **SSRF** | Private-range and metadata-endpoint blocking on outbound fetch | Outbound fetch filter | — | 2 |

### 15.1 The two boundaries most likely to be attempted to weaken

**RLS.** `PROJECT_SOURCE_OF_TRUTH.md` section 22.3 states plainly: "Neon connects over the network, so RLS is defence-in-depth for customer data rather than the primary boundary. The primary boundary is the application service layer." RLS is a second line, not the first. Conflating the two is how a policy gap becomes a data breach.

**AI tool restrictions.** Four layers exist because one is not enough: structural (no such tool exists), contractual (`mutates` declared, application service named), runtime (`authorization()` before `execute()`, no write-capable repository held), prompt (defence-in-depth only, never the sole control). Removing any one leaves three, which is defensible; removing two is not.

---

## 16. AI-SPECIFIC SKILLS

### 16.1 The binding constraint

```
LLM MUST NOT directly mutate database state.

AI must operate through deterministic application tools.
```

This is ADR-003 and NFR-05. It is not a style preference; it is the property that makes an LLM safe to put in front of a one-of-a-kind catalogue where an incorrect availability flag loses a stone and an incorrect price loses margin.

### 16.2 Skill map

| Skill | What it requires | Concrete requirement | Phase |
|---|---|---|---|
| `ModelGateway` | Provider isolation, fallback chain, budget enforcement, concurrency semaphore | No business logic imports a provider SDK. Primary then gateway-routed alternative on 429/5xx/timeout, **maximum 1 retry**. Per-surface daily budget with a hard stop plus handoff, never silent truncation. `temperature=0` for extraction | 9 |
| Tool calling | A fixed registry with strict input and output schemas | Ten tools. Each declares `name`, `version`, `inputSchema`, `outputSchema`, `mutates`, `timeoutMs`, `idempotent`, `execute`, `citationFor`. **No tool that mutates price, inventory, orders, payments, certificates or permissions** | 9 |
| Deterministic tools | Authorization evaluated in code, outside the LLM | `authorization()` runs before `execute()` on every call. A denial records `authorization_decision='DENY'` and tells the model only that the capability is unavailable, never the policy internals | 9 |
| Guardrails | Rule engine detecting and blocking escalation attempts | Guardrail events persisted; injection defence with delimited untrusted blocks; per-intent tool allow-lists; output schema validation on every model response | 9 |
| RAG | Chunking, embedding, hybrid retrieval, trust-tier weighting | Heading-boundary chunks of 400 to 800 tokens with 15% overlap. `score = (0.55 cosine + 0.30 ts_rank_cd + 0.15 metadata) x trust_tier_weight`. `UNVERIFIED` weight 0.0 | 9 |
| Embeddings | Single model, single dimension | Dimension 1024, recorded per chunk. A model change is a full rebuild, never a mixed-dimension index | 5, 9 |
| pgvector | `vector(1024)`, HNSW indexing | Two HNSW indexes already validated. Index maintenance and reindexing as background jobs | 1, 5 |
| Evaluation | Fourteen dimensions, CI-blocking, nightly | `factuality`, `no_invention_null`, `tool_selection`, `price_safety`, `inventory_safety`, `certificate_safety`, `treatment_disclosure`, `dyo_quality`, `refusal`, `citation`, `escalation`, `injection_resistance`, `grounded_ratio`, `cost`. Results in `ai_evaluations` | 9 |
| Provenance | Every factual claim resolves to a real field with a declared evidence status | `evidence_status` is `OBSERVED` or `EXTRACTED`; certificate-derived claims additionally require `verification_status='VERIFIED'`; the claim text must be entailed by the value | 9 |
| Refusal behaviour | Refuse rather than guess, specifically for NULL structured data | `stone_type` populated for only **113 of 1,024** products, so this path is common. Refusal form: "I do not have a recorded stone type for this piece. I can show you the colour, cut and origin we do have, or connect you with a gemologist." | 9 |
| Human handoff | Nine triggers, persisted, state transition not message | `CUSTOMER_REQUEST`, `LOW_CONFIDENCE`, `CERTIFICATE_ANOMALY`, `COMPLEX_DYO`, `HIGH_VALUE`, `SENSITIVE_OPERATION`, `POLICY_ESCALATION`, `DISSATISFACTION`, `NO_INFORMATION`. Moves to `AWAITING_HUMAN`, writes a request row, gives the customer a concrete expectation | 9 |

### 16.3 The refusal table the AI must honour

| Field | May state when | Must refuse when |
|---|---|---|
| Stone type | `variety_id` resolved | NULL. `[OBSERVED]` populated for 113 of 1,024 |
| Origin | `origin_id` present | NULL, or a certificate extraction below 0.85 |
| Treatment | `treatment_id` present and not UNKNOWN | NULL or UNKNOWN. Never "probably untreated" |
| Weight, dimensions | `gemstone_stones` rows exist | Only a summed total exists |
| Price | A live `dyo_price_snapshots` or `price_entries` value | From memory or estimation |
| Availability | `products.availability` true **and** within the freshness window | Stale or unknown |
| Certificate authenticity | `verification_status='VERIFIED'` | Anything else. Always "on file, not yet verified" |
| Price per carat | `price_per_cararat` present | Derived by division without disclosure |
| Metal | `metals.code` resolved | Inferred from a free-text name |

Unverifiable claims are **stripped, not softened**. "This is probably untreated" is still an invented claim wearing a hedge.

### 16.4 Skills required for the AI phase that are not AI skills

| Skill | Why it is needed |
|---|---|
| RLS and authorization on every data the AI reads | The AI reads customer conversations and orders through tools that must enforce the same policies |
| Audit logging of tool calls | `tool_calls` records input, redacted output, authorization decision, latency and cost |
| Cost budget infrastructure | AI spend is bounded by a Redis-backed per-surface budget |
| Observability with cardinality control | `grounded_ratio` and `tool_denial_rate` are correctness signals, and their labels must not include user ids |

---

## 17. WEBAR SKILLS

### 17.1 Evidence position, restated without softening

`[VERIFIED][DEFECT D4]` **The source contained no verified GLB or WebGL implementation.** The `three_d` (6,923) and `three_sixty` (855) asset classes are Nuxt JavaScript bundles misclassified because hex filenames contained `3d` or `360`. `crawler.sqlite.media_assets` contains no genuine 3D assets.

Genuine 360-degree material exists as mp4 plus thumbnails at `phone-video.naturalgemstones.com`. That is video, not WebAR.

**Therefore WebAR is target architecture, entirely `[INFERRED / PROPOSED]`, and not source fact.** No original AR behaviour, asset, model or placement algorithm is reconstructible. Every skill in this section is a new capability.

### 17.2 Skill map

| Skill | Technology | Requirement | Difficulty |
|---|---|---|---|
| Hand tracking | MediaPipe HandLandmarker, WASM plus GPU delegate | 21 landmarks at 30 to 60 fps; handedness, pinch distance, orientation | Documented, well-supported |
| Scene rendering | Three.js with WebGL2 | PBR materials, HDR environment, renderer configuration | Documented, well-supported |
| WebGL2 | Browser API | Fallback required when absent | Browser capability, not a library |
| PBR materials | albedo, normal, roughness, metalness, AO | Baked offline, max 1024px textures | Offline pipeline work |
| GLB format | glTF binary | Per setting variant, not per SKU | Container format |
| Draco compression | Draco encoder and decoder | Target budgets: ring 1.8 MB, earrings 1.5 MB, pendant 1.2 MB, necklace 2.6 MB, bracelet 2.4 MB | Documented tool |
| KTX2 textures | Basis Universal transcoder | GPU-compressed textures, max 1024px | Documented tool |
| 3D asset production | Retopology, decimation, UV unwrap, PBR bake | **951 designs.** Triangle targets: ring 60k, earrings 50k, pendant 40k, necklace 90k, bracelet 80k | **The hard part. Not a library skill.** |
| Browser-only execution | `<video>` element, no server inference | Camera frames never leave the device | Privacy requirement, ADR-004 |
| Fit rules as data | `webar_assets.fit_rule` | Anchor segment, base scale, rotation offset, adjustment range | Design decision |
| Placement maths | Proximal-intermediate joint, ring axis, clamped scale | Critically damped spring smoothing | Algorithmic |
| Hand occlusion | Depth-only proxy pass | Without it the ring reads as pasted on | Subtle, easy to omit |
| Device-tier governor | Frame-rate adaptation, shadow disable | Low-tier mobile | Performance engineering |
| Fallback matrix | Seven conditions | No camera, no WebGL2, no WASM, low power, tracking lost, asset pending, slow network | Correctness requirement |
| Asset lazy loading | `next/dynamic` `ssr:false`, Intersection Observer, prefetch on intent | Must not regress storefront LCP | Performance requirement |
| AR handoff | QR to short-lived token, hash-only at rest, single-use, 10-minute expiry | Desktop to mobile | Security requirement |
| Zero-frame-egress proof | Network assertion test | **Depends on ADR-021** | Verification requirement |

### 17.3 The economic argument for modelling by design not by SKU

Because SKUs decompose to `setting x stone`, a single ring model serves every stone SKU for that setting. With 951 designs the asset count is bounded by **designs**, not by the 9,812 DYO configurations. This is what makes WebAR affordable at all: 951 assets is expensive, 9,812 would be prohibitive.

### 17.4 Scoping guidance

| Phase | Scope |
|---|---|
| First delivery | Rings only, top 20 designs, measured on real low-tier devices |
| Second | Extend by measured demand, one jewellery type at a time |
| Third | Earrings and pendants, with non-hand placement modes |
| Deferrable | Necklaces and bracelets, the heaviest assets and the least requested |

Nothing else depends on WebAR. If the budget is cut, this is what defers, and the fallback matrix guarantees that a deferral costs a feature rather than a page.

---

## 18. MIGRATION SKILLS

### 18.1 The binding rules

```
`urls.jsonl` is the migration spine.

Never migrate from `products.jsonl` alone.

The 1,245 products records are NOT the complete catalogue.

Setting variants = 10,349.

221 DYO identities remain derived/inferred and must never be fabricated as source SKUs.
```

`[DEFECT D1]` `products.jsonl` holds 1,245 records, which is 2.4% of commerce URLs, because the crawler's classifier recognised only DYO pages. Migrating from it discards approximately 97% of the catalogue. This is the single highest-consequence rule in the plan, and the automated defence against repeating it is the permanent catalogue-completeness regression test.

### 18.2 Skill map

| Skill | Requirement | Gate |
|---|---|---|
| URL classification | Five families: loose stone, pair, ready-made, settings, DYO. Deterministic, not heuristic | V14 |
| Slug grammar | Deterministic parsers with per-field confidence and evidence status | V1, V2 |
| SKU parsing | `JS{design}{metal}-{gemRef}` with the validated regex | V3, V19 |
| D9 tokenizer | Split doubled concatenated spec strings into one `gemstone_stones` row per stone, with `token_count` and `is_doubled` | V8, V9 |
| Provenance | `evidence_status`, `source_url`, `source_sku`, `source_sku_derived`, `sku_evidence_status`, `raw_spec`, `import_batch_id` on every migrated row | NFR-08 |
| Canonicalisation | Upsert in dependency order: species, varieties, colours, intensities, origins, shapes, clarities, treatments, metals, setting styles, jewellery types, stones, pairs, settings, variants, products | V4, V10, V12, V13 |
| Conflict handling | Both sides stored in `staging_conflicts` with URLs, unresolved, never auto-resolved | — |
| Quarantine | Parse failures, invariant failures and conflicts quarantined with a reason, counted, never silently dropped | — |
| Idempotency | Deterministic natural keys plus `ON CONFLICT`; a second run changes zero rows | V17 |
| SHA-256 gating | Each artefact hashed into `import_batches.source_sha256`; refuse to run on mismatch | — |
| Media classification | Path-stem rule table; chrome and JavaScript dispositioned `SKIPPED` with a reason | V16 |
| Certificate artefact extraction | `cert`, `sarin`, `appraisal` path families become certificate rows with `verification_status='UNVERIFIED'` and no populated fields | — |
| Redirect generation | 44,218 rows from the route map; 301 where the shape changes, 200 where identical, 302 for temporary mappings | — |
| Validation gate runner | V1 to V22 as executable assertions | All |
| Catalogue completeness guard | All five source families present with the section 2.1 counts | D1 defence |

### 18.3 The 221 derived identities

Five binding rules:

1. `[INFERRED / PROPOSED]` identity, two-source corroborated. **Never written to `source_sku`.**
2. `source_sku_derived` holds the parsed value; `sku_evidence_status = 'INFERRED'`.
3. Every attribute column null; `state = 'DRAFT'`; not published.
4. Human approval required before canonical promotion (INV-08).
5. **Never manufacture a source SKU.** Never infer attributes from a sibling product sharing a stone reference.

Verified as 221 additional distinct products with zero duplicates of the observed 1,024. Migration therefore creates 1,245 CONFIGURED product candidates from `urls.jsonl`, of which 1,024 carry observed attributes and 221 carry only a derived SKU.

The reason rule 5 exists: for 3 of the 8 stones in the captured subset, no stone-level record otherwise exists. Inferring weight, colour or price from a sibling would create data with no source whatsoever, wearing the costume of migrated data.

### 18.4 Expected conflict counts

| Conflict | Count | Handling |
|---|---|---|
| Pair URLs sharing a PR id | 5 | Manual review |
| Stone URLs ending `-J#####` | 314 | Likely misfiled; quarantine |
| `stone_type` populated and doubled | 113 | Normalise to a single value with `token_count` recorded |
| Doubled spec strings across the pair family | 113 x 12 | D9 tokenizer |
| DYO SKUs absent from the settings catalogue | expected 0 | Halt if non-zero |
| Stone references only in the failed-fetch set | 3 | Quarantine |

### 18.5 Skills explicitly NOT to be built during migration

OCR and confidence scoring; a pricing engine or discount logic; the DYO compatibility engine; AI of any kind; asset binary downloads beyond metadata; any merge of conflicting records; any invented value for the 221.

---

## 19. SOURCE RETENTION

### 19.1 Binding prohibitions

```
Do NOT delete anything.
Do NOT modify crawler.sqlite.
Do NOT modify raw HTML.
Do NOT modify any reverse-engineering evidence.
```

The evidence package is **read-only**. There is no write path in the migration tooling, by design.

### 19.2 Files that must stay outside the application repository

Stored in durable object storage with checksum verification, reachable read-only at import time, **not vendored into Git**.

| File | Size | Why critical | If lost |
|---|---|---|---|
| `crawler.sqlite` (+ `-wal`, `-shm`) | 159 MB + 26 MB | The only relational source of truth; table schemas for `documents`, `links`, `media_assets` | Cannot re-derive without a re-crawl |
| `data/urls.jsonl` | 30.5 MB | **The migration spine.** All 44,218 URLs including the 33,934 absent from `products.jsonl` | **Catalogue unrecoverable** |
| `data/specifications.jsonl` | 4.9 MB | The 13 attribute fields for 1,024 products, and the D9 concatenated values | **Attributes unrecoverable** |
| `data/pages_analyzed.jsonl` | 468 MB | **The only source of price, availability and JSON-LD** | **All 1,024 prices permanently lost** |
| `data/products.jsonl` | 929 KB | Observed SKU ground truth required by gates V3 and V19 | Cannot validate the parser |
| `data/media_analyzed.jsonl` | 179 MB | Asset URL inventory with host and path stem | Asset classification impossible |
| `data/taxonomy.json` | 26 KB | Field value distributions; seeds reference data and validates normalizers | Facet seeding loses its evidence basis |
| `entities/media/report.json`, `appraisal.json` | 63 KB | The only structured evidence that certificate and report artefacts exist | Certificate seed lost |
| `raw/source_snapshots/manifest.jsonl` | 24 MB | HTML SHA-256 hashes for re-crawl integrity | Cannot prove a re-crawl captured the same content |
| `PROJECT_SOURCE_OF_TRUTH.md` | repo | The durable architecture authority | Architecture lost |

**Two single points of irreversible loss, restated:** deleting `pages_analyzed.jsonl` destroys all prices permanently. Deleting `urls.jsonl` destroys 33,934 commerce URLs.

### 19.3 WAL checkpoint requirement

Before archiving `crawler.sqlite`, checkpoint the WAL into the main file. Otherwise the 26 MB `-wal` may hold committed rows absent from the main file, and the archived copy is silently incomplete.

### 19.4 What may safely stay out of GitHub

| Item | Disposition | Reason |
|---|---|---|
| All datasets above | Exclude; store in object storage with checksums | Size, and evidence is not source |
| `raw_html/**` (1.5 GB) | Exclude; archive the 1,024 real files compressed | 43,149 files are 502 shells with no content; the 1,024 real files are DOM insurance |
| `exports/*.csv`, `exports/products.jsonl` | Exclude | Redundant with the JSONL datasets and `crawler.sqlite` |
| `architecture/**` | Exclude; safe to archive | Generation A; empty taxonomy arrays, 30-URL sample |
| `relationships/relationship_graph.json` | Exclude; safe to archive | Empty arrays |
| `entities/settings/`, `entities/side_stones/` | Exclude; safe to archive | Both `[]` |
| `entities/gemstones/all_gemstones.json` | Exclude; safe to archive | 11 KB of all-null objects; defective |
| `entities/media/{3d,360}.json` | Exclude; safe to archive | Misclassified JavaScript bundles |
| `content/**`, `design_your_own/`, `logs/` | Exclude; safe to archive | Zero files |
| `DATASET_MANIFEST(1).json`, `validation/**` | Exclude; safe to archive | Generation A; describe a 30-page crawl |
| `ai_context/ARCHITECTURE.md`, `AI_CODING_AGENT_INSTRUCTIONS.md` | Exclude; **do not follow** | Generation A and actively misleading |
| `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md` | Keep in repo | Vision and charter authority |

### 19.5 The in-repository substitute

`docs/evidence/MANIFEST.md` records the storage location, SHA-256 and retention class of each dataset, so provenance is checkable without vendoring the data. This is implementation plan task 3, has no dependency, and is the first thing that should be built.

---

## 20. CODING READINESS GATE

Coding may begin only when every box below is checked. Each is objectively verifiable.

| # | Condition | How verified | Status |
|---|---|---|---|
| 1 | Skill matrix complete | This document, all 22 sections | **DONE** |
| 2 | Required tools approved | Section 2 inventory: every APPROVED item named, no OPEN item in the Phase 1 path | **DONE** for technology; blocked for test tooling |
| 3 | Open ADRs resolved or explicitly accepted as deferred | ADR-021, 022, 023, 024 | **NOT MET.** ADR-021 blocks |
| 4 | Test tooling selected | ADR-021 resolved and recorded | **NOT MET** |
| 5 | Design system decision resolved | ADR-022 resolved | **NOT MET**, but Phase 4 only, does not block Phase 1 |
| 6 | Phase 1 dependencies available | Local Postgres 16, Neon dev branch, Vercel env secrets, OTel collector, error reporting | **NOT MET.** Provisionable immediately |
| 7 | Repository structure approved | Plan section 5 structure agreed | **NOT MET.** Requires client sign-off |
| 8 | Database implementation remains frozen | 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 9 named invariants, 6 RLS policies, 2 HNSW, 1 trigger, 1 view, 2 functions | **MET.** Locked and validated |
| 9 | Migration retention secured | `docs/evidence/MANIFEST.md` with verified checksums for all ten entries | **NOT MET.** Plan task 3, no dependency |
| 10 | No architecture contradiction remains | Section 6.5 verification | **MET** with four residual inconsistencies reported to the plan owner, none architecture-breaking |

### 20.1 What blocks Phase 1 specifically

| Blocker | Type | Resolvable by |
|---|---|---|
| ADR-021 test tooling unresolved | Approval | Client decision |
| `docs/evidence/MANIFEST.md` not written | Execution | `MIGRATION_ENGINEER`. No dependency, can start now |
| Repository structure not approved | Approval | Client sign-off on plan section 5 |
| Local Postgres 16 not provisioned | Execution | Engineering |
| Neon dev branch not provisioned | Execution | Engineering |
| Vercel env secrets not configured | Execution | Engineering |
| OTel collector and error reporting not configured | Execution | Engineering |
| `citext`, `pg_trgm`, `unaccent`, `btree_gin` availability on target unconfirmed | Verification | Engineering. Standard on the Neon image; confirmation only |

### 20.2 What does NOT block Phase 1

Payment provider; vision model; email provider; ADR-022, 023, 024; WhatsApp credentials; AI gateway credentials; ImageKit; R2; Redis; every WebAR skill; every P2 and P3 item. None of these is needed to build the schema, the domain layer, the parsers, the seeders, the evidence manifest or the boundary rules.

---

## 21. FIRST CODING PHASE

### FIRST CODING PHASE

**Phase 1 — Database + Domain Foundation**

Objective, verbatim from `INITIAL_IMPLEMENTATION_PLAN.md` section 8: "Materialise the locked schema as running migrations, seed the reference data, and implement the pure domain layer with its invariants. No features. No catalogue data yet."

### 21.1 The first 10 coding tasks

Verbatim from `INITIAL_IMPLEMENTATION_PLAN.md` section 36, "FIRST 20 IMPLEMENTATION TASKS". Tasks 1 to 10, in order, unaltered.

| # | Task | Phase | Depends on | Done when |
|---|---|---|---|---|
| 1 | Stand up the workspace skeleton from section 5: `apps/web`, `apps/worker`, `packages/{db,domain,contracts,config,observability}`, `tools/migrate`, `docs/adr`, with pnpm workspaces | 1 | - | Workspaces install; boundary lint rules active |
| 2 | Provision a disposable local PostgreSQL 16 and a Neon **dev branch** target for migrations | 1 | 1 | Both reachable; neither is production |
| 3 | Write `docs/evidence/MANIFEST.md` recording the storage location, SHA-256 and retention class of every migration-critical file from section 22.3 | 1 | - | All ten entries present with verified checksums |
| 4 | Port the validated DDL into ordered migrations, one logical unit per section 8 subsection | 1 | 2 | Applies cleanly on a clean database |
| 5 | Assert schema fidelity in CI: 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 9 named invariant constraints, 6 RLS policies with 0 policy-less tables, 2 HNSW indexes, 1 trigger, 1 view, 2 functions | 1 | 4 | Introspection test green against a fresh database |
| 6 | Implement the domain value objects and INV-01, INV-02, INV-03 as pure predicates | 1 | 4 | Unit tests green; no infrastructure imports |
| 7 | Implement the SKU grammar parser with the validated regex and prove it against the 1,024-record corpus | 1 | 6 | 1,024/1,024 match, 0 mismatches (gates V3, V19) |
| 8 | Implement the configuration-hash function and slug derivation | 1 | 6 | Deterministic; property tests green |
| 9 | Seed reference data: 15 metals, 8 jewellery types, setting styles, treatments, intensities, clarities | 1 | 4 | Seeds idempotent; counts asserted |
| 10 | Build `tools/migrate` with resumable, idempotent stage execution and per-artifact SHA-256 gating | 2 | 9 | Refuses to run on hash mismatch |

Tasks 1, 2 and 3 are Phase 1 tasks with no prior dependency. Tasks 4 through 9 complete Phase 1. Task 10 opens Phase 2.

**Note on task 9.** The counts "15 metals, 8 jewellery types" are enum member counts. The observed counts are 14 metal codes and 5 jewellery types. `R10` is enum-only and is explicitly recorded as absent from all evidence. The seeder must insert the full enum; the counts must not be described as observed. Flagged in Section 6.5.

### 21.2 What Phase 1 must not implement

No catalogue import. No product, category or search APIs. No storefront routes. No cart, pricing computation, AI, certificates, DYO engine, admin or CMS. Do not add a second domain concept not in Source of Truth section 7.

### 21.3 Phase 1 exit criteria, verbatim

- Migrations apply in order on a clean Neon branch with zero errors.
- `pg_tables` shows 74 tables; `pg_type` shows 33 enums; 94 FKs; 591 CHECK; 263 indexes.
- All 9 named invariant constraints exist by name.
- RLS: 6 enabled, 6 policies, 0 without policy.
- Both HNSW indexes exist and `vector(1024)` accepts a row.
- The `gemstones` trigger populates `search_document`, verified by test insert.
- Domain layer imports nothing from `infrastructure/`, lint-enforced.
- The SKU parser reproduces all 1,024 observed SKUs exactly, 0 mismatches.

---
## 22. FINAL STATUS

```
SKILL MATRIX STATUS:
NOT READY
```

**Reason in one sentence:** the matrix is complete and the locked stack is fully approved, but ADR-021 (test tooling) is unresolved and implementation plan task 6 requires green unit tests, so the first coding task cannot be signed off as complete without an approval that has not been given.

### Approved technologies

25 items, all from `technical_design/02` with no additions.

| Category | Approved |
|---|---|
| Language and build | TypeScript 5.x, pnpm workspaces, TypeScript project references, ESLint with `no-restricted-imports` |
| Framework | Next.js App Router on Vercel, Vercel Node runtime, Vercel cron and env secrets |
| Database | Neon PostgreSQL 16+, pgvector 0.6+, pg_trgm, unaccent, citext, btree_gin (declared, use deferred) |
| Data access | Drizzle ORM, Drizzle Kit |
| Validation | Zod |
| Cache | Redis 7.x, never truth |
| Storage and media | Cloudflare R2, ImageKit |
| AI | Vercel AI Gateway, OpenRouter fallback, via `ModelGateway` |
| Channel | Meta WhatsApp Cloud API |
| AR | MediaPipe HandLandmarker, Three.js, WebGL2, Draco GLB, KTX2 |
| Observability | OpenTelemetry, Sentry-compatible error reporting |

### Open decisions

| Decision | Blocks | Owner |
|---|---|---|
| **ADR-021 test runner, E2E driver, load tool, scanners** | **Phase 1 task 6** | Client |
| **ADR-022 design-system primitives** | Phase 4 | Client |
| **ADR-023 AI evaluation harness** | Phase 9 | Client |
| **ADR-024 provenance storage design** | Phase 2 | Client |
| Payment provider | Phase 6 | Client |
| Tax treatment | Phase 6, before production | Client |
| Shipping carriers and rates | Phase 6, before production | Client |
| Discount policy | Phase 6, before production | Client |
| Refund policy | Phase 6, before production | Client |
| Vision model for OCR | Phase 8 | Client |
| Email provider | Phase 6 notifications | Client |
| Jurisdiction and statutory retention | Compliance | Client |

### Proposed ADRs

Four. **Not accepted. Not to be treated as decisions.**

| ADR | Proposed | Must not be inferred |
|---|---|---|
| ADR-021 | Vitest for unit/domain/integration/contract; Playwright for E2E | Do not install a test runner on the strength of this ADR |
| ADR-022 | In-repo primitives composed of unstyled accessible libraries | Do not install shadcn, Radix, MUI, Chakra or Tailwind; none is named in any authoritative document |
| ADR-023 | First-party evaluation harness writing to `ai_evaluations` | Do not install an evaluation framework |
| ADR-024 | Explicit `provenance` table plus `evidence_status` columns, not a framework | Do not install a provenance or lineage framework |

### Required approvals before coding

1. **ADR-021.** The single blocking decision. Ten P0 skills and two P0 CI gates depend on it.
2. **Repository structure sign-off** on `INITIAL_IMPLEMENTATION_PLAN.md` section 5.
3. **Phase 1 external dependencies** provisioned: local PostgreSQL 16, Neon dev branch, Vercel env secrets, OTel collector, error reporting.
4. **Extension availability confirmed** on the target Neon instance for `citext`, `pg_trgm`, `unaccent`, `btree_gin`.

### Phase-1 blockers

| Blocker | Type |
|---|---|
| ADR-021 unresolved | **Approval. The only true design blocker.** |
| `docs/evidence/MANIFEST.md` not written | Execution. No dependency, can start immediately |
| Repository structure not approved | Approval |
| Local PostgreSQL 16 not provisioned | Execution |
| Neon dev branch not provisioned | Execution |
| Vercel env secrets not configured | Execution |
| OTel collector and error reporting not configured | Execution |
| Contrib extension availability unconfirmed on target | Verification, not design |

### Phase-1 prerequisites

Architecture lock. Schema definition. Domain model. Invariants INV-01 to INV-10. Repository structure. Reference-data values. The 13-phase plan. Tasks 1 to 15 of the implementation plan, of which tasks 1 to 9 are Phase 1.

All present. Nothing is missing architecturally.

### First coding phase

**Phase 1 — Database + Domain Foundation.** No features, no catalogue data, no dependencies on any later phase.

### First 10 coding tasks

| # | Task | Depends on | Done when |
|---|---|---|---|
| 1 | Workspace skeleton with pnpm workspaces | - | Workspaces install; boundary lint active |
| 2 | Local PostgreSQL 16 and Neon dev branch | 1 | Both reachable; neither production |
| 3 | `docs/evidence/MANIFEST.md` with SHA-256 per artefact | - | Ten entries with verified checksums |
| 4 | Validated DDL ported to ordered migrations | 2 | Applies cleanly |
| 5 | Schema fidelity CI assertion | 4 | Introspection green on a fresh database |
| 6 | Domain value objects and INV-01/02/03 | 4 | Unit tests green; no infrastructure imports |
| 7 | SKU grammar parser against the 1,024-record corpus | 6 | 1,024/1,024, 0 mismatches |
| 8 | Configuration hash and slug derivation | 6 | Deterministic; property tests green |
| 9 | Reference-data seeders | 4 | Idempotent; counts asserted |
| 10 | `tools/migrate` with resumable stages and SHA-256 gating | 9 | Refuses on hash mismatch |

Unaltered from `INITIAL_IMPLEMENTATION_PLAN.md` section 36. No replacement tasks were invented.

### Contradictions discovered

Four residual inconsistencies were found and **reported rather than silently fixed**, because fixing them would require editing the authoritative plan, which this stage must not do.

| # | Contradiction | Severity | Recommended resolution |
|---|---|---|---|
| 1 | `INITIAL_IMPLEMENTATION_PLAN.md` 35.2 says "ADR-021 (open): test tooling stack ... No technology has been chosen in this plan", while `technical_design/40` ADR-021 names Vitest and Playwright as a **proposed** decision | **Medium.** A reader could treat named candidates as selected and install a runner | Plan owner confirms ADR-021. Until then `technical_design/02` remains the authority and lists it OPEN |
| 2 | `INITIAL_IMPLEMENTATION_PLAN.md` Phase 1 task 9 requires seeding "15 metals, 8 jewellery types"; `PROJECT_SOURCE_OF_TRUTH.md` 4.2 records **14 metal codes** observed, and `R10` is enum-only; 7.2 lists **5 jewellery types** against 8 enum members | **Low.** Reconcilable as enum-superset versus observed-subset | Plan owner annotates task 9: enum counts, not observed counts |
| 3 | `INITIAL_IMPLEMENTATION_PLAN.md` says "all thirteen dimensions" for AI evaluation in three places (16, 23.1, 24.1); Source of Truth 34.5 and `technical_design/32` both enumerate **fourteen** | **Low.** Undercount in the plan | Plan owner corrects three to fourteen |
| 4 | `technical_design/02` line 54 and plan section 35 both label the design-system decision "ADR-022 candidate" using wording authored before ADR-022 existed | **Informational.** Now accurate | None needed; noted for traceability |

Two ADR-reference corrections were made during this stage, both in `technical_design/39_GLOSSARY_AND_EVIDENCE_LEDGER.md`: row 20 incorrectly cited ADR-022 for AI evaluation tooling, and the known-unknowns list had a duplicate row number after ADR-022 was assigned to the design system. Both were fixed. `technical_design/38` and `36` referenced the same unknowns generically and needed no change.

**No architecture-breaking contradiction was found.** The four items above are wording and count issues in the plan, none of which changes a data model, an invariant, an API contract or a security control.

### Binding constraints restated

```
NO APPLICATION CODE                          until Phase 1 gate approval
NO DATABASE MIGRATIONS                       until the coding phase is authorised
NO MANAGED / PRODUCTION DATABASE ACCESS      at any point without explicit authorisation
NO SOURCE-EVIDENCE MODIFICATION              crawler.sqlite and raw HTML are read-only, permanently
NO TOOL OR DEPENDENCY INSTALLATION           until the installation policy permits it
NO SILENT ADR RESOLUTION                     Proposed is not Accepted
NO FABRICATED SOURCE BEHAVIOUR               INFERRED and UNKNOWN stay labelled
NO 1,245 AS THE COMPLETE CATALOGUE           10,349 setting variants, 44,218 URLs
NO MANUFACTURED SOURCE SKUS                  the 221 stay derived, null, DRAFT, unpublished
```

---

**End of SKILL_MATRIX_AND_TOOLING.md**

**Next action required from the client:** resolve ADR-021. It is the only decision standing between the completed planning package and the first coding task.