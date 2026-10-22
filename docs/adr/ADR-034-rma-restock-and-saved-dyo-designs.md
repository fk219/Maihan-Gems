# ADR-034 — RMA/returns with restock, and saved DYO designs: proposed schema surfaces

- **Status:** Proposed (awaiting client ratification; no migration is authored
  until then — locked-schema discipline, AGENTS.md §6.8).

- **Context:** Phase 3 rows P3-3 (saved DYO designs) and P3-4 (RMA/returns +
  restock) both name capabilities whose schema surfaces do not exist in the
  locked schema (74 tables; `packages/db/migrations/0001…0022`). The schema is
  LOCKED (PROJECT_SOURCE_OF_TRUTH.md): a change is proposed here, not
  implemented. What exists today and what is missing:

  - Returns today stop at the refund layer: `refunds` rows carry `reason`,
    `kind`, and a `provider_refund_id`, audited through `executeRefund` with a
    refundable-state guard (packages/db/src/commerce/refund-repository.ts). No
    `return_authorizations`-class table, no inspection/disposition record, no
    restock action exist — a "return" is currently a refund with a reason.
  - Saved designs: the DYO configurator produces a live cart line through the
    checkout session snapshot, and `dyo_snapshots` keep pricing components for
    the order, but there is no owner-scoped "my designs" list; users cannot
    save, re-open, duplicate or delete a configuration without re-running the
    configurator.

- **Proposal (both surfaces follow the locked conventions — UUID PKs,
  evidence-ordered states, CHECK-guarded transitions, audit on privileged
  actions, append-only events):**

  1. **`return_authorizations` + `return_items`**
     - `return_authorizations(id, order_id FK, state
       {REQUESTED→APPROVED→RECEIVED→RESOLVED | REJECTED}, reason,
       disposition {RESTOCK, QUARANTINE, DISPOSE}, issued_by, decided_at,
       created_at, updated_at)`; audit rows on every transition; the restock
       action writes the same guarded conditional updates the reservation
       hold/reversal path uses (one stone or one pair, `version`-checked) so
       restock cannot double-inventory.
     - Only items whose order state ∈ {PAID, FULFILLED} may open an RMA;
       high-value orders (the `HIGH_VALUE_ORDER_FLAGGED` audit row) require an
       ADMIN review before APPROVED.
     - INV-01 protected: restock targets the ORIGINAL gemstone rows —
       consumed-at-order stones may return to ACTIVE only for non-consumed
       classes; setting variants are not consumable and always restock.
  2. **`saved_dyo_designs`**
     - `(id, user_subject FK, name, configuration JSONB (the validated DYO
       request shape, not raw freeform), price_quote snapshot, state {ACTIVE,
       ARCHIVED}, created_at, updated_at)`.
     - Owner-only access through the same application-service seam (no header
       or query-param identity — the U-03 contract); duplicate creates a NEW
       row; delete is state=ARCHIVED (audit-visible, not hard delete).
     - Re-opening a design re-runs the DYO conversion/re-price path so the
       user sees CURRENT pricing truth, never a stale frozen number.

- **Alternatives considered:**
  - *(a)* Reuse `refunds.reason` free-text for returns — rejected: no
    disposition, no restock, no operator workflow; audit would hold the
    business state of returns in an untyped column.
  - *(b)* Keep designs client-side (localStorage) — rejected: the design is a
    priced, evidence-bearing artefact; losing it to a cache clear breaks the
    "Design Your Own" promise and produces no audit trail.
  - *(c)* Do nothing until Phase 2 data lands — rejected for the surfaces
    themselves (customer-visible feature), retained for the DATA volume
    question: these tables start empty and do not depend on the corpus.

- **Consequences:** two new tables + enums in the next migration (0023),
  `expected-schema.ts` updated in lockstep, repositories + handlers + admin
  consoles follow only after acceptance. RLS: both tables are user-scoped —
  `withRlsContext` applies to reads; restock transitions stay in the
  application service (system actor) and are audited, mirroring ADR-029
  positions.
