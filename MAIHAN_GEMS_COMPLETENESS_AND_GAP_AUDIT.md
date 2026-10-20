# MAIHAN GEMS — REMAINING GAPS & COMPLETENESS TRACKER

**Last updated:** 2026-10-20
**Repository:** `/workspaces/Maihan-Gems`
**Branch / commit:** `develop` @ `3b9305b`
**Mode:** remaining-work tracker. Resolved findings have been removed from this file; they remain in Git history. Open and partially resolved items are below.

---

## 0. Status summary

**Verdict: functionally incomplete and not production-ready.** Weighted completeness is approximately **56%**. The last remediation slice fixed the admin bootstrap path, one-of-one stock transitions, provider-backed refunds, payment-webhook state guards, DYO making-fee consistency, AI SSE parsing, AI handoff/tool persistence, admin CMS/certificate UI contracts, security headers, and production secret guards.

Those fixes are not repeated here. What remains is:

1. The real catalogue and URL migration.
2. Real money movement and checkout configuration.
3. One-of-one concurrency and failure-path proof.
4. Certificate upload/storage/OCR.
5. Real AI/RAG/WhatsApp delivery.
6. Admin/CMS completion.
7. Vendor uploads and payouts.
8. 3D/AR asset production.
9. Security hardening that still depends on decisions or deployment.
10. Verification and operational evidence.

---

## 1. Verification baseline

Last verified after remediation slice 1:

| Check | Result |
|---|---|
| `pnpm run typecheck` | PASS, 0 errors |
| `pnpm run build` (`tsc -b`) | PASS |
| `pnpm --filter @maihan/web run build` | PASS |
| `pnpm run lint` | PASS, 0 errors, 211 warnings |
| `pnpm run schema-fidelity` | PASS on fresh DB: 83 tables, 21 migrations |
| `pnpm -r run test` | 909 passed, 98 skipped, 0 failed |
| Domain | 240 passed / 11 skipped |
| Contracts | 43 passed |
| AI | 14 passed |
| Observability | 12 passed |
| DB | 101 passed / 52 skipped |
| Worker | 0 passed / 3 skipped |
| Migration tooling | 20 passed / 11 skipped |
| Web | 479 passed / 21 skipped |
| Bundle budgets | PASS: category 150.4/170 KB, product 150.0/190 KB |
| Playwright / load / Lighthouse / security matrix | NOT PRESENT |
| Full corpus migration | NOT RUN |
| Live provider / OCR / AR device tests | NOT RUN |

Live DB remains fixture-scale and incomplete:

| Item | Count |
|---|---:|
| `products` | 446 (443 ACTIVE, 3 DRAFT) |
| `gemstones` | 261 |
| `settings` / `setting_variants` | 85 / 85 |
| `dyo_configurations` | 0 |
| `orders` / `payments` / `refunds` | 1 / 1 / 0 |
| `redirects` | 0 |
| `navigations` / `seo_metadata` | 0 / 0 |
| `staging_source_pages` | 0 |
| `price_entries` / `price_model_observations` | 0 / 0 |
| `knowledge_documents` / `knowledge_chunks` | 0 / 0 |
| `webar_assets` | 0 |
| `pages` | 14 |
| admin accounts | 0 |
| `import_batches` | 1 (`ngc-catalog-v1`, 443 records) |

---

## 2. P0 production blockers

| ID | Blocker | Why it blocks production | Exit condition |
|---|---|---|---|
| P-01 | No corpus migration / redirects | The catalogue is a 443-product fixture, not 19,665 stones / 10,349 variants; 44,218 URLs are unresolved | V1–V22 pass on corpus; 44,218 redirects in DB and generated edge module |
| P-02 | No live payment capture/refund | Orders cannot take real money or return it | Provider sandbox authorize→capture→refund; webhook reconciliation |
| P-03 | Tax/shipping unconfigured | Totals are zero or client-controlled | Approved tax/shipping rules; server-computed totals; fail closed |
| P-04 | One-of-one sale proof missing | Code now marks stones sold, but no concurrent live proof | Two concurrent buyers: exactly one succeeds; reservation consumed |
| P-05 | No first admin provisioned | Admin console is unreachable on a clean production DB | `pnpm bootstrap:admin` run once, audited, MFA/rotation documented |
| P-06 | Trust pipeline not real | Certificate upload/OCR is a client-supplied stub; documents are not private | Private upload, scan, OCR, review, INV-07 display |
| P-07 | AI/RAG not real | No real embedding model, empty knowledge corpus, web model path unverified | Live model + corpus + grounded eval |
| P-08 | Worker not deployed | Outbox, email, reservations and expiry do not run by default | Worker deployed with health, queue dashboards and alerts |
| P-09 | 3D/AR assets absent | `webar_assets` is 0; standalone AR is a 2D overlay | Asset pipeline + GLB set + real device verification |
| P-10 | No production verification pack | No Playwright, load, Lighthouse, SG-1..15 evidence, backup drill | Dated evidence artifacts for every gate |

---

## 3. Remaining work by subsystem

### 3.1 Catalogue, taxonomy and search

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| Full corpus import | Open | Run `tools/migrate` with `--archive-root naturalgemstones/naturalgemstones`; stages extract→parse→tokenize→canonical→derived→prices→assets→certificates→redirects→gates | 19,665 stones, 3,072 pairs, 951 settings, 10,349 variants, 1,024 observed prices; V1–V22 green |
| Archive path mismatch | Open | Fix hardcoded `naturalgemstones/reverse_engineered/...` in corpus/redirect tests or document/normalize the archive root | Corpus tests actually run instead of skipping |
| Redirects | Open | Generate 44,218 rows; run `scripts/generate-redirects.mjs`; verify no chains/loops/404 targets | Every source URL resolves or 301s |
| Price observations | Open | Populate `price_entries` and `price_model_observations` from `pages_analyzed.jsonl`; enforce V15 | Prices traceable; no `UNKNOWN` price published |
| Taxonomy coverage | Partial | Load all varieties, colours, origins, treatments, shapes from corpus | Facets match the real catalogue |
| Storefront search | Partial | Replace `searchStorefront` on `/search` with `CatalogQueryService.search`; server facets, suggestions, pagination | Search UI uses hybrid service; facet counts equal result counts |
| Collection filters | Partial | Move filtering/facet counts server-side; remove the 64-product client cap | Works at 19k stones |
| Static NGC PDP dependence | Partial | Make `/product/[slug]` and `/[varietySlug]/[productSlug]` DB-first; retire fixture-only structure/media | Admin/DB edits always govern PDP |
| Sitemap scale | Partial | Verify shards and canonical paths against the full corpus | Sitemap covers canonical 200 URLs only |
| Canonical metadata | Open | Read `seo_metadata`; emit canonical URLs on PDP/category pages | No wrong/missing canonicals |

### 3.2 Commerce, payments and orders

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| Card collection | Open | Provider-hosted card fields; never handle PAN/CVV | Payment method token reaches provider only |
| PaymentIntent lifecycle | Partial | Return `client_secret`; confirm on client; verify authorized status; capture | Sandbox e2e authorize→capture→PAID |
| Refund provider test | Partial | Sandbox Stripe refund; failure handling; reconciliation | Provider refund id stored; no false SUCCEEDED |
| Tax | Open | Approved tax rules/engine; fail closed in production | Totals include tax; no zero-tax production order |
| Shipping | Open | Rate table; server-side validation; no client-supplied amount | Client cannot choose an arbitrary shipping price |
| Add-ons | Partial | Attach add-ons inside order transaction or as order lines before placement | Selected add-ons always appear in the order |
| Webhook reconciliation | Partial | Provider-state poller; out-of-order/failed/cancelled handling | Divergence self-heals or alerts |
| Provider idempotency | Partial | Reconcile provider idempotency keys; duplicate capture prevention | No duplicate capture/refund |
| Order-number race | Open | Use a sequence or retry loop for `MG-YYYY-NNNNNN` | Concurrent placements never 23505 |
| FX/currency | Open | Add approved FX source; lock currency at checkout | Displayed and charged currency agree |
| Email delivery | Partial | Configure Resend/Mailtrap; bounce/complaint handling | Verification/reset/order emails delivered and observable |

### 3.3 Inventory and fulfilment

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| One-of-one concurrency proof | Partial | Add live DB test with two concurrent checkouts for one stone | Exactly one order succeeds; other gets 409/422 |
| Reservation release on failure | Partial | Release on payment failure/cancel/expiry; verify sweeper | No stone blocked after terminal failure |
| Reservation consumption test | Partial | Assert `CONSUMED` after order placement | No 30-minute resurrection |
| Unique quantity guard test | Partial | Test a loose stone quantity >1 is rejected | 422; no oversell |
| READY_MADE/SETTING_ONLY policy | Partial | Confirm made-to-order policy; decide whether finished pieces are unique | Documented and enforced |
| Fulfilment tracking UI | Open | Customer shipment/tracking view | Order detail shows carrier/tracking |
| Returns/RMA | Open | Return authorization, inspection, restock/destock | RMA workflow with audit |

### 3.4 Certificates and trust

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| Private upload | Open | R2 presigned PUT, private bucket, server-generated keys | No public certificate URL |
| Content validation | Partial | Virus scan, EXIF strip, dimension/page caps | Rejected files have reasons |
| OCR/vision | Open | Real `ModelGateway` vision call; persist run/model/version/confidence | Per-field confidence from actual extraction |
| Review queue | Partial | E2E the admin queue; fix any remaining contract drift | APPROVE/REJECT work end to end |
| INV-07 public display | Partial | Render certificate fields with verified/unverified badges on PDP | No unverified field renders as fact |
| Artifact provenance | Partial | Associate cert/report/appraisal rows with source paths | Every artefact traceable |
| Lab authenticity | Conditional | Decide whether independent verification is in scope | Clear customer wording if not |

### 3.5 AI, RAG and WhatsApp

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| Real embeddings | Open | Replace deterministic `Math.sin` vectors with approved model | 1024-dim semantic vectors |
| Knowledge corpus | Open | Ingest published education/FAQ/variety content | `knowledge_chunks` populated; trust tiers set |
| Web SSE live test | Partial | Test parser against live model; no canned fallback | Real answer rendered from model |
| Tool output/latency persistence | Partial | Persist tool output, latency, cost; redact PII | Every tool call auditable |
| AI budgets | Partial | Redis-backed per-surface budget, not per-process Map | Budget survives restart/instances |
| Handoff operations | Partial | Agent queue UI, SLA, assignment, close | Handoffs visible and actionable |
| Inbound WhatsApp replies | Partial | Send orchestrator answer through Graph API | Customer receives reply |
| WhatsApp delivery receipts | Open | Persist/status-monitor delivered/read/failed | Admin visibility |
| AI evaluation | Partial | Expand to 14 dimensions; run in CI | Grounding/refusal regression gate |

### 3.6 Admin, CMS and staff operations

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| CMS block renderers | Open | Implement the remaining 17 of 20 block types | Every registered type renders |
| Navigation admin | Open | DB-driven header/footer/mega menu + editor | No hardcoded navigation |
| SEO admin | Open | Edit `seo_metadata`; canonical validation | Metadata drives pages |
| Redirect admin | Open | List/add/validate redirects; chain/loop detection | Operators can manage parity |
| Catalogue editors | Open | Product/gemstone/setting/taxonomy/price/inventory editing | No manual DB edits |
| Bulk operations | Open | Preview token, approve, audit, bounded undo | Bulk changes safe |
| Conflict resolution | Open | Resolve `staging_conflicts` without overwrite | Both sides preserved |
| AI operations console | Open | Conversations, tool audit, guardrails, evaluations | AI supportable |
| Customer admin | Partial | Detail, addresses, consent, deletion | Staff can support customers |
| Saved DYO designs | Open | Account list/edit/duplicate/delete | Owner-only saved designs |
| Admin bootstrap runbook | Partial | Run and document first-admin provisioning/rotation | Reproducible clean install |

### 3.7 Vendor portal

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| Vendor uploads | Open | Presigned upload, sniff, scan, storage keys | No arbitrary remote URL assets |
| Vendor notifications | Partial | Status/moderation/order notifications delivered | Vendor sees decisions |
| Payouts/commission | Open | Decide and model vendor payout/commission/tax | Vendor statements reconcile |
| Vendor reporting | Partial | Sales/payout/tax reports | Vendor can reconcile |

### 3.8 3D and AR/VTO

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| Asset pipeline | Open | Ingest GLB, validate geometry/textures, Draco/KTX2, budgets, approval | Over-budget assets rejected |
| Ring asset set | Open | Produce scoped ring models | At least the approved first tranche |
| PDP 3D tab | Partial | Load `webarAsset` on canonical PDP | Model appears only when approved |
| Standalone AR | Partial | Replace 2D `WebArModal` with real `TryOnScene` placement | Hand-anchored ring, occlusion, fallback |
| Device matrix | Open | Test low-tier mobile/desktop browsers | Documented compatibility |
| AR analytics | Open | Session duration, tracking loss, fallback cause | No imagery uploaded |

### 3.9 Security

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| CSRF enforcement | Open | Double-submit token on all cookie mutations; update admin/customer clients | Missing token rejected |
| Managed identity | Open | ADR decision: adopt IdP or explicitly approve local auth | No undocumented architecture violation |
| RLS runtime | Partial | Non-bypass app role; apply RLS on all customer read/write paths | Cross-customer SQL denied |
| Secret history | Open | Rotate Neon credential; purge leaked chat log from Git history | Rotation + purge evidence |
| Vendor SSRF | Partial | Fetch/sniff uploaded media server-side; block metadata/private ranges | No arbitrary fetch |
| Security headers smoke | Partial | Test CSP/HSTS/frame-ancestors in a deployed preview | Headers present, app functions |
| Rate-limit identity | Partial | Strip/derive client IP at edge; per-account limits | No spoofable bucket |
| PII telemetry | Partial | Automated PII scan in CI | No PII in logs/metrics |

### 3.10 Operations, testing and multi-domain

| Item | Status | Required work | Acceptance |
|---|---|---|---|
| Worker deployment | Open | Deploy `apps/worker`; health, queue depth, dead-letter alerts | Async plane observable |
| Playwright | Open | 14 journeys in a real browser | Green in CI |
| Load tests | Open | k6/filtered search/checkout/DYO; NFR-02/03 | Dated artifacts |
| Lighthouse/axe | Open | Route-level LCP/INP/CLS and WCAG 2.2 AA | Budgets pass in CI |
| Security matrix | Open | SG-1..15 execution including AI | Green evidence |
| Backup/restore | Open | Restore drill with RPO/RTO | Dated runbook evidence |
| Retention/privacy | Open | Retention jobs, export/erasure, consent | Legal/ops sign-off |
| Multi-domain | Open | Domain registry, attribution, per-domain config/isolation decision | Explicit supported model |
| Alerts/SLOs | Partial | Wire evaluator to alert delivery; owner/runbook per alert | Alert test |
| Observability export | Partial | OTel exporter/metrics backend/error reporting | Live traces/metrics |

---

## 4. Verification debt for implemented fixes

These fixes exist in code but still need stronger evidence:

| Fix | Missing proof |
|---|---|
| Admin bootstrap CLI | Run on a scratch DB; assert ADMIN_SUPER login and audit row |
| One-of-one stock transition | Live concurrent purchase test |
| Unique-item quantity cap | API test for quantity >1 |
| Refund provider call | Stripe sandbox refund test + failure path |
| Payment webhook state guard | Late/duplicate/out-of-order webhook test |
| Stripe authorize status guard | Sandbox intent status test |
| DYO making fee | Quote regression: total = stone + setting + 15% |
| AI SSE parser | Live model/browser stream test |
| AI tool/handoff persistence | Assert `tool_calls` and `AWAITING_HUMAN` rows |
| Certificate review API/UI | E2E approve/reject |
| CMS page creation | E2E create→review→publish |
| Security headers | Deployed header smoke test |
| WhatsApp Graph send | Sandbox send + delivery receipt |
| Production secret guards | Startup/health test with missing env |

---

## 5. Potentially missing requirements and product blind spots

These are recommendations, not approved plan additions.

| ID | Requirement | Why it matters | Priority | Acceptance |
|---|---|---|---|---|
| R-01 | Admin break-glass + MFA | Clean deploy otherwise has no operator | Critical | Provisioned, audited, rotated |
| R-02 | Explicit one-of-one state machine | Prevents double-selling | Critical | ACTIVE→RESERVED→SOLD/CONSUMED |
| R-03 | Provider capture/refund reconciliation | Money must actually move | Critical | Daily reconciliation job |
| R-04 | Tax/shipping engine with fail-closed production | Price correctness | Critical | No production order without rules |
| R-05 | Private document storage/OCR | Trust USP | Critical | Upload→scan→OCR→review |
| R-06 | Real RAG/model | Concierge USP | Critical | Live grounded answers |
| R-07 | Worker deployment | Async correctness | Critical | Deployed + alerting |
| R-08 | Full corpus/redirects | Catalogue/SEO | Critical | 44,218 URLs |
| R-09 | CSRF + security headers | Baseline web security | High | Enforced/tested |
| R-10 | Managed identity decision | Architecture/compliance | High | ADR + implementation |
| R-11 | Vendor table | Retention/data loss | High | Normalized + backfilled |
| R-12 | CMS 20 renderers/nav/SEO | Content operations | High | Complete registry |
| R-13 | Inventory/price/bulk admin | Catalogue operations | High | Editors + preview/undo |
| R-14 | Saved designs | SRS FR-12 | High | Owner-only saved designs |
| R-15 | 3D asset pipeline | 3D/AR USP | High | Approved GLB set |
| R-16 | E2E/load/security evidence | Readiness proof | High | Phase 13 artifacts |
| R-17 | Backup/restore drill | Recovery | High | Dated RPO/RTO evidence |
| R-18 | Consent/privacy/export/erasure | Legal/privacy | Medium | Consent + DSAR APIs |
| R-19 | Email bounce/complaint handling | Deliverability | Medium | Suppression + status |
| R-20 | Multi-vendor payouts/commission | Vendor economics | Medium (if multi-vendor) | Statements/payout records |
| R-21 | Return authorization/restock | Post-purchase ops | Medium | RMA workflow |
| R-22 | High-value order controls | Fraud/loss | Conditional | Threshold review/insurance |
| R-23 | Certificate/lab authenticity | Trust claim | Conditional | Verification or explicit disclaimer |
| R-24 | 3D/AR rights and provenance | Legal | Conditional | Asset licence records |
| R-25 | Search quality telemetry | Conversion | Medium | Zero-result/relevance metrics |
| R-26 | Multi-currency checkout/FX lock | Display/charge consistency | Medium | Checkout currency lock |
| R-27 | Accessibility manual review | WCAG 2.2 AA | Medium | Keyboard + screen-reader pass |
| R-28 | AI operations console | Safety support | High | Conversation/tool/eval view |
| R-29 | AI cost controls | Runaway spend | High | Redis budget + alerts |
| R-30 | Migration/conflict operation runbook | Data integrity | High | Rehearsed runbook |

---

## 6. Prioritized remaining roadmap

### Stage 1 — Data truth

1. Fix archive root/corpus test paths.
2. Run stages extract→verify-gates with manifest hashing.
3. Generate 44,218 redirects and run URL parity.
4. Retire fixture-only PDP/search dependence.

### Stage 2 — Money and stock

5. Card UI, PaymentIntent confirm/capture, sandbox refund.
6. Tax/shipping configuration and fail-closed production.
7. One-of-one concurrency + reservation failure-path tests.
8. Webhook reconciliation and order-number safety.

### Stage 3 — Trust and AI

9. Private upload, scan, OCR, review, INV-07 display.
10. Real embeddings + knowledge corpus.
11. AI tool output/persistence, budgets, handoff console.
12. WhatsApp inbound reply delivery and receipts.

### Stage 4 — Admin, vendor and 3D

13. Vendor uploads; payout/commission decision.
14. CMS renderers, nav/SEO/redirect, catalogue/inventory/bulk admin.
15. Conflict resolution, AI operations, saved designs.
16. GLB pipeline, ring asset set, real AR, device matrix.

### Stage 5 — Production evidence

17. Worker deployment, alerts, queues, dead-letter operations.
18. Playwright 14 journeys, k6, Lighthouse/axe, SG-1..15.
19. Backup/restore, retention, privacy/export.
20. Multi-domain decision and attribution.

---

## 7. Close criteria for this tracker

An item may be removed from this file only when:

1. The implementation exists on `develop`.
2. The relevant test layer passes (unit → live DB → provider sandbox → browser/device).
3. The evidence path and command are recorded.
4. No production blocker in §2 depends on it.
5. The change is committed explicitly (never `git add .`).

**Current production verdict: NO.**
