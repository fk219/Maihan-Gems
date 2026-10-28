# DECISIONS

Decisions already made and supported by the authoritative documents. For the
reasoning behind each, read `technical_design/40_ARCHITECTURE_DECISION_RECORDS.md`.

**Status values:** `ACCEPTED` = binding. `PROPOSED` = recommendation only, not
approved. `DEFERRED` = deliberately postponed.

---

## 1. Architecture

| Decision | Status | Source |
|---|---|---|
| **Fresh clean database (2026-10-28):** business-first schema, three pillars (Gemstones · Settings · Jewellery), zero provenance, no redirects; existing entries cleaned in. Supersedes the corpus-import pipeline (doc 33), ADR-024 provenance model and doc-34 redirects for future schema work. Locked schema stays live until cut-over. | **ACCEPTED** | ADR-035 + `technical_design/41` |
| The architecture is **LOCKED**. Validated by live execution against a disposable PostgreSQL 16.2 instance. | ACCEPTED (partially superseded 2026-10-28 for future schema work by ADR-035) | Plan §2 |
| Modular monolith. Extraction requires a named, measured trigger. | ACCEPTED | ADR-019 |
| Microservices are **rejected** at launch. | ACCEPTED | ADR-019 |
| Business and domain logic must not depend on Vercel-specific behaviour. Every external dependency sits behind a port. | ACCEPTED | `technical_design/29` |

---

## 2. Platform

| Decision | Status | Source |
|---|---|---|
| Next.js **App Router** on Vercel. | ACCEPTED | `technical_design/02` |
| TypeScript 5.x throughout. | ACCEPTED | `technical_design/02` |
| pnpm workspaces. TypeScript project references. | ACCEPTED | Plan §5 |
| ESLint `no-restricted-imports` for module and layer boundaries. | ACCEPTED | Plan §5 |
| Neon PostgreSQL 16+ as the transactional source of truth. | ACCEPTED | ADR-001 |
| pgvector with `vector(1024)` and two HNSW indexes. | ACCEPTED | ADR-001, ADR-018 |
| A single embedding model and a single dimension (1024). A change is a versioned re-embed, never a schema change. | ACCEPTED | ADR-018 |
| Drizzle ORM as the only repository layer. No other ORM. | ACCEPTED | Source of Truth §10.3 |
| Redis for cache, rate limits, sessions and locks. **Never truth.** | ACCEPTED | ADR-002 |
| Cloudflare R2 for originals, renditions and private documents. | ACCEPTED | `technical_design/02` |
| ImageKit for image delivery. | ACCEPTED | `technical_design/02` |
| Vercel for deployment, cron and environment secrets. | ACCEPTED | `technical_design/29` |
| OpenTelemetry traces and metrics; Sentry-compatible error reporting. | ACCEPTED | `technical_design/02` |

---

## 3. AI and channels

| Decision | Status | Source |
|---|---|---|
| Vercel AI Gateway with OpenRouter as fallback, behind a `ModelGateway`. No business logic imports a provider SDK. | ACCEPTED | `technical_design/02`, §16.2 |
| **The LLM cannot directly mutate database state.** AI operates only through deterministic application tools. | ACCEPTED | ADR-003, NFR-05 |
| No tool mutates price, inventory, orders, payments, certificates or permissions. Only `create_customer_request` and `transfer_to_human` mutate, both via application services. | ACCEPTED | ADR-003 |
| Four independent enforcement layers: structural, contractual, runtime, prompt. Prompt is defence-in-depth only. | ACCEPTED | `technical_design/18` §7 |
| The AI **refuses rather than guesses**. A NULL structured field yields an honest refusal. | ACCEPTED | NFR-06 |
| Low-confidence OCR **never** becomes verified truth. Verification is whole-document and needs human approval. | ACCEPTED | ADR-012 |
| Web and WhatsApp share **one** brain: same orchestrator, tools, guardrails and tables. | ACCEPTED | ADR-013 |
| Meta WhatsApp Cloud API for the WhatsApp channel. | ACCEPTED | `technical_design/02` |
| WebAR is **client-side only**. Camera frames never leave the device. | ACCEPTED | ADR-004 |
| MediaPipe HandLandmarker for tracking; Three.js + WebGL2 for rendering; Draco GLB and KTX2 for assets. | ACCEPTED | `technical_design/02`, ADR-004 |
| Gem 3D preview uses `three-mesh-bvh` internal-reflection (not MeshPhysicalMaterial; not R3F/drei). | ACCEPTED | ADR-026 |
| Permanent state normalized out of the 90-day `jobs` queue into real tables (`auth_*`, `favorites`, `checkout_sessions`, `inventory_reservations`, `notifications`, `vendor_onboarding`). Migrations 0019+0020. | ACCEPTED | ADR-027 |
| Security mode is fail-closed by default: dev seam only via `MAIHAN_DEV_SEAM='1'` or `NODE_ENV=test\|development`; `MAIHAN_ENV` absence now means production behaviour (R1-1). Authority: `packages/config/src/security-mode.ts`. | ACCEPTED | AGENTS.md §10 |

---

## 4. Evidence and data

| Decision | Status | Source |
|---|---|---|
| The evidence hierarchy is mandatory: `OBSERVED`, `VERIFIED`, `EXTRACTED`, `PATTERN`, `INFERRED`, `INFERRED / PROPOSED`, `UNKNOWN`. `UNKNOWN` is a valid final answer. | ACCEPTED | `AGENTS.md` §4 |
| **The source archive remains outside Git.** `naturalgemstones/` is excluded by `.gitignore` and must never be committed. | ACCEPTED | `AGENTS.md` §5 |
| **`products.jsonl` is NOT the complete catalogue.** It holds 1,245 records = 2.4% of commerce URLs. | ACCEPTED | ADR-007, defect D1 |
| **`urls.jsonl` is the migration spine.** Never migrate from `products.jsonl` alone. | ACCEPTED | ADR-007 |
| **The 221 derived DYO identities remain `INFERRED`.** `source_sku` stays null, every attribute column null, `state='DRAFT'`, unpublished, pending human approval. | ACCEPTED | ADR-008, INV-08 |
| Never manufacture a source SKU. Never infer attributes from a sibling product sharing a stone reference. | ACCEPTED | Source of Truth §19.1 |
| Per-stone measurements are modelled, never concatenated. | ACCEPTED | ADR-009 |
| The unknown component of price is modelled **explicitly**, not hidden in an opaque total. Derived setting prices are labelled estimates. | ACCEPTED | ADR-010 |
| Certificate artefacts are ingested from path convention; the document schema is treated as **unknown**. | ACCEPTED | ADR-011 |
| Media classification is re-derived from the path stem, not the captured `role` (94.7% of which is `unknown`). | ACCEPTED | ADR-016 |
| Source routes are preserved through redirects, not by copying the source route tree. | ACCEPTED | ADR-015 |
| The source product-type taxonomy is **rejected** as a target model. | ACCEPTED | ADR-014 |
| Generation-A artefacts are excluded from migration inputs. | ACCEPTED | ADR-017 |
| The canonical configuration representation is SoT 19.2 verbatim; the hash embeds `hash_version`; the configuration slug is base62 of the full digest; engraving text never enters the identity. | ACCEPTED (implementation, Task 8) | SoT 19.2, doc 14 §2 |
| `normaliseSlug` folds NFKD, lowercases, collapses non-[a-z0-9] runs to '-' (the doc-34 '5.98ct'→'5-ct' behaviour). | ACCEPTED (implementation, Task 8) | doc 34 §5 |
| The FULL metal_code and jewellery_type enums are seeded (15/8) with enum-only members marked `INFERRED`; per-treatment only the 3 observed values seed the treatments table. | ACCEPTED (implementation, Task 9) | plan task 9 note; doc 11 |
| Metal slug phrases are extracted from the observed URL tokens (1:1 per code); setting styles seed all 22 slugs (15 base + 7 pendant variants; 10,772 routes reconciled). | ACCEPTED (implementation, Task 9) | SoT §4, INV-04 |
| Intensity/clarity `rank` orderings are a merchandising decision ours (light<medium<intense<vivid<dark; eye_clean cleanest) — [INFERRED], documented and test-visible; the value rows stay OBSERVED. | ACCEPTED (implementation, Task 9) | doc 11 ("rank enables a sensible default sort") |
| Migration stage state lives in the locked `import_batches` table keyed by stable stage ids; no new table, no process memory. | ACCEPTED (implementation, Task 10) | SoT 8.4, doc 33 |
| Future catalogue stages are DECLARED and refuse execution until their plan tasks land. | ACCEPTED (implementation, Task 10) | plan tasks 11-20 |
| Transactions emit events through a **transactional outbox**, not direct publishing. Consumers are idempotent via `event_consumers`. | ACCEPTED | ADR-020 |

---

## 5. Deferred or rejected

| Decision | Status | Source |
|---|---|---|
| A dedicated search engine (Elasticsearch, Algolia, Typesense, Meilisearch) is **rejected** at launch. Postgres FTS + `pg_trgm` + `unaccent` + pgvector meets NFR-03 at ~33,000 searchable entities. | ACCEPTED (as a rejection) | ADR-006 |
| An external vector database is **rejected**. Vectors live with transactional data. | ACCEPTED (as a rejection) | ADR-001, ADR-018 |
| An event broker (Kafka, RabbitMQ, NATS) is **rejected**. The outbox suffices at this scale. | ACCEPTED (as a rejection) | ADR-020 |
| Redis as a write-through store for orders is **rejected**. | ACCEPTED (as a rejection) | ADR-002 |
| GraphQL | DEFERRED | `technical_design/02` |
| Migration-runner for raw HTML re-fetch | DEFERRED | `technical_design/02` |
| Lab API integration for certificates | DEFERRED | Plan §15 |
| CRM / ERP integration | OUT OF SCOPE | Plan §3.3 |
| Loyalty and review subsystem internals | OUT OF SCOPE | Plan §3.3 |
| Multi-language | DEFERRED | Plan §3.3 |
| Micro-frontends | DEFERRED | Plan §3.3 |
| Ring sizing, engraving workflow, side stones as DYO options | OUT OF SCOPE — **no source evidence exists** | `technical_design/14` §1 |

---

## 6. Open — must not be treated as decided

| Decision | Status | Blocks | Note |
|---|---|---|---|
| **ADR-021 test tooling** | **ACCEPTED 2026-10-07** | — | The user explicitly authorized acceptance at Task 6. Vitest = runner for unit/domain/integration/contract (installed 5.0.3, domain layer); Playwright = accepted E2E runner, **not installed** until a phase requires it. Recorded in `technical_design/40` with the authorization note |
| **ADR-022 design-system primitives** | **PROPOSED** | Phase 4 | shadcn, Radix, MUI, Chakra and Tailwind are **not approved**. None is named in any authoritative document. |
| **ADR-023 AI evaluation harness** | **PROPOSED** | Phase 9 | First-party harness argued, not selected. |
| **ADR-024 provenance storage design** | **PROPOSED** | Phase 2 | Explicit table argued over a framework; not selected. |
| Payment provider | UNKNOWN | Phase 6 | `PaymentProvider` port designed; no provider chosen |
| Tax treatment | UNKNOWN | Phase 6 | Fails closed in production; zero-return stub permitted in P6 |
| Shipping carriers and rates | UNKNOWN | Phase 6 | Flat placeholder permitted |
| Discount policy | UNKNOWN | Phase 6 | Configuration gap; never invent policy |
| Refund policy | UNKNOWN | Phase 6 | Configuration gap; never invent policy |
| Vision/OCR model | UNKNOWN | Phase 8 | Chosen within the locked `ModelGateway` |
| Email provider | UNKNOWN | Phase 6 | Deferred decision |
| Jurisdiction / statutory retention | UNKNOWN | Compliance | Retention table is conditional |
| `process.env` lint scope | **AMBIGUOUS — follow-up** | Task 1 follow-up | `technical_design/01` line 56 scopes the `process.env` restriction to `packages/domain`; `technical_design/03` implementation constraint 3 states no package may read `process.env` except `packages/config`. Task 1 implements the narrower `technical_design/01` reading and changed nothing further. Plan owner to reconcile. No ADR created; this is a documentation conflict, not a technology choice |
| `packages/ai` in the Task 1 skeleton | **NOT CREATED** | Phase 9 | `AGENTS.md` section 2 lists it in the future layout; `INITIAL_IMPLEMENTATION_PLAN.md` section 5, the authority for Task 1, omits it. Task 1 followed the plan. Sequencing ambiguity for the plan owner |
| CI provider | **ACCEPTED: GitHub Actions** | Phase 1 boundary-lint job | Decided 2026-10-05 at Task 1 closure: the repository is hosted on GitHub and `technical_design/03` requires a blocking boundary-lint CI job. **Workflow created at Task 5** (`.github/workflows/ci.yml`); Task 6 added the domain unit-test job |

**Proposed is not Accepted.** A proposal names candidates; it does not authorise
installation or implementation.

---

## 7. Governance

| Rule | Source |
|---|---|
| Any new runtime dependency, framework or external service requires an ADR. | ADR governance, `technical_design/40` |
| An ADR marked Proposed is never implemented without approval. | `AGENTS.md` §6 |
| A superseded ADR is never deleted; the reasoning chain is preserved. | `technical_design/40` |
| Two reviewers; `ADMIN_SUPER` for any decision affecting money, inventory or trust. | `technical_design/40` |
| No test framework may be installed until ADR-021 is resolved. | Plan §23.4, `AGENTS.md` §6 — **satisfied**: ADR-021 ACCEPTED 2026-10-07; from now on, installation follows the layer needs recorded in `SKILL_MATRIX_AND_TOOLING.md` §The testing table (Vitest now; Playwright at its phase; load tool still undecided) |
| Any relaxation of an NFR requires an ADR. | `technical_design/36` |
| Migrating runs on a Neon **dev branch** or local PostgreSQL 16, never managed production, without explicit current approval. | `AGENTS.md` §6 |

---

## 8. Repository hygiene

| Rule | Source |
|---|---|
| Never `git add .` or `git add -A`. Stage explicit paths so the archive cannot be swept in. | `AGENTS.md` §6 |
| `naturalgemstones/` must never be staged, committed, deleted or modified. | `AGENTS.md` §5 |
| Stage explicit paths only: `AGENTS.md`, `.opencode/`, or named documents. | `AGENTS.md` §13 |
| No secrets in the repository, database, config table, log or trace. | `AGENTS.md` §10 |
| `.opencode/memory/` is committed. `.opencode/cache/`, `logs/`, `sessions/` are ignored. | `.gitignore` |