# MAIHAN GEMS — MASTER PHASE REPORT
## Audit Findings → 4 Remediation Phases: What Was Missing, What Is Done, What Is Pending

**Report date:** 2026-10-19 (Phase R1 build completed this session)
**Branch:** `qwen-code-7a7c5562-…` · **R1 commits:** `2a41141`, `95ab386`, `bd95ae5`
**Basis documents:** `AGENTS.md`, `INITIAL_IMPLEMENTATION_PLAN.md` (§19 Phase 12, §20 Phase 13), `COMPLETENESS_AUDIT.md`, `MAIHAN_GEMS_COMPLETE_PRODUCT_AUDIT.md`, `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md`, all 40 `technical_design/*.md`, `.opencode/memory/*`, `AUDIT_PHASE_PLAN.md`.

> Existing Global Task / phase numbering is preserved. These are **remediation phases R1–R4**; every finding keeps its original M-xx / F-xx / PB-x identifier. This file supersedes the earlier per-phase status notes and is the single master tracker for all four phases.

---

# 0. AT-A-GLANCE STATUS BOARD

| Phase | Scope | Status | Verification |
|---|---|---|---|
| **R1 — Security Fail-Closed + Governance** | R1-1 env-conditional security, R1-2 ADR-027, R1-3 vendor state out of `jobs`, R1-4 leaked creds | ✅ **COMPLETE** (code); ⚠️ 2 client/residual items | Build PASS · 897 tests green · lint 0 errors (run THIS session) |
| **R2 — Data Scale + Live Providers** | Corpus migration, Email key, Stripe sandbox, AI provider, WebAR assets | ⏸ **NOT STARTED — CLIENT-GATED** | Blocked on archive + secrets + devices |
| **R3 — Feature Completion** | Admin consoles, DYO render job, upload pipeline, 3D pipeline, multi-domain, blind-spot controls | ❌ **NOT STARTED** (1 item reclassified done) | Can start immediately after R2 data lands; several items independent |
| **R4 — Production Hardening (§20 Phase 13)** | E2E, load, security matrix, SLOs/alerts/runbooks, DR rehearsal, debt | ❌ **NOT STARTED** | Must run against post-R2 production-shaped data |

**Dependency order:** R1 → R2 → R3 → R4. **Production cutover allowed only after R4 is green** (plan §20 Definition of Done).

**Overall position:** ~68% implementation completeness entering R1 → R1 defects closed in code with fresh test evidence. The application remains a *functionally incomplete application* until R2–R4 land.

---

# 1. PHASE R1 — SECURITY FAIL-CLOSED + GOVERNANCE RECONCILIATION ✅ COMPLETE

**Started:** yes (previous session scaffold) · **Completed:** this session, commits `2a41141` → `bd95ae5`.
No external credentials were required by design.

## R1-1 — Fail-closed security mode (was PB-env / audit blind-spot #2) — DONE ✅

**What was missing (evidence):** Identity-header trust, header stripping, cookie flags, reset-token suppression and the edge host allow-list were each independently keyed on `process.env['MAIHAN_ENV'] === 'production'` in:
`apps/web/src/app/api/v1/[...path]/route.ts`, `account-handlers.ts:64,84`, `favorites-handlers.ts:47`, `commerce-handlers.ts:83`, `refund-handlers.ts:97,139`, `ai-handlers.ts:333,501`, `certificate-handlers.ts:55`, `admin/backoffice-handlers.ts:127`, `proxy.ts:85`.
A deployment that **forgot** to set `MAIHAN_ENV` silently behaved as dev: spoofable `x-customer-id` / `x-admin-*` headers honoured (IDOR + vertical privilege escalation), password-reset tokens leaking into API responses (`auth-repository.ts:904`), insecure cookies, disabled host allow-list. That is fail-**OPEN** on a missing variable — an AGENTS.md §10 violation.

**What was built:**
- **`packages/config/src/security-mode.ts`** — the single authority (placed in `@maihan/config`, the only package permitted to read `process.env` per `technical_design/01` line 56). Rules: secure by default; seam ONLY via explicit `MAIHAN_DEV_SEAM='1'` or `NODE_ENV=test|development`; `MAIHAN_ENV='production'` forces closed and can never force open. Exports `isDevSeamEnabled()`, `isFailClosedMode()`, `SPOOFABLE_IDENTITY_HEADERS`.
- Wired into **all** call sites listed above plus `admin-server.tsx`, `(storefront)/account/actions.ts`, and `proxy.ts` host allow-list (fail-closed when `ALLOWED_HOSTS` unset outside the seam).
- `apps/web/src/api/security-mode.ts` retained as a thin re-export for existing imports.
- **New tests:** `apps/web/src/api/security-mode.spec.ts` — 8 tests covering no-env ⇒ fail closed, `MAIHAN_ENV=production` overrides seam opt-in, explicit seam opens, `NODE_ENV=test|development` open the seam (integration suites keep working), non-`"1"` seam values rejected, header-set coverage.

**Verification (this session):** `pnpm run build` PASS; web suite **479 passed / 0 failed / 21 skipped**; full monorepo **897 passed / 0 failed / 85 skipped**; lint **0 errors**.

## R1-2 — ADR-027 governance reconciliation (was PB-2 / conflict C1) — DONE ✅

**What was missing:** `migrations/0019_jobs_normalization.sql:2` asserted "ADR-027 Accepted", but `technical_design/40` ended at ADR-026 and `.opencode/memory/DECISIONS.md` had no entry — an unratified schema expansion (drift-gate trust compromised).

**What was built:** ADR-027 formally recorded at `technical_design/40_ARCHITECTURE_DECISION_RECORDS.md:344` ("Normalize permanent state out of the jobs queue into real tables") restoring a monotonic registry matching the migration's long-standing citation, plus a DECISIONS.md row listing the normalized tables (`auth_*`, `favorites`, `checkout_sessions`, `inventory_reservations`, `notifications`, `vendor_onboarding`; migrations 0019+0020).

## R1-3 — Vendor permanent state out of the `jobs` queue (was M-03 residual) — DONE IN CODE ✅ / integration pending ⚠️

**What was missing:** Vendor onboarding profiles lived as rows in the 90-day-retention `jobs` table (`queue='vendors'`, `job_type='VENDOR_PROFILE'`) at `vendor-repository.ts:167,199,264,277,352`, `auth-repository.ts:426-460,657,756`, `dashboards-repository.ts:132-133` — violating doc 27 §1 (permanent state must not live in the jobs queue; retention sweep could destroy vendor records).

**What was built:**
- **`packages/db/migrations/0020_vendor_onboarding.sql`** — dedicated `vendor_onboarding` table (with unique owner index, idempotent backfill from legacy `jobs` rows).
- Repository cutover in `vendor-repository.ts`, `auth-repository.ts`, `dashboards-repository.ts` — reads/writes now target `vendor_onboarding`.
- `expected-schema.ts` updated (line 81 `'vendor_onboarding'`) so the schema-fidelity gate covers it.

**Pending (environment limit):** apply migration 0020 against a real PostgreSQL and run the DB integration suites (52 db + 11 migrate specs skip without Postgres here). Command: `docker compose up -d db && pnpm --filter @maihan/db run test:integration` (or equivalent approved branch).

## R1-4 — Leaked credentials in Git history (was M-10/PB-5) — CLIENT-OWNED ⚠️ (no agent action possible)

`freebuff-chat-*.md` files contain exposed Neon credentials in tracked history. Correctly excluded from agent scope (no history rewrite per instructions). **Client must:** rotate the credentials first; then decide whether to purge history (`git filter-repo`) — rotation makes purge optional-but-advisable. Tracked as an open blocker in this report until the client confirms rotation.

## Bonus finding during R1 verification — R3-6 item reclassified

Audit claimed "session revocation on password change: field exists, behaviour unproven." **Verified implemented:** `auth-repository.ts:956` calls `revokeAllUserSessions(db, payload.customer_id)` inside the password-change path; `auth_sessions.revoked_at` enforced at `:708` (`AND revoked_at IS NULL`). Removed from R3 backlog; add a targeted integration assertion in R4's security matrix instead.

## R1 exit criteria scorecard

| Criterion | Result |
|---|---|
| Headers always stripped server-side unless explicit seam | ✅ code + unit tests |
| Spoofed `x-customer-id` rejected with NO env set | ✅ `security-mode.spec.ts` |
| Tests green with no env configured | ✅ 897 passed / 0 failed |
| Migration authority string matches a findable ADR | ✅ doc 40 line 344 |
| No permanent vendor state readable only from `jobs` | ✅ code; ⚠️ live-DB check pending |
| Credential rotation | ⚠️ client action outstanding |

---

# 2. PHASE R2 — DATA SCALE + EXTERNAL PROVIDER CONNECTIONS ⏸ NOT STARTED (CLIENT-GATED)

**Status:** 0%. Every item requires a client-provided input (archive, secret, device, or approval). Nothing here was started because none of the gates are open. Code paths exist and are honest about their absence (e.g., email falls through to OUTBOX_LOG rather than faking delivery).

| ID | Finding (what is missing) | Evidence | Action when unblocked | Gate (who/what) |
|---|---|---|---|---|
| **R2-1** (PB-1/M-01) | Corpus never migrated: live DB has **443 products vs 44,218 source URLs**; `redirects` = 0 rows. Catalogue, SEO, search are seed-scale. | DB counts from prior measurement; `naturalgemstones/` absent from workspace (absence expected per AGENTS.md §5) | Restore archive out-of-band → run `tools/migrate` full corpus → corpus-mode gates → `scripts/generate-redirects.mjs` | **Client:** archive + approved DB branch |
| **R2-2** (PB-4/M-05 prod half) | Email code path real (`email-provider.ts`: Resend → Mailtrap → honest OUTBOX_LOG) but **no live key** ⇒ verification/recovery/order emails never actually send. Account recovery unusable in production. | No `RESEND_API_KEY`/`MAILTRAP_*` configured | Provision key; verify real delivery, bounces, suppression | **Client secret** |
| **R2-3** (PB-3/M-04) | Stripe wired conditionally on `STRIPE_SECRET_KEY`; webhook HMAC verified on raw body; **never exercised** against sandbox. Refund flow unverified externally. | `commerce-handlers.ts`, webhook route inspection | Sandbox E2E: PaymentIntent → webhook → reconcile; refunds; 3DS | **Client secret** |
| **R2-4** (AI boundary) | Model calls simulated (deterministic hash embeddings, mock transport). Tool registry + guardrails are real. | `packages/ai` inspection | Approve provider/model ADR (cost controls per ADR-003), wire live boundary behind flag | **Client decision + key** |
| **R2-5** (M-11/PB-9) | `webar_assets` empty; MediaPipe hand tracker real; WebArModal is a 2D overlay (simulated AR). No device evidence. | Table empty; modal code | Produce tracking assets; real-device compatibility matrix | **Physical devices + asset production** |

**Outcome when R2 completes:** catalogue at true scale with working redirects/SEO, real transactional email, real payment capture/refunds, live AI behind cost controls, and genuine AR content — converting the app from "test-adapter prototype" to a business-viable system. R3/R4 features should be tested against this production-shaped data, which is why R2 precedes them.

---

# 3. PHASE R3 — FEATURE COMPLETION ❌ NOT STARTED

**Status:** 0% (one former item moved to verified-complete — see R1 bonus). These are documented-behaviour gaps found in the traceability matrix; most need no external secrets and can begin immediately once R2-1 data lands (some, like R3-2/R3-6, can start today).

| ID | Finding (what is missing) | Source requirement | What must be built | Priority |
|---|---|---|---|---|
| **R3-1** (M-16) | Admin console gaps: **AI Ops** (conversation/tool-call audit, guardrail events, eval runs), **Redirect Manager** (bulk import UI for the 44,218 redirect rows), **Catalogue bulk edit with preview/undo**, **derived-reference approval queue** (221 pending). | Plan §19 Phase 12 tasks 3, 4, 6, 11, 13 | Build per §19 acceptance criteria incl. two-person rule on trust content | High |
| **R3-2** | DYO chain works (builder → validation → pricing → cart → order snapshot) but **preview render job missing**. | Doc 14 / §19 | Render job on `media` queue producing saved-design previews | Medium |
| **R3-3** | Vendor uploads are **URL-only**; no direct file upload, no AV scanning, presign gaps (SG-5/SG-6 violations). | Docs 24, 27; security matrix | Object-storage ADR + signed-upload pipeline + scan + provenance | High |
| **R3-4** | **3D asset pipeline absent**: viewer renders procedural geometry; no GLB/CAD ingest, Draco/KTX2 optimization, scale/orientation validation. | Docs 21, 24; distinguishing-sauce USP | Upload→validate→process→optimize→approve→publish pipeline | High (differentiator) |
| **R3-5** | Multi-domain at ~45%: order attribution incomplete; single `siteBaseUrl()` canonicals (wrong canonicals per brand domain); cross-domain cookie policy undocumented. | Docs 08, 29, 34 | Per-domain canonical generation, attribution wiring, cookie/allowed-host spec | High |
| **R3-6** | Blind-spot controls: **payment reconciliation sweeper** (dropped-webhook catch-up), **high-value order manual-review threshold**, **outbox growth sweep**. *(Session revocation on password change — originally listed here — verified already implemented; dropped.)* | Audit §10 recommendations | Implement + test each control | Medium |

**Outcome when R3 completes:** every documented Phase 12 admin capability present, the DYO/3D/AR differentiators backed by real pipelines, correct multi-brand SEO/attribution, and the ecommerce-integrity blind spots closed → app becomes *functionally complete but insufficiently verified*.

---

# 4. PHASE R4 — PRODUCTION HARDENING (§20 Phase 13) ❌ NOT STARTED

**Status:** 0%. Cannot meaningfully execute before R2 (real data/providers) and R3 (features) exist — testing seed-data mocks proves nothing about launch conditions.

| ID | Finding (what is missing) | Required work (per plan §20) | Dependency |
|---|---|---|---|
| **R4-1** | Playwright installed but **no browser E2E specs executed**. | Full E2E suite: register→verify→browse→cart→checkout→pay(sandbox)→order→return; vendor loop; admin moderation. Run against post-R2 data. | R2, R3 |
| **R4-2** | **No load tests** vs NFR-02/NFR-03 budgets. | k6 scenarios on catalogue/search/checkout at projected traffic; capacity statement produced. | R2-1 |
| **R4-3** | **Security matrix unexecuted.** | SG-1..SG-15 incl. IDOR sweeps, role-matrix penetration, CSRF/XSS/host-header checks, rate-limit probes, **non-superuser RLS integration tests** (PB-6), plus a regression assertion that password-change revokes sessions (moved from R3). | R1 (done) |
| **R4-4** | **No SLOs, alerting, runbooks, on-call story.** | Define SLOs; wire observability alerts; write operational runbooks. | R2 providers |
| **R4-5** | **Backup/restore never rehearsed.** | Documented DR runbook + executed restore rehearsal with evidence. | live DB |
| **R4-6** | Technical debt: 210 `no-explicit-any` lint warnings; handler-SQL layering violations; stale storefront status docs (46-route claim). | Debt burn-down + doc hygiene pass; keep CI at 0 errors throughout. | parallel |

**Outcome when R4 completes:** verified, observable, recoverable system meeting the plan's Phase 13 Definition of Done → **production-ready with evidence**, safe to schedule cutover.

---

# 5. CONSOLIDATED PENDING REGISTER (everything still open across all phases)

| # | Item | Phase | Owner | Severity |
|---|---|---|---|---|
| P-1 | Rotate leaked Neon credentials (+ optional history purge) | R1-4 | **CLIENT** | Critical |
| P-2 | Apply migration 0020 + run DB integration suites on real Postgres | R1 close-out | Agent (needs DB access) | High |
| P-3 | Restore `naturalgemstones/` archive; run full corpus migration + redirects | R2-1 | **CLIENT** then Agent | Critical |
| P-4 | Email provider key + delivery verification | R2-2 | **CLIENT** | Critical |
| P-5 | Stripe sandbox key + PSP E2E incl. refunds/3DS | R2-3 | **CLIENT** then Agent | Critical |
| P-6 | AI provider decision (ADR) + key; wire live boundary + cost controls | R2-4 | **CLIENT** then Agent | High |
| P-7 | WebAR asset production + device matrix | R2-5 | **CLIENT** (devices/assets) | Medium |
| P-8 | Admin consoles: AI Ops, Redirect Manager, bulk edit/undo, approval queue | R3-1 | Agent | High |
| P-9 | DYO preview render job | R3-2 | Agent | Medium |
| P-10 | File-upload pipeline + AV scan + storage ADR | R3-3 | Agent (+ADR sign-off) | High |
| P-11 | 3D processing pipeline (GLB/CAD→Draco/KTX2→approval) | R3-4 | Agent | High |
| P-12 | Multi-domain canonicals, attribution, cookie spec | R3-5 | Agent | High |
| P-13 | Reconciliation sweeper, high-value review, outbox sweep | R3-6 | Agent | Medium |
| P-14 | E2E suite execution | R4-1 | Agent | Critical (gate) |
| P-15 | Load tests + capacity statement | R4-2 | Agent | Critical (gate) |
| P-16 | Security matrix incl. non-superuser RLS | R4-3 | Agent | Critical (gate) |
| P-17 | SLOs/alerting/runbooks | R4-4 | Agent | High |
| P-18 | Backup/restore rehearsal | R4-5 | Agent + infra | High |
| P-19 | Lint/type debt + stale-doc cleanup | R4-6 | Agent | Low |

---

# 6. WHAT WAS ALREADY GOOD (preserved, untouched by R1)

Per the traceability matrix — these carried forward with fresh green tests this session:
- Order integrity engine: atomic transactions, idempotency replay, price-change guards, stock restoration on cancel (`order-repository.ts`) — F-04 fixed previously.
- Server-side unified cart (F-03), ownership enforcement `assertOrderOwnership` (F-02 core), admin header stripping in production mode (F-01 core).
- RBAC: 10 roles, PII redaction for analysts, two-person-rule plumbing in CMS.
- DYO deterministic assembly + compatibility validation + pricing + order snapshot chain.
- Jobs normalization for auth/favorites/checkout/reservations/notifications (migration 0019 — partially landed claim corrected to fact).
- Test suite integrity: 897 passing tests, 0 failures, verified live this session.

---

# 7. FINAL VERDICT & NEXT TRIGGER

- **Now:** R1 closed in code with evidence. Two residuals are explicitly non-agent: credential rotation (client) and live-DB migration application (needs Postgres access).
- **Next actionable step (highest leverage):** client opens R2 gates — restore archive + provide email/Stripe keys. Without them, R2–R4 cannot progress and the app cannot exceed *"functionally incomplete application"* regardless of further coding.
- **On completion of R1→R4:** Maihan Gems moves from ~68% implementation / ~55% verification confidence to a **production-ready, evidence-backed** state satisfying INITIAL_IMPLEMENTATION_PLAN §20 DoD.

*Evidence commands run this session:* `pnpm install --frozen-lockfile` · `pnpm run build` · `pnpm -r run test` · `pnpm run lint` · targeted `vitest run src/api/security-mode.spec.ts src/api/certificate.spec.ts` (15/15 pass). All findings herein cite exact files/lines observed in the repository at commit `bd95ae5`.
