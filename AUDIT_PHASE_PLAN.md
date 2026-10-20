# MAIHAN GEMS — AUDIT FINDINGS RECONCILED INTO 4 REMEDIATION PHASES

**Date:** 2026-10-19 · **Branch:** `qwen-code-7a7c5562-…` (working tree clean at audit start)
**Basis:** Full-gap audit of the repository against `AGENTS.md`, `INITIAL_IMPLEMENTATION_PLAN.md` (§19 Phase 12, §20 Phase 13), `COMPLETENESS_AUDIT.md`, `MAIHAN_GEMS_COMPLETE_PRODUCT_AUDIT.md`, `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md`, `.opencode/memory/*`, and all 40 `technical_design/` documents.

**Existing Global Task / phase numbering is preserved.** These are *remediation* phases (R1–R4), not new project phases; each finding keeps its original M-xx / F-xx / PB-x identifier.

## Fresh verification executed during this reconciliation (observed facts)

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | OK (Node 20.20.2 vs engines ≥22 — warning only) |
| `pnpm run build` (`tsc -b`) | **PASS**, exit 0 |
| `pnpm -r run test` | **ALL GREEN**: domain 240, contracts 43, ai 14, observability 12, db 101 (+52 skipped integration), worker 3 skipped, migrate 20 (+11 skipped), web 471 (+21 skipped) = **889 passed, 0 failed, 84 skipped** |
| `pnpm run lint` | **0 errors**, 210 warnings (`no-explicit-any` debt) |
| DB-dependent suites (schema-fidelity, corpus gates) | **NOT RUN** — no PostgreSQL available in this environment. `[UNVERIFIED HERE]` |

Correction to inherited claims: the jobs-normalization work (M-03) is **partially landed** — migration `0019_jobs_normalization.sql` exists and auth/favorites/checkout/reservations/notifications repositories already read/write the new tables. The residual gap is narrower than previously reported (see R1-3).

---

## PHASE R1 — SECURITY FAIL-CLOSED + GOVERNANCE RECONCILIATION  *(build started this session)*

Blocking correctness/governance defects. No external credentials needed.

| ID | Finding (evidence) | Action | Acceptance |
|---|---|---|---|
| R1-1 (PB-env, was blind-spot #2) | Identity-header trust is conditional on `MAIHAN_ENV==='production'` in `apps/web/src/app/api/v1/[...path]/route.ts`, `account-handlers.ts:64,84`, `favorites-handlers.ts:47`, `commerce-handlers.ts:83`, `refund-handlers.ts:97,139`, `ai-handlers.ts:333,501`, `certificate-handlers.ts:55`, `admin/backoffice-handlers.ts:127`, `proxy.ts:85`. A misconfigured staging deployment silently disables header stripping and enables IDOR. | Make security behaviour **fail-closed by default**; dev seams opt-in via explicit `MAIHAN_DEV_SEAM=1` (never implied by absence of `production`). | Headers always stripped server-side; spoofed `x-customer-id` rejected unless seam explicitly enabled; tests green with no env set. |
| R1-2 (PB-2, C1) | `migrations/0019_jobs_normalization.sql:2` asserts "ADR-027 Accepted", but `technical_design/40` ends at ADR-026 and `.opencode/memory/DECISIONS.md` has no entry. Governance break. | Record ADR-027 properly: registry entry in doc 40 + DECISIONS.md, labelled per evidence hierarchy, referencing user authorization date. | Migration authority string matches a real, findable ADR. |
| R1-3 (M-03 residual) | Vendor onboarding still overloads `jobs` queue `'vendors'`, `job_type='VENDOR_PROFILE'`: `auth-repository.ts:426-460,657,756`; `vendor-repository.ts:167,199,264,277,352`; `dashboards-repository.ts:132-133`. Violates doc 27 §1 (permanent state does not belong in the 90-day-retention jobs table). | Complete normalization: dedicated vendor-onboarding storage (expand migration) + repository cutover + idempotent backfill from existing rows. | No permanent vendor state readable only from `jobs`; retention sweep cannot destroy vendor records. |
| R1-4 (M-10 note) | Leaked credentials persist in Git history (`freebuff-chat-*.md`). | **Client-owned**: rotate + decide on `git filter-repo` purge. Audit agent must not rewrite history. | Tracked as blocker; no code action. |

## PHASE R2 — DATA SCALE + EXTERNAL PROVIDER CONNECTIONS

Requires user/client actions (archive restore, provider keys, live DB access approval).

| ID | Finding | Action | Gate |
|---|---|---|---|
| R2-1 (PB-1/M-01) | Corpus never migrated: 443 products vs 44,218 URLs; `redirects`=0. `naturalgemstones/` archive absent (absence expected per AGENTS.md §5). | Restore archive out-of-band → run `tools/migrate` full corpus → corpus-mode gates → `scripts/generate-redirects.mjs`. | Needs archive + approved DB branch. |
| R2-2 (PB-4/M-05 prod half) | Email code path real (`email-provider.ts` Resend→Mailtrap→honest OUTBOX_LOG) but no live key configured. | Provision Resend/Mailtrap key; verify delivery, bounce handling. | Client secret. |
| R2-3 (PB-3/M-04) | Stripe wired conditionally on `STRIPE_SECRET_KEY`; webhook HMAC verified on raw body; never exercised against sandbox. | Sandbox E2E: PaymentIntent → webhook → reconcile; refund flow; 3DS. | Client secret. |
| R2-4 (AI boundary) | Model calls simulated (deterministic hash embeddings, mock transport). Tool registry + guardrails real. | Approve provider/model ADR (cost controls per ADR-003), then wire live boundary behind flag. | Client decision + key. |
| R2-5 (M-11/PB-9) | WebAR assets empty; MediaPipe tracker real; WebArModal is 2D overlay. Device evidence absent. | Produce tracking assets; real-device matrix. | Physical devices. |

## PHASE R3 — FEATURE COMPLETION (documented gaps)

| ID | Finding | Action |
|---|---|---|
| R3-1 (M-16, plan §19 tasks 3,4,6,11,13) | Missing admin consoles: AI Ops (conversations/tool-call audit/guardrail events/eval runs), Redirect Manager (bulk import of 44,218 rows), Catalogue bulk edit with preview/undo, derived-reference approval queue for the 221. | Build per §19 acceptance criteria incl. two-person rule on trust content. |
| R3-2 | DYO preview render job missing (builder/pricing/cart/order-snapshot chain works). | Render job on `media` queue. |
| R3-3 | Vendor upload pipeline URL-only; no direct file upload, no AV scan, presign gaps (SG-5/SG-6). | Object-storage decision (ADR) + upload pipeline. |
| R3-4 | 3D asset pipeline absent: viewer renders procedural geometry; no GLB/CAD processing, Draco/KTX2. | Pipeline per `21_WEBAR_ARCHITECTURE.md` + `24_ASSET_AND_MEDIA`. |
| R3-5 (multi-domain, 45%) | Order attribution incomplete; single `siteBaseUrl()` canonicals; cross-domain cookie policy undocumented. | Per-domain canonicals, attribution columns wiring, cookie/allowed-host spec. |
| R3-6 (blind spots) | Payment reconciliation sweeper; high-value order manual-review threshold; session revocation on password change (field `revoked_at` exists, behaviour unproven); outbox growth sweep. | Implement + test each. |

## PHASE R4 — PRODUCTION HARDENING (plan §20 Phase 13)

| ID | Finding | Action |
|---|---|---|
| R4-1 | No browser E2E execution (Playwright installed, specs absent/unrun). | E2E suite on production-shaped data (post R2-1). |
| R4-2 | No load tests vs NFR-02/NFR-03 targets. | k6-style load evidence (tooling needs ADR if new). |
| R4-3 | Security matrix SG-rows not fully executed; RLS runtime depth (M-02/PB-6) integrated tests skipped-by-default (52 db skips). | Non-superuser app-role integration tests; full matrix. |
| R4-4 | SLOs/alerts/runbooks/capacity statement absent (§19 task 5-8 equivalents in §20). | Observability completion + backup/restore rehearsal. |
| R4-5 | Lint debt: 210 `any` warnings; handler-SQL extraction debt (M-14). | Scheduled cleanup, no behaviour change. |

---

### Dependency order
R1 (self-contained, safe now) → R2 (needs client inputs) → R3 (some items need R2 decisions) → R4 (needs R2-1 data scale). Production cutover may be scheduled only after R4 green, per plan §20 DoD.
