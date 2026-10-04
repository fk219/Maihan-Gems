# 10 CATALOG ARCHITECTURE

**Package:** `technical_design/` doc 10 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 1.1, 4.2, 8.6, 14, 33.3, 34.2.
**Evidence status:** `[OBSERVED]`/`[VERIFIED]` for every count and grammar rule; `[INFERRED]` for target structure.

---

## Purpose

Define how the seven validated catalogue entities are implemented, and state the cardinality contract that CI enforces.

## The one rule

**`products.jsonl` is not the catalogue.** It contains 1,245 records, which is 2.4% of commerce URLs, because the crawler's classifier recognised only DYO pages. The catalogue is derived from `urls.jsonl` (44,218 URLs). This is defect D1 and ADR-007.

## Entities and evidence-backed counts

| Entity | Table | Count | Tag | Source |
|---|---|---:|---|---|
| Gemstone (single) | `gemstones` where `kind='SINGLE'` | **19,665** | `[VERIFIED]` | loose-stone URLs, `K#####` |
| Gemstone pair | `gemstones` where `kind='PAIR'` | **3,072** | `[VERIFIED]` | pair URLs, `PR#####` |
| Setting design | `settings` | **951** | `[VERIFIED]` | `js{digits}` |
| Setting variant | `setting_variants` | **10,349** | `[VERIFIED]` | `js{digits}{metalCode}` |
| Configured product | `products` where `kind='CONFIGURED'` | **9,812** | `[VERIFIED]` | `/design-your-own/review/*` |
| Ready-made product | `products` where `kind='READY_MADE'` | **88** | `[VERIFIED]` | `/{variety}-rings/*-J#####` |
| DYO configuration | `dyo_configurations` | 0 at import; user-created thereafter | `[INFERRED]` | no source rows exist |
| Sellable realisation | `products` row + `order_items` row at sale | - | `[INFERRED]` | - |

Supporting: `gemstone_stones` (1 row single, 2 rows pair), `product_gemstones` (typed side-stone relation), `setting_compatibility_rules` (~1,024 ALLOW seeds from observed pairs).

**10,349, not 9,484.** An earlier figure dropped all 865 Sterling Silver SKUs. Corrected and re-verified in Phase 0.

## SKU grammar

```text
SETTING    JS<design><metalCode>            e.g. JS1016W10, JS1169SL
CONFIGURED JS<design><metalCode>-<gemRef>   e.g. JS1383R14-PR5681
READY-MADE J<digits>                        e.g. J10347
STONE      K<digits>                        e.g. K1324, K32255
PAIR      PR<digits>                        e.g. PR5681, PR14703
```

`[VERIFIED]` Validated 1,024 / 1,024 exact matches, 0 mismatches (gates V3, V19). The parser is pure, lives in `packages/domain`, and is property-tested against the full corpus.

`[VERIFIED]` 15 metal codes with a 1:1 slug mapping and no ambiguity: `W10 Y10 R14 W14 W18 Y18 R18 PT SL YW14 YW18 WY14 WY18`. No `R10` exists anywhere in the evidence. `SL` (Sterling Silver) and 10K gold appear **only** in settings, never in the captured DYO products.

## Aggregate structure

`settings` (951 designs) and `setting_variants` (10,349 = design x metal) are the **reusable parents**. `products` are realisations. `dyo_configurations` are user states over a realisation.

```text
settings 1---N setting_variants 1---N products N---1 setting_variants
gemstones (single or pair) 1---N products
```

Generating the full cross-product is forbidden. `[VERIFIED]` The theoretical cross-product of the captured DYO subset is 40,425 SKUs; the source realised 1,024. Creating the other 39,401 would fabricate inventory that never existed.

## Stone identity

`[VERIFIED]` Each of the 35 captured stone references has **exactly one** weight value and **exactly one** dimension set across all its products; zero unstable references. A `gem_ref` is therefore a genuine physical-entity identity, and `gemstones.gem_ref` is unique.

## Pair semantics

`[VERIFIED]` Two independent proofs that `PR` means pair:

1. The route family `/{variety}-pairs/{slug}-pair-PR#####` uses `PR` exclusively.
2. For all 113 pair records, the per-stone weights sum exactly to the `Ct.Tw.` figure in the product name: 113 / 113, 0 mismatches.

`[VERIFIED]` `PR` references appear **only** on earrings (113/113). `K` references only on ring (830), pendant (212), necklace (90). Zero exceptions. Enforced as INV-02 and INV-03, at both the domain and database layers.

## Gemstone attributes

`[OBSERVED]` 13 source specification fields: `item_id`, `stone_type`, `weight`, `dimensions_mm_help`, `color_help`, `color_intensity_help`, `clarity_help`, `shape_help`, `cut`, `cutting_style`, `enhancements_help`, `origin_help`, `per_carat_price_help`.

`[OBSERVED]` `stone_type` is populated for only **113 of 1,024** products, and only for pairs. **911 of 1,024 stones have no structured stone type.** This is not a migration failure; it is a real gap in the source and it directly drives the AI refusal path (doc 18).

Variety is nonetheless known for essentially every stone: `[VERIFIED]` 19,666 / 19,666 slugs parse, and the variety token is present in the slug in every case (gate V4). So variety comes from the slug, not from `stone_type`.

## The D9 tokenizer

`[DEFECT D9]` `[VERIFIED]` 113 records carry concatenated per-stone values: `"Blue Blue"`, `"Emerald Cut Emerald Cut"`, `"Length: X Width: Y Height: Z Length: X2 Width: Y2 Height: Z2"`, `"2.87 Ct. 3.11 Ct."`.

This is genuine multi-stone data with the delimiter lost, not a duplicate render. Naive normalisation would create a facet named `Pink Pink`. `StoneAttributeTokenizer` (doc 05) splits on the repeated marker and records `tokenCount`; `clarity_labels.is_doubled` records the detection.

## Product realisation

| `kind` | Composition | Invariants |
|---|---|---|
| `CONFIGURED` | 1 setting-variant + (1 stone XOR 1 pair) | INV-01, INV-02, INV-03 |
| `READY_MADE` | standalone, stone weight `0.00ct` placeholder | none |
| `LOOSE_STONE` | a `gemstone` promoted to a sellable unit | none |
| `STONE_PAIR` | a pair promoted to a sellable unit | none |
| `SETTING_ONLY` | 1 setting-variant, no stone | none |

`[OBSERVED]` All 88 ready-made products carry a literal `0.00ct` in the slug, meaning the stone is customer-supplied. They are demoted slightly in search ranking because a placeholder weight is less useful than a real one (doc 12).

## The 221 derived identities

`[VERIFIED]` 221 DYO records have empty `product.sku` and **no** `specifications` row at all, so `specifications.item_id` cannot establish identity. All 221 slugs parse to 221 distinct SKUs, and **0 collide** with the observed 1,024.

Rules, enforced by gates V18, V19, V20 and INV-08:

| Field | Value |
|---|---|
| `source_sku` | **NULL**. Never written from a parse |
| `source_sku_derived` | the parsed SKU |
| `sku_evidence_status` | `'INFERRED'` |
| `state` | `'DRAFT'`, never published |
| all attributes | NULL; evidence `UNKNOWN` |
| promotion | only via `POST /admin/derived-refs/{id}/approve`, audited |

Two-source corroboration: all 8 stone references appear in the loose-stone inventory, and all 168 `(design, metal)` pairs appear in the settings catalogue. Three stones (`K2198`, `K2199`, `K2209`) are new identities present only in this set.

**Never manufacture a source SKU. Never infer attributes from a sibling product sharing a stone reference.**

## Catalogue read model

`CatalogQueryPort` is the single interface the storefront and search consume. It is implemented in Phase 3 with structured SQL plus facet counts, and its implementation is replaced in Phase 5 by hybrid search **behind the same interface**. Storefront call sites never change.

## Validation rules

1. A product must satisfy INV-01, INV-02, INV-03 at both domain and database layers.
2. `gem_ref` unique across the union of stones and pairs.
3. `setting_variants.sku` unique.
4. `metal_code` always resolves in `metals`.
5. Variety in the slug must equal the assigned variety, or the row is quarantined.
6. Pair per-stone weights must sum to `total_weight_ct`, and to the slug `Ct.Tw.` value.
7. No `INFERRED` product publishes without approval.

## Error handling

| Code | Meaning |
|---|---|
| `PRODUCT_NOT_FOUND` | Unknown slug, or soft-deleted |
| `PRODUCT_NOT_PURCHASABLE` | State is not `ACTIVE` |
| `SETTING_VARIANT_NOT_FOUND` | Unknown SKU |
| `GEMSTONE_NOT_FOUND` | Unknown `gem_ref` |
| `INV-01`..`INV-03` | Composition invariant breach |
| `SOURCE_CONFLICT` | Two source records disagree; see `staging_conflicts` |

## Security boundaries

Catalogue reads are public. The only non-public catalogue data is `price_entries.cost_component`, which is excluded from every public DTO by construction, and unpublished products, which are filtered by `state` in the repository rather than in the UI.

## Observability

Spans per query; metrics for query latency by query name, facet computation time, quarantine count by reason, and derived-identity approval backlog. No SKU or URL in metric labels (cardinality).

## Testing requirements

| Test | Evidence | Expectation |
|---|---|---|
| SKU parser corpus | 1,024 observed | 1,024 / 1,024 exact, 0 mismatches |
| Stone stability | 0 unstable | 1 weight and 1 dimension set per `gem_ref` |
| Pair sum | 113 / 113 | Per-stone weights equal slug `Ct.Tw.` |
| Earrings invariant | 113 / 113 | `PR` only on earrings |
| Single-stone invariant | 1,132 / 1,132 | `K` never on earrings |
| Variety in slug | 19,666 / 19,666 | Assigned variety equals slug variety |
| Slug parse rate | 100% | Gates V1, V2 |
| Metal mapping | 15 codes | 1:1, no ambiguity |
| **Catalogue completeness** | Section above | All seven families present at the stated counts |
| Derived identity | 221 | Gates V18, V19, V20 |
| Idempotency | V17 | Second import changes zero rows |

The catalogue-completeness test is a permanent CI gate. It is the automated defence against repeating D1.

## Failure modes

| Failure | Response |
|---|---|
| Parser regression | Halt at gate V1/V2/V3 |
| Invariant violation in the database | 422 and an alert; should be unreachable |
| A family silently missing | Catalogue-completeness test fails the build |
| Derived identity leaks to `source_sku` | Gate V18 and a DB constraint block it |
| Cross-product explosion | Repository never enumerates the matrix; only explicit rows are read |

## Implementation constraints

1. The full cross-product is never generated.
2. `products.jsonl` is never the migration spine.
3. A derived identity is never an observed identity.
4. Variety comes from the slug, not from `stone_type`.
5. Per-stone measurements are rows, never a concatenated string.

## Evidence status

Every count and grammar rule above is `[VERIFIED]` against the raw datasets. Target structure is `[INFERRED]`. The two corrections made during Phase 0 are recorded here: setting variants **10,349** (not 9,484) and the DYO-221 characterisation as new products rather than duplicates.