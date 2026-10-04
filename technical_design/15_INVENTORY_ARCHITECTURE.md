# 15 INVENTORY ARCHITECTURE

**Package:** `technical_design/` doc 15 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 4.2, 24.2, 25, 30.
**Evidence status:** `[OBSERVED]` minimal; `[UNKNOWN]` for mechanics; `[INFERRED / PROPOSED]` for the design.

---

## Purpose

Define inventory for a small-batch, made-to-order, one-of-a-kind domain where every stone is a unique physical object.

## Evidence position

`[OBSERVED]` The source reported `schema.org/InStock` for **1,024 of 1,024** products, with no quantities, no per-unit stock, no reservation and no backorder evidence.

`[UNKNOWN]` Inventory mutation, reservation semantics, backorder, fulfilment and stock-keeping.

This is the weakest-evidenced domain in the platform, and the design below is therefore explicitly `[INFERRED / PROPOSED]` and deliberately conservative.

## Model: no numeric stock

| Decision | Rationale |
|---|---|
| A loose stone or pair is a single unit | `[VERIFIED]` each `gem_ref` is one physical object |
| `gemstones.availability BOOLEAN` is authoritative | A numeric count would only ever be 0 or 1 |
| `setting_variants.availability BOOLEAN` is a catalogue flag, not stock | `[OBSERVED]` settings sell without a stone; made to order |
| No stock column exists in the locked schema | Inventing one would redesign the validated schema |
| Reservations are created at checkout with a 30-minute TTL | Standard practice; prevents overselling during payment |

Adding a quantity column would require an ADR superseding the validated schema. It is not justified.

## Availability states

Three states, expressed honestly, because the AI and search both consume them:

| State | Representation | Search | AI | UI |
|---|---|---|---|---|
| Available | `availability = true`, `availability_checked_at` recent | Eligible, x1.05 boost | May state "available" | In stock |
| Unavailable | `availability = false` | Eligible, demoted | Must not promise | Sold out |
| Unknown | `availability = true` but check older than the freshness window | Eligible, no boost | Must say availability is unconfirmed | "Check availability" |

The third state is the one that protects against the most damaging AI failure: converting Unknown into Available. FR-SEARCH-06 requires it, and doc 18's refusal rules implement it.

Freshness window: configurable, default 15 minutes, matching the maximum Redis availability cache TTL.

## Reservation

```text
reserve(productId, customerId):
  transaction:
    1 SELECT ... FOR UPDATE the gemstones row
    2 assert availability = true
    3 assert no active reservation exists for this stone
    4 insert the reservation (checkout session), expires_at = now() + 30 min
    5 emit InventoryReserved
```

| Situation | Policy |
|---|---|
| Unique stone in a CONFIGURED product | Reserve at checkout step 1, 30-minute TTL |
| Pair in earrings | Reserve **both stones atomically**; if either is unavailable, neither is reserved |
| SETTING_ONLY, READY_MADE | No reservation; made to order |
| Reservation expiry | Sweeper job releases and emits `InventoryReleased` |
| Stock change during a reservation | Reservation wins until TTL; customer notified if it cannot be honoured |
| Payment failure | Release immediately, emit `InventoryReleased` |

Atomic pair reservation is the important correctness property. A pair is two stones; a partially reserved pair is a broken configuration.

Reservations live in Postgres inside the checkout transaction, **not** in Redis. A Redis flush must not release inventory that is still committed downstream.

## Caching

| Data | Cache | TTL | Invalidation |
|---|---|---|---|
| `products.availability` | Redis `avail:{productId}` | 15s max | `InventoryReserved`, `InventoryReleased`, `OrderCreated`, and any admin change |
| Availability summary by product set | Redis `avail:set:{hash}` | 15s | same |

Deliberately the shortest TTL in the cache inventory. This is the one place where a slightly wrong answer is a lost or oversold sale, so the TTL is 15 seconds and every write invalidates.

Cache failure: bypassed, reads go to Postgres. Never a wrong answer.

## Bulk changes

Admin availability changes are bulk operations with preview, approval, one `audit_logs` row per affected entity, and bounded undo. A bulk change to more than a configured threshold requires dual authorisation, because it can affect live inventory.

## Fulfilment

`fulfillments` supports `SHIPMENT`, `PICKUP`, `APPRAISAL`, `ENGRAVING`, `CERTIFICATE`, `WHITE_GLOVE_VIDEO`. The last three exist because those artefacts were observed in the source: appraisal images at `/previewandpast/{sku}/appraisal/`, and 360-degree "white glove" video at `phone-video.naturalgemstones.com` `[OBSERVED]`.

`carrier`, `tracking_number` and `tracking_url` are present but `[UNKNOWN]` in the source; they remain null until a carrier is chosen.

## Integration with search and AI

| Consumer | Rule |
|---|---|
| Search | Filters on `availability AND state='ACTIVE'`; boosts available items; never hides unavailable items silently |
| AI tool `search_inventory` | Returns availability plus its freshness; the AI must not state availability when freshness has lapsed |
| AI tool `get_product` | Same |
| Cart | Re-checks availability server-side inside the transaction |
| Checkout | Reserves; this is the only point reservation begins |

## Validation rules

1. `availability` is a boolean; no numeric stock field exists.
2. A pair reservation is all-or-nothing.
3. A reservation cannot be created for an unavailable stone.
4. A reservation cannot overlap an existing active reservation for the same stone.
5. Any availability change writes an `audit_logs` row.
6. `availability_checked_at` is set by the checker, never by a client.

## Error handling

| Code | Status | Meaning |
|---|---|---|
| `OUT_OF_STOCK` | 409 | Reservation impossible |
| `ALREADY_RESERVED` | 409 | Another session holds an active reservation |
| `RESERVATION_EXPIRED` | 409 | TTL elapsed; restart checkout |
| `PAIR_RESERVATION_FAILED` | 409 | One stone of a pair unavailable; neither reserved |
| `AVAILABILITY_UNKNOWN` | 200 with flag | Returned to the AI layer, never as "available" |

## Security boundaries

- Availability is public; reservation and stock-change records are admin-only.
- Reservation creation is inside the checkout transaction, so it cannot be bypassed by calling the cart endpoint directly.
- Admin bulk availability changes are dual-authorised above a threshold and fully audited.

## Observability

Metrics: reservation success and failure by reason, reservation expiry count, pair-reservation failure count, availability-cache hit rate, `availability_checked_at` staleness distribution. Alerts on a rising `ALREADY_RESERVED` rate (possible double-booking) and on stale availability checks.

## Testing requirements

| Test | Proves |
|---|---|
| Reservation exclusivity | Two concurrent reservations for one stone: exactly one succeeds |
| Atomic pair reservation | One unavailable stone reserves neither |
| TTL release | Expired reservation frees the stone and emits `InventoryReleased` |
| Payment-failure release | Immediate release |
| Unknown availability | Search applies no boost; AI refuses to state availability |
| Bulk change audit | One audit row per affected entity |
| Redis-down | Correctness preserved, slower |

## Failure modes

| Failure | Behaviour |
|---|---|
| Double booking | `FOR UPDATE` serialises; the loser gets `ALREADY_RESERVED` |
| Reservation leak | Sweeper job; alert if the backlog grows |
| Redis flush | Reservations unaffected (Postgres); availability re-read |
| Admin bulk error | Preview plus undo; audit for every row |
| Availability never checked | `AVAILABILITY_UNKNOWN` surfaces to search and AI |

## Implementation constraints

1. No numeric stock column; the schema is frozen.
2. Reservations are Postgres, never Redis.
3. Pair reservation is atomic.
4. Unknown availability is never rendered as available.
5. Every availability change is audited.

## Evidence status

`[OBSERVED]`: `schema.org/InStock` on 1,024 of 1,024 products; settings sold without a stone; appraisal and 360-video artefacts implying fulfilment sub-types. `[UNKNOWN]`: all inventory mechanics. `[INFERRED / PROPOSED]`: the entire reservation, TTL and bulk-change design, which is stated as proposed rather than reconstructed.