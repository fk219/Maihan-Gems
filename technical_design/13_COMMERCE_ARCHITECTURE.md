# 13 COMMERCE ARCHITECTURE

**Package:** `technical_design/` doc 13 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 11.5, 19.6, 24, 25, 30.
**Evidence status:** `[OBSERVED]` for the four-step funnel; `[UNKNOWN]` for provider, tax, shipping, discounts, refunds; `[INFERRED / PROPOSED]` for everything else.

---

## Purpose

Define cart, checkout, payment abstraction, orders, order items, pricing snapshots, inventory reservation, refunds, add-ons, idempotency and webhook processing.

## Bounded contexts

```text
Cart -> Checkout -> Payment -> Order -> Fulfillment
           |          |         |
           |          +-> Refund
           +-> Inventory reservation
```

Each owns its tables and its state machine. They communicate through application services and domain events, never by direct table writes.

| Context | Tables |
|---|---|
| Cart | `carts`, `cart_items` |
| Checkout | checkout session (Redis-backed session plus `orders` on commit) |
| Payment | `payments`, `refunds` |
| Order | `orders`, `order_items`, `order_events`, `fulfillments` |
| Promotion | `discounts`, `product_addons` |
| Inventory | `products.availability`, reservations |

## Evidence position

| Aspect | Status |
|---|---|
| Four-step checkout funnel | `[OBSERVED]` `/cart`, `/cart/order-summary`, `/cart/payment-order`, `/cart/secure-payment` |
| Payment provider | `[UNKNOWN]` |
| Tax calculation | `[UNKNOWN]` |
| Shipping carriers and rates | `[UNKNOWN]` |
| Discount mechanics | `[UNKNOWN]` |
| Refund policy | `[UNKNOWN]` |
| Order numbering | `[UNKNOWN]` |
| Financing product | `[OBSERVED]` as a route; `[UNKNOWN]` as a mechanism |
| Protection plan | `[OBSERVED]` as a route; `[UNKNOWN]` as a mechanism |

`[INFERRED / PROPOSED]` choices where evidence is silent: order numbers `MG-YYYY-NNNNNN`; free shipping above a configured threshold; refunds as request plus approval; financing and protection as `product_addons`.

## The four steps

| Source URL `[OBSERVED]` | Target endpoint | Server checkpoint |
|---|---|---|
| `/cart` | `POST /checkout/sessions` | Validate cart, re-price, freeze snapshot, reserve stock |
| `/cart/order-summary` | `POST /checkout/sessions/{id}/shipping` | Address and shipping method validated |
| `/cart/payment-order` | `POST /checkout/sessions/{id}/payment` | Payment intent created |
| `/cart/secure-payment` | `POST /checkout/sessions/{id}/confirm` | Order placed |

The existence of four steps is observed. Their internal semantics are proposed. Each step is a separate server-side checkpoint, so a customer cannot skip re-validation by jumping the route.

## Cart

```text
state: ACTIVE -> CONVERTED | ABANDONED | EXPIRED
```

| Rule | Detail |
|---|---|
| Guest carts | Supported; identified by a server-held anonymous session |
| Merging | A guest cart merges into the customer cart on sign-in, re-priced at merge time |
| Pricing | Always re-derived server-side. `pricing_snapshot` on the cart is **advisory only** and never authoritative |
| Expiry | Configurable; a sweeper job transitions stale carts to `EXPIRED` |
| Uniqueness | `UNIQUE (cart_id, product_id, configuration_id)` |

`cart_items.configuration_id` links a cart line to a DYO configuration. A line may be a migrated CONFIGURED product, a DYO configuration, or a SETTING_ONLY product.

## Checkout session

A checkout session is a short-lived server-side object holding: cart id, validated line items, a frozen `pricing_snapshot`, the chosen shipping address, the selected shipping method, the reservation id, and an expiry (30 minutes).

It is not a separate table in the locked schema; it is a Redis-backed object plus the eventual `orders` row. The durable record of what was agreed is `orders.pricing_snapshot` plus the `order_items` snapshots. This avoids inventing a table the locked schema does not have.

## Price snapshots and immutability

Once an order is placed, money and configuration are frozen:

| Field | Frozen content |
|---|---|
| `orders.pricing_snapshot` | Full breakdown, rule version, per-line components |
| `orders.shipping_address`, `billing_address` | As submitted |
| `order_items.configuration_snapshot` | Full configuration at purchase |
| `order_items.gem_snapshot` | Stone specifications as sold |
| `order_items.document_snapshot` | Certificate references as sold |
| `order_items.sku_snapshot`, `title_snapshot` | Denormalised for stable display |

Later catalogue edits never alter a placed order. Cancellation and refund are state transitions on the order plus new rows; the original totals are never edited. This is why snapshots exist at all.

## Payment abstraction

```ts
interface PaymentProvider {
  authorize(input: AuthorizeInput): Promise<AuthorizeResult>;
  capture(input: CaptureInput): Promise<CaptureResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(req: RawRequest): VerifiedWebhook;   // verify BEFORE parse
}
```

- No provider SDK appears in domain or application code; only in `integrations`.
- Amounts are re-derived server-side from `order_items`; a payload or client amount is ignored.
- Webhooks are the only trusted channel for state transitions, reconciled against `payments`.
- One adapter ships in Phase 6. Shopify or any PSP is behind this boundary, so the domain model never becomes provider-shaped (charter section 16).
- `provider` and `provider_payment_id` are recorded for reconciliation and are `[UNKNOWN]` until chosen.

## Orders

```text
state: PENDING_PAYMENT -> PAID -> IN_FULFILLMENT -> FULFILLED
                          |            |
                          +-> CANCELLED, REFUNDED, PARTIALLY_REFUNDED
```

| Rule | Detail |
|---|---|
| Number | `MG-YYYY-NNNNNN`, generated at placement, unique, never reused |
| Version | `version INTEGER` for optimistic concurrency |
| Idempotency | `idempotency_key` unique; a replay returns the original order |
| Timeline | Every transition appends to `order_events`; never updated |
| Audit | Every transition also writes `audit_logs` |

Order state transitions are a pure function `(current, event) -> next` in `packages/domain`, fully unit-tested including illegal transitions.

## Inventory reservation

`[UNKNOWN]` in the source: `[OBSERVED]` only `schema.org/InStock` on 1,024 products, with no quantities.

`[INFERRED / PROPOSED]`, deliberately conservative because each stone is a unique physical object:

| Situation | Policy |
|---|---|
| Unique stone or pair in a CONFIGURED product | Reserve at checkout step 1; 30-minute TTL |
| Pair in earrings | Reserve **both stones atomically**; if either fails, neither is reserved |
| SETTING_ONLY or READY_MADE | No reservation; made to order |
| Reservation expiry | Sweeper job releases and emits `InventoryReleased` |
| Stock change during a reservation | Reservation wins until TTL; the customer is notified if it cannot be honoured |

Reservations live in Postgres inside the checkout transaction, **not** in Redis, so a Redis flush cannot release inventory that is still committed downstream.

## Refunds

```text
state: REQUESTED -> APPROVED -> PROCESSING -> SUCCEEDED
                                |              |
                                +-> FAILED    +-> REJECTED
```

`[UNKNOWN]` policy. `[INFERRED / PROPOSED]`: refund is a **request**; approval is a separate authorised action; refunds above a configured threshold require dual authorisation; refund state is reconciled with the provider via webhook; partial refunds create new rows and never edit `payments.amount`.

## Add-ons

`[OBSERVED]` `/financing` and `/extend-protection-plan` prove financing and protection/warranty are real products. `[INFERRED]` they are `product_addons` of type `FINANCING` and `PROTECTION_PLAN`, attached at checkout as **separate order lines** so a refund can target merchandise independently of a plan.

Financing is additionally exposed as a `discount_type` for the promotional representation; the canonical record is the add-on.

## Discounts

`[UNKNOWN]` mechanics. `[INFERRED / PROPOSED]` `discounts` supports percentage, fixed amount, free shipping, financing and protection plan, with `scope` as JSONB over varieties, categories and products, plus `min_subtotal`, `valid_from`/`valid_to`, `max_redemptions`, `redemption_count` and `per_customer_limit`.

Validation is server-side and complete: scope, window, minimum, per-customer limit, redemption count. A client-validated discount is never trusted. Redemption count is incremented inside the placing transaction, so concurrent orders cannot exceed `max_redemptions`.

## Idempotency

| Table | Key |
|---|---|
| `orders` | `idempotency_key` unique |
| `payments` | `idempotency_key` unique |
| `dyo_quotes` | `idempotency_key` unique |
| `jobs` | `job_key` unique |
| `webhook_receipts` | `(provider, external_event_id)` unique |
| Redis | `idem:{key}` mirrors, never authoritative |

Record the request hash with the key. Same key plus same hash returns the original response; same key plus different hash is `409 IDEMPOTENCY_CONFLICT`. Database uniqueness makes this survive a Redis flush.

## Webhook processing

```text
1 read raw body
2 verify signature, constant-time
3 timestamp tolerance <= 5 minutes
4 reject 401 BEFORE parsing
5 insert webhook_receipts (provider, external_event_id)   -- conflict = already seen, return 200
6 respond 2xx immediately
7 enqueue integrations.payment.process
8 reconcile: load order, re-derive expected amount, compare, transition state
9 append order_events and audit_logs
```

Step 5 is the dedupe that makes at-least-once delivery safe. Step 8 never trusts a payload amount.

## Validation rules

1. Quantity is a positive integer within a configured maximum.
2. Engraving text length-capped; charset-restricted.
3. Address validated per country; country code is ISO-3166 alpha-2.
4. Cart and checkout re-price on every request; a client total is ignored.
5. Order placement requires a valid, unexpired checkout session.
6. Refund amount is positive and does not exceed the captured amount.
7. `Idempotency-Key` is mandatory on every state-creating request.

## Error handling

| Code | Status | Meaning |
|---|---|---|
| `PRICE_CHANGED` | 409 | Server total differs from the client total; the new total is returned so the UI can require explicit consent |
| `OUT_OF_STOCK` | 409 | Reservation impossible |
| `CART_EXPIRED` | 409 | Cart past TTL |
| `CHECKOUT_SESSION_EXPIRED` | 409 | Reservation TTL elapsed |
| `DISCOUNT_INVALID` | 422 | Scope, window, minimum or limit failed |
| `REFUND_EXCEEDS_CAPTURED` | 422 | Refund greater than captured |
| `IDEMPOTENCY_CONFLICT` | 409 | Key reused with a different payload |
| `PAYMENT_FAILED` | 402 | Provider declined |

`PRICE_CHANGED` is the anti-price-manipulation control. The client may display a stale price; it can never commit one.

## Security boundaries

- Card data never reaches our servers; provider-hosted fields only.
- Payment state is trusted only from a verified webhook.
- Order and payment reads are RLS-scoped and policy-checked.
- Refund approval requires a distinct authorised role above the threshold.
- No amount in any payload is trusted; amounts are re-derived.

## Observability

Funnel metrics per step, order conversion rate, AOV, refund rate, payment success rate and capture latency, webhook lag and signature-failure count, reservation expiry count, discount rejection reason. Alerts on payment failure spikes and webhook lag.

## Testing requirements

| Test | Proves |
|---|---|
| Four-step E2E | Each step is a distinct server checkpoint |
| Price tampering | Modified client price rejected with 409 |
| Idempotency replay | Original result returned, no duplicate order or payment |
| State machine | Legal and illegal transitions, including terminal states |
| Webhook forgery and replay | Rejected before parse; duplicates deduplicated |
| Amount re-derivation | A tampered webhook amount is ignored |
| RLS cross-customer | Customer A cannot read B's order |
| Reservation | Atomic pair reservation; TTL release |
| Discount limits | Concurrency cannot exceed `max_redemptions` |
| Refund bounds | Refund cannot exceed captured |
| Snapshot immutability | Catalogue edits do not alter a placed order |

## Failure modes

| Failure | Behaviour |
|---|---|
| Payment provider down | Checkout unavailable; cart intact; orders stay `PENDING_PAYMENT` |
| Webhook delayed | Order stays `PENDING_PAYMENT`; a sweeper reconciles |
| Webhook signature failure | 401, no parse, alert on spike |
| Reservation expiry mid-payment | Order creation blocked with `CHECKOUT_SESSION_EXPIRED`; user restarts checkout |
| Redis flush | Carts rehydrate from Postgres; reservations unaffected |
| Discount service error | Discount silently not applied; the price difference is never negative |

## Implementation constraints

1. Orders are immutable after placement; changes are transitions plus new rows.
2. Amounts are always re-derived server-side.
3. Payment is the only trusted source of payment state.
4. Idempotency is database-enforced, not Redis-enforced.
5. Verify webhooks before parsing.

## Evidence status

`[OBSERVED]` for the four-step funnel, the financing route and the protection-plan route. `[UNKNOWN]` for provider, tax, shipping, discount and refund mechanics. `[INFERRED / PROPOSED]` for every mechanism described. The payment provider remains an **explicit open decision** until Phase 6 (doc 33).