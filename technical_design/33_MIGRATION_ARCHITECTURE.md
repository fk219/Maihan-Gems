# 33 MIGRATION ARCHITECTURE

> **SUPERSEDED 2026-10-28 (ADR-035, owner-authorized) for future schema work.**
> The fresh clean database (`technical_design/41` + `docs/fresh-schema/`)
> replaces the corpus-import pipeline, staging model and provenance gates with
> cleaning rules + an acceptance gate (doc 41 §6). This document is retained
> **as historical reference**; its source facts remain valid evidence. The
> archive protections (AGENTS.md §5) still apply — cleaning reads
> `naturalgemstones/` read-only.

**Package:** `technical_design/` doc 33 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 13.1, 33, 4.2.
**Evidence status:** `[OBSERVED]` for every count and defect reference; `[INFERRED]` for the pipeline mechanics.

---

## Purpose

Define the eight-stage migration pipeline, entity derivation, the critical migration rule, the 22 validation gates, provenance, conflicts, phasing and safety.

## 1. Pipeline

```text
SOURCE EVIDENCE (read-only)
   -> [1] EXTRACT    read crawler.sqlite and every JSONL; hash each artefact
   -> [2] STAGE      load verbatim into staging_source_pages; never normalise here
   -> [3] PARSE      deterministic slug/SKU parsers -> staging_parsed_urls
   |                 with per-field confidence and evidence status
   -> [4] VALIDATE   parse assertions, referential checks, cardinality checks
   -> [5] CANONICAL  upsert taxonomy, gemstones, settings, variants, products
   |                 in dependency order; conflicts -> staging_conflicts
   -> [6] SEARCH     build tsvector, trigram and facet indexes; initial reindex
   -> [7] EMBED      chunk and embed knowledge documents and products
   -> [8] PRODUCTION flip traffic; run the verification suite
```

Every stage is resumable and idempotent. Stages 1 through 5 are **fully deterministic given the same input hashes**, which is what makes gate V17 (re-running produces zero changed rows) a meaningful assertion rather than an aspiration.

Staging never normalises. The separation matters: normalisation applied during load destroys the ability to answer "what did the source actually say", and the whole evidence discipline depends on being able to ask that.

## 2. Entity derivation

| Target entity | Derived from | Method | Expected count |
|---|---|---|---|
| `gemstone_varieties` | first path segment across stone URLs; `taxonomy.json` `stone_type` | distinct base slugs, cross-checked against spec values | ~100-145 |
| `gemstone_species` | variety slug suffix | `[INFERRED]` grouping | ~25 |
| `gemstone_colours` | loose-stone slug colour token; `color_help` | token extraction plus the 60 colour routes | ~60+ |
| `gemstone_origins` | `origin_help`; slug origin token | value extraction | ~20 |
| `shapes` | `shape_help`; slug shape token | value extraction | ~13 |
| `clarities` | `clarity_help` | value extraction plus `is_doubled` detection (D9) | ~7 |
| `treatments` | `enhancements_help` | value extraction | ~5 |
| `metals` | SKU metal codes and slug phrases | 1:1 mapping, verified across all families | 14 |
| `setting_styles` | settings slug design token | value extraction | 18 families |
| `settings` | settings URL `js{digits}` | distinct design cores | 951 |
| `setting_variants` | settings URL `js{digits}{code}` | distinct (design, metal) | 10,349 |
| `gemstones` | loose-stone `K#####`; pair `PR#####` | distinct refs; attributes from slug plus `specifications` where available | 19,665 + 3,072 |
| `gemstone_stones` | `specifications.weight` and `dimensions_mm_help` | tokenizer; 1 row single, 2 rows pair | per D9 |
| `products` (CONFIGURED) | DYO URLs | SKU grammar decomposition | 9,812 |
| `products` (READY_MADE) | `/{variety}-rings/{slug}-J#####` | direct | 88 |
| `settings_compatibility_rules` | the 1,024 observed (setting, stone) pairs | ALLOW with `EXTRACTED` | ~1,024 candidates |
| `price_entries` / `price_model_observations` | `pages_analyzed` JSON-LD offers | residual computation (doc 16) | 1,024 |
| `assets` | `media_analyzed.jsonl` | path-stem classification, dedupe | ~44,480 before dedupe |
| `certificates` | `cert`, `sarin`, `appraisal` paths | path convention | per distinct ref |
| `pages` | functional route list | manual authoring plus CMS | ~25 |
| `redirects` | all 44,218 source URLs | route mapping (doc 34) | 44,218 |

## 3. The critical migration rule

`[DEFECT D1]` **Do not migrate from `products.jsonl`.**

It contains only the 1,024 DYO products the crawler's classifier recognised: roughly **2.4% of commerce URLs**. Migrating from it would produce a store with 1,024 products instead of tens of thousands, and every one of them would look correct.

Migrate from **`urls.jsonl` as the spine**, joining `specifications.jsonl` and `pages_analyzed.jsonl` for attributes and prices.

This is the single most consequential finding in the migration, and it is the reason `urls.jsonl` is a permanent-retention artefact (doc 31 category A).

## 4. Validation gates

| Gate | Assertion | On failure |
|---|---|---|
| V1 | Loose-stone slug parse rate = 100% (baseline 19,666/19,666) | Halt; parser regression |
| V2 | Pair slug parse rate = 100% (3,077/3,077) | Halt |
| V3 | Every DYO slug yields a SKU matching its `product.sku` where present (1,024/1,024) | Halt |
| V4 | Variety token in slug equals assigned `variety_id` (19,666/19,666) | Quarantine the row |
| V5 | Every product satisfies INV-01 | Quarantine |
| V6 | Zero products with a pair and non-earring type | Halt |
| V7 | Zero products with a single stone and earrings type | Halt |
| V8 | For every pair, per-stone weights sum to `total_weight_ct` (113/113) | Quarantine |
| V9 | For every pair, `Ct.Tw.` in the source name equals the summed weight | Quarantine |
| V10 | `gem_ref` uniqueness across the union of stones and pairs | Halt |
| V11 | Every product's `source_url` is unique | Halt |
| V12 | Every setting variant SKU is unique | Halt |
| V13 | Metal code always resolves in `metals` | Halt |
| V14 | Count reconciliation per family against section 4.2 | Halt |
| V15 | No product priced from `UNKNOWN` price_evidence is published | Warn and hold |
| V16 | No asset has `kind` derived from a JavaScript URL | Halt |
| V17 | Re-running the import produces zero new or updated rows | Halt |
| V18 | All 221 failed-fetch DYO rows land with `sku_evidence_status='INFERRED'`, `source_sku IS NULL`, `state='DRAFT'`, and every attribute column null | Halt |
| V19 | Derived SKU parser reproduces all 1,024 observed SKUs exactly | Halt |
| V20 | Derived SKUs never collide with observed SKUs; collisions quarantined rather than merged | Halt |
| V21 | Every `(design, metal)` pair encountered in any URL family resolves in `setting_variants` | Warn and hold |
| V22 | Every stone reference encountered resolves in `gemstones`, or is created with `ref_evidence_status` set correctly | Warn and hold |

**V1-V14 blocking. V15-V17 hold publication. V18-V20 blocking. V21-V22 hold publication.**

The distinction between blocking and hold-publication matters operationally: a blocking gate stops the migration, a publication hold means the data may exist but nothing unverified reaches a customer.

## 5. The 221 derived identities

`[OBSERVED]` 221 DYO URLs had failed fetches. Their identities are `[INFERRED]` from the SKU grammar, not observed.

| Field | Required value |
|---|---|
| `sku` | derived |
| `sku_evidence_status` | `INFERRED` |
| `source_sku` | `NULL` |
| `state` | `DRAFT` |
| every attribute column | `NULL` |

Enforced by gates V18, V19, V20 and INV-08.

These rows are the practical test of the whole evidence system. They are structurally valid, correctly derived, and **not real observed data**. A pipeline that "helpfully" filled in their attributes would look successful and be quietly wrong, which is the specific failure mode every evidence label in this architecture exists to prevent.

## 6. Provenance

Every migrated row carries `evidence_status`, `source_url`, and where relevant `source_sku`, `source_sku_derived`, `sku_evidence_status`, `raw_spec` and `import_batch_id`.

This is what makes the charter's question answerable for every field: *where did this value come from?* (NFR-08, doc 31 section 3).

## 7. Conflicts

Where two source records disagree, **both are stored in `staging_conflicts` with their URLs and no automatic resolution.**

| Conflict | Expected count | Handling |
|---|---|---|
| 5 pair URLs sharing a PR id | 5 | Manual review |
| 314 stone URLs ending `-J#####` | 314 | Likely misfiled; quarantine |
| `stone_type` populated on only 113 records, and doubled | 113 | Normalise to a single value with `token_count` recorded |
| Doubled spec strings across the pair family | 113 × 12 | D9 tokenizer |
| DYO SKUs absent from the settings catalog | expected 0 | Halt if non-zero |

Storing both sides without automatic resolution is deliberate. A conflict resolved by a heuristic is a conflict nobody reviews, and the five shared PR ids are exactly the case where a heuristic would confidently pick the wrong stone.

## 8. Phasing

| Phase | Content | Gates |
|---|---|---|
| M1 | taxonomy, stones, pairs | V1, V2, V4, V10 |
| M2 | settings and variants | V12, V13 |
| M3 | products and compatibility seeds | V3, V5-V9, V11 |
| M4 | prices and observations | V15 |
| M5 | assets, classified and dispositioned | V16 |
| M6 | certificates from path convention | none blocking |
| M7 | CMS pages, navigation, 44,218 redirects | none blocking |
| M8 | knowledge documents and embeddings | none blocking |
| M9 | full verification and load test | V17 |

Each phase is independently revertible. **M1-M3 must complete before the storefront can serve a single product page** — a fact worth stating plainly, because it means the migration is on the critical path to launch, not a parallel activity.

M6-M8 have no blocking gates because their sources are path conventions and authored content rather than parsed records with error modes.

## 9. Migration safety

| Rule | Detail |
|---|---|
| Rehearsal | Runs on a Neon branch first, verified against all gates |
| Backfills | Batches of 1,000 with a rate limit, resumable from a cursor |
| No destructive change with dependent code | A dropped column ships after the code stops using it (doc 29) |
| Per-phase counts | `records_seen`, `records_accepted`, `records_rejected`, `records_quarantined` recorded for every phase |
| Source read-only | The evidence package is never written to; hashes recorded before and after |
| Idempotence | Deterministic keys plus `import_batches`; V17 asserts a re-run changes nothing |

Recording per-phase counts is what makes an incomplete migration visible. A migration that reports "19,665 accepted, 12 quarantined" is auditable; one that reports "done" is not.

## 10. Preserved routes

| Source route | Count | Target | Redirect |
|---|---:|---|---|
| `/{variety}` | 191 | `/[variety]` | no |
| `/{variety}-pairs` | 142 | `/[variety]-pairs` | no |
| `/{variety}-rings` | 99 | `/[variety]-rings` | no |
| `/{variety}/{slug}-K#####` | 19,997 | `/products/{slug}` | 301 |
| `/{variety}-pairs/{slug}-PR#####` | 3,077 | `/products/{slug}` | 301 |
| `/{variety}-rings/{slug}-J#####` | 88 | `/products/{slug}` | 301 |
| `/design-your-own/review/{slug}` | 9,812 | `/design-your-own/review/{code}` | 301 |
| `/gemstone-ring-settings/{slug}` | 8,522 | `/settings/{sku}` | 301 |
| `/gemstone-necklace-pendant-settings/{slug}` | 1,808 | `/settings/{sku}` | 301 |
| `/gemstone-earring-settings/{slug}` | 442 | `/settings/{sku}` | 301 |
| `/gemstone-bracelet-settings` | 1 | `/settings` | no |
| `/mens-gemstone-ring-settings` | 1 | `/settings?style=mens` | 302 |
| `/{colour}-gemstones` | 60 | `/colour/{colour}` | 301 |
| `/all-natural-gemstones` and siblings | 7 | `/search?collection=all` | 302 |
| `/cart` | 1 | `/cart` | no |
| `/cart/order-summary` | 1 | `/checkout/order-summary` | 301 |
| `/cart/payment-order` | 1 | `/checkout/payment-order` | 301 |
| `/cart/secure-payment` | 1 | `/checkout/secure-payment` | 301 |
| `/account` | 1 | `/account` | no |
| `/auth`, `/verify-email` | 2 | `/account/sign-in`, `/account/verify-email` | 301 |
| `/favorites` | 1 | `/favorites` | no |
| `/compare-list` | 1 | `/compare` | 301 |
| `/financing` | 1 | `/financing` | no |
| `/extend-protection-plan` | 1 | `/protection-plan` | 301 |
| `/contact-us` | 1 | `/contact` | 301 |
| `/showroom`, `/showroom/preview`, `/showroom/preview/success` | 3 | `/showrooms`, `/showrooms/{slug}` | 301 |
| `/education` and children | 15 | `/education/...` | no |
| `/blog` | 1 | `/blog` | no |
| `/meet-our-team`, `/michael-arnstein` | 2 | `/about/...` | 301 |
| `/custom-design-gemstone-rings-jewelry` | 1 | `/design-your-own` | 301 |
| `/sitemap-static.xml`, `/sitemap-products-N.xml` | 45 | `/sitemap.xml`, `/sitemap-products/N.xml` | generated |

`[OBSERVED]` Query-string variants: `?rs=` (423 URLs) becomes a sort or page parameter; `?design-styles=` (6) becomes `?style=`. Full treatment in doc 34.

## 11. Validation rules

1. The source evidence package is opened read-only; hashes recorded before and after each phase.
2. Staging never normalises; normalisation happens in stage 5 only.
3. Stages 1-5 are deterministic given the same input hashes.
4. Every gate V1-V22 runs automatically in CI (doc 32 section 7).
5. The migration reads `urls.jsonl` as the spine, never `products.jsonl` (D1).
6. Conflicts are stored, never auto-resolved.
7. Quarantine is the default for any row failing a referential or cardinality check.
8. No `INFERRED` value publishes without curator approval (V15, V21, V22, INV-08).
9. Every phase records seen, accepted, rejected and quarantined counts.
10. Each phase is independently revertible.

## 12. Error handling

| Condition | Behaviour |
|---|---|
| Blocking gate fails | Halt; no further phase proceeds |
| Publication-hold gate fails | Data may land; publication blocked pending resolution |
| Parser regression | V1/V2 halt; the parser is the suspect, not the data |
| Referential failure | Quarantine the row with its `source_url`, never drop it |
| Import interrupted | Resume from cursor; never restart (doc 27) |
| Source artefact changed mid-run | Hash mismatch; halt; the evidence package is immutable |
| Count reconciliation fails | Halt; a missing 300 stones is a silent catalogue hole |

## 13. Security boundaries

- The evidence package is read-only to the migration process; no write path exists.
- Migration credentials are read-only on Postgres except for staging tables.
- `raw_spec` may contain arbitrary source text and is never rendered without escaping.
- Staging tables are dropped after the phase completes and its gates pass.
- `MIGRATION_ENGINEER` can approve derived references but cannot publish them; publication is a separate authorization.

## 14. Observability

Metrics: records seen, accepted, rejected and quarantined per phase and family, gate pass rate, parse latency, import throughput, quarantine backlog age, unresolved conflict count, re-import delta for V17. Alerts on any blocking gate failure, on a quarantine rate above threshold, on unresolved conflicts not draining, and on a non-zero V17 delta.

A non-zero V17 delta is the most important signal in the set: it means the migration is not deterministic, so no count can be trusted.

## 15. Testing requirements

| Test | Proves |
|---|---|
| Gate suite | All 22 gates run automatically and pass |
| Determinism | Two runs from identical hashes produce identical rows |
| Idempotence | A third run changes zero rows (V17) |
| Spine correctness | Migrating from `products.jsonl` is detected as insufficient (2.4% coverage) |
| 221-row integrity | Every derived row has null attributes, `INFERRED` status, `DRAFT` state |
| Provenance coverage | Every migrated field resolves to a source artefact and locator |
| Conflict storage | Known conflicts are stored, not auto-resolved |
| Source immutability | Evidence-package hashes are unchanged after a full run |
| Revertibility | Each phase can be rolled back independently |
| Route coverage | Every one of the 44,218 URLs maps to a redirect (doc 34) |

## 16. Failure modes

| Failure | Behaviour |
|---|---|
| D1 enacted | Detected by a coverage test; halt |
| Parser regression | V1/V2 halt the build |
| Invariant breach | V5-V9 quarantine or halt |
| Count mismatch | V14 halts |
| Unverified price published | V15 holds publication |
| JS asset imported | V16 halts |
| Non-idempotent re-import | V17 halts |
| Conflict auto-resolved | Review failure; both sides must be stored |

## 17. Implementation constraints

1. Migrate from `urls.jsonl` as the spine, never from `products.jsonl` (D1).
2. Staging loads verbatim; normalisation happens only in stage 5.
3. Stages 1-5 are deterministic and every stage is resumable and idempotent.
4. All 22 gates run automatically; blocking gates halt.
5. Conflicts are stored with no automatic resolution.
6. The 221 derived identities land with null attributes, `INFERRED` status and `DRAFT` state.
7. Every migrated field carries provenance (NFR-08).
8. M1-M3 complete before the storefront serves any product page.

## Evidence status

`[OBSERVED][VERIFIED]`: every count in sections 2 and 10, all 22 gate baselines (19,666/19,666, 3,077/3,077, 1,024/1,024, 113/113, 0/1,024), the 44,218 URL inventory, the 423 `?rs=` and 6 `?design-styles=` variants, the 221 failed fetches, the five shared PR ids, the 314 misfiled `-J#####` URLs, and the defects D1 and D9. `[INFERRED]`: the pipeline stage design, idempotence mechanics, batching and the phasing rationale.