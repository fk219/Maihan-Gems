# 16 PRICING ARCHITECTURE

**Package:** `technical_design/` doc 16 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 4.2, 8.8, 26.
**Evidence status:** `[OBSERVED]`/`[VERIFIED]` for the recovered data; `[UNKNOWN]` for the setting component; `[INFERRED]` for the model.

---

## Purpose

Define deterministic price computation, the component model, migration of the observed residual, and the safety rules that keep the LLM out of pricing.

## Evidence

`[OBSERVED]` Price exists only in `pages_analyzed.jsonl` (JSON-LD `offers.price` and `product.json.commercial.price`). It was never extracted into `products.jsonl` (defect D8). Deleting that file destroys all prices permanently.

`[VERIFIED]` Recovered and analysed:

| Property | Value |
|---|---|
| Products with a price | 1,024 / 1,024 |
| Currency | USD, 100% |
| Range | $1,074 - $17,599 |
| Mean | $4,210.18 |
| Distinct values | 804 |
| Availability | `schema.org/InStock` |
| `priceValidUntil` | present, e.g. `2026-10-17` |
| `price == weight x per_carat` | **0 of 1,024** |
| Ratio `price / (weight x per_carat)` | min 1.091, p25 1.693, **median 2.269**, p75 3.273, max 268.745 |
| `per_carat_price_help` | 30 distinct values, $10 - $12,000 |

`[INFERRED]` Price is a deterministic function of `(setting-variant, gemstone)`: the same stone at different settings yields different prices (`PR5681` -> $6,625 / $6,741 / $6,803 / $6,715 / $7,213 / $7,333 / $8,621 / $9,233).

**Conclusion: the gemstone component is computable; the setting and making components are `[UNKNOWN]`.**

## Component model

```text
total = gemstoneComponent
      + settingComponent
      + sideStoneComponent
      + makingComponent
      + discountComponent
      + taxComponent
```

| Component | Source | Evidence |
|---|---|---|
| `gemstoneComponent` | `price_per_carat x total_weight_ct` | `[EXTRACTED]`, validated against 1,024 observations |
| `settingComponent` | `setting_variants.base_price` or `price_entries` | `[UNKNOWN]`; migrated residual |
| `sideStoneComponent` | `price_entries` for `SIDE_STONE` | `[UNKNOWN]`; zero until defined |
| `makingComponent` | pricing configuration | `[UNKNOWN]`; explicit and separately configurable |
| `discountComponent` | `discounts` | `[UNKNOWN]` |
| `taxComponent` | tax engine | `[UNKNOWN]`; zero until chosen |

Naming the unknown component is the design decision. A single opaque total would hide a 2x factor we cannot explain and would make pricing impossible to reason about, audit or adjust. An explicit column makes the gap visible and closable.

## Migration of the setting component

For every observed `(source_url, observed_total, observed_weight, observed_ppc)`:

```text
gemstoneComponent(stone)   = price_per_carat x total_weight_ct
settingComponent(observed) = observed_total - gemstoneComponent(stone)
```

Worked example, `PR5681`: 5.98ct x $590 = $3,528; observed total $7,213; implied setting component **$3,685**.

Grouping by `gem_ref` gives the observed price for a stone across settings, from which a per-`(design, metal)` setting price is derived. For a pair, the gem component uses the **summed** per-stone weights, which is why the ratio sits near 2.0 for pairs.

Every derived value is written to `price_model_observations` with:

```text
source_url, observed_total, observed_weight, observed_ppc,
gem_component, implied_making, ratio, import_batch_id
```

and to `price_entries` with `evidence_status = 'INFERRED'`.

**Curators confirm and promote.** Until then no `INFERRED` price may be published (gate V15: no product priced from `UNKNOWN` price evidence is published). The admin UI must display the inferred badge and the residual ratio, so a curator can see immediately which rows are suspicious.

Rows with `ratio > 3.273` (the observed p75) are flagged for priority review: a ratio that high suggests either a very expensive setting or a per-stone rather than summed weight, and must be understood before publication.

## Money representation

| Rule | Detail |
|---|---|
| Storage | `NUMERIC(12,2)`; currency `CHAR(3)` ISO-4217 |
| Transport | Decimal **string**, never a JSON number |
| TypeScript | `Money = { amount: string; currency: string }` |
| Never | `float`, `double`, or any binary floating-point type in a price path |

A float in a price path fails review. This is a correctness requirement, not a style preference: 0.1 + 0.2 !== 0.3 in binary floating point, and money arithmetic must be exact.

## Computation

```ts
computePrice(input: PriceInput): PriceBreakdown {
  const gemstone = money(input.pricePerCarat * input.totalWeightCt);
  const setting  = money(resolveSettingPrice(input.settingVariantSku));
  const side     = money(sum(input.sideStones.map(s => resolveSideStonePrice(s))));
  const making   = money(config.makingAmount);
  const discount = money(validateDiscount(input));
  const subtotal = add(gemstone, setting, side, making);
  const tax      = money(applyTax(subtotal));   // zero until a tax engine is chosen
  return { ...components, total: add(subtotal, discount, tax),
           currency, pricingRuleVersion };
}
```

Pure, deterministic, versioned. `pricingRuleVersion` is written into every `dyo_price_snapshots` row and into `orders.pricing_snapshot`, so any historical total can be reproduced by re-running the exact rule version.

## Snapshots

`dyo_price_snapshots` rows are **immutable and append-only**. A price change creates a new snapshot; the old one is retained for audit. An order freezes its snapshot at placement.

A `quoteToken` references exactly one snapshot and is single-use: a consumed quote cannot be re-committed, which is what makes stale-price prevention structural rather than procedural.

## Price safety

| Control | Detail |
|---|---|
| Server-side only | No client computes a price. A client total is never trusted. |
| Re-price on read | Cart and checkout re-price on every request. |
| Mismatch | `409 PRICE_CHANGED` returning the new total, so the UI requires explicit consent |
| AI | The AI may **read** a snapshot and **explain** a breakdown. It may not compute a price, and no pricing tool exists in the registry (ADR-003) |
| Discounts | Validated server-side: scope, window, minimum, per-customer limit, redemption count |
| Concurrency | `redemption_count` incremented inside the placing transaction, so concurrent orders cannot exceed `max_redemptions` |

## Caching

`quote:{token}` in Redis, TTL to `expires_at`. The snapshot in Postgres is authoritative; the cache is an accelerator. A cache miss re-reads the snapshot; a cache hit is never used to decide a price at commit time.

`price_entries` are cached under the `taxonomy` tag for 1 hour; a price change invalidates via `ProductUpdated` and bumps the search generation (doc 25).

## Validation rules

1. Every amount is a non-negative decimal string with at most two fraction digits.
2. Currency is a supported ISO-4217 code.
3. `total == sum(components)` exactly, to the cent.
4. A `discount` never makes a total negative.
5. A `refund` never exceeds the captured amount.
6. Every published price resolves to a `price_entries` row with `evidence_status` in `OBSERVED` or `APPROVED`.
7. `pricingRuleVersion` is present on every snapshot.

## Error handling

| Code | Status | Meaning |
|---|---|---|
| `PRICE_CHANGED` | 409 | Server total differs; new total returned |
| `PRICE_NOT_FOUND` | 422 | No price entry resolves |
| `PRICE_UNVERIFIED` | 422 | Only `INFERRED` evidence exists and it is unpublished |
| `DISCOUNT_INVALID` | 422 | Scope, window, minimum or limit failed |
| `DISCOUNT_EXHAUSTED` | 422 | `max_redemptions` reached |
| `QUOTE_EXPIRED` | 409 | Snapshot past `expires_at` |
| `TAX_UNAVAILABLE` | 503 | Tax engine unreachable; fail closed, never a zero-tax guess |

`TAX_UNAVAILABLE` failing closed is deliberate. Silently charging zero tax is worse than refusing the sale.

## Security boundaries

- `price_entries.cost_component` is internal and excluded from every public DTO by construction.
- Price writes are `COMMERCE_OPERATOR` or `ADMIN_SUPER` only, and every write is audited with before and after state.
- The AI layer has no repository handle, so it cannot read `cost_component` even if a tool wanted to.

## Observability

Metrics: quote latency, price-change rate, discount application and rejection by reason, residual-ratio distribution (to detect a bad migration), price-component share (setting vs gem vs making), tax engine error rate. Alerts on a price-change rate spike (possible stale-client issue or a rogue price edit) and on any residual-ratio shift after a re-import.

## Testing requirements

| Test | Proves |
|---|---|
| Money exactness | `0.1 + 0.2 === 0.3` on the Money type |
| Component sum | `total` equals the sum of components to the cent, across random inputs |
| Gem component | Matches the observed 1,024 observations within tolerance |
| Residual derivation | Setting component is non-zero for every migrated row |
| Snapshot immutability | An update attempt fails; a new snapshot is required |
| Reproducibility | Re-running the recorded rule version reproduces the total |
| Price tampering | A modified client total is rejected with 409 |
| Discount limits | Concurrency cannot exceed `max_redemptions` |
| AI pricing | The tool registry contains no pricing-mutation tool |
| Tax failure | Tax engine error fails closed |

## Failure modes

| Failure | Behaviour |
|---|---|
| Price list changes mid-quote | Cart conversion re-prices, returns 409 |
| Discount service error | Discount not applied; the difference is never negative |
| Tax engine down | 503, fail closed |
| Residual ratio anomalous | Flagged in `price_model_observations`; curator review before publish |
| Snapshot missing | `QUOTE_EXPIRED`; re-quote |

## Implementation constraints

1. Money is `NUMERIC` end to end and a decimal string in TypeScript. No floats.
2. `total == sum(components)` exactly.
3. Snapshots are immutable and rule-versioned.
4. The AI explains prices; it never computes one.
5. No `INFERRED` price publishes without curator approval.

## Evidence status

`[OBSERVED]`/`[VERIFIED]` for all 1,024 recovered prices and the ratio distribution. `[UNKNOWN]` for the setting and making components. `[INFERRED]` for the six-component model, the residual bootstrap and the safety rules. The one recorded caveat: the residual-derived setting prices are a **labelled estimate**, not a source fact, and the UI must never present them as observed.