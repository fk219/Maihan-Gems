# 14 DYO ARCHITECTURE

**Package:** `technical_design/` doc 14 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 7.2, 11.4, 19, 34.2.
**Evidence status:** mixed, and the distinction is load-bearing. See section 1.

---

## Purpose

Define exactly: configuration lifecycle, configuration hash, compatibility engine, rule evaluation, pricing, snapshots, persistence, resume and share, cart integration.

## 1. Source observations versus target implementation

| Statement | Status |
|---|---|
| DYO URLs at `/design-your-own/review/{slug}`, 9,812 | `[OBSERVED]` |
| SKU grammar `JS{design}{metalCode}-{gemRef}` | `[OBSERVED]`, `[VERIFIED]` 1,024/1,024 |
| Configuration signals: metal, gemstone, treatment, origin, pricing | `[OBSERVED]` |
| Gemstone reference stable per stone | `[OBSERVED]`, `[VERIFIED]` 0 unstable |
| Earrings use pairs; others single | `[OBSERVED]`, `[VERIFIED]` 113/113 and 1,132/1,132 |
| Every DYO `(design, metal)` exists as a standalone setting SKU | `[OBSERVED]`, `[VERIFIED]` |
| Review is the terminal DYO step before cart | `[OBSERVED]` (`navigation-page-title: "Finalize Your"`) |
| Original DYO backend entity model | `[UNKNOWN]` |
| Original compatibility rules | `[UNKNOWN]` |
| Original pricing algorithm | `[UNKNOWN]` |
| **Ring sizing as a DYO option** | `[UNKNOWN]` - no evidence anywhere in the package |
| **Engraving as a DYO option** | `[UNKNOWN]` - named only in the reverse-engineering package's own inference |
| **Side stones as a dimension** | `[UNKNOWN]` - `all_side_stones.json` is `[]`; `Accent Stones` is an observed setting *style*, not a side-stone catalogue |

Everything below is `[INFERRED / PROPOSED]` except the eight observed rows.

## 2. Configuration hash

```ts
configurationHash = 'sha256:' + sha256(canonicalJson({
  hashVersion,               // bumped deliberately when the option set changes
  jewelleryType,
  settingVariantSku,         // e.g. 'JS1383R14'
  gemRef,                    // 'K1324' or 'PR5681'
  sideStones: [...sorted],
  options:   {...sortedKeys},
  engravingPresent: boolean, // presence only, never the text
}))
```

Rules:
- Canonical JSON: keys sorted, no insignificant whitespace, arrays sorted by a stable key.
- `hashVersion` is inside the hash, so a deliberate option-set change yields new hashes without colliding with history.
- Engraving **presence** is hashed, never the text, so an engraving never leaks into a share link.
- Deterministic and reproducible; a test asserts identical input yields an identical hash.

## 3. Configuration lifecycle

```text
DRAFT --select stone----------------> DRAFT
DRAFT --validate--> VALIDATING --pass--> VALID
                              \--fail--> INCOMPATIBLE
VALID  --quote---------------------> PRICED
VALID  --change stone/setting/metal-> DRAFT      (resets validation)
INCOMPATIBLE --edit----------------> DRAFT
PRICED --add to cart----------------> ADDED_TO_CART
ADDED_TO_CART --order placed--------> ORDERED
PRICED | ADDED_TO_CART --ttl---------> EXPIRED
```

| Rule | Detail |
|---|---|
| Reset on change | Any change to stone, setting variant or options resets to `DRAFT` and clears `compatibility_status`. A configuration is never priced while `INCOMPATIBLE` |
| Snapshot immutability | A price snapshot is immutable; any change requires a new snapshot, the old one retained for audit |
| Terminal EXPIRED | Expired configurations are never revived; a new one is created, so historical orders keep resolving |
| Concurrency | `state_version` optimistic lock; a stale write is `VERSION_CONFLICT` |
| Enforcement | The state machine is a pure function in `packages/domain`, fully unit-tested |

## 4. Persistence and resume

| Layer | Store | TTL | Write policy |
|---|---|---|---|
| Live session | Redis `dyo:draft:{sessionId}` | 30 min | write-through |
| Durable record | `dyo_configurations` | until `expires_at` | write-through on every transition |
| Price | `dyo_price_snapshots` | until `expires_at` | append-only |
| Share link | `short_code` (base62) | until expiry | stable |

Write-through means a user who closes the tab can resume from `/dyo/configurations/{shortCode}` without a session. Reading requires no authentication; **editing** requires the owning session, checked in the application service. Redis is an accelerator, never the record.

## 5. Compatibility engine

Pure, deterministic, side-effect free, fully unit-testable.

```ts
evaluateCompatibility(input): CompatibilityResult {
  // 1. structural invariants first: INV-01, INV-02, INV-03
  // 2. persisted rules, ordered by priority then specificity
  // 3. any DENY or failed constraint => INCOMPATIBLE with per-rule detail
  // 4. no matching rule => UNKNOWN, never silent compatibility
}
```

### Rule evaluation order

| Precedence | Rule kind | Effect |
|---|---|---|
| 1 | Structural invariant (INV-01/02/03) | Always evaluated; a breach is `INCOMPATIBLE` regardless of rules |
| 2 | `DENY` | Wins over any `ALLOW` |
| 3 | `REQUIRES_REVIEW` | Yields `REQUIRES_REVIEW`, not a block |
| 4 | `ALLOW` | Most specific wins: more populated predicates beat fewer |

Rule predicates: `jewellery_type`, `stone_kind` (required), `variety_id`, `colour_id`, `shape`, weight range, dimension range, `requires_treatment_id`, `forbids_treatment_id`.

### Rule seeding

| Rule kind | Source | Count | Evidence |
|---|---|---|---|
| `ALLOW` | the 1,024 observed `(setting, stone)` pairs | ~1,024 candidates | `EXTRACTED` |
| `DENY` | curator-authored | 0 initially | `INFERRED` |
| `REQUIRES_REVIEW` | curator-authored | as needed | `INFERRED` |

**Never auto-generate DENY rules from absence of evidence.** Absence of a matching ALLOW yields `UNKNOWN`, which the UI presents as "compatibility not yet established, offer a concierge". That honesty is what stops both the AI and the customer believing something unverified.

## 6. Rule evaluation output

```json
{ "configurationHash": "sha256:9f2c...",
  "status": "INCOMPATIBLE",
  "rules": [
    { "rule": "stone_kind", "outcome": "PASS",
      "message": "Earrings require a matched pair; PR5681 is a pair." },
    { "rule": "max_weight", "outcome": "FAIL", "limit": 4.50, "actual": 5.98,
      "message": "Halo setting JS1383 accepts stones up to 4.50ct." },
    { "rule": "treatment_disclosure", "outcome": "REVIEW",
      "message": "PR5681 is Heat Treated; disclosure is required." }
  ],
  "suggestions": [
    { "action": "SELECT_LIGHTER_PAIR", "maxWeightCt": 4.50, "candidateCount": 3 }
  ] }
```

Every rule outcome carries a human-readable message, because the UI and the AI both render these and neither may invent an explanation.

## 7. Pricing

`[INFERRED]` pure, versioned, never performed by a model (doc 16).

```text
total = gemstoneComponent + settingComponent + sideStoneComponent
      + makingComponent + discountComponent + taxComponent
```

For a pair, `gemstoneComponent = price_per_carat * SUM(per-stone weights)`, which matches observed evidence: `[VERIFIED]` PR5681 at 5.98ct and $590/ct gives $3,528 against an observed total of $7,213, ratio 2.04, consistent with the pair median of 2.269.

A quote returns a `PriceBreakdown` and a `quoteToken` valid until `expires_at`. Every quote consumes exactly one snapshot; a consumed quote cannot be reused, so a stale price can never be committed.

## 8. Cart integration

```text
addToCart(configuration):
  transaction:
    1  reload the configuration FOR UPDATE
    2  assert state is VALID or PRICED
    3  re-evaluate compatibility     (rules may have changed since quoting)
    4  re-price                     (price list may have changed)
    5  if total != client total -> 409 PRICE_CHANGED with the new total
    6  assert the product is ACTIVE and available
    7  create or resolve the product row for this configuration
    8  insert cart_item linked to the snapshot
    9  emit CartItemAdded
```

Steps 3 to 5 are the anti-staleness controls. The client may display an old price; it cannot commit one.

## 9. Resume and share

| Capability | Mechanism |
|---|---|
| Resume | `/dyo/configurations/{shortCode}` returns full state |
| Share | `POST /dyo/share/{shortCode}` returns a canonical link containing only the short code |
| Deep link | The short code is the only identifier in the URL. No stone ref, price or setting SKU is exposed |
| Expiry | An expired shared link prompts to start a new configuration |
| Historical render | An order line stores `configuration_snapshot`, so a historical configuration always renders after expiry |

## 10. API

| Method | Path | Idempotency | Emits |
|---|---|---|---|
| POST | `/dyo/configurations` | required | `DYOConfigurationCreated` |
| GET | `/dyo/configurations/{shortCode}` | - | - |
| PATCH | `/dyo/configurations/{shortCode}` | required | `DYOConfigurationCreated` |
| POST | `/dyo/configurations/{shortCode}/validate` | - | `DYOConfigurationValidated` |
| POST | `/dyo/configurations/{shortCode}/quote` | required | `DYOConfigurationPriced` |
| GET | `/dyo/configurations/{shortCode}/compatible-settings` | - | - |
| POST | `/dyo/configurations/{shortCode}/render` | required | job enqueued |
| POST | `/dyo/configurations/{shortCode}/add-to-cart` | required | `DYOConfigurationPriced`, `CartItemAdded` |
| POST | `/dyo/share/{shortCode}` | - | - |

## 11. Errors

| Code | Status | Meaning |
|---|---|---|
| `DYO_STONE_REQUIRED` | 422 | No stone selected |
| `DYO_PAIR_REQUIRED` | 422 | Earrings without a pair (INV-02) |
| `DYO_PAIR_NOT_ALLOWED` | 422 | Pair on a non-earring type (INV-03) |
| `DYO_SETTING_INCOMPATIBLE` | 422 | A rule failed; per-rule detail attached |
| `DYO_COMPATIBILITY_UNKNOWN` | 422 | No rule matched; offer a concierge |
| `DYO_CONFIGURATION_NOT_FOUND` | 404 | Unknown or expired short code |
| `DYO_CONFIGURATION_VERSION_CONFLICT` | 409 | Concurrent edit |
| `DYO_QUOTE_EXPIRED` | 409 | Quote aged out |
| `DYO_STONE_UNAVAILABLE` | 409 | Stone no longer reservable |

`DYO_COMPATIBILITY_UNKNOWN` is a deliberate product decision: it is more honest to say "not yet established" than to assume compatibility.

## 12. Security boundaries

- Configuration state is server-authoritative; the client holds only a view model.
- Editing requires the owning session; share links are read-only and opaque.
- A configuration never exposes a price the server did not compute.
- The AI may call `check_dyo_compatibility` (read-only) but may not create or mutate a configuration.
- Engraving text is stored but never hashed into a share link.

## 13. Observability

Funnel `created -> validated -> quoted -> added_to_cart -> ordered` with drop-off at each step. Metrics: compatibility outcome by rule id, unknown-compatibility rate, quote latency, price-change rate, configuration-hash reuse. Alerts on a rising unknown-compatibility rate, which indicates under-curated rules.

## 14. Testing requirements

| Test | Proves |
|---|---|
| State machine | All legal transitions; all illegal transitions rejected |
| Hash determinism | Same input, same hash; `hashVersion` change yields a new hash |
| Reset on change | Any field change resets to `DRAFT` and clears validation |
| Rule ordering | DENY beats ALLOW; specific beats general |
| Unknown path | No matching rule yields `UNKNOWN`, not `COMPATIBLE` |
| INV-01/02/03 | Enforced at domain and database layers |
| Price reproducibility | A total equals its breakdown; snapshot immutable |
| Pair pricing | Pair gem component uses summed per-stone weights |
| Cart re-validation | Stale rules or prices produce 409, not a silent commit |
| Resume | A configuration survives a Redis flush |
| Share opacity | A share link contains no price, stone ref or engraving text |

## 15. Failure modes

| Failure | Behaviour |
|---|---|
| Redis flush | Draft rehydrates from Postgres; no data loss |
| Rules change mid-quote | Cart conversion re-validates and rejects with 409 |
| Price list change mid-quote | Cart conversion re-prices and returns 409 `PRICE_CHANGED` |
| Configuration expired | 404 with a prompt to start again; historical orders unaffected |
| Concurrent edit | `VERSION_CONFLICT`; client refetches |
| Rules under-curated | `UNKNOWN` and a concierge offer, never a false `COMPATIBLE` |

## 16. Implementation constraints

1. Never price an `INCOMPATIBLE` or `UNKNOWN` configuration.
2. Never auto-generate DENY rules from absence.
3. Never expose a price, stone ref or engraving text in a share link.
4. Snapshots are immutable and versioned by pricing rule version.
5. Ring size, engraving workflow and side stones are **not** implemented as configurator features, because no source evidence exists.

## Evidence status

`[OBSERVED]` for the eight rows in section 1. `[INFERRED / PROPOSED]` for everything else. The 221 failed-fetch records remain `[INFERRED / PROPOSED]` identities with null attributes and `DRAFT` state, per doc 10 section "The 221 derived identities", enforced by gates V18, V19, V20.