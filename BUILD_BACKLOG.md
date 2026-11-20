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
- [x] P3.1 product publish/unpublish with gate V15 + audit
- [x] P5/P6.1 vendor schema, lifecycle state machine, commission split, ledger
- [x] ADR-026 multivendor, ADR-027 sessions

---

## Track A — Media and the working store (P3)

- [ ] A1 `packages/db/src/media/storage.ts` — `ObjectStorage` port
      (`put`, `signGet`, `delete`, `head`) + `LocalDiskStorage` driver
- [ ] A2 `S3CompatibleStorage` driver (R2/S3) — no new SDK unless ADR; use
      signed HTTP against the S3 API
- [ ] A3 `assets` pipeline: fetch source URL → validate content type/size →
      upload → set `processing_state='READY'`, `storage_key`, `storage_provider`
- [ ] A4 Backfill command `assets:backfill` — idempotent, resumable, explicit
      `SKIPPED` reason per row (never a silent drop)
- [ ] A5 `GET /api/v1/media/{assetId}` — signed redirect, cache headers
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
- [ ] B5 Tax configuration and calculation on order placement
- [ ] B6 Shipping rates and selection
- [ ] B7 Acceptance: sandbox card charge → order → confirmation email →
      refund, all reconciling to the cent

## Track C — Admin modules (P4, the 11 remaining Phase-12 tasks)

- [ ] C1 Catalogue admin: bulk edit, preview diff, bounded undo window
- [ ] C2 Navigation editor + redirect manager (bulk import of 44,218 rows)
- [ ] C3 SEO metadata editor
- [ ] C4 Migration console: batches, counts, conflicts, quarantine
- [ ] C5 Conflict resolution UI — never silent overwrite (328 open conflicts)
- [ ] C6 Derived-identity approval queue — per-row approve/reject (221 rows,
      INV-08)
- [ ] C7 Certificate review queue + anomaly triage
- [ ] C8 AI operations console: conversations, tool audit, guardrail events,
      evaluation runs
- [ ] C9 Two-person approval enforced for trust-bearing content
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
