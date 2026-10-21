# ADR-031 — Vendor payout, commission and vendor-of-record economics

- **Context:** The vendor portal is real but financially hollow. It covers
  onboarding, profiles, product lifecycle and moderation, inventory, and
  multi-vendor order fulfilment — the module header names "Vendor Onboarding,
  Profile, Product Lifecycle & Moderation, Asset Validation, Inventory
  Management, and Multi-Vendor Order Fulfilment"
  (`packages/db/src/vendor/vendor-repository.ts:1-19`), with the exported
  surface from `getVendorById` (:187) through `moderateVendor` (:271) and
  `updateVendorOrderFulfillment` (:954). Vendor attribution on order lines is
  resolved through `products.structured_extra->>'vendor_id'`
  (`vendor-repository.ts:913`); per-line fulfilment rows exist as `fulfillments
  (order_id, order_item_id, kind, state, ... shipped_at, delivered_at)`
  (`packages/db/migrations/0009_commerce.sql:235-246`, indexed per order item
  in `0022_integrity_indexes.sql:80-81`). There is no commission rate, payout
  record, vendor statement, or vendor invoice anywhere in `packages/db` — a
  search for `commission`, `payout` and `vendor_statement` across its SQL and
  TypeScript returns zero matches; `orders` and `order_items`
  (`0009_commerce.sql:96-`, :137) carry no vendor or settlement columns. The
  regional tax rows (`tax_inclusive`, `default_tax_rate`; AE 5.00, TH 7.00,
  `0019_storefront_schema.sql:230-238`) are display/regional taxes, not vendor
  economics.

- **Alternatives:**
  - (a) Consignment model: Maihan is merchant of record; vendors are paid on
    delivery of their lines, net of a commission. Maihan invoices the customer;
    the commission rate becomes a first-class, versioned database fact with
    per-vendor overrides; payout records and statements must reconcile against
    delivered `fulfillments`; refunds need clawback logic.
  - (b) Marketplace model: vendors are sellers of record; the PSP splits
    payment at capture. The payment-provider contract grows split/settle
    capabilities; vendors issue their own invoices and carry their own
    VAT/tax registration; Maihan books a platform fee; reconciliation spans the
    PSP ledger plus vendor ledgers; refunds split too.
  - (c) Single-vendor exhibition model: no payouts at all — Maihan sells every
    line; the portal's vendor views remain operational (moderation,
    fulfilment) with vendor attribution used for reporting only.

- **Decision (proposed, no branch adopted yet):** No branch is adopted. All
  three are recorded as live alternatives; the choice is a client decision
  because it determines merchant-of-record status, invoicing and tax
  obligations, none of which is resolvable from repository evidence.
  `[INFERRED / PROPOSED]`

- **Reason:** The portal already implies a multi-vendor operational reality
  (per-line fulfilment, vendor-scoped order views) while the money model is
  undefined. Choosing nothing leaves a silent gap: the first payout feature
  would have to invent merchant-of-record status, tax treatment and commission
  mechanics in one motion. Deciding the model first lets the schema follow —
  commission rate, payout and statement tables differ materially between (a),
  (b) and (c) — and keeps the invariant that Postgres remains the sole copy of
  a money fact (repository §10).

- **Consequences:** (a) Maihan invoices customers and recognizes revenue, then
  remits; requires commission-rate versioning, payout batching keyed to
  `delivered_at` on `fulfillments`, vendor statements, refund clawback, and
  vendor tax-inclusive pricing rules per region table. (b) Requires the PSP
  split capability as a hard gate before launch, vendor KYC/tax data, and
  three-way reconciliation (order, PSP split, vendor ledger); Maihan's exposure
  to vendor disputes is contractual rather than financial. (c) Requires no
  financial schema, but the portal's vendor_id attribution must never be
  presented to vendors as earnings; existing `fulfillments` semantics stay
  unchanged. Under (a) and (b) every payout row must carry provenance back to
  order and order_item ids, mirroring the existing index pattern.

- **Evidence:** Portal scope and vendor attribution as cited above in
  `packages/db/src/vendor/vendor-repository.ts`; `fulfillments` definition at
  `packages/db/migrations/0009_commerce.sql:235-246`; its per-item index at
  `packages/db/migrations/0022_integrity_indexes.sql:80-81`; absence of any
  commission, payout or statement object verified by grep over
  `packages/db/migrations/*.sql`, `packages/db/storefront-migrations/*.sql` and
  `packages/db/src/**/*.ts`; regional tax rows at
  `packages/db/storefront-migrations/0019_storefront_schema.sql:230-238`.

- **Status:** Proposed — awaiting client ratification. Per repository rule,
  this draft is recorded in `docs/adr/` because that directory holds future
  ADRs; it must not be marked Accepted, and no commission, payout or statement
  schema may land until the client ratifies a model explicitly.
