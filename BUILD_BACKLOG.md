# BUILD BACKLOG — everything that remains

Authority: `INITIAL_IMPLEMENTATION_PLAN.md` §37 (phases P0–P9) and ADR-026/027.
This file is the execution order. A box is ticked only when the code exists,
typechecks, has a test, and its acceptance line is met.

Rule carried from the client (2026-11-20): **no writes to a real database until
every track below is code-complete and verified on a disposable scratch
database. Neon is applied last, once, with explicit approval.**

---

## 0. Already done

- [x] P1.1–P1.4 API mounted in the App Router; one start command
- [x] P2.1–P2.3 users/sessions, scrypt, admin gate, login page, admin console
- [x] P2.4 customer identity: register, verify-email, reset, `/account`,
      `/account/login`, `/account/register`. **Email delivery is not wired**
      (Track B4): the dev-only `auth-token` CLI issues tokens out of band and
      production responses never carry one
- [x] P3.1 product publish/unpublish with gate V15 + audit
- [x] P5/P6.1 vendor schema, lifecycle state machine, commission split, ledger
- [x] ADR-026 multivendor, ADR-027 sessions

---

## Track A — Media and the working store (P3)

- [ ] A1 `packages/db/src/media/storage.ts` — `ObjectStorage` port
      (`put`, `signGet`, `delete`, `head`) + `LocalDiskStorage` driver
- [x] A2 `S3CompatibleStorage` driver (R2/S3) — no new SDK unless ADR; use
      signed HTTP against the S3 API. SigV4 proven against AWS's published
      `get-vanilla` vector; driver verified against fake fetch, **not a live
      bucket**
- [ ] A3 `assets` pipeline: fetch source URL → validate content type/size →
      upload → set `processing_state='READY'`, `storage_key`, `storage_provider`
- [x] A4 Backfill command `assets:backfill` — idempotent, resumable, explicit
      `SKIPPED` reason per row (never a silent drop). Planner/runner unit-tested
      against an in-memory store; live run pending A3 and a database
- [x] A5 `GET /api/v1/media/{assetId}` — signed redirect, cache headers.
      Unit-tested with fake db/storage; live 302 pending a READY asset
- [ ] A6 `ProductSummary` + `ProductDetail` gain `media[]` (primary first)
- [ ] A7 `ProductCard` / PDP gallery render real images with `next/image`,
      blur placeholder, explicit alt text, and an honest "no photograph"
      state instead of a fabricated URL
- [ ] A8 Acceptance: publishing one product shows its photograph on the PLP and
      PDP, with LCP p75 measured

## Track B — Payments, email, tax, shipping (P3)

- [ ] B1 `PaymentProvider` implementation for the chosen PSP (client decision)
- [ ] B2 Webhook verification over the raw body, replay-safe via
      `webhook_receipts`
- [ ] B3 Refund execution at the provider, reconciled to `refunds`
- [ ] B4 Email port + provider adapter; templates for order, shipping,
      password reset, vendor approval
      **Progress 2026-11-23:** `EmailPort` with `none` / `sink` (default) /
      `smtp` transports; six strict notification contracts; pure, escaping
      renderers for order confirmation, shipping update, password reset, email
      verification, vendor approval and vendor suspension; the outbox
      dispatcher, the job runner and the reservation-expiry schedule in
      `apps/worker`; the transactional-outbox and job-queue repositories in
      `packages/db`. **Still open:** a real provider adapter (client decision),
      a producer for `OrderCreated` / `OrderFulfilled` / `VendorApproved` /
      `VendorSuspended`, and the auth-token emails (apps/web still issues
      tokens out of band).
- [ ] B5 Tax configuration and calculation on order placement
- [ ] B6 Shipping rates and selection
- [ ] B7 Acceptance: sandbox card charge → order → confirmation email →
      refund, all reconciling to the cent

## Track C — Admin modules (P4, the 11 remaining Phase-12 tasks)

- [x] C1 Catalogue admin: bulk edit, preview diff, bounded undo window
      **Progress 2026-11-23:** `packages/db/src/admin/catalogue-admin-repository.ts`
      + `POST /api/v1/admin/catalogue/bulk/{prices,state}` and
      `POST .../bulk/{operationId}/undo` + `/admin/catalogue/bulk`. The preview is
      the same endpoint with `dryRun: true` (one SELECT, no writes); >200 ids is
      refused before any read; a price SET on UNKNOWN evidence and a bulk publish
      of an UNKNOWN-evidence row are skipped with a reason (gate V15); the update,
      one audit row per changed product and one `bulk_operation` row are one
      statement. Undo is single-use, 30-minute-bounded, refused when any affected
      row changed since, and reversible from the console's recent-operations list.
      Undo gates on `products/approve`, so CATALOG_MANAGER can apply but only
      ADMIN_SUPER can reverse.
- [ ] C2 Navigation editor + redirect manager (bulk import of 44,218 rows)
- [ ] C3 SEO metadata editor
- [x] C4 Migration console: batches, counts, conflicts, quarantine
      **Progress 2026-11-23:** `/admin/migration` + `GET
      /api/v1/admin/import-batches`; per-batch staged / conflict / open-conflict
      and `records_quarantined` counts. No per-row quarantine ledger exists in
      the locked schema, so the count is the recorded fact.
- [x] C5 Conflict resolution UI — never silent overwrite (328 open conflicts)
      **Progress 2026-11-23:** both sides shown; a human records one resolution;
      a second resolve is 409 `CONFLICT_ALREADY_RESOLVED`; the update and its
      before/after audit row are one statement.
- [x] C6 Derived-identity approval queue — per-row approve/reject (221 rows,
      INV-08)
      **Progress 2026-11-23:** `/admin/derived-identities` + approve/reject
      endpoints. Approval writes the explicit `products.review_state` column
      plus `review_note` / `reviewed_by` / `reviewed_at` (migration 0022) and
      never writes `source_sku` or promotes `INFERRED`. Rejection flags the row
      and never deletes. The earlier `structured_extra` JSON workaround is
      removed: no repository path reads or writes it (ADR-024). Migration 0022
      is registered but not yet applied.
- [x] C7 Certificate review queue + anomaly triage
      **Progress 2026-11-23:** `packages/db/src/admin/certificate-review-repository.ts`
      + `GET /api/v1/admin/certificates`, `GET .../{id}` and
      `POST .../{id}/decide` + `/admin/certificates`. The queue puts ERROR
      anomalies first, then the least confident document. The detail carries
      per-field confidence, band, bbox and the domain material-field assessment.
      Approval is refused below the 0.90 whole-document threshold with the domain
      reason, and refused while an ERROR anomaly is open; the decision writes the
      review, the append-only `verification_events` row and the audit row in one
      statement.
      **Anomaly resolution (2026-11-23):** `resolveAnomaly` is single-use
      (`WHERE resolved_at IS NULL`, 409 on a second attempt), writes the three
      resolution columns plus a before/after audit row in one statement, never
      deletes the row; `listAnomaliesForCertificate` returns open and resolved
      oldest first. Endpoints
      `GET /api/v1/admin/certificates/{id}/anomalies` and
      `POST /api/v1/admin/certificates/anomalies/{anomalyId}/resolve`
      (`anomalies/read` and `anomalies/resolve`). `decideCertificate` re-reads
      anomalies at decision time, so a resolved ERROR anomaly no longer blocks
      and an unresolved one still does. The console records a resolution with a
      reason and shows the history.
- [ ] C8 AI operations console: conversations, tool audit, guardrail events,
      evaluation runs
- [x] C9 Two-person approval enforced for trust-bearing content
      **Progress 2026-11-23:** `packages/domain/src/approval/two-person.ts`
      (`requiresSecondApprover`, `isSelfApproval`, `assertTwoPerson`,
      `TwoPersonError` with `code='TWO_PERSON_REQUIRED'`) plus the three
      classifiers. Enforced in `decideCertificate` (approval to VERIFIED),
      `decideRevision`/`publishApproved` (BUYING_GUIDE, CERTIFICATE_GUIDE,
      TREATMENT copy) and `publishProduct` (DRAFT→ACTIVE while
      `price_evidence != 'VERIFIED'`). The approver must differ from the last
      recorded editor (certificate: last HUMAN `verification_events` actor;
      CMS: revision `editor_id`; product: last ADMIN `audit_logs` actor); no
      recorded editor satisfies the rule and is recorded as
      `editor_unrecorded: true`. Both actors go into `audit_logs.diff` and the
      after-state. A refusal is 403 `TWO_PERSON_REQUIRED` before any write.
      CMS audit rows are now actually written (`createCmsAuditWriter`); before
      this, the CMS handler's audit seam was a no-op.
- [ ] C10 Audit completeness test sweep across every admin endpoint
- [ ] C11 Acceptance: every privileged mutation has a before/after audit row,
      proven by a test that enumerates the routes

## Track D — Vendor portal (P5)

- [ ] D1 Vendor sign-in (same session model, role-scoped to `vendor_members`)
- [ ] D2 Onboarding: application, KYC document upload, terms acceptance
- [ ] D3 Vendor dashboard: stock, orders, payouts, performance
- [ ] D4 Stock intake: create gemstone/setting with images and provenance,
      `state='DRAFT'` until platform approval
- [ ] D5 Per-vendor pricing and availability
- [ ] D6 Order fulfilment: accept, ship, tracking, cancel
- [ ] D7 Returns: vendor-initiated request routed to admin decision
- [ ] D8 Payout statements reconstructed from `vendor_ledger`
- [ ] D9 Acceptance: a vendor registers, is approved, lists stock, receives an
      order, and sees an accurate payable balance

## Track E — Multivendor commerce execution (P6)

- [ ] E1 Vendor-scoped inventory reservation (all-or-nothing per vendor)
- [ ] E2 Cart lines carry `vendor_id`; totals grouped per vendor
- [ ] E3 Order placement splits into `order_vendor_allocations` atomically with
      the order
- [ ] E4 Per-vendor shipping and tax
- [ ] E5 Commission posting to `vendor_ledger` on capture; reversal on refund
- [ ] E6 Payout run: select releasable allocations → ledger entries → statement
- [ ] E7 Dispute ownership and routing
- [ ] E8 Vendor-scoped search and AI tools — no cross-vendor leakage, proven by
      a test that fails if a query omits the vendor predicate
- [ ] E9 Acceptance: one order spanning two vendors splits, ships, refunds and
      pays out correctly

## Track F — AR / 3D (P7)

- [ ] F1 Decide the model source (photogrammetry vs CAD vs vendor-supplied) —
      this is a client decision, not an engineering one
- [ ] F2 Add `three` (ADR required) and replace the simulated `ThreeDViewer`
      with a real WebGL2 renderer + OrbitControls
- [ ] F3 GLB ingestion: validate against `WEBAR_BUDGETS`, store, version
- [ ] F4 Ring-size calibration and `FitRule` resolution per product
- [ ] F5 Camera try-on with in-memory frames only (NFR-06 preserved)
- [ ] F6 Device capability matrix + fallback ladder
- [ ] F7 Acceptance: a real ring renders in 3D and is tried on from a phone

## Track G — AI depth (P8)

- [ ] G1 Real model provider adapter (network calls, streaming, timeouts)
- [ ] G2 Real embedding model; delete the `Math.sin(hash)` placeholder
- [ ] G3 Embedding backfill stage (the one unimplemented migration stage)
- [ ] G4 Hybrid retrieval + reranker; measure nDCG and recall on a labelled set
- [ ] G5 Vendor-scoped retrieval and tool authorisation
- [ ] G6 Evaluation suite in CI on every prompt/model change
- [ ] G7 Cost ledger persisted, budgets enforced per surface
- [ ] G8 Acceptance: grounding ratio ≥ 0.60 with a real model, and a NULL
      structured field still produces an honest refusal

## Track H — Production gate (P9)

- [ ] H1 Dockerfile + deploy pipeline + staging environment
- [ ] H2 `instrumentation.ts` wiring OTel and Sentry with real DSNs
- [ ] H3 Load tests against NFR-02/NFR-03
- [ ] H4 Security matrix including AI rows
- [ ] H5 Chaos/degradation drills (Redis down, vector down, provider down)
- [ ] H6 Backup + restore drill
- [ ] H7 Capacity statement measured, replacing the non-claim
- [ ] H8 Runbooks with named owners
- [ ] H9 Acceptance: cutover checklist fully green

## Track I — Repository hygiene

- [ ] I1 Move `.opencode/skills` out of the tracked tree (594 of 1,159 files)
- [ ] I2 Remove the 13,326-line chat transcript from the repository root
- [ ] I3 One documented start command per process
- [ ] I4 CI runs AI, observability and E2E suites, not just the current five

---

## Definition of done for the whole backlog

1. Every box ticked with a command whose output proves it.
2. Full suite green on a **disposable** database, twice in a row (idempotency).
3. `next build` succeeds with no database present.
4. Only then: apply migrations to `maihan_dev`, with explicit client approval.
