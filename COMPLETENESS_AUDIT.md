# COMPLETENESS AUDIT — Maihan-Gems

**Audit date:** 2026-10-16
**Audited commit:** `5fdaa19` — *fix(dyo): bind cart and order pricing to selected quote*
**Branch:** `develop`
**Method:** Direct read of source (519 TS files, ~77,400 LOC), 20 SQL migrations, 108 test files, all root/technical design docs, git history (156+ commits). Four parallel deep-audit passes (frontend, database, security re-verification, blind-spot analysis) plus manual verification of every critical claim. All file:line citations were verified against HEAD.

**Previous audit:** An earlier full-repository audit (HEAD `7b9be2c`, 2026-10-13) identified critical findings; this audit re-verifies each one and marks it FIXED / PARTIAL / NOT FIXED.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Delta since previous audit](#2-delta-since-previous-audit)
3. [Completeness scorecard](#3-completeness-scorecard)
4. [Core findings & gap analysis](#4-core-findings--gap-analysis)
5. [Unaddressed blind spots](#5-unaddressed-blind-spots)
6. [Prioritized action plan](#6-prioritized-action-plan)
7. [Verification log](#7-verification-log)

---

## 1. Executive summary

The project is a genuinely impressive, discipline-heavy build: the locked 74-table
schema is complete and CI-asserted, the migration tooling complies with every
documented discipline, the domain layer is pure and tested, and the DYO
quote→cart→order money path is now transactional and integration-tested against
real Postgres.

But the repository is **not production-ready (~58% complete)**. The deepest
problems are untouched:

- **Zero authentication anywhere.** Customer identity is a spoofable header;
  admin identity defaults to `ADMIN_SUPER`; orders, refunds, certificates and
  AI conversations are publicly callable by ID.
- **The background-job plane does not exist.** `apps/worker` is an empty
  skeleton; the outbox is write-only; nothing schedules reservation expiry,
  webhook retries, or session cleanup.
- **A live Neon database password remains committed to git history.**
- **The app pool hardcodes `ssl: false`** and cannot reach Neon at all, while
  the storefront silently renders an empty catalogue on DB failure.
- **Fabrication persists in the customer-facing DYO configurator** — the exact
  failure mode the project charter (INV-07, "refuse rather than guess") was
  written to prevent.

---

## 2. Delta since previous audit

30 new commits between `7b9be2c` and `5fdaa19`. What the team **fixed**:

| Prior finding | Status now | Evidence |
|---|---|---|
| 31 TypeScript errors (`pnpm run typecheck`) | **FIXED** — 0 errors | full typecheck green at HEAD |
| 22 failing web tests | **IMPROVED** — 13 failing (448 passing / 21 skipped) | `npx vitest run` in `apps/web` |
| Random-product DYO add-to-cart (`SELECT id FROM products … LIMIT 1`) | **FIXED** — add-to-cart now upserts a real `CONFIGURED` product bound to the price snapshot | `dyo-repository.ts:384-410`, `dyo-handlers.ts:179-184` |
| Hardcoded COMPATIBLE + $3,200 AI quote | **FIXED (code), PARTIAL (honesty)** — reads real columns and refuses UNKNOWN evidence, but still serves `INFERRED` prices as `isLiveQuote: true` confidence 1.0 | `ai-handlers.ts:101-214`; `dyo-pricing-tools.ts:108,116` |
| Fake WebAR sine-wave tracking + third-party QR service | **FIXED** — honest no-op loop, internal `/api/v1/ar/handoff` QR tokens, real MediaPipe landmarks, real GLB loading with honest failure | `WebArModal.tsx:137-143,380`; `api.qrserver.com`: 0 hits repo-wide |
| `DyoReviewActions` navigating on API error | **FIXED** — errors surfaced, navigation only on success, stale quote invalidated on 409/422 | `DyoReviewActions.tsx:61-75` |
| DYO quote→cart→order pricing | **FIXED & VERIFIED** — transactional, `FOR UPDATE` locked, snapshot-verified, quote consumed once; **a live-Postgres integration test passes** (cart's 4700.00 snapshot frozen, newer 9200.00 quote ignored) | `dyo-repository.ts:310-436`; `order-repository.integration.spec.ts` |
| New dependency without ADR | **FIXED** — `three-mesh-bvh@0.8.3` properly recorded as ADR-026 (Accepted, 2026-10-13) | `technical_design/40:322-334` |

What **remained open** (carried into §4 below): the git-tracked Neon password,
`x-customer-id` spoofing, refund/certificate/order authorization gaps, hardcoded
WhatsApp/payment secrets, the fabricated DYO review page and configurator
catalogue, float money in `pricing-calculator.ts`, the per-request pool leak in
`dyo-server.ts`, the `0.88 as similarity` AI fabrication, and un-wired AI
mutating-tool stubs.

---

## 3. Completeness scorecard

| Module | Completeness | Notes |
|---|---:|---|
| **Database schema (locked 74-table)** | **100%** | Asserted by CI with exact names/definitions; fresh-DB fidelity gate; INV-01/02/03 as real CHECKs |
| **Migration tooling** (`tools/migrate`) | **95%** | 14/15 stages implemented; full V1–V22 discipline incl. V17 idempotency digest; only `knowledge-embeddings` declared |
| **Domain layer** (`packages/domain`) | **95%** | Pure (zero runtime deps, enforced by spec), tested, correct invariants; 1 float-money path remains |
| **Contracts + OpenAPI** | **90%** | `openapi.json` regenerates byte-identical; WhatsApp `.passthrough()` undocumented |
| **Frontend — catalog read side** | **85%** | Real data, cached service, JSON-LD; missing robots.txt, soft-404s |
| **Frontend — media pipeline** (Cloudinary/NGC) | **60%** | Deterministic ID derivation; no `next/image`; fallback hotlinks source site; compile-time remote dependency |
| **Frontend — 3D/WebAR** | **55%** | BVH shader well-bounded; WebGL2 fallback broken on main canvas; GPU texture leak; unbudgeted bundles |
| **Frontend — commerce UI** | **25%** | Checkout = 3 static pages; account/admin render `null`; no session anywhere |
| **DYO configurator** | **55%** | Quote→cart→order chain real and tested; **configurator catalogue is a hardcoded fabrication**; review page still invents stones/prices |
| **Backend API — contract/validation** | **85%** | 143 routes, strict zod on catalog paths, closed envelopes; newer handler families bypass validation |
| **Backend API — authn/authz** | **10%** | No sessions exist; `x-customer-id` / `x-admin-sub` client-asserted; refunds/certificates/orders publicly callable |
| **Backend — background jobs / worker** | **0%** | `apps/worker/src/index.ts` = `export {}`. Outbox write-only; no dispatch, sweeps, or retries |
| **AI package** | **70%** | 4-layer mutation prohibition structurally holds; LLM never called; 2 sanctioned mutating tools are stubs |
| **Payments** | **20%** | Test-only provider; no tax, FX job, SCA/3DS, or fraud |
| **Observability** | **Libraries 90% / Wiring 15%** | SLOs never evaluated; alerts go nowhere; Sentry stub |
| **CI/CD** | **60%** | Lint+build+schema-fidelity+tests exist; **currently red**; `develop` ungated |
| **Documentation** | **70%** | Voluminous and often excellent; internally contradictory on status |
| **Compliance** (email, consent, GDPR, sanctions/KYC) | **0%** | Nothing exists |
| **OVERALL** | **~58%** | **Production-ready: NO.** "Well-built demo with a real data core." |

---

## 4. Core findings & gap analysis

### 4.1 CRITICAL

| # | Finding | Evidence |
|---|---|---|
| **C1** | **Live Neon password still committed & tracked in git.** `npg_xjMsC5QTt7gc` at `freebuff-chat-2026-10-12T07-19-30.094Z.md:1788` and `:4260`. Memory claims "Secret hygiene PASS — 0 credential hits" while the file sits in the repo. Rotation status UNKNOWN. Violates AGENTS.md prohibition #9 | `git ls-files` confirms tracked; `.gitignore` covers `.env` only |
| **C2** | **Zero authentication in the entire system.** Customer identity = spoofable `x-customer-id` header (`account-handlers.ts:39`, `favorites-handlers.ts:33`); admin identity = `x-admin-sub` header **defaulting to `ADMIN_SUPER`** (`packages/contracts/src/dto/admin/actor.ts:71,79`). Order read/cancel by bare UUID (IDOR — `commerce-handlers.ts:205-240`). Refund approve/execute publicly callable with `approved_by` from body (`refund-handlers.ts:72-110`). Certificate review flips `VERIFIED` from any caller (`certificate-handlers.ts:205,262`). **New:** AI conversation IDOR — anyone can read/append to any conversation (`ai-handlers.ts:402-419`) | Repo-wide grep for session/jwt/cookie auth: **0 hits** |
| **C3** | **The background-job plane does not exist.** Worker is `export {}` (`apps/worker/src/index.ts:29`). `domain_events` outbox is write-only — no dispatcher, no consumer, no `event_consumers` writer. Reservation TTL sweep exists only as an **unauthenticated manual HTTP endpoint** (`routes.ts:93-94`). Webhook reconciliation failures stored with `processing_error` and **never retried** (`webhook-reconciliation.ts:114-153`). Paid orders can sit stuck in `PENDING_PAYMENT`; expired reservations hold stock forever | Verified by direct read |
| **C4** | **App pool cannot reach Neon and masks misconfiguration.** `packages/db/src/pool.ts:26` hardcodes `ssl: false`, overriding `sslmode=require`. `storefront-data.ts:21-27` silently falls back to a hardcoded localhost URL and `withCatalogue` swallows DB failure into empty-catalogue rendering — a production outage renders as a plausible-but-empty storefront | Verified by direct read |
| **C5** | **Money-path header/line divergence at order placement.** `placeOrder` stores header totals verbatim from the checkout-session snapshot (`order-repository.ts:256-262`) while line items re-price from the *current* cart (`:207,397-398`); no checkpoint re-reads the cart after session creation (`checkout-session-repository.ts:161-248` never invalidates). Webhook reconciliation charges against the possibly stale header (`webhook-reconciliation.ts:144`) | The per-line snapshot binding from `5fdaa19` does not close this |
| **C6** | **Fabricated DYO catalog — the largest remaining fabrication surface.** `DyoConfigurator.tsx:49-159` hardcodes 4 settings ($110k–$185k), 5 metals, 6 gems with invented origins/prices. Review page fabricates gem refs `PR5681`/`K1324`, "Ratnapura, Sri Lanka", "Standard Traditional Heat Only", "Certified Natural Mineral" with no certificate check — **while presenting a "Verification Ledger" and "Authoritative Pricing Snapshot"** (`design-your-own/review/[configurationCode]/page.tsx:44-55,126,130,192`). `dyo-server.ts` swallow-to-null catch (`:46-49`) makes the fake fallback page reachable | `dyo-flow.spec.tsx:88-114` actually **codifies** the fabrication |
| **C7** | **CI is red and `develop` is ungated.** 13 failing tests = route-manifest drift: manifest requires 12 missing `[varietySlug]-pairs/-rings` files (deleted in `082b39b`, manifest never updated); disk has 11 strays including the **new NGC PDP `[varietySlug]/[productSlug]/page.tsx` never registered**. CI triggers only on `main`+PRs (`ci.yml:21-24`) — direct pushes to the active branch run zero checks | Verified: `ls` shows the page exists; `route-manifest.ts:81-115` |

### 4.2 HIGH

| # | Finding | Evidence |
|---|---|---|
| **H1** | **Hardcoded secrets unchanged.** WhatsApp `WHATSAPP_APP_SECRET_DEFAULT = 'maihan_gems_wa_app_secret_test_token'` (anyone can forge signed webhooks), `test_webhook_secret_key_123` payment default, `NEXT_PUBLIC_DATABASE_URL` + new `NEXT_PUBLIC_CLOUDINARY_URL` fallbacks (browser-inlined) | `whatsapp-handlers.ts:33-34`; `test-payment-provider.ts:29`; `lib/db.ts:7`; `media.ts:10` |
| **H2** | **Public full-certificate read.** `getCertificateHandler` serves any certificate by ID, unfiltered by INV-07, contradicting "certificates are private, short-lived signed URLs only". Gallery renders `certificate`/`appraisal` images as public `<img>`s | `certificate-handlers.ts:95-112`; `ProductStudio.tsx:419-431` |
| **H3** | **Raw scraped HTML into `dangerouslySetInnerHTML` with no sanitization.** 334 records verified clean *today*; nothing enforces tomorrow | `ProductStudio.tsx:415` |
| **H4** | **Unauthenticated mutating surfaces.** `POST /inventory/sweep-expired` (force-releases reservations), `POST /whatsapp/send-template` (arbitrary numbers, fabricated `wamid` provider ID), `POST /ar/handoff` token minting | `routes.ts:93-94,150-161`; `whatsapp-handlers.ts:258` |
| **H5** | **3D canvas failure modes.** WebGL2 fallback broken on the primary canvas (unhandled throw → silent blank panel); `MeshBVHUniformStruct` GPU textures leak on every mount/unmount; full context rebuild on metal toggle; `autoRotate` ignores `prefers-reduced-motion` | `JewelryConfiguratorCanvas.tsx:60,243-258,266`; `gem-refraction.ts:76-77` |
| **H6** | **New NGC PDP route unbudgeted.** It carries 3D + try-on client trees but `performance-budgets.json` measures only the old PDP route; no production build verification exists | `performance-budgets.json` covers 2 routes |
| **H7** | **Payments are a test adapter.** Auto-capture, no 3DS/SCA, no fraud/velocity, tax is a regex DTO field, FX static seed with no refresh job — behind checkout pages claiming "PCI-DSS Level 1" and "custodial escrow" | `test-payment-provider.ts:32-65`; `secure-payment/page.tsx:50-68` |
| **H8** | **No email, consent, or compliance layer.** Zero transactional email, no cookie consent (targeting AED/THB markets), no sanctions/KYC hooks for high-value gem trade | Grep: only `mailto:` links |
| **H9** | **34 MB of verbatim third-party product copy committed** at `docs/research/ngc/` — IP exposure and a violation of the project's own "source data out of Git" evidence discipline | `docs/research/ngc/products.json:13213+` |

### 4.3 MEDIUM

- **Observability unwired:** SLO evaluator has no runtime caller; `@maihan/observability` imported in 3 places; Sentry stub with no DSN; runbooks RB-01–06 exist but no alert routing.
- **DB growth unbounded:** no retention/pruning for `domain_events`, `webhook_receipts`, `audit_logs`, expired carts/sessions; embeddings and search vectors grow forever.
- **Two module-level pools per Next process** (max 10 each) → 20+ connections/instance; no pooled-vs-direct endpoint discipline; no Neon cold-start retry.
- **Client-only filter state** on collections — no URL state (refresh/back/share lose filters), unlike DyoStudio which syncs via `history.replaceState`.
- **Media fallback hotlinks** `naturalgemstones.com` / `images.thenaturalsapphirecompany.com` from the browser on Cloudinary 404 — copyright, availability, and LCP risk; empty state is a silent `aria-hidden` grey box; **no telemetry on fallback hits**.
- **Non-hermetic build:** compiling the catalog fetches a remote Cloudinary manifest (`compile-ngc-catalog.mjs:10`).
- **Paid Cloudinary AI op** (`e_background_removal`) injected into every catalogue-card and PDP image URL — cost multiplier.
- **N+1s / partial merges:** `mergeGuestCart` serialized per-item, non-transactional (`cart-repository.ts:514-539`); `getCustomerOrders` N+1; header fetches all stone types then discards.
- **A11y:** mega-menu hover-only (no keyboard/`aria-expanded`); 4 modals with `aria-modal` but no focus trap/restore; 3D canvas keyboard-inoperable; currency switcher invalid listbox DOM; PDP videos uncaptioned.
- **`DyoConfigurator` error path** still navigates to a fabricated review URL on API failure; `submitError` dead state (only `DyoReviewActions` was fixed).
- **AI honesty leftovers:** `0.88 as similarity` fabricated (`ai-handlers.ts:90`); AI price gate accepts `INFERRED` evidence then stamps `isLiveQuote: true` / confidence 1.0 (canonical path requires OBSERVED/VERIFIED — inconsistent gates, `dyo-repository.ts:232,250` vs `dyo-pricing-tools.ts:108`); `req_`/`hnd_` IDs fabricated without persistence (`ai-handlers.ts:239-246`); telemetry records `gemini-1.5-pro` calls that never happen (`ai-handlers.ts:337-339`); `assertStructuralMutationSafety()` runs only in tests, never at boot.
- **Float money** survives in `pricing-calculator.ts:68-73` (mitigated by per-component rounding; the only non-cents path feeding `dyo_price_snapshots`) and `currency.ts:34` display math.
- **One broken DYO cart line bricks the whole cart read** — `resolveAuthoritativeUnitPrice` throws for any configured item with a missing snapshot join (`cart-repository.ts:81-88`).
- **Backup/DR:** no PITR runbook, no rehearsed restore (DoD item unchecked, `technical_design/38:107`); load testing zero; Playwright accepted, never installed.
- **Validation bypass in newer handlers:** `dyo-handlers.ts:44-86` and `certificate-handlers.ts:53-93` parse raw body with `as any` instead of the strict zod `query.ts` pipeline (webar-handlers is the good exception).
- **Health endpoints:** `/health/metrics` public and unauthenticated; `healthReadyHandler` leaks raw `err.message` (`health-handlers.ts:70,108-128`).

### 4.4 LOW

- `robots.txt` absent; no OG/Twitter cards; no hreflang; sitemap submits 3 null-rendering pages (`/blog`, `/financing`, `/protection-plan`); dual product routes (`/products/[slug]` vs `/product/[slug]`) uncannonicalized.
- Graceful shutdown doesn't drain idle connections (`server.ts:162-166`).
- Dead code: `NGC_STONE_TILES`, `gemAttenuationHex`, Agentation null stub + `nextjs-portal { display:none }` CSS that hides dev errors in production, `temp-seed.sql` at repo root, unreachable sister-branch in `[varietySlug]/page.tsx:33-35`.
- `dyo-*` product upsert doesn't refresh `price_amount` on conflict (`dyo-repository.ts:396-398`) — snapshot-bound money is safe; public PDP display can drift.
- Concurrent same-`idempotency_key` placeOrder dies as raw 23505 instead of replaying (no double charge; ugly 500).
- CI-side: DB-gated suites (49 db + 11 migrate + 21 web) silently skip without Postgres — the most security-sensitive SQL is exactly what's untested in default runs.

---

## 5. Unaddressed blind spots

Risks **not documented or planned** anywhere in the repository:

1. **The "async reality" gap.** The architecture documents an outbox, event consumers, TTL sweeps, and retries (ADR-020, docs 26–27) — but no phase deliverable has ever forced their implementation, and nothing schedules anything. Every operational behavior that matters (reservation expiry, webhook retry, session cleanup, email, FX refresh, SLO evaluation) silently depends on this nonexistent plane. **The single largest unplanned gap.**
2. **Silent-degradation inversion.** The code fails *open* exactly where it should fail closed: DB down → empty storefront (`withCatalogue`), missing price → `$0`, missing quote → `$0.00 isLiveQuote:true`, unknown stone image → blue sapphire photo, missing Cloudinary mapping → hotlink fallback, rate limiter down → allow. And fails *closed* where blast radius is worst: one broken cart line → entire cart 422. The charter says fail closed on money/trust, fail open only on cache — the code has it backwards in several places.
3. **Certificate privacy architecturally contradicted by the new media pipeline.** Locked design: private certificates, signed short-lived URLs, INV-07 read model. New reality: `galleryReports()` ships certificate/appraisal images as public `<img>`s and `getCertificateHandler` serves full documents publicly. Nobody planned the reconciliation.
4. **Test strategy measures the wrong pages.** Budgets, route manifests, and probe specs target the old DB-driven PDP while customer-facing weight moved to the NGC route. CI can be green while the real storefront regresses — and is currently red for structural reasons while `develop` runs ungated.
5. **Build hermeticity.** Compiling the catalog fetches a remote Cloudinary manifest; media resolution depends on third-party uptime at runtime; MediaPipe WASM loads from jsdelivr/Google storage with no SRI or offline fallback.
6. **Compliance for the actual market.** Currency auto-switching to AED/THB implies AE/TH customers; there is no consent layer, no statutory retention decision (explicitly open per CURRENT_STATE §7), no export/sanctions screening, no KYC threshold for high-value orders — and nothing in the plan assigns these.
7. **Ops economics.** Paid Cloudinary background-removal on every image, unbounded embeddings/audit growth, no cost/quota alerting — the running-cost failure mode isn't in any runbook.
8. **Sessionless high-value cart risk.** Guest carts are token-in-localStorage with no identity binding; for five-figure orders, cross-device cart abandonment (the QR handoff flow exists for AR but not for carts) and lost carts are a revenue-architecture gap, not just a feature.

---

## 6. Prioritized action plan

### Sprint 0 — Stop the bleeding (days)
1. **Rotate the Neon credential** (Neon console) and **purge `freebuff-chat-*.md` from git history** (`git filter-repo`); add chat exports to `.gitignore`; add `gitleaks` to CI.
2. **Un-red CI:** register the new NGC PDP in `route-manifest.ts` and restore or delete the `[varietySlug]-pairs`/`-rings` files (regenerate the manifest); add `develop` to `ci.yml` push triggers; make required checks blocking on `develop`.
3. **Delete the fail-open seams:** remove `NEXT_PUBLIC_DATABASE_URL` / `NEXT_PUBLIC_CLOUDINARY_URL` fallbacks; make `storefront-data` fail closed (503) in production; derive pool SSL from the URL.

### Sprint 1 — Trust boundary (1–2 weeks)
4. **Implement sessions:** signed httpOnly cookie (customer) + real IdP/OIDC for admin; wire `resolveCustomer` / `resolveAdminActor` to verified identity; **remove `x-customer-id` / `x-admin-sub` trust**; delete the `ADMIN_SUPER` default fallback; make `allowRoleHeader` impossible in production.
5. **Apply ownership predicates** to orders, refunds (approve/execute → admin-only), certificates (read = INV-07-filtered + private; review/OCR = admin-only), AI conversations; require an internal token on `sweep-expired` and `send-template`.

### Sprint 2 — The async plane (2–3 weeks)
6. **Build the worker:** outbox dispatcher (PENDING→PUBLISHED, backoff, dead-letter), `event_consumers` idempotency, scheduled sweeps (reservation TTL, checkout-session expiry, webhook receipt retry, stale-cart GC) — cron-triggered, idempotent, behind the internal token. This unblocks email, FX refresh, and SLO evaluation.
7. **Close the money gap:** revalidate header totals against re-priced cart lines at `submitConfirm` and `placeOrder` (invalidate the session on cart mutation); wrap order/refund/webhook mutation sets in transactions with `WHERE version = $n` guards; fix the refund TOCTOU.

### Sprint 3 — Honesty & fabrication purge (1–2 weeks)
8. **Kill the DYO fabrications:** make `DyoConfigurator` load real settings/metals/gems from the API (the DB path is honest — the UI catalogue is not); rewrite the review page from DB data only; delete the invented "Verification Ledger" / "Certified" claims; fix `dyo-server` to fail loudly instead of `return null`.
9. **Finish AI honesty:** real trigram score or refusal instead of `0.88`; align the AI price gate to OBSERVED/VERIFIED; persist `create_customer_request` / `transfer_to_human` or refuse; stop recording telemetry for LLM calls that never happen; call `assertStructuralMutationSafety()` at boot.

### Sprint 4 — Production hardening (2–4 weeks, per phase)
10. **Payments:** resolve the provider ADR → integrate with SCA/3DS, tax ADR, FX refresh job, fraud/velocity checks; remove "PCI-DSS Level 1" claims until true.
11. **Compliance:** transactional email ADR + order/reservation lifecycle emails (natural consumers of the outbox); cookie consent; document sanctions/KYC stance and statutory retention.
12. **Media & frontend:** `next/image` + `remotePatterns`; budget the NGC PDP route; drop background-removal from card images; replace NGC hotlink fallback with a neutral placeholder; sanitize scraped HTML at compile time; fix WebGL2 fallback, BVH texture disposal, reduced-motion.
13. **Ops:** wire per-request metrics, schedule SLO evaluation, provision Sentry DSN + OTel collector, add `robots.ts` + OG/Twitter metadata, retention/pruning jobs, a backup/PITR runbook with one rehearsed restore, and Playwright smoke on browse→checkout once sessions exist.

**Estimated total to production-ready: 8–12 focused weeks.** Sprints 0–2 are non-negotiable before any real traffic; the compliance track (Sprint 4.11) is a legal prerequisite for the AE/TH markets the currency switcher already targets.

---

## 7. Verification log

Commands actually executed during this audit (not claimed from memory):

| Check | Result |
|---|---|
| `pnpm run typecheck` | **0 errors** (was 31) |
| `npx vitest run` (`apps/web`) | 13 failed / 448 passed / 21 skipped |
| `pnpm -r run test` (domain, db, contracts, ai, observability, migrate) | 419 passed / 71 skipped / 0 failed |
| `git ls-files \| grep freebuff` | 1 — transcript still tracked |
| `grep npg_` across tracked files | Password present in `freebuff-chat-*.md:1788,4260` only |
| `apps/worker/src/index.ts` | `export {}` — empty skeleton confirmed |
| `packages/db/src/pool.ts:26` | `ssl: false` hardcoded confirmed |
| `.github/workflows/ci.yml` triggers | `main` + PRs only; `develop` ungated confirmed |
| Live-DB DYO integration test (compose Postgres, migrate + seed) | 1 passed — order binds cart quote, not newer quote |
| `openapi.json` regeneration | byte-identical to committed artifact |
| Route-manifest delta | 12 missing files required; 11 strays incl. new NGC PDP page |

*Prepared by the repository audit session. Per AGENTS.md §13, no files were modified during the audit; this document is the sole artifact.*
