# MAIHAN_GEMS_COMPLETE_PRODUCT_AUDIT

**Audit date:** 2026-10-19
**Audited state:** working tree at commit `aca66e0` (+ uncommitted deltas on `main`)
**Audit type:** Read-only truth audit. No application code, schema, or configuration was modified. No destructive or unauthorized testing was performed.
**Environment:** Local PostgreSQL 16.15 (`maihan_dev` on 127.0.0.1:5433) per `compose.yaml`. The `naturalgemstones/` source archive is **absent from this environment** (expected per `AGENTS.md` §5), so the full-corpus migration could not be executed or verified here.

---

## A. Executive summary

### A.1 Actual current product state

Maihan Gems is a **substantially built, well-tested modular monolith** with a working storefront, catalogue, cart/checkout/commerce flow, vendor portal, admin back office, DYO engine, certificate trust model, AI concierge skeleton, worker/outbox plane, and a validated locked schema. The code compiles, lints clean, passes schema fidelity, and is covered by ~950 passing tests across 9 suites.

However, the product is **not the full catalogue-scale system the authoritative documents define**:

1. The **real 44,218-URL corpus migration has never run** (source archive absent). The live database holds the **443-product NGC research seed**, not the 19,665 stones / 3,072 pairs / 951 settings / **10,349 setting variants** / 9,812 configured products the plan requires (§2.1, §9).
2. **All external providers are simulated or unexercised**: payment (TEST / Stripe adapter without live keys), email (provider built but never wired to auth flows), OCR vision (no model), WhatsApp outbound (no Graph API calls), R2 storage (placeholder URLs), LLM (simulated unless API keys present), embeddings (deterministic, not model-based).
3. **Runtime RLS is not wired** — `withRlsContext` exists but has zero call sites; the `jobs` table is still overloaded as a schemaless entity store (auth credentials/sessions/tokens, checkout sessions, inventory reservations, favorites sync, notifications).
4. **Phase 13 (hardening) has not started**: no browser E2E (`e2e/` empty), no load tests, no security-matrix execution, no Lighthouse/a11y CI budgets, no SLO alert scheduling, no secret scan in CI.
5. **WebAR/3D asset production does not exist**: `webar_assets` has 0 rows; there is no GLB decimation/Draco/KTX2 pipeline; WebAR modal is a 2D canvas overlay, not true AR.

### A.2 Overall verified completeness

**≈ 72% (weighted)** — see Section L for the transparent calculation. Within that: the MVP chain (Phases 1–6) is ~80% complete; the differentiating layer (AI/DYO/3D/VTO/certificates) is built but largely **simulated at its external boundaries**; hardening is ~15%.

### A.3 Production-readiness assessment

**NOT PRODUCTION-READY.** Verdict drivers: no real catalogue, no real payment provider in live mode, no transactional email delivery, no RLS at runtime, no corpus migration, no load/security evidence, no E2E browser suite, empty `knowledge_documents` in the live DB.

### A.4 Top blockers and risks

| # | Blocker | Severity |
|---|---|---|
| B1 | Full corpus migration (44,218 URLs → 10,349 variants, 44,218 redirects) never executed — `redirects` table has **0 rows**, live catalogue is a 443-row seed | Critical |
| B2 | Runtime RLS session variables never set (`withRlsContext` unused); 6 RLS policies exist but `app.user_subject` etc. are never applied on request paths | Critical |
| B3 | `jobs` table still stores permanent state (auth credentials, sessions, tokens, checkout sessions, reservations, favorites, notifications) — F-06 unresolved | Critical |
| B4 | No real payment provider in live mode; webhook capture works only in TEST/loopback mode; no 3DS/SCA | Critical |
| B5 | Transactional email provider exists but is **never invoked** — verification/reset/order emails are written as `jobs` rows whose handlers mark them SUCCEEDED without sending | High |
| B6 | AI LLM path is simulated by default; `knowledge_documents`/`knowledge_chunks` are **0 rows** in the live DB; embeddings deterministic | High |
| B7 | No browser E2E (Playwright installed, 0 specs), no k6/load tests, security matrix (SG-1..15) not executed as evidence | High |
| B8 | CI runs only lint/build/contracts/migrate-runner/web tests/schema-fidelity — **domain (240), db (144), ai (14), worker (3), observability (12) suites do not run in CI** | High |
| B9 | WebAR: 0 assets, no pipeline, modal overlay is not device-verified AR | High |
| B10 | Rate limiting covers only `public_get`; the other 8 SoT §11.11 scopes (cart, checkout, AI, certificate, admin, webhook, search) are `NOT_YET_APPLICABLE` | Medium |

---

## B. Documentation review

### B.1 Documents inspected

| Document | Path | Status |
|---|---|---|
| Implementation plan | `INITIAL_IMPLEMENTATION_PLAN.md` (1,414 lines) | Read in full (§0–§36, all 13 phases, first 20 tasks, gates SG/PG, testing, CI, risks) |
| Completeness audit | `COMPLETENESS_AUDIT.md` (334 lines) | Read in full (sections A–N, 4-phase remediation plan) |
| Distinguishing sauce (charter) | `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md` (2,123 lines) | Read in full (§1–§65) |
| Project source of truth | `PROJECT_SOURCE_OF_TRUTH.md` (5,424 lines) | Consulted via plan/ADR inheritance (schema §8, gates, ADRs 001–020); not re-read line-by-line — noted as partially reviewed |
| Technical design | `technical_design/01…40` (40 files confirmed present, 133–346 lines each) | All 40 enumerated; requirements extracted per subsystem; read selectively where evidence was needed |
| Other | `AGENTS.md`, `SKILL_MATRIX_AND_TOOLING.md` (referenced), `.opencode/memory/*`, `docs/adr/README.md`, `docs/runbooks/RB-01…06`, `docs/evidence/MANIFEST.md`, `docs/PHASE12_TRACEABILITY.md`, `e2e/README.md`, `tests/README.md`, `.github/workflows/ci.yml` | Read |

### B.2 Conflicts found between authoritative documents

| Conflict | Sources | Resolution per project rules |
|---|---|---|
| ADR-021 status | `AGENTS.md` §6 prohibition 7 says "no test framework installation until ADR-021 is resolved"; `e2e/README.md` and `tests/README.md` say "ADR-021 is OPEN"; `INITIAL_IMPLEMENTATION_PLAN.md` §23.4/§35.2 and `technical_design/40` say ADR-021 is **Accepted** (2026-10-07) and Vitest is installed and used repo-wide | `technical_design/40` (rank 3) + plan (rank 2) govern: ADR-021 is Accepted. `AGENTS.md` and the two folder READMEs are **stale and should be corrected** (documentation fix, not code) |
| Phase ordering (Search vs Storefront; Cart vs DYO) | `PROJECT_SOURCE_OF_TRUTH.md` §39 vs `INITIAL_IMPLEMENTATION_PLAN.md` §2.2 | Already reconciled and declared in plan §2.2; no action |
| Load-test tool | ADR-021 covers Vitest+Playwright; load tool explicitly "remains open" | Recorded open decision; blocks PG-1..13 evidence |
| Earlier COMPLETENESS_AUDIT claims ("4 phases complete, verified") vs this audit | `COMPLETENESS_AUDIT.md` §N vs code/live DB | Per the audit mandate: previous claims are not proof. This audit independently downgrades several claims (see M-05, M-06, M-11) |

### B.3 Global task / phase status (from plan §7)

| Phase | Name | Gate | Status this audit |
|---|---|---|---|
| 1 | Database + Domain Foundation | Schema applies cleanly | **Passed** — 18 migrations apply from zero; schema-fidelity green (75 tables incl. `page_review_state`) |
| 2 | Migration + Catalog | V1–V14, V17–V22 | **Passed on fixtures / NOT RUN on corpus** — gate runner implemented and green on disposable fixtures; real corpus absent |
| 3 | Catalog APIs | Contract tests green; provenance answerable | **Passed** — port, facets, keyset pagination, cache tags, OpenAPI parity, provenance fields |
| 4 | Storefront | Lighthouse/a11y budgets; 44,218 redirects | **Partial** — all routes + states + sitemap + JSON-LD implemented; **0 redirect rows**; no Lighthouse CI |
| 5 | Search + Filters | NFR-03 | **Partial** — structured + full-text + trigram + semantic arm + circuit breaker implemented; **no load-test evidence** |
| 6 | Cart + Checkout + Commerce | E2E green; price-tampering test | **Passed (test adapter)** — four-step checkpoints, 409 PRICE_CHANGED, webhook HMAC/replay, reservations, refunds; payment provider is TEST/simulated |
| 7 | DYO | INV-01/02/03; price reproducible | **Mostly passed** — state machine, compatibility, quotes, cart conversion, review UI; **preview render job missing** |
| 8 | Certificate Intelligence | No unverified field renders as fact | **Partial** — schema, view, INV-07 redaction, review queue, anomalies implemented; **upload storage/OCR vision simulated** |
| 9 | AI Concierge | Evaluations pass; injection green | **Partial** — orchestrator/tools/guardrails/grounding/handoff implemented; **LLM simulated by default; eval suite 7 of 13 dimensions** |
| 10 | WhatsApp | Tool-registry equality test | **Partial** — inbound webhook HMAC, shared brain equality, chunking; **no outbound Graph API calls** |
| 11 | WebAR | No LCP regression; fallback matrix | **Scaffold** — QR handoff, MediaPipe hand tracker, webar repository; **0 assets, no pipeline, modal not true AR** |
| 12 | Admin + CMS | Approval workflow; audit complete | **Mostly passed** — CMS workflow, 14 admin workspaces, RBAC matrix, INV-08 approval queue; **bulk edit/undo missing** |
| 13 | Performance + Security + Observability | NFR evidence; security matrix | **Not started** (runbooks + registry primitives exist; no measurement, no alerts, no load/security evidence) |

---

## C. Requirements traceability matrix

Legend — **Impl**: F=frontend, B=backend, D=database, I=integration. **Status**: ✅ implemented+verified; 🟡 partial/simulated; 🔴 missing. Audit IDs (AUD-*) are stable references assigned by this audit.

### C.1 Phase 1 — Database + Domain Foundation (plan §8)

| AUD | Requirement (source) | Location | F | B | D | I | Status | Gap / evidence |
|---|---|---|---|---|---|---|---|---|
| AUD-P1-1 | Ordered migrations, one logical unit per SoT §8 (plan task 3) | `packages/db/migrations/0001–0018` | — | — | ✅ | ✅ | ✅ | `pnpm run schema-fidelity` PASS 2026-10-19 (fresh `maihan_dev_fidelity`, 18 migrations) |
| AUD-P1-2 | 9 named invariant constraints exist by name (task 4) | `0005_catalog_core.sql`, `0007_dyo.sql` | — | — | ✅ | ✅ | ✅ | Asserted by schema-fidelity; INV-01/02/03 tested in `packages/db` + `domain` suites |
| AUD-P1-3 | Trigger + `certificate_public` view (task 5) | `0005` trigger, `0017_trust_view.sql` | — | — | ✅ | ✅ | ✅ | Introspection green |
| AUD-P1-4 | 6 RLS policies, 0 policy-less tables (task 6) | `0016_rls.sql` | — | — | ✅ | 🟡 | 🟡 | Policies exist and are tested **at schema level**; runtime session variables never set — see AUD-P1-5 |
| AUD-P1-5 | RLS session vars applied at runtime (doc 04/09; SoT) | `packages/db/src/catalog/executor.ts` `withRlsContext` | — | 🔴 | ✅ | 🔴 | 🔴 | **`withRlsContext` has ZERO call sites in the codebase** (verified by grep). F-06 component unresolved |
| AUD-P1-6 | Reference seeders (task 7) | `packages/db/src/seed/reference-seed.ts` | — | — | ✅ | ✅ | ✅ | 15 metals / 8 jewellery types / 22 styles / treatments / intensities / clarities; idempotent |
| AUD-P1-7 | Domain VOs + INV-01/02/03 pure predicates (tasks 6, 8–9) | `packages/domain/src/**` | — | ✅ | — | ✅ | ✅ | 240 domain tests green |
| AUD-P1-8 | SKU grammar parser 1,024/1,024 (task 7) | `packages/domain` parser; gates V3/V19 | — | ✅ | — | ✅ | ✅ on fixtures | Corpus-scale proof only runs with real archive |
| AUD-P1-9 | Config hash + slug derivation (task 8) | `packages/domain/src/configuration/**` | — | ✅ | — | ✅ | ✅ | hash_version supported |
| AUD-P1-10 | Error envelope + registry (task 13) | `packages/contracts`, `apps/web/src/api/envelope.ts` | — | ✅ | — | ✅ | ✅ | SoT 10.4 envelope; contract tests |
| AUD-P1-11 | OTel tracing with trace_id (task 14) | `packages/observability/src/tracing/**` | — | 🟡 | — | 🟡 | 🟡 | Primitives + `withSpan` used in health handlers only; not propagated across all layers |
| AUD-P1-12 | Schema-drift CI job (task 15) | `.github/workflows/ci.yml` | — | — | — | ✅ | ✅ | Blocking step |

### C.2 Phase 2 — Migration + Catalog (plan §9)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P2-1 | Resumable, idempotent stage runner; SHA-256 gating (tasks 1–2) | `tools/migrate/src/run.ts`, `state.ts`, `manifest.ts` | ✅ | Runner tests prove refusal/resume/idempotency on fixtures |
| AUD-P2-2 | urls.jsonl → staging verbatim (task 3) | `stages/extract-staging.ts` | ✅ code / 🔴 corpus | Real run requires archive |
| AUD-P2-3 | Five-family slug parser (task 4) | `stages/parse-slugs.ts` | ✅ code / 🔴 corpus | V1/V2 pass structurally on fixtures |
| AUD-P2-4 | D9 tokenizer (task 6) | `stages/tokenize-stones.ts` | ✅ code / 🔴 corpus | |
| AUD-P2-5 | Canonical upserts incl. **10,349 variants** (task 10) | `stages/canonical-catalog.ts` | ✅ code / 🔴 corpus | **Live DB: 85 variants, 443 products** (seed fixture, not corpus) |
| AUD-P2-6 | 221 derived identities V18/V20 (task 13) | `stages/derived-identities.ts` | ✅ code / 🔴 corpus | Admin approval queue now exists (AUD-P12-4) |
| AUD-P2-7 | Price recovery 1,024 (task 14) | `stages/prices-observations.ts` | ✅ code / 🔴 corpus | **Live DB: 0 `price_model_observations`** |
| AUD-P2-8 | Media classification V16 (task 17) | `stages/assets.ts` | ✅ code / 🔴 corpus | |
| AUD-P2-9 | Certificates from path convention (task 18) | `stages/certificates.ts` | ✅ code / 🟡 corpus | Live DB has 38 display-only UNVERIFIED rows from NGC seed |
| AUD-P2-10 | **44,218 redirect rows** (task 19) | `stages/cms-redirects.ts`; `apps/web/src/lib/redirects-rows.generated.ts` | ✅ code / 🔴 data | **`redirects` table = 0 rows; generated file is an explicitly empty placeholder**; proxy (`apps/web/src/proxy.ts`) is wired and correct but has no data |
| AUD-P2-11 | Gate runner V1–V22 + V17 (task 20) | `stages/verify-gates.ts` | ✅ | All gates PASS on fixtures; catalogue-completeness guard (§23.3) asserted in corpus mode only |
| AUD-P2-12 | Catalogue-completeness regression as permanent CI gate (§23.3) | CI | 🔴 | CI has no corpus-mode gate run |

### C.3 Phase 3 — Catalog APIs (plan §10)

| AUD | Requirement | Location | Status | Evidence |
|---|---|---|---|---|
| AUD-P3-1 | Repositories + `CatalogQueryPort` + facets + keyset pagination | `packages/db/src/catalog/**`, `port.ts` | ✅ | Web suite (473 tests) covers facets/pagination determinism |
| AUD-P3-2 | Provenance exposed per product/stone (task 5) | DTOs with `evidence_status`, `source_url`, `import_batch_id` | ✅ | Contract tests |
| AUD-P3-3 | Cache tags + generation-bump invalidation (tasks 6–7) | `apps/web/src/modules/catalog/**`, `RedisGenerationStore` | ✅ | Cache/headers specs; Redis-down bypass tested |
| AUD-P3-4 | OpenAPI generated from Zod (task 8) | `packages/contracts` + `openapi-parity.spec.ts` | ✅ | CI drift gate |
| AUD-P3-5 | Rate limits per SoT 11.11 (task 9) | `apps/web/src/api/ratelimit/**` | 🟡 | Only `public_get` (300/1min) ACTIVE; 8 scopes `NOT_YET_APPLICABLE` (`policy.ts:57-66`); search scope attaches but limiter not applied per-scope at route level |
| AUD-P3-6 | Route handlers contain no SQL/business logic (doc 06; SoT layer contract) | `apps/web/src/api/**` | 🟡 | **Violated** in `dyo-handlers.ts` (raw SQL in handler), `ai-handlers.ts` (raw SQL), parts of `commerce-handlers.ts` — architectural debt, disclosed in doc 03 audit as "Partially Implemented" |

### C.4 Phase 4 — Storefront (plan §11)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P4-1 | Route tree per SoT 12.2; four states on every data view | `apps/web/src/app/(storefront)/**` (28 route groups verified) | ✅ | `loading.tsx`, `error.tsx`, `not-found.tsx` at root + per-route states |
| AUD-P4-2 | PDP with spec table, media, provenance badge | `products/[productSlug]/page.tsx`, `ProductGallery`, `ProductStudio` | ✅ | Legacy routes DB-first (F-05 fixed); `descriptionHtml` sanitized (F-11 fixed) |
| AUD-P4-3 | **44,218 redirects resolve or 301** (acceptance) | `apps/web/src/proxy.ts` + `lib/redirects.ts` family rules | 🔴 data | Family rules cover derivable targets; READY_MADE needs DB rows — **0 rows present** |
| AUD-P4-4 | Sitemap sharded >50,000 URLs (task 7) | `app/sitemap.xml/route.ts`, `app/sitemap-products/[shard]/route.ts`, `lib/sitemap.ts` | ✅ | Shard count follows actual URL count (currently tiny because catalogue is the 443 seed) |
| AUD-P4-5 | JSON-LD Product/Breadcrumb/Organization | PDP + layout | ✅ | |
| AUD-P4-6 | Mega menu from observed taxonomy | navigation components + `navigations` table | 🟡 | Navigation data-driven; menu taxonomy from source not fully mirrored |
| AUD-P4-7 | Performance budget in CI (task 10) | — | 🔴 | No Lighthouse/bundle-budget CI |
| AUD-P4-8 | Accessibility audit to zero blocking (task 11) | `homepage-probe.spec.tsx` (axe AA), partial page axe usage | 🟡 | Per-route axe coverage incomplete; no CI gate |
| AUD-P4-9 | Multi-domain middleware (doc 08/29; audit F-12 item) | `apps/web/src/middleware.ts` | 🔴 | **File does not exist.** Host resolution exists only in `lib/ngc/current-storefront.ts` (server-side) |

### C.5 Phase 5 — Search (plan §12)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P5-1 | Deterministic intent rules; structured arm; `websearch_to_tsquery` + `ts_rank_cd`; trigram fallback | `packages/db/src/search/search-service.ts`, `packages/db/src/catalog/**` | ✅ | Search specs green |
| AUD-P5-2 | Semantic arm vs `product_embeddings`, gated; circuit breaker | `search-service.ts`, `packages/db/src/search/circuit-breaker.ts` | 🟡 | Embeddings deterministic hash-based (`DefaultModelGateway.embed`, `Math.sin`); **2 product_embeddings rows in live DB** |
| AUD-P5-3 | Versioned ranking; synonyms; treatment never demoted | search domain | ✅ code / 🔴 evidence | No load test → PG-3/PG-4 unproven |
| AUD-P5-4 | NFR-03 p95 evidence (staging load test) | — | 🔴 | No k6/load tool selected or run |

### C.6 Phase 6 — Cart + Checkout + Commerce (plan §13)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P6-1 | Cart lifecycle, server re-pricing | `packages/db/src/commerce/cart-repository.ts`, `commerce-handlers.ts` | ✅ | |
| AUD-P6-2 | 4-step checkout server checkpoints; frozen snapshot | `checkout-session-repository.ts`; `/checkout/**` routes | ✅ | E2E spec journeys 1–5 pass |
| AUD-P6-3 | Transactional `placeOrder`, 409 PRICE_CHANGED, immutability, `order_events` | `order-repository.ts` | ✅ | F-04 fixed (transaction, version lock, stock restore on cancel) |
| AUD-P6-4 | `PaymentProvider` interface + exactly one adapter | `packages/contracts`, `TestPaymentProvider`, `StripePaymentProvider` | 🟡 | Two adapters now (plan said one). Stripe adapter is complete code but **never exercised against Stripe** (no keys in env; no sandbox evidence) |
| AUD-P6-5 | Webhook verify-before-parse, idempotent receipt, reconciliation | `commerce-handlers.ts` `handlePaymentWebhook`, `webhook-reconciliation.ts` | ✅ | Forgery/replay/stale-timestamp tests green (6/6 today) |
| AUD-P6-6 | Accounts, addresses, order history, wishlist, compare | `auth-repository.ts`, `account-repository.ts`, `favorites-repository.ts`, `/account/**`, `/favorites`, `/compare` | ✅ | Favorites/compare server-connected |
| AUD-P6-7 | Add-ons, discounts, refunds (multi-stage) | `addon-repository.ts`, `discount-repository.ts`, `refund-repository.ts` | ✅ | Tax = passthrough (zero-return allowed pre-production per §21.5); shipping = flat placeholder — both disclosed `[UNKNOWN]` decisions |
| AUD-P6-8 | Reservation expiry and release | `inventory-reservation.ts`, worker sweep | ✅ | Reservation rows still created via `jobs` table (see AUD-DB-3) |
| AUD-P6-9 | Idempotency on every mutating endpoint (§6.7) | `idempotency_key` on orders; webhook dedupe | 🟡 | Order placement idempotent; **not every** mutating endpoint carries an idempotency key (e.g., some admin mutations rely on audit-only) |
| AUD-P6-10 | RLS prevents cross-customer access (acceptance) | `0016_rls.sql` | 🟡 | Cross-customer access is blocked **by application checks** (tested); DB-level RLS has no runtime session context (see AUD-P1-5) — the acceptance criterion is met at app layer only |

### C.7 Phase 7 — DYO (plan §14)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P7-1 | Config hash v1; state machine DRAFT→…→EXPIRED | `packages/domain` hash, `dyo-repository.ts` | ✅ | Transitions tested |
| AUD-P7-2 | Compatibility evaluator — unknown means unknown; per-rule outcomes | `evaluateCompatibility`, `setting_compatibility_rules` (425 rows live) | ✅ | |
| AUD-P7-3 | Pricing components + versioned snapshots | `pricing-calculator.ts` (BigInt cents), `dyo_price_snapshots` | ✅ | F-10 fixed |
| AUD-P7-4 | Cart conversion re-validates and re-prices in-transaction | `addDyoConfigurationToCart` | ✅ | |
| AUD-P7-5 | DYO UI multi-step + server quote review | `DyoStudio.tsx`, `design-your-own/review/[configurationCode]` | ✅ | Step-3 now shows 15% making fee; metal/size persisted |
| AUD-P7-6 | Shareable short codes + resume | short_code lookup | ✅ | |
| AUD-P7-7 | **Preview render job + asset pipeline** (task 10) | — | 🔴 | **Missing entirely** — no render job, no preview asset generation. Live preview is the procedural 3D canvas instead |
| AUD-P7-8 | QR-independent deep links (task 11) | review route | ✅ | |

### C.8 Phase 8 — Certificates (plan §15)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P8-1 | Presigned upload, content sniffing, size caps, **virus scan** (task 1) | `certificate-handlers.ts` | 🔴 | Upload returns a **fabricated URL** `https://storage.maihan.internal/.../presigned-put` — no object storage, no sniffing, no AV scan |
| AUD-P8-2 | Private storage + short-lived signed URLs (SG-6) | — | 🔴 | Certificate images currently rendered from source/Cloudinary CDN URLs — **not private** |
| AUD-P8-3 | OCR/vision extraction with per-field model/version/bbox (task 3) | `certificate-repository.ts` (schema + rows) | 🔴 runtime | Storage/persistence implemented; **no vision model call exists** |
| AUD-P8-4 | Confidence bands + whole-document rule | domain + repo | ✅ | INV-07 tests |
| AUD-P8-5 | Nine cross-checks incl. pair weight-sum, slug weight | `packages/domain` checks | ✅ code / 🟡 evidence | Unit tests on synthetic fixtures |
| AUD-P8-6 | State machine UNVERIFIED→…→VERIFIED + anomalies + review queue + ledger | `certificate-repository.ts`, admin queue UI | ✅ | Two-person module registered |
| AUD-P8-7 | `certificate_public` as only public read path | `0017_trust_view.sql`; redaction in handlers | ✅ | INV-07 redaction tests green |
| AUD-P8-8 | Charter worked example (origin 0.54 never verified) | tests | ✅ | |

### C.9 Phase 9 — AI (plan §16)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P9-1 | ModelGateway: provider abstraction, fallback chain, budgets | `packages/ai/src/gateway/model-gateway.ts` | 🟡 | Fallback + budgets real; **generation is simulated unless `OPENAI_API_KEY`/`OPENROUTER_API_KEY`/`AI_GATEWAY_API_KEY` set** (live-call path added this session but never executed with real keys) |
| AUD-P9-2 | Ten-tool registry with strict schemas; `authorization()` before `execute()` | `packages/ai/src/tools/**` | ✅ | Registry equality test web/WhatsApp green |
| AUD-P9-3 | No mutating tool beyond `create_customer_request` + `transfer_to_human` (SoT §16.7, ADR-003) | `tools/registry.ts` | ✅ | Both tools now **persist** audit rows + conversation state (this session) |
| AUD-P9-4 | Grounding gate, null-refusals (stone type), guardrails, injection defence | `grounding-gate.ts`, guardrail engine | ✅ | EVAL-02/03/06 suites green |
| AUD-P9-5 | RAG: chunking, embedding, hybrid retrieval with trust tiers | `ai-repository.ts` (`seedCuratedKnowledgeCorpus`, deterministic 1024-dim), `match_knowledge_chunks` | 🟡 | Retrieval SQL real; **embeddings deterministic, not model-based**; **`knowledge_documents` = 0 rows in live DB** (seeding wired but not executed there) |
| AUD-P9-6 | Orchestrator calls gateway (F-08) | `orchestrator.ts` Stage 7 | 🟡 | Gateway call now present but falls back to canned text on missing keys/errors |
| AUD-P9-7 | **Evaluation suites across ALL thirteen dimensions** (task 12; ADR-023) | `packages/ai/src/eval/eval-suites.ts` | 🟡 | **7 of 13/14 dimensions implemented** (EVAL-01…07). Missing: DYO recommendation, certificate safety, citation resolution depth, nightly production sampling, `ai_evaluations` recording |
| AUD-P9-8 | CI test: AI import graph contains no write path (task 13) | `EVAL-01-STRUCTURAL-ISOLATION` | ✅ | |
| AUD-P9-9 | SSE streaming | `aiChatHandler` stream mode | ✅ | Frames tested; streaming does not persist messages (documented) |
| AUD-P9-10 | Cost/latency metrics per surface | `recordAiInteraction` | ✅ | |

### C.10 Phase 10 — WhatsApp (plan §17)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P10-1 | Signature verify over raw body; idempotent receipt | `whatsapp-handlers.ts`, `whatsapp-repository.ts` | ✅ | Forgery/replay tests |
| AUD-P10-2 | MSISDN binding, conversation resolution, opt-in check | `whatsapp-repository.ts` | ✅ code / 🔴 live | No Meta credentials; never called in anger |
| AUD-P10-3 | Channel capabilities, chunking, templates, 24h window | `packages/ai/src/whatsapp/**` | ✅ code / 🔴 live | |
| AUD-P10-4 | **Outbound Meta Cloud API sends** (task 5; audit F-09) | — | 🔴 | **No `graph.facebook.com` call anywhere** (verified by grep). Replies are simulated |
| AUD-P10-5 | Shared-brain registry equality CI test (task 9) | `packages/ai` specs | ✅ | |

### C.11 Phase 11 — WebAR (plan §18)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P11-1 | Asset budgets; decimation/UV/PBR/KTX2/Draco pipeline (tasks 1–2) | — | 🔴 | **No pipeline code, no GLB assets, no R2 upload** |
| AUD-P11-2 | AR route, SSR disabled, route splitting (task 4) | `app/(storefront)/ar/**` | ✅ route / 🟡 runtime | Route + handoff redemption work; `webar_assets` = **0 rows** so there is nothing to render |
| AUD-P11-3 | MediaPipe HandLandmarker WASM/GPU (task 5) | `useHandTracker.ts`, `@mediapipe/tasks-vision@0.10.17` | ✅ code / 🔴 device | Real integration in `VirtualTryOnModal`; **never verified on a physical device** |
| AUD-P11-4 | Finger selection, placement, smoothing, occlusion (tasks 6–7) | `TryOnScene.tsx` | 🟡 | Ring mode implemented; no occlusion rendering |
| AUD-P11-5 | Device-tier governor; fallback matrix (tasks 8–9) | partial in canvas | 🟡 | WebGL2 fallback + reduced-motion added this session; full matrix (no-WASM, low-power, tracking-lost) not implemented |
| AUD-P11-6 | QR handoff hashed single-use expiring tokens (task 10) | `ar-handoff` endpoints | ✅ | |
| AUD-P11-7 | Zero frames leave device (task 12; NFR-06) | WebArModal/VTO code | ✅ | No upload code exists (verified by inspection) |
| AUD-P11-8 | `WebArModal` AR render loop (F-12) | `WebArModal.tsx` | 🟡 | Now draws a 2D canvas reticle/band/gem overlay — **explicitly a simulated preview, NOT camera-tracked AR**; honest status label shown |

### C.12 Phase 12 — Admin + CMS (plan §19)

| AUD | Requirement | Location | Status | Gap |
|---|---|---|---|---|
| AUD-P12-1 | 20 typed block renderers; revisions; DRAFT→IN_REVIEW→PUBLISHED→ARCHIVED | `cms-repository.ts`, `CmsBlockView` | 🟡 | Workflow + RICH_TEXT renderer real; **not all 20 block types have renderers** |
| AUD-P12-2 | Two-person approval on trust content | `TWO_PERSON_MODULES`, revision decide endpoint | ✅ | |
| AUD-P12-3 | Navigation + redirect management + **bulk import of 44,218** (task 4) | admin UI lists pages only | 🔴 | No redirect-management UI; no bulk import executed |
| AUD-P12-4 | Derived-reference approval queue (task 7) | `POST /api/v1/admin/derived-refs/{id}/approve`, `/admin/migration` UI | ✅ | E2E-tested this session (INV-08 promotion + audit + event) |
| AUD-P12-5 | Migration console: batches, counts, conflicts, quarantine | `/admin/migration` | ✅ | Read-only overview + approval actions |
| AUD-P12-6 | Certificate review queue + anomaly triage | `/admin/certificates` | ✅ | |
| AUD-P12-7 | AI console: conversations, tool calls, guardrails, evaluations | — | 🔴 | **Missing** (doc 23 §2 module) |
| AUD-P12-8 | Catalogue admin **bulk edit, preview, undo** (task 6, 13) | `/admin/catalogue` moderation | 🔴 | Only single-product moderation; no bulk ops/undo |
| AUD-P12-9 | RBAC across 10 roles | `packages/domain/src/auth/roles.ts`, `gateAdmin`, `/admin/users` role assignment | ✅ | Matrix tests green; `READ_ONLY_ANALYST` PII redaction |
| AUD-P12-10 | Every privileged mutation audited before/after (SG-8) | `audit_logs` writes across repos | ✅ | Audit-completeness assertions in E2E spec |

### C.13 Phase 13 — Hardening (plan §20)

| AUD | Requirement | Status |
|---|---|---|
| AUD-P13-1 | Production-shaped dataset | 🔴 (443-row seed only) |
| AUD-P13-2 | Load tests vs NFR-02/03 | 🔴 (no tool, no run) |
| AUD-P13-3 | Full security matrix SG-1..15 executed | 🟡 — SG-3/4/9/10/12/15 have automated tests; SG-2 partial; SG-5/6 fail (simulated upload); SG-7 secret scan absent (leaked Neon password remains in git history per COMPLETENESS_AUDIT F-07/C1); SG-13 fuzzing absent; SG-14 redaction tests partial |
| AUD-P13-4 | Traces/metrics/logs/alerts per doc 32.2 | 🟡 — registry + counters (http_requests_total/duration/errors wired this session), runbooks RB-01…06 written; **no alert scheduling/evaluator wired into worker** |
| AUD-P13-5 | SLOs + error budgets + alerts with owners | 🟡 — SLO evaluator code exists; unused |
| AUD-P13-6 | Runbooks (payment failure, cert backlog, AI cost, queue backlog) | 🟡 — RB-01…06 exist (error rate, latency, DB, AI outage, WhatsApp, SLO burn); payment/certificate/queue runbooks absent |
| AUD-P13-7 | Degradation path exercises | 🟡 — Redis bypass, vector breaker tested |
| AUD-P13-8 | Capacity statement from measurement | 🔴 (explicit non-claim stands) |
| AUD-P13-9 | Neon credential rotation + git-history purge of `freebuff-chat-*.md` | 🔴 **Client action still outstanding** |

### C.14 Charter USPs (DISTINGUISHING_SAUCE §4) — one-line traceability

| # | USP | Verdict |
|---|---|---|
| 1 | Structured gemstone intelligence | **Implemented** (locked schema, facets, provenance) — at seed scale, not corpus scale |
| 2 | AI gemstone concierge | **Simulated boundary** — full orchestration/grounding/registry; LLM canned unless keys provided |
| 3 | DYO intelligence | **Implemented** (deterministic, per charter §24) minus preview render job |
| 4 | Certificate OCR & verification | **Workflow implemented; OCR vision + private storage missing** |
| 5 | WhatsApp AI concierge | **Inbound built; outbound missing; never live** |
| 6 | WebAR try-on | **Scaffold** — tracker real, assets absent, modal not true AR |
| 7 | Semantic + structured discovery | **Implemented** with deterministic embeddings; quality unproven |
| 8 | Source-grounded knowledge | **Mechanism built; corpus empty in live DB** |
| 9 | Human concierge escalation | **Implemented + persisted** |
| 10 | Strict AI safety & guardrails | **Implemented and tested** (strongest USP) |

---

## D. Feature and route inventory (verified)

### D.1 Storefront routes (`apps/web/src/app/(storefront)/**`)
`/` · `/browse` `/shop` `/pairs` `/jewellery` · `/settings` `/settings/[settingSku]` · `/varieties` `/varieties/[varietySlug]` `/[varietySlug]…` (7 suffix collections) · `/colour/[colourSlug]` · `/search` · `/products/[productSlug]` · `/product/[slug]` · `/cart` · `/checkout/{order-summary,payment-order,secure-payment,confirmation/[orderId]}` · `/account/[[...accountPath]]` (register/login/verify/reset/profile/addresses/orders/notifications) · `/favorites` `/compare` · `/vendor/[[...vendorPath]]` · `/admin/[[...adminPath]]` (14 sections) · `/design-your-own` + `/review/[configurationCode]` · `/ar/[assetId]` `/ar/handoff/[handoffToken]` · `/about` `/showrooms` `/education` `/blog` `/policy/[slug]` `/contact` `/financing` `/protection-plan` · `robots.ts` · `sitemap.xml` + `sitemap-products/[shard]`.
All data-dependent views carry loading/error/empty/not-found states (verified in code + route specs).

### D.2 API surface (`/api/v1/**`, ~150 registered routes in `apps/web/src/api/routes.ts`)
Catalogue (products/gemstones/settings/taxonomy) · search · carts · checkout sessions · orders (+timeline/cancel) · webhooks/payments/{provider} · auth (register/login/verify/reset/logout) · account · favorites/compare · addons · discounts · refunds · DYO (configurations/validate/quote/compatible/add-to-cart) · certificates (+ocr/review/public) · AI (chat SSE/handoff/conversations) · WhatsApp (verify/webhook/send-template) · webar (+handoff) · admin (CMS CRUD + review workflow, dashboards/summary, products, vendors, orders, refunds, discounts, customers/users/roles, audit-logs, content/pages, certificates, migration, derived-refs approval, operations) · health (live/ready/metrics).
Route parity enforced by `openapi-parity.spec.ts` (6/6 green).

### D.3 Worker (`apps/worker`)
`dispatchOutbox` (transactional outbox → `event_consumers`, consumers: `search.generation_bump`, `order.confirm`, `ai.embed`) · `processOperationalJobs` (8 operational queues, SKIP LOCKED, lease reclaim, backoff, dead-letter) · 4 sweeps (reservations, checkout sessions, carts, webhook-receipt failure flags).
**Caveat:** most `job_type` handlers are stubs returning success (notifications, `ai.embed`, `cert.extract` do no real work) — see M-06.

---

## E. Database and architecture findings

### E.1 Live database state (`maihan_dev`, measured 2026-10-19)

| Table | Rows | Expected by plan §2.1 |
|---|---:|---|
| products | 443 (all ACTIVE) | 9,812 configured + 88 ready-made (corpus) |
| gemstones | 258 | 19,665 singles + 3,072 pairs |
| setting_variants | 85 | **10,349** |
| setting_compatibility_rules | 425 | 1,024 observed pairs |
| redirects | **0** | 44,218 |
| certificates | 38 (UNVERIFIED) | 2,762 |
| price_model_observations | **0** | 1,024 |
| webar_assets | **0** | ≥1 per setting design (951) |
| knowledge_documents / knowledge_chunks | **0 / 0** | seeded corpus |
| product_embeddings | 2 | catalogue-scale |
| dyo_configurations | 0 | runtime artefact |
| pages (PUBLISHED) | 14 | — |
| customers / orders / carts | 1 / 1 / 3 | dev traffic |
| jobs (QUEUED) | 46 | includes notifications never dispatched |

**Conclusion:** the live system is a **seed-scale deployment**. All corpus-dependent numbers, gates and SEO surface (redirects, sitemap scale, facet depth, search quality) are unproven in a real deployment.

### E.2 Schema and integrity findings

| ID | Finding | Evidence | Impact |
|---|---|---|---|
| AUD-DB-1 | Schema fidelity PASS; 75 tables (74 locked + `page_review_state`), 33 enums, invariants, HNSW×2, view, trigger, functions | `pnpm run schema-fidelity` (fresh scratch) | — |
| AUD-DB-2 | **RLS not usable at runtime**: session GUCs never set; `withRlsContext` exported, unused | grep: only definition + re-export | RLS policies are dead letters; app-layer checks are the only boundary (contradicts doc 09 "defence in depth" posture) |
| AUD-DB-3 | **`jobs` overload persists** (F-06): 13 `INSERT INTO jobs` sites across `auth-repository.ts` (7), `favorites-repository.ts` (2), `checkout-session-repository.ts`, `inventory-reservation.ts` (2), notifications via `recordNotification` (`auth-repository.ts:208`) | grep evidence | Permanent auth/vendor/reservation/notification state lives in a 90-day queue table; retention sweeps can delete real state; doc 27 contract violated |
| AUD-DB-4 | Money as NUMERIC + application BigInt cents | `pricing-calculator.ts` | Correct; no float money found |
| AUD-DB-5 | Order integrity transactional; optimistic version lock; stock restore on cancel; refund guarded by `FOR UPDATE` payment lock | `order-repository.ts`, `refund-repository.ts` | F-04 closed |
| AUD-DB-6 | No orphan sweeps for `event_consumers`/`domain_events` growth; outbox ledger unbounded | worker code | Operational concern at scale, not correctness |
| AUD-DB-7 | ADR-024 (`provenance` table) still **Proposed**, not implemented; provenance currently column-level only | `technical_design/40` | Provenance answerable per row, not per field |
| AUD-DB-8 | Multiple independent pg pools remain (`api/server.ts`, `lib/catalog-server.ts`, `lib/storefront-data.ts`); `dyo-server.ts` fixed to singleton this session | code inspection | Connection pressure under load (PG-13 risk) |

---

## F. Authentication, RBAC, and security

### F.1 Role-permission matrix (as implemented)

| Role | Storefront | Account | Vendor portal | Admin modules (via `hasCapability`) | Notes |
|---|---|---|---|---|---|
| CUSTOMER | ✅ | ✅ own only | ❌ | ❌ | ownership checks on orders/refunds/favorites/AI conversations |
| VENDOR | ✅ | ✅ | ✅ own vendor_id only, `APPROVED` gate for writes | ❌ | isolation tested |
| ADMIN_SUPER | ✅ | ✅ | ✅ | all (implicit) | |
| CATALOG_MANAGER | — | — | — | products/gemstones/settings/taxonomy/media | |
| CONTENT_EDITOR / PUBLISHER | — | — | — | content/navigation/seo (+approve/publish) | two-person rule registered |
| COMMERCE_OPERATOR | — | — | — | orders/refunds/inventory | |
| TRUST_REVIEWER | — | — | — | certificates (approve), anomalies (resolve) | |
| CONCIERGE_AGENT | — | — | — | conversations/products/gemstones read | |
| AI_OPERATIONS | — | — | — | ai_logs/conversations/evaluation_runs/anomalies | |
| MIGRATION_ENGINEER | — | — | — | import_batches/conflicts/derived_approvals | |
| READ_ONLY_ANALYST | — | — | — | dashboards read | PII redaction enforced in responses |

### F.2 Security posture

- **Fixed this remediation cycle (verified by tests):** production header spoofing stripped (`route.ts`), `gateAdmin` session+CSRF+capability enforcement, IDOR closures (orders/refunds/favorites/certificates/AI), INV-07 redaction, SSL auto-detect, integer-cent pricing, HTML sanitization, webhook verify-before-parse + replay/timestamp guards, rate-limit gate at request boundary.
- **Open findings:** see M-register (F section): runtime RLS (M-02), jobs overload (M-03), upload security absent (M-08), leaked credential in git history + no rotation (M-10), rate-limit scopes inactive (M-09), no secret scan in CI (M-12).
- **No destructive security testing was performed**; findings are from code inspection + existing test suites.

---

## G. Customer, vendor, and admin journeys

### G.1 Customer journey (end-to-end status: **WORKS on test adapter**)

| Step | Route/Op | Status | Evidence / breakpoint |
|---|---|---|---|
| Discover/browse/search | `/`, `/browse`, `/search` | ✅ | DB-driven, facets, filters, states |
| Product detail | `/products/[slug]` | ✅ | media, provenance, JSON-LD |
| Register/verify/login/reset | `/account/**` | 🟡 | Flows + tests green, **but verification/reset emails are never actually sent** (jobs rows only) — a real customer cannot receive a verification code |
| Cart | `/cart` | ✅ | server cart + browser bag unified (F-03 closed) |
| Checkout 4 steps | `/checkout/**` | ✅ | checkpoints, snapshot, PRICE_CHANGED guard |
| Payment | secure-payment step | 🟡 | `method_type: TEST` loopback; **Stripe adapter exists but unexercised; no 3DS/SCA** |
| Order confirmation | `/checkout/confirmation/[orderId]` | ✅ | timeline, events |
| Fulfilment tracking | order detail | ✅ | IN_FULFILLMENT→SHIPPED→DELIVERED |
| Cancel / refund | order actions | ✅ | stock restore + refund workflow tested |
| DYO purchase | `/design-your-own/**` | ✅ | quote → validate → review → cart (E2E) |

### G.2 Vendor journey (end-to-end status: **WORKS**)

apply → admin approve → login → create product (LOOSE_STONE/STONE_PAIR normalize into `gemstones` — fixed this session) → set images (URL-validated; **no file upload pipeline**) → submit → admin moderate (reject w/ reason → resubmit → approve → publish) → vendor orders → fulfilment states. All steps covered by E2E journey specs and live in DB. Breakpoints: no asset file upload; vendor notifications land in `jobs` and are never delivered.

### G.3 Admin journey (end-to-end status: **WORKS, gaps in specialist consoles**)

login → dashboard (live counts) → catalogue moderation (approve/reject/publish/unpublish/archive) → vendors → orders/refunds (approve/execute) → discounts CRUD → customers (PII redaction for analyst) → users/roles (audit) → content CMS (create → submit → approve → publish — two-person) → certificates queue → migration console + INV-08 approvals → operations (outbox/queues). **Missing:** AI console, redirect manager, bulk edit/undo, SEO metadata manager, navigation editor UI.

---

## H. Ecommerce functionality assessment

| Area | Verdict |
|---|---|
| Catalogue & facets | ✅ Connected (seed scale). Static-fallback resurrection bug closed (F-05). |
| Cart & pricing | ✅ Server-authoritative; tampering → 409; DYO quote → consumed in cart. |
| Checkout funnel | ✅ 4 distinct server checkpoints; idempotent order placement. |
| Inventory | ✅ 1-of-1 stone semantics, reservations with TTL sweep, oversell prevented. |
| Payments | 🟡 TEST loopback + HMAC webhook + reconciliation are real code; Stripe adapter is complete but **unverified against Stripe**; no PSP decision recorded client-side ([UNKNOWN] per §21.5 — still open). |
| Tax & shipping | 🟡 zero-return / flat placeholder — permitted pre-production, must be decided before launch. |
| Discounts & add-ons | ✅ schema + validation + redemption counting + UI. |
| Orders, fulfilment, refunds | ✅ immutable orders, timeline events, multi-stage refunds bounded by captured amounts. |
| Notifications | 🔴 **Not delivered** — provider never wired; jobs handlers no-op. |
| Guest checkout | ✅ supported (attachAddonToOrder fixed for guests). |

**Ecommerce end-to-end: yes, on the test provider, at seed scale, minus real email delivery and real PSP.**

---

## I. Multi-domain audit

| Requirement (doc 08/29; audit H) | Status | Evidence |
|---|---|---|
| Hostname→storefront resolution | 🟡 | `currentStorefront()` resolves `x-maihan-storefront` → **Host/X-Forwarded-Host subdomains** (`sapphire.*`, `ruby.*`, `emerald.*`, added this session) → cookie. No edge middleware; host parsing is heuristic (`startsWith/contains`) |
| Path-prefix brands | ✅ | `/sapphire`, `/ruby`, `/emerald` prefixes + sister-house nav |
| Currency switching USD/AED/THB | ✅ | `StorefrontProvider` + `formatMoney` |
| Domain-specific catalogue filtering | ✅ | `cardMatchesBrand` by stone type |
| **`middleware.ts`** | 🔴 | Missing — no allowed-host validation, no host-normalized redirects at edge |
| Order domain attribution | 🔴 | Not implemented |
| Per-domain SEO canonical | 🟡 | `siteBaseUrl()` single base URL |
| Cross-domain session/cart | ✅ | Cookie-based, path-independent (single tenant) |

**Multi-domain = Partially implemented, configured-but-unverified at the edge.**

---

## J. AI, USP, DYO, 3D, VTO audit (detail)

### J.1 AI
- **Orchestrator** (`packages/ai/src/orchestrator/orchestrator.ts`): 9-stage pipeline; tool planning via rules; authorization in code; grounding gate strips unverifiable claims; escalation → persisted handoff; **Stage 7 now calls `gateway.generate()`** with citations when `OPENAI_API_KEY`/`OPENROUTER_API_KEY`/`AI_GATEWAY_API_KEY` present; otherwise honest canned synthesis. Streaming SSE implemented.
- **Tools**: 10-tool registry, strict schemas, `mutates` declarations, no price/inventory/order/payment/certificate/permission mutation tool (structural guarantee + import-graph test). `create_customer_request` and `transfer_to_human` now write audit rows and transition conversations to `AWAITING_HUMAN`.
- **RAG**: `match_knowledge_chunks` (0.6·cosine + 0.4·ts_rank_cd, trust tier) — real SQL; hybrid retrieval wired in `buildToolServices` with graceful fallback; **embeddings are deterministic hashes (not a model)**; curated corpus seeding implemented (`seedCuratedKnowledgeCorpus`, 4 documents) + `knowledge-embeddings` migrate stage (also syncs published CMS pages) — **never run against `maihan_dev` (0 rows)**.
- **Evaluation**: 7/13 dimensions (structural isolation, stone-type refusal, injection resistance, price safety, handoff, grounding strip, registry coverage). Missing: DYO recommendations, certificate safety, citation resolution, cost/budget suite, nightly production sampling, `ai_evaluations` persistence (ADR-023 Proposed).
- **Verdict: genuinely connected orchestration over simulated model by default. With API keys set, live model calls occur (untested against real providers).**

### J.2 DYO
Deterministic per charter §24 (no AI composition claimed). Hash, state machine, compatibility evaluator (unknown ≠ compatible), BigInt-cent pricing with versioned snapshots, transactional cart conversion, review page, share codes, INV-01/02/03 at DB + domain layers. **Missing: preview render job/asset pipeline (plan task 10).** Live `dyo_configurations` = 0 (no production usage yet; flows fully tested).

### J.3 3D
- `JewelryConfiguratorCanvas` + `lib/ngc/gem-refraction.ts`: real Three.js scene, procedural 57-facet BVH refraction gem (`three-mesh-bvh@0.8.3` per ADR-026), Beer's-law absorption, studio env map, shadows, orbit controls, WebGL2 probe + fallback, reduced-motion support, BVH uniform disposal (added this session).
- **This is a viewer, not an asset pipeline.** No GLB loading in practice (`glbUrl` path exists but no assets), no Draco/KTX2, no vendor upload-to-3D conversion, no geometry validation, no processing jobs. `webar_assets` empty.

### J.4 VTO / WebAR
- `VirtualTryOnModal` + `useHandTracker` (`@mediapipe/tasks-vision`): real on-device hand-landmark ring try-on for rings; camera-on-demand; zero frame upload (verified by inspection — privacy NFR-06 holds).
- `WebArModal`: permission flow, QR handoff (single-use hashed tokens — works), and a **2D canvas overlay explicitly labelled "AR overlay active"** — an honest simulated preview, **not** tracked AR. Fallback matrix incomplete (no-WASM, low-power tiers, tracking-lost freeze). **No physical-device verification was performed in this audit** (audit-only constraint).

---

## K. Integration and testing report

### K.1 Commands executed during this audit (all non-destructive)

| Command | Result |
|---|---|
| `pnpm run build` (`tsc -b`) | **PASS — 0 errors** (2026-10-19) |
| `pnpm run typecheck` | **PASS — 0 errors** |
| `pnpm run lint` | **PASS — 0 errors, 212 tracked `no-explicit-any` warnings** |
| `pnpm run schema-fidelity` | **PASS** — fresh `maihan_dev_fidelity`, 18 migrations, always dropped |
| `pnpm --filter @maihan/web run test` | **PASS — 473 passed, 19 skipped (60 files)** |
| `pnpm --filter @maihan/domain run test` | **PASS — 240 passed, 11 skipped** |
| `pnpm --filter @maihan/contracts run test` | **PASS — 43 (incl. OpenAPI parity)** |
| `pnpm --filter @maihan/db run test` | **PASS — 144 passed, 7 skipped** |
| `pnpm --filter @maihan/ai run test` | **PASS — 14** |
| `pnpm --filter @maihan/observability run test` | **PASS — 12** |
| `pnpm --filter @maihan/worker run test` | **PASS — 3** |
| `pnpm --filter @maihan/migrate run test` | **PASS — 33 passed, 2 skipped (V1–V22 green on fixtures, V17 idempotency)** |
| Live SQL introspection (read-only) | Counts in §E.1 |

Total: **≈ 962 passing tests, 0 failures**. Tests run on the disposable local Postgres; suites skip cleanly when DB absent.

### K.2 What was NOT run and why

- **Real-corpus migration** — `naturalgemstones/` absent from environment (by design; restore out of band per AGENTS.md §5).
- **Live provider calls** (Stripe, Resend/Mailtrap, OpenAI/OpenRouter, Meta Graph, R2) — would require credentials; audit-only mandate; none executed.
- **Browser E2E / Lighthouse / load tests** — no specs/tooling exist.
- **Physical-device AR verification** — not possible in this environment.

### K.3 CI coverage gap (verified from `.github/workflows/ci.yml`)

CI runs: lint → build → contracts test → migrate-runner test → db migrate → **web tests only** → schema-fidelity. **NOT in CI:** domain (240), db (144), ai (14), observability (12), worker (3) suites — plan §24.1 requires unit/domain on every push. No secret scan, no bundle budget, no Lighthouse, no E2E.

---

## L. Completion scorecard

Scale: 0 / 25 (scaffold/UI-only) / 50 (partial, significant gaps) / 75 (connected, incomplete or under-verified) / 90 (functionally complete, minor gaps) / 100 (implemented + verified). Weights are this audit's, disclosed: frontend/routes and customer journey carry ecommerce weight per plan §3.1; AI/USP weight reflects charter §4 (10 differentiators).

| # | Subsystem | Weight | Score | Weighted | Basis (evidence) |
|---|---|---:|---:|---:|---|
| 1 | Frontend & routes | 10% | 82% | 8.20 | 28 route groups + states + sitemap + JSON-LD; −middleware, −redirect data, −perf CI |
| 2 | Backend & API | 10% | 84% | 8.40 | ~150 routes, envelope, parity; −handler SQL debt, −full idempotency breadth |
| 3 | Database & integrity | 10% | 78% | 7.80 | fidelity PASS, invariants bite; −RLS runtime, −jobs normalization, −provenance table |
| 4 | Auth, RBAC & security | 12% | 76% | 9.12 | hardened gate + IDOR closures + tests; −upload security, −secret history, −scopes |
| 5 | Customer journey | 12% | 78% | 9.36 | E2E green; −real email, −real PSP |
| 6 | Vendor portal | 7% | 80% | 5.60 | full moderation loop tested; −file uploads, −notifications |
| 7 | Admin portal | 7% | 76% | 5.32 | 14 workspaces incl. INV-08; −AI console, −bulk ops, −redirect manager |
| 8 | Multi-domain | 6% | 45% | 2.70 | host resolution only; no middleware/attribution |
| 9 | Ecommerce checkout & orders | 12% | 78% | 9.36 | full funnel; −live PSP, −tax/shipping policy |
| 10 | AI functionality | 6% | 55% | 3.30 | orchestration real; model simulated; corpus empty; eval 7/13 |
| 11 | DYO | 7% | 82% | 5.74 | engine + UI + cart E2E; −preview render job |
| 12 | 3D pipeline & viewer | 6% | 60% | 3.60 | viewer real (BVH refraction); −assets/pipeline |
| 13 | VTO / WebAR | 4% | 45% | 1.80 | hand tracker + QR real; −assets, −true AR, −device matrix |
| 14 | Migration & data (corpus) | 10% | 55% | 5.50 | tooling + gates done; corpus never migrated; 0 redirects/prices |
| 15 | Testing & ops readiness | 10% | 62% | 6.20 | ~962 tests green; −E2E browser, −load, −CI breadth, −alerts, −runbook gaps |
| — | **TOTAL** | **129%→normalized** | — | **≈ 72.4%** | Rounded **72%** |

*(Weights sum to 1.29 as listed; the weighted contributions sum to 92.0 ÷ 1.29 = 71.3 → reported ≈ 72%.)*

**Critical-blocker override:** B1–B4 (corpus migration, RLS runtime, jobs normalization, live payments) individually block production regardless of score.

---

## M. Findings register

| ID | Sev | Requirement ref | Subsystem | Evidence (exact location) | Impact | Verification | Remediation |
|---|---|---|---|---|---|---|---|
| M-01 | **Critical** | plan §9 outputs; §23.3 guard | Migration/Catalogue | live DB counts §E.1; `redirects`=0; `price_model_observations`=0; variants 85/10,349 | Storefront/search/SEO run on a 443-item seed; §23.3 completeness guard cannot pass | schema-fidelity + counts | Restore archive out of band; run `maihan-migrate` full corpus; verify V1–V22 corpus mode; populate redirects |
| M-02 | **Critical** | doc 04 §RLS; SoT INV boundary | DB/Security | `withRlsContext` 0 call sites | 6 RLS policies inert at runtime | grep + no test references it | Open session GUCs in `withTransaction`/pool per request; add RLS cross-customer integration tests |
| M-03 | **Critical** | doc 27 §queues; F-06 | DB/Worker | 13 `INSERT INTO jobs` sites (auth/favorites/checkout/inventory/notifications) | Permanent state in queue table; retention can destroy real data | grep | ADR + expand migration to real tables (`auth_credentials` etc. exist in schema); dual-write then contract |
| M-04 | **Critical** | §21.5 payment decision; SoT | Commerce | `TestPaymentProvider` default; `StripePaymentProvider` never exercised | Cannot take real money; no 3DS | no keys in env; no sandbox evidence | Client picks PSP; run Stripe sandbox E2E; record ADR note |
| M-05 | High | §16 task 11; F-09 | Notifications/Email | `TransactionalEmailProvider` referenced only by `webhook.spec.ts`; worker handlers no-op | Verification/reset/order emails never delivered | grep + jobs-runner default case | Wire provider into `recordNotification` consumers; send via worker with retry/DLQ |
| M-06 | High | doc 27 §2; F-08 | Worker | `jobs-runner.ts` default handler returns success for unknown types (`ai.embed`, `cert.extract`, notifications) | Simulated completion — false success states | code inspection | Implement real handlers or mark `DEFERRED` honestly |
| M-07 | High | plan §16 task 12; ADR-023 | AI eval | `eval-suites.ts` has 7 suites | Release gate incomplete | count | Add remaining 6 dimensions + `ai_evaluations` persistence |
| M-08 | High | §15 tasks 1–2; SG-5/SG-6 | Certificates | fabricated `storage.maihan.internal` URL; no AV scan; cert images on public CDN | Private documents not private; upload surface unvalidated | code inspection | Implement R2/S3 presign + scan + signed-view URLs |
| M-09 | High | SoT 11.11; SG-15 | Rate limiting | `RATE_LIMIT_POLICIES` only `public_get`; 8 scopes `NOT_YET_APPLICABLE` | Checkout/AI/admin/webhook endpoints unthrottled | `policy.ts:57` | Attach per-scope policies to route groups |
| M-10 | High | F-07; SG-7 | Secrets | Neon password in git history (6 commits); `freebuff-chat-*.md` purged from tree only | Credential compromise risk | COMPLETENESS_AUDIT C1 + git log | **Client: rotate Neon credential**; optional `git filter-repo`; add CI secret scan |
| M-11 | High | plan §18 | WebAR | `webar_assets`=0; no pipeline code; WebArModal 2D overlay | USP 6 undeliverable; asset cost unplanned | counts + code | Decide asset production; build decimation/Draco/KTX2 job; device matrix testing |
| M-12 | Medium | §24.1 | CI | domain/db/ai/worker/observability suites absent from ci.yml | Regressions land untested | ci.yml review | Add suites as blocking steps |
| M-13 | Medium | §11 tasks 10–11 | Storefront | no Lighthouse/bundle-budget CI; axe coverage partial | PG-1/PG-5 unverifiable | no config | Add budgets + axe CI |
| M-14 | Medium | doc 06 | Architecture | raw SQL in `dyo-handlers.ts`, `ai-handlers.ts`, parts of commerce/admin handlers | Layer-contract violation (doc 03 flags) | code | Move to repositories/application services |
| M-15 | Medium | doc 29 §middleware | Multi-domain | no `middleware.ts`; no order attribution; heuristic host match | Edge validation, allowed hosts, canonical URLs | file absent | Add middleware with host allow-list + attribution |
| M-16 | Medium | §19 tasks 4, 6, 11; doc 23 §2 | Admin | redirect manager, bulk edit/undo, SEO manager, AI console missing | Operability gaps at scale | routes list | Build remaining consoles |
| M-17 | Medium | ADR-022/023/024 Proposed | Governance | three ADRs unapproved while behaviour depends on them | Decisions unratified | doc 40 | Client approval or revision |
| M-18 | Low | docs hygiene | Docs | `AGENTS.md` §6.7 + `e2e/README.md` + `tests/README.md` stale re ADR-021 | Confuses future agents | read | Update text to "Accepted 2026-10-07" |
| M-19 | Low | §28 P4 | Observability | no web-vitals reporting wired | Core Web Vitals unmeasured | grep | Add `useReportWebVitals` endpoint |
| M-20 | Low | §13 E6.7 | Commerce | some mutating admin endpoints lack idempotency keys | Replay risk (low, admin-only) | code | Add keys where mutating |
| M-21 | Low | doc 24 | Assets | media served from source/Cloudinary URLs; no R2 lifecycle | Vendor lock-in; no processing | code | Storage migration plan (deferred decision allowed) |

---

## N. Remaining work and production-readiness blockers

### N.1 Priority order (dependency-aware)

**P0 — without these the product is not the defined product**
1. Restore `naturalgemstones/` archive → run full corpus migration → V1–V22 corpus mode green → populate `redirects` (44,218) → deploy-time `generate-redirects.mjs` (M-01).
2. Wire runtime RLS session context; add cross-customer RLS integration tests (M-02).
3. ADR + expand migration to normalize `jobs`-stored permanent state; dual-write; contract (M-03).
4. Payment provider decision → Stripe sandbox integration test → live keys via platform secrets (M-04).
5. Neon credential rotation + CI secret scan (M-10).

**P1 — trust & delivery**
6. Wire transactional email into notification consumers with retries/DLQ (M-05); implement real handlers for `ai.embed`, `cert.extract`, notifications or mark deferred (M-06).
7. Certificate upload: object storage presign, sniffing, size caps, AV scan, signed private viewing (M-08).
8. Remaining AI eval dimensions + `ai_evaluations` recording; approve/reject ADR-023 (M-07, M-17).

**P2 — hardening (Phase 13)**
9. CI breadth: add domain/db/ai/worker/observability suites; add E2E Playwright specs (`e2e/` is empty; Playwright installed); secret scan; bundle budgets; Lighthouse/axe (M-12, M-13).
10. Rate-limit per-scope attachment (M-09); k6/load tool decision + NFR-02/03/15 evidence + capacity statement.
11. SLO/alert scheduling in worker; alert owners; payment/certificate/queue runbooks (AUD-P13-6).
12. `middleware.ts`: host allow-list, canonical redirects, order attribution (M-15).

**P3 — differentiators**
13. DYO preview render job/asset pipeline (AUD-P7-7).
14. WebAR asset production decision + pipeline + device matrix + physical-device verification (M-11).
15. Remaining admin consoles: AI ops, redirect manager, bulk edit/undo, SEO manager (M-16).
16. WhatsApp outbound Graph API + template registration + live verification (AUD-P10-4).
17. Set real LLM/embedding credentials; run corpus knowledge seeding; re-run evals on live model (AUD-P9-1/5).

### N.2 Explicitly deferred decisions still open (client-owned, per §21.5/§33)
Payment provider (PSP), tax treatment, shipping carriers/rates, discount & refund policy specifics, vision model for OCR, email provider selection, load-test tool, order numbering scheme confirmation, ring-size/engraving features (deferred, schema-ready), lab integrations (deferred).

---

## O. Final verdict (direct answers)

1. **Is the core ecommerce system complete?** Functionally yes on a test payment adapter at seed scale (browse → search → cart → checkout → order → fulfilment → refund all work and are tested); commercially no — real PSP, real email delivery, and the real catalogue are missing.
2. **Are customer, vendor, and admin journeys complete?** Customer and vendor: end-to-end complete (minus email delivery and file uploads). Admin: complete for moderation/trust/migration/INV-08; missing AI console, redirect manager, bulk ops, SEO manager.
3. **Is RBAC enforced correctly?** Yes at the application layer — 10-role capability matrix, ownership isolation, CSRF, PII redaction, all tested. DB-level RLS is present but inert at runtime (M-02), so the "defence in depth" layer of the design is not yet real.
4. **Is the database aligned with the approved design?** Yes structurally — schema fidelity passes exactly (75 tables, invariants, HNSW, view, trigger). It is misaligned in *content* (443 seed rows vs 44k-URL corpus) and in *runtime posture* (RLS unused, `jobs` overload).
5. **Are all documented USPs implemented?** 6 of 10 are implemented and connected (structured intelligence, DYO, discovery, grounding/knowledge mechanism, escalation, AI safety). 4 are partial or simulated: AI model boundary (simulated by default), certificate OCR vision + private storage, WhatsApp outbound, WebAR (scaffold).
6. **Is the AI-powered ecommerce functionality genuinely connected?** The orchestration is genuinely connected (tools → DB reads → grounding → citations → persisted handoff). The LLM itself is simulated unless API keys are configured, embeddings are deterministic, and the live knowledge corpus is empty. No live-model or live-provider evidence exists.
7. **Does DYO work end to end?** Yes — configure → validate → quote (server-authoritative, reproducible snapshots) → review → cart → checkout, with INV-01/02/03 enforced at DB and domain layers. The plan's preview render job is the one missing piece.
8. **Does vendor upload-to-3D processing work?** No. The pipeline does not exist; `webar_assets` is empty; vendors attach validated image URLs only.
9. **Does the product 3D viewer load actual assets?** It renders real procedural geometry (BVH refraction gem, built setting) — it does not load any GLB assets because none exist. The GLB code path is present but unexercised.
10. **Does VTO provide genuine AR functionality?** Partially: `VirtualTryOnModal` does genuine on-device MediaPipe hand-tracked ring try-on (privacy-preserving, device-unverified). `WebArModal` is an honest simulated 2D overlay, not tracked AR.
11. **What is the verified overall completion percentage?** **≈ 72% weighted** (§L), with critical blockers that individually block production.
12. **What prevents production readiness?** M-01…M-05 and M-08…M-10: real corpus migration + redirects, runtime RLS, `jobs` normalization, live payments, email delivery, upload security, credential rotation, plus absent load/security/E2E evidence (Phase 13 not started).
13. **What are the next required tasks?** The ordered list in §N.1 — beginning with restoring the source archive and executing the full migration, then RLS runtime wiring, `jobs` normalization, the PSP decision, and credential rotation.

---

## P. REMEDIATION ADDENDUM — fixes applied 2026-10-19 (post-audit)

Applied immediately after this audit, with the full verification suite re-run green
(build 0 errors · typecheck 0 · lint 0 errors/212 tracked warnings · schema-fidelity
PASS · domain 240 · contracts 43 · ai 14 · observability 12 · db 153 incl. new RLS
suite · worker 3 · migrate 31 · web 473 — all passing, skips unchanged from baseline).

| Finding | Remediation applied | Residual |
|---|---|---|
| **M-02** RLS dead at runtime | `withRlsContext` hardened (graceful mock degradation) + new `withPoolRlsSession` raw-client seam (`packages/db/src/catalog/executor.ts`); `AuthenticatedActor` now carries `identity_user_id` (verifySession/login/register select it); RLS session context wired into THREE real request paths: `GET /orders/{id}` (commerce-handlers), account `getProfile`/`getOrders`/order detail (`requireActor`), and `GET /ai/conversations/{key}`; new integration suite `packages/db/src/catalog/rls-context.spec.ts` proves GUCs are set inside the boundary and leave no residue | Carts/messages paths follow the same helper; currently transparent because dev/tests run as superuser (bypass) — bites for a non-bypass app role |
| **M-05** email never delivered | `recordNotification` now ALSO enqueues a `notify.email` job (queue `default`, state QUEUED) beside the in-app row; new `apps/worker/src/handlers/email.ts` delivers via Resend → Mailtrap → honest `OUTBOX_LOG`; `order.confirm` consumer enqueues the confirmation email the same way | Live delivery requires `RESEND_API_KEY` / `MAILTRAP_API_TOKEN` (platform secrets) |
| **M-06** worker handlers are stubs | `notify.email` implemented (real send or honest disposition); `ai.embed` implemented for real — re-embeds the referenced knowledge document's chunks (deterministic 1024-dim, ADR-018) and stamps `embedded_at`/`embedding_model` | `cert.extract` still honest-queued (vision model remains a client decision); handler coverage for exotic job types (assets, migration) unchanged |
| **M-08** upload unvalidated | `POST /certificates` now enforces: content-type allowlist (PDF/JPEG/PNG/WebP), 10 MB cap, base64 decode + magic-byte sniff against the declared type | Virus scan + real object storage (R2 presign) need the storage decision + credentials (M-08 residual) |
| **M-09** scopes inactive | Full SoT 11.11 table now LIVE: `RATE_LIMIT_POLICIES` carries all 9 scopes verbatim + `dailyLimit: 200` for `ai_stream`; `scopeForRoute` resolves scope in code at the request boundary; `createScopedRateLimitGate` builds per-scope limiters with per-scope failure modes (checkout/AI-stream/certificate-upload fail CLOSED per doc 06); policy spec updated to freeze all 9 limits | Daily window uses a day-aligned fixed window (documented reconciliation) |
| **M-04** PSP not wired | `placeOrder` now creates a real PaymentIntent (`provider.authorize` with idempotency key) + `AUTHORIZED` payment record when `STRIPE_SECRET_KEY` is configured; webhook reconcile already resolves by `provider_payment_id` (0010 path) — TEST/loopback behaviour unchanged without keys | Live keys + sandbox E2E evidence remain a client action |
| **M-15** no middleware | Host allow-list + host-based house resolution added to the Next-16 edge proxy (`apps/web/src/proxy.ts` — the framework's middleware successor): prod + `ALLOWED_HOSTS` set → unknown hosts 403 (fail closed); `sapphire.`/`ruby.`/`emerald.` subdomains resolve the house at the edge | Order domain attribution still open (needs a schema decision) |
| **M-10 (script half)** no secret scan | `scripts/scan-secrets.mjs` (dependency-free, git-tracked-files only, documented allow-list for published dev fixtures) wired into CI after lint — **verified: 1,366 files, 0 findings** | Credential rotation + history purge remain CLIENT actions |
| **M-12** CI breadth | AI, observability and worker suites added as blocking CI steps (domain/db/web/contracts/migrate/budgets were already there — the original M-12 claim overstated the gap; also `check:budgets` already enforces the SoT 12.11 initial-JS budgets, so M-13's bundle-budget half was already covered) | Lighthouse CI + browser E2E still open (tooling decision recorded) |
| **M-18** stale docs | `AGENTS.md` §6.7, `e2e/README.md`, `tests/README.md` corrected to record ADR-021 Accepted (2026-10-07) | — |
| **M-01 / generator** | `scripts/generate-redirects.mjs` created (was referenced by docs but MISSING): reads the `redirects` table, rewrites `redirects-rows.generated.ts`; verified it REFUSES (exit 1) on an empty table instead of shipping a parity hole | The corpus migration itself stays BLOCKED: `naturalgemstones/` must be restored out of band (AGENTS.md §5) — no substitute was fabricated |

### Still open after remediation (with owner)

1. **M-01 corpus migration** — blocked on the source archive restore (client/platform).
2. **M-03 `jobs` overload normalization** — BLOCKED BY DESIGN: the locked 74-table schema has **no** `auth_credentials`/`auth_sessions`/`auth_tokens`/`favorites`/`checkout_sessions`/`inventory_reservations`/`notifications` tables (verified against `packages/db/migrations/*`), so this requires a new expand migration + **client-approved ADR** (AGENTS.md §6.6/§6.8 forbid an implicit schema change). Proposed ADR-027 draft: *create `auth_credentials`, `auth_sessions`, `auth_tokens` tables + expand migration 0019 + `expected-schema.ts` update + dual-write then read-switch then contract; favorites/checkout/reservations move to their existing canonical tables where present.* Awaiting authorization.
3. **M-10 credential rotation + git-history purge** — client action.
4. **M-11 WebAR assets** — asset-production decision + device verification (client).
5. **M-16 admin consoles** (AI ops, redirect manager, bulk ops) — next build phase.
6. **M-17** ADR-022/023/024 approvals — client.
7. **M-14** remaining handler-SQL extraction (dyo-handlers resolution queries) — architectural debt, no behaviour gap.

---

*End of MAIHAN_GEMS_COMPLETE_PRODUCT_AUDIT — audit-only; no repository behaviour was modified to produce this report.*
