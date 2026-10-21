# ADR-033 — FX source and checkout currency lock

- **Context:** Display FX has no approved source. The storefront falls back to
  a hardcoded table `{USD: 1, AED: 3.6725, THB: 34.5}`
  (`apps/web/src/lib/storefront-data.ts:31`), duplicated as `DEFAULT_FX` in
  `apps/web/src/lib/currency.ts:5-9`; `getFxRates` reads the most recent
  `fx_rates` rows for base USD and silently returns the hardcoded table when
  Postgres is unreachable (`apps/web/src/lib/storefront-data.ts:162-180`).
  `fx_rates` exists only in the storefront migration chain
  (`packages/db/storefront-migrations/0019_storefront_schema.sql:240-257`),
  seeded with source `'manual'` — no approved FX API feeds it. There is no
  currency lock at checkout: carts are created with `currency: 'USD'`
  (`packages/db/src/commerce/cart-repository.ts:107`; column default
  `CHAR(3) NOT NULL DEFAULT 'USD'`, `packages/db/migrations/0009_commerce.sql:67`),
  whose snapshot is "advisory only, never authoritative"
  (`0009_commerce.sql:70`); the order takes the currency straight from the
  session's pricing snapshot (`orders.currency CHAR(3) NOT NULL DEFAULT 'USD'`
  plus `pricing_snapshot` "frozen and auditable", `0009_commerce.sql:102,108`;
  copied at `packages/db/src/commerce/order-repository.ts:345`). Orders and
  payments therefore carry a currency but no FX rate; the storefront's
  own-schema `cart_items.fx_rate_used` / `price_locked_at` columns
  (`0019_storefront_schema.sql:404-406`) are not referenced by the active
  commerce chain. Display rounding today is 0 digits at 1000 and above, else 2
  (`apps/web/src/lib/currency.ts:40-44`).

- **Alternatives:**
  - (a) Approved FX API with a daily snapshot into `fx_rates`, plus checkout
    locking the rate into `pricing_snapshot` at placement: display and charge
    derive from the same stored rate; the api rate is auditable.
  - (b) Static published table amended quarterly (an editorial rate, not a
    market feed): cheap, deterministic, and honest if published as such.
  - (c) USD-only charging: display FX in AED/THB stays informational;
    conversion happens on the card issuer's side; orders always charge USD.

- **Decision (proposed, no branch adopted yet):** No branch is adopted. All
  three are recorded as live alternatives; the choice is a client decision
  because it sets the charge-currency promise and a reconciliation posture,
  neither of which is resolvable from repository evidence. `[INFERRED /
  PROPOSED]`

- **Reason:** Today a customer can display a THB price, produce an order whose
  authoritative totals are USD (`order-repository.ts:345`), and pay a card
  amount computed by neither system — three amounts with no shared rate. That
  is a display-versus-charge inconsistency, not a rounding nit. Whatever
  branch is chosen, the locked chain's order snapshot stays the single
  authoritative money record; the decision only fixes where the conversion
  rate lives and when it is frozen.

- **Consequences:** (a) Requires a new external dependency and an ADR under
  repository rule 5, a daily ingest job writing `fx_rates` with source and
  `fetched_at`, and a checkout step that stamps the applied rate (and its
  snapshot time) into the frozen `pricing_snapshot`; reconciliation compares
  order total against payment amount at one stored rate; refund math reuses
  the same rate; the hardcoded fallback survives only for display when the
  DB is down and must be flagged as such. (b) Requires a documented quarterly
  amendment process and a rate effective-date; wording must say rates are
  approximate and the charged amount is in the order currency; reconciliation
  is trivial because the rate never moves between display and charge within a
  quarter. (c) Requires no ingest, but PDP/cart/checkout wording must show
  converted figures as indicative only; PSI/DCC claims by issuers sit outside
  reconciliation; customer disputes about the shown THB/AED figure against the
  USD charge become a support-text problem. Under every branch the frozen
  order snapshot remains the truth for payments, refunds and reports.

- **Evidence:** Hardcoded fallback at `apps/web/src/lib/storefront-data.ts:31`
  and duplicated constants at `apps/web/src/lib/currency.ts:5-9`; fallback
  path at `apps/web/src/lib/storefront-data.ts:162-180`; manual seed of
  `fx_rates` at
  `packages/db/storefront-migrations/0019_storefront_schema.sql:240-257`;
  unused `fx_rate_used` / `price_locked_at` at
  `packages/db/storefront-migrations/0019_storefront_schema.sql:404-406`;
  USD-pinned cart creation at `packages/db/src/commerce/cart-repository.ts:107`
  with column default and advisory-snapshot comment at
  `packages/db/migrations/0009_commerce.sql:60-71`; order currency and frozen
  snapshot at `packages/db/migrations/0009_commerce.sql:96-118` and
  `packages/db/src/commerce/order-repository.ts:345`; rounding rules at
  `apps/web/src/lib/currency.ts:40-44`.

- **Status:** Proposed — awaiting client ratification. Per repository rule,
  this draft is recorded in `docs/adr/` because that directory holds future
  ADRs; it must not be marked Accepted, and no FX ingestion, rate stamping, or
  currency-lock change may land until the client ratifies a branch explicitly.
