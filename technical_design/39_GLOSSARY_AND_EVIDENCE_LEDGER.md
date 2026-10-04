# 39 GLOSSARY AND EVIDENCE LEDGER

**Package:** `technical_design/` doc 39 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 3, 7.2, 36, 37, 42.
**Evidence status:** the ledger records observed facts; the glossary is authoritative for this build.

---

## Purpose

Provide one authoritative vocabulary and one consolidated register of what is observed, what is inferred, what is defective and what is unknown.

## 1. Evidence statuses

| Status | Meaning | Promotion rule |
|---|---|---|
| `[OBSERVED]` | Directly present in a source artefact | None; it is a fact about the source |
| `[VERIFIED]` | Observed and checked at scale, with a recorded pass rate | None |
| `[EXTRACTED]` | Derived by deterministic parsing from an artefact | Re-verify if the parser changes |
| `[PATTERN]` | Derived from a regular pattern across many samples | Promote only with a full-set check |
| `[INFERRED]` | A reasoned proposal, not observed | Requires human approval before publication |
| `[UNKNOWN]` | Not determinable from the evidence | Cannot be promoted by inference alone |

| Rule | Detail |
|---|---|
| `[UNKNOWN]` is a valid outcome | It is not a failure; it is an honest statement |
| Never promote by inference | `[INFERRED]` becomes `[OBSERVED]` only with new evidence |
| Labels are per field | A row can have an `[OBSERVED]` slug and an `[INFERRED]` price |
| No silent promotion | Test V15 holds publication of anything priced from `UNKNOWN` evidence |

## 2. Domain glossary

| Term | Definition | Evidence |
|---|---|---|
| **Gemstone variety** | A trade or species-level classification such as Tsavorite or Paraiba Tourmaline. Reference data | `[OBSERVED]` route slugs |
| **Gemstone** | One individual physical stone. Identity `K#####` | `[OBSERVED]` + `[VERIFIED]` stable identity |
| **Gemstone pair** | Two matched stones sold and used together. Identity `PR#####` | `[OBSERVED]` + `[VERIFIED]` |
| **Setting** | A reusable jewellery mount design with no stone and no metal chosen. Identity `JS<design>` | `[EXTRACTED]` |
| **Setting variant** | A setting in one specific metal. Identity `JS<design><metalCode>`. Sellable alone | `[OBSERVED]` |
| **Setting style** | Design family: solitaire, pave, three-stone, accent-stones, halo, bezel, antique, vedic, floral, celtic, wedding-set, studs, mens, drops, flush-set | `[EXTRACTED][VERIFIED]` |
| **Jewellery type** | ring, pendant, necklace, earrings, bracelet | `[EXTRACTED][VERIFIED]` |
| **Product** | The sellable unit: CONFIGURED, READY_MADE, LOOSE_STONE, STONE_PAIR, SETTING_ONLY | `[INFERRED]` framing of observed URL families |
| **Configuration** | A persisted, hashed DYO state that can be resumed, quoted and added to cart | `[INFERRED]` |
| **Evidence status** | OBSERVED / EXTRACTED / PATTERN / INFERRED / UNKNOWN for a given field | charter 6 |
| **Total weight (`Ct.Tw.`)** | Sum of all stone weights in a configuration | `[VERIFIED]` 113/113 pairs |
| **SARIN report** | A third-party gemological report, observed only as image artefacts at `/stone/{ref}/sarin/`. Contents unknown | `[OBSERVED]` + `[UNKNOWN]` |
| **Configuration hash** | Deterministic SHA-256 over canonical configuration state; excludes engraving text | `[INFERRED]` |
| **Compatibility status** | COMPATIBLE / INCOMPATIBLE / UNKNOWN / REQUIRES_REVIEW, from the rule engine | `[INFERRED]` |
| **Price snapshot** | An immutable, rule-versioned record of a computed total | `[INFERRED]` |
| **Residual** | The unexplained component of an observed total after subtracting the computable gem component | `[INFERRED]` |
| **Setting component** | The residual, attributed to the setting and making. Explicitly an estimate | `[INFERRED]` |
| **Quote token** | A single-use reference to one price snapshot, valid to `expires_at` | `[INFERRED]` |
| **Pair** | Two stones sold and used together; requires atomic reservation | `[VERIFIED]` 113/113 |
| **Setting-only** | A setting variant sold without a stone | `[OBSERVED]` |
| **Ready-made** | A pre-configured product with both setting and stone | `[OBSERVED]` |
| **Loose stone** | A stone sold on its own | `[OBSERVED]` |
| **Grounding gate** | The mechanism stripping any factual claim without a resolvable citation | `[INFERRED]` |
| **Trust tier** | CORROBORATED / VERIFIED / CURATED / COMMUNITY / UNVERIFIED, weighting retrieval and answers | `[INFERRED]` |
| **Derived reference** | A SKU or identity inferred from a pattern rather than observed | `[INFERRED]` |
| **Terminal asset state** | READY, FAILED, or SKIPPED with a reason. Never a silent drop | `[INFERRED]` |

## 3. Technical glossary

| Term | Definition |
|---|---|
| **Outbox** | Events written in the same transaction as the state change, published asynchronously |
| **Dispatcher** | The loop that publishes unpublished outbox rows |
| **Idempotency key** | A client-supplied key making a retried mutation return the original result |
| **`job_key`** | The natural key making a retried job a no-op |
| **`event_consumers`** | The dedupe table recording which consumers have processed which events |
| **Generation bump** | A monotonic counter in search cache keys; a bump retires all old keys |
| **SWR** | Stale-while-revalidate: serve stale, refresh in the background |
| **Single-flight** | One caller computes a cache miss while others wait |
| **Sentinel row** | A marker row forcing FK referential integrity in the database |
| **Expand-then-contract** | Multi-release migration: add, backfill, dual-write, then drop |
| **Quarantine** | Holding a record that failed a gate, with its provenance, rather than dropping or guessing |
| **Provenance** | The chain answering where a value came from |
| **Grounding ratio** | The fraction of claims with a surviving citation |
| **TTFB** | Time to first byte |
| **INP / LCP / CLS** | Interaction, largest-contentful and cumulative-layout-shift Core Web Vitals |
| **pc / p95 / p75** | Percentile measurements, not averages |

## 4. Verified observations

| # | Observation | Verification |
|---|---|---|
| 1 | Loose-stone slug parse rate 100% | 19,666 / 19,666 |
| 2 | Pair slug parse rate 100% | 3,077 / 3,077 |
| 3 | DYO slug to `product.sku` match 100% | 1,024 / 1,024 |
| 4 | Derived SKU parser reproduces observed SKUs exactly | 1,024 / 1,024 |
| 5 | Pair per-stone weights sum to `Ct.Tw.` | 113 / 113 |
| 6 | Single-token weight parse | 911 records |
| 7 | Stone identity stability across products | 0 unstable |
| 8 | Variety token in slug equals assigned `variety_id` | 19,666 / 19,666 |
| 9 | Earrings use pairs | 113 / 113 |
| 10 | Non-earring types use a single stone | 1,132 / 1,132 |
| 11 | Metal code to slug phrase mapping 1:1 | 14 codes |
| 12 | Price recovery from `pages_analyzed` | 1,024 / 1,024 |
| 13 | `price == weight × per_carat` | **0 / 1,024** |
| 14 | Currency is USD | 1,024 / 1,024 |
| 15 | Availability `schema.org/InStock` | 1,024 / 1,024 |
| 16 | Media record volume | 241,961 across 5 hosts, 3,749 path stems |
| 17 | Media `role='unknown'` | 94.7% |
| 18 | Total URL inventory | 44,218 |
| 19 | Commerce URLs absent from `products.jsonl` | 33,934 |
| 20 | DYO configurations | 9,812 |
| 21 | Settings designs / variants | 951 / 10,349 |
| 22 | Gemstones / pairs | 19,665 / 3,072 |
| 23 | Functional routes | 25, plus `/education` with 14 children |
| 24 | Checkout funnel steps | 4 URLs |
| 25 | `stone_type` populated | 113 / 1,024, all pairs |
| 26 | `gem_ref` per-stone rows for pairs | 113 / 113 |
| 27 | `crawler.sqlite.documents` rows | 0 |
| 28 | Query-string variants | `?rs=` 423, `?design-styles=` 6 |

## 5. Defect register

| ID | Defect | Impact | Correction |
|---|---|---|---|
| D1 | `products.jsonl` contains only the 1,024 DYO products, ~2.4% of commerce URLs | Migrating from it yields a store with 1,024 products | Migrate from `urls.jsonl` as the spine |
| D2 | Cardinality counts in the package understate the catalogue | Under-provisioned infrastructure | Use the verified counts in section 4 |
| D3 | Route inventory mixes functional and parameter URLs | Redirect scope misjudged | Classify by shape; preserve query variants |
| D4 | 7,778 media records are JavaScript bundles misfiled as 3D or 360 | False 3D asset inventory | Skip `/_nuxt/*.js`; gate V16 |
| D5 | `content/` directories are empty | No content to migrate | Author from observed routes; CMS from scratch |
| D6 | Certificate artefacts exist as images but no document schema was captured | OCR pipeline is a from-scratch design | Treat contents as `[UNKNOWN]`; path conventions are the only evidence |
| D7 | 94.7% of media carry `role='unknown'` | Classification unusable | Derive `kind` and `role` from path stems |
| D8 | Price exists only in `pages_analyzed.jsonl`, never in `products.jsonl` | Deleting that file destroys all prices permanently | Retain permanently; recover before any cleanup |
| D9 | Pair specification strings are concatenated | Weight and dimension parsing breaks | Tokenize to `gemstone_stones`; record `token_count` and `is_doubled` |
| D10 | 221 DYO URLs had failed fetches | Identities unknown | Derive SKUs, mark `[INFERRED]`, null attributes, `DRAFT`; gates V18-V20 |
| D11 | 5 pair URLs share one PR id | Ambiguous stone identity | Store both; manual review |
| D12 | 314 stone URLs end `-J#####` | Likely misfiled | Quarantine |
| D13 | 423 `?rs=` and 6 `?design-styles=` variants | Redirect scope | Map explicitly; preserve unmapped parameters |
| D14 | 43,149 of 44,173 `raw_html` files are error shells, ~1.5 GB | Storage waste | Retain the 1,024 real files only |

## 6. Known unknowns

| # | Unknown | Why it matters | Handling |
|---|---|---|---|
| 1 | Payment provider and mechanics | Checkout cannot be built | `PaymentProvider` port; explicit open decision |
| 2 | Tax calculation | A sale cannot be finalised | Engine port; **fails closed**, never zero-tax |
| 3 | Shipping carriers and rates | Fulfilment and AOV | Open decision before fulfilment |
| 4 | Discount mechanics | Pricing | Validated server-side when defined |
| 5 | Refund policy | Financial exposure | Open decision before refunds are enabled |
| 6 | Inventory mutation and reservation semantics | Overselling | Postgres reservations with 30-minute TTL |
| 7 | Certificate document schema | OCR design | Typed extraction with per-field confidence |
| 8 | Original compatibility rules | DYO correctness | Seeded `ALLOW` from the 1,024 observed pairs; no invented `DENY` |
| 9 | Original pricing algorithm | Setting prices | Residual-derived and labelled an estimate |
| 10 | Ring sizing as a DYO option | Feature scope | **No evidence it existed.** Not implemented |
| 11 | Engraving as a DYO option | Feature scope | **No evidence it existed.** Not implemented |
| 12 | Side stones as a DYO dimension | Feature scope | `all_side_stones.json` is `[]`. Not implemented |
| 13 | Order numbering | Customer references | Proposed `MG-YYYY-NNNNNN` |
| 14 | Financing mechanism | Route is `[OBSERVED]` | Add-on line item when defined |
| 15 | Protection plan mechanism | Route is `[OBSERVED]` | Add-on line item when defined |
| 16 | Jurisdiction and statutory retention | Data compliance | Open decision before relying on the retention table |
| 17 | Test tooling | Developer velocity | **ADR-021**; proposed, not yet approved |
| 18 | Original CMS platform, workflow, permissions | Editorial model | Designed from observed routes |
| 19 | Original admin surface | Back-office scope | Designed from requirements; `/admin` absent from the URL inventory |
| 20 | Design-system primitives | Frontend consistency, accessibility | **ADR-022**; proposed, not yet approved |
| 21 | AI evaluation harness | Release gating | **ADR-023**; proposed, not yet approved |
| 22 | Provenance storage design | NFR-08 enforcement | **ADR-024**; proposed, not yet approved |
| 23 | WebAR asset production | Largest cost risk | Scoped to rings first; fully deferrable |
| 24 | Performance baseline data | NFR-15 | No source performance data exists; measurement required |

## 7. Assumptions register

| # | Assumption | Validation |
|---|---|---|
| 1 | `Ct.Tw.` in a slug equals the summed stone weight | 113/113 pairs |
| 2 | A setting variant sells without a stone | `[OBSERVED]` setting routes |
| 3 | Each `gem_ref` is one physical object | `[VERIFIED]` 0 unstable |
| 4 | Skugs preserve semantic tokens worth keeping | Observed slug shape |
| 5 | Variety is derivable from the first slug segment | 19,666/19,666 |
| 6 | Metal codes map 1:1 to slug phrases | 14 codes verified |
| 7 | `INVENTORY` has no numeric stock because each stone is unique | Domain reasoning; flagged `[INFERRED]` |
| 8 | Stone weight is per-stone for pairs | D9 tokenization |
| 9 | Education and FAQ pages are the trust-bearing content class | Observed route structure |
| 10 | The jewellery audience skews older | `[INFERRED]`; affects accessibility weighting |

## 8. Traceability

| Target capability | Evidence | Test | Doc |
|---|---|---|---|
| SKU grammar | 1,024/1,024 | Parser test over all source SKUs | 33, 32 |
| Pair weights | 113/113 | Sum check against `Ct.Tw.` | 32 |
| Variety derivation | 19,666/19,666 | Slug variety equals assigned variety | 32 |
| Metal mapping | 1:1, 14 codes | Every phrase maps to one code | 32 |
| Earrings-pair invariant | 113/113 | INV-02 assertion | 32 |
| Price recovery | 1,024/1,024 | All prices recovered | 32 |
| Price residual | 0/1,024 exact | Residual non-zero for every row | 32 |
| Media classification | D4 | Zero assets from a `.js` URL | 24, 32 |
| Media disposition | 94.7% unknown | Chrome records `SKIPPED`, not attached | 24, 32 |
| URL preservation | 44,218 | Every URL resolves or 301s | 34 |
| Checkout funnel | 4 URLs | Four-step E2E with server checkpoints | 13, 32 |
| Certificate artefacts | Path convention | Every artefact becomes a record | 17, 32 |
| DYO invariants | `[VERIFIED]` | INV-01, INV-02, INV-03 as constraints | 14, 32 |
| Derived SKUs | §3.1 Example B | 221 rows quarantined | 33, 32 |

## 9. Source-to-target map

| Source artefact | Target |
|---|---|
| `urls.jsonl` | The migration spine; the redirect inventory |
| `specifications.jsonl` | `gemstones` attributes; `gemstone_stones` rows (D9) |
| `pages_analyzed.jsonl` | `price_entries`, `price_model_observations`, availability, JSON-LD |
| `products.jsonl` | SKU ground truth only, for parser validation (V3) |
| `media_analyzed.jsonl` | `assets` with path-stem classification |
| `entities/media/*.json` | `certificates` existence (D6) |
| `taxonomy.json` | Reference data seeding and normalizer validation |
| `crawler.sqlite` | Schema intent; relational cross-check; regenerate derived JSONL |
| `raw_html` (1,024 real files) | Archive; DOM ground truth if ever needed |
| `source_snapshots/manifest.jsonl` | Integrity verification of any re-crawl |

## 10. Implementation constraints

1. Every factual claim in this package carries an evidence status.
2. `[UNKNOWN]` is a valid, final outcome.
3. `[INFERRED]` requires human approval before publication.
4. Never promote a status by inference alone.
5. The verified observations in section 4 are the regression baseline; a change to any of them invalidates the corresponding gate.
6. The defect register is permanent; each defect has a corresponding test that must not be removed.

## Evidence status

This document is a register rather than a design. Sections 4 and 5 record observed facts and known defects; sections 6 and 7 record what is not known and what is assumed. All counts in section 4 are the verified baselines used by the migration gates in doc 33 and the tests in doc 32. Where a number appears nowhere else in this package, it appears here with its verification method.