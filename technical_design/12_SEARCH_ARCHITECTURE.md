# 12 SEARCH ARCHITECTURE

**Package:** `technical_design/` doc 12 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 11.3, 14 (complete search architecture), 33.
**Evidence status:** `[INFERRED]`. The source's search provider, ranking algorithm, synonym rules and filter precedence are `[UNKNOWN]`; only 860 keyword signals and the `?rs=` / `?design-styles=` query strings were observed.

---

## Purpose

Define hybrid search exactly: structured filtering, PostgreSQL full-text, `pg_trgm`, `pgvector`, facet generation, ranking, synonyms, typo tolerance, caching, reindexing and versioning.

## Stack decision

`[INFERRED]` ADR-006: PostgreSQL FTS + `pg_trgm` + `pgvector` + structured filters + deterministic business ranking. **No dedicated search engine.**

Justification: approximately 33,000 searchable entities (19,665 stones + 3,072 pairs + 10,349 setting variants + 9,812 products, deduplicated by kind). Postgres meets NFR-03 with zero operational overhead and no second source of truth. A dedicated engine would add index lifecycle, reindex tooling and eventual consistency for unproven benefit. Revisit only on measured breach of PG-3 or PG-4.

## Query flow

```text
query + URL filters
  -> [1] parse and normalise        lowercase, strip punctuation
  -> [2] detect intent             deterministic rules, never a model
  -> [3] build structured filters  typed, whitelisted, index-backed
  -> [4] candidate retrieval        three arms, unioned by id
       a) structured   products join settings, gemstones, taxonomy
       b) full-text    tsvector + websearch_to_tsquery, trigram fallback
       c) semantic     product_embeddings HNSW, gated
  -> [5] merge and filter           intersect with structured predicates
  -> [6] rank                       weighted blend then business modifiers
  -> [7] facet counts               one grouped pass over the filtered set
  -> [8] assemble                   data + meta + facets + rejectedFilters
```

Step 2 is a rule set, not a model. The request path must be fast and free. The AI concierge performs its own richer intent extraction and then calls this.

## Structured filters

Every filter maps to an indexed column, so selectivity drives the plan.

| Filter | Predicate | Index |
|---|---|---|
| `kind` | `products.kind` | `(kind, state)` |
| `variety` | `variety_id = ANY($1)` | `(variety_id, state)` |
| `color` | `colour_id = ANY($1)` | `(colour_id, state)` |
| `intensity` | `gemstones.intensity_id` | `gemstones (colour_id, intensity_id)` |
| `shape` | `gemstones.shape` | `gemstones (shape)` |
| `clarity` | `gemstones.clarity_id` | join |
| `treatment` | `gemstones.treatment_id` | `gemstones (treatment_id)` |
| `origin` | `gemstones.origin_id` | `gemstones (origin_id)` |
| `minWeightCt` / `maxWeightCt` | `total_weight_ct BETWEEN` | `products (total_weight_ct)` |
| `minPrice` / `maxPrice` | `price_amount BETWEEN` | `products (price_amount) WHERE state='ACTIVE'` |
| `jewelleryType` | `jewellery_type = ANY($1)` | `(jewellery_type, state)` |
| `settingStyle` | join `settings.style_id` | `settings (style_id, jewellery_type)` |
| `metal` | `setting_variants.metal_code` | `setting_variants (metal_code, state)` |
| `certified` | `EXISTS (certificates WHERE verification_status='VERIFIED')` | `certificates (verification_status)` |
| `available` | `availability AND state='ACTIVE'` | partial |

Filters validate against a whitelist derived from the taxonomy tables. An unknown value returns `rejectedFilters` with a reason; it never silently widens the result set.

`settingStyle` maps to the `?design-styles=` facet observed in the source `[OBSERVED]`. `rs` is treated as a sort or page parameter `[INFERRED]`, because its meaning is not recoverable from 423 URLs of unknown semantics.

## Full-text arm

```sql
websearch_to_tsquery('english', $1)                      -- quotes, OR, -negation
ts_rank_cd(<tsvector>, websearch_to_tsquery('english',$1), 32)  -- cover density
```

Three indexed `tsvector` sources: `gemstones.search_document` (maintained by trigger), `products` (weighted title/subtitle/description), `knowledge_chunks` and `knowledge_documents`.

## Trigram arm

`pg_trgm` GIN on `gem_ref`, `products.title` and `gemstone_varieties.name`, similarity threshold 0.3, used when the full-text arm returns nothing. This handles single-token misspellings: `tsavorite` -> `tsavorite garnet`, `aquamarinn` -> `aquamarine`.

## Semantic arm

Gated, because it costs an embedding call and an HNSW probe:

| Disabled when | Enabled when |
|---|---|
| `semantic=false` in the request | Descriptive intent, few structured constraints |
| Query is navigational (exact variety or SKU match) | Query has descriptive modifiers |
| Structured arm already returns `> limit * 20` candidates | Result set would benefit from re-ranking |

Embeddings are `product_embeddings` (1024-dim, HNSW cosine). Product embedding document: title, variety, colour, intensity, shape, cut, clarity, treatment, origin, setting style, metal.

`content_hash` makes re-embedding idempotent: an unchanged product produces the same hash and skips the model call. This is the single largest AI cost control in the system.

## Ranking

`[INFERRED]` Deterministic, versioned, unit-tested. Weights reflect gemstone buying behaviour. **They are not observed source behaviour and are not claimed to be.**

```text
score = 0.34 * textRankNormalised
      + 0.22 * semanticSimilarity        (0 when the semantic arm is off)
      + 0.16 * businessSignal
      + 0.12 * facetMatchBonus
      + 0.10 * availabilitySignal
      + 0.06 * recencySignal
```

Business modifiers applied after scoring:

| Modifier | Factor | Rationale |
|---|---|---|
| Verified certificate attached | x1.15 | Trust differentiates in this market |
| `stone_type` recorded | x1.08 | More useful; 911 of 1,024 lack it, so this is a real differentiator |
| In stock | x1.05 | Never promote unavailable |
| Ready-made (`J` SKU) | x0.95 | Stone weight is the `0.00ct` placeholder `[OBSERVED]` |
| **Heat Treated disclosed** | **x1.00** | **Never penalised.** See below |
| Pair | x1.00 | Neutral |
| Draft or archived | excluded | Never surfaced |

**Treatment is explicitly not a ranking penalty.** Suppressing treated stones would be commercially and ethically wrong. The correct behaviour is prominent disclosure, enforced by the UI and by the AI refusal rules.

Ranking configuration is versioned (`SearchRankingConfig`, stored in `feature_flags.rules`) so a change is a deployable, revertible act, not a code edit. Ranking determinism is unit-tested by asserting a fixed candidate set produces a fixed ordered output.

## Synonyms

`[INFERRED]` A versioned map, seeded from evidence and curated. Each entry records whether it is observed or curated so the AI can distinguish them.

| Canonical | Variants | Basis |
|---|---|---|
| `tsavorite` | tsavorite garnet, green grossular | `[OBSERVED]` route `tsavorite-garnet` |
| `paraiba tourmaline` | paraiba, blue-green tourmaline | `[OBSERVED]` |
| `sphene` | titanite, sphene titanite | `[OBSERVED]` |
| `padparadscha` | padparadscha sapphire, pink-orange sapphire | `[OBSERVED]` |
| `chrome diopside` | chrome diopside, chrome | `[OBSERVED]` |
| `precious topaz` | imperial topaz, precious topaz | `[OBSERVED]` `imperial-topaz` |
| `grossular garnet` | grossular, hessonite, tsavorite | `[INFERRED]` grouping |
| `emerald cut` | emerald, step cut | `[INFERRED]` gemological synonym |
| `ceylon` | ceylon, sri lankan, ceylon (sri lanka) | `[OBSERVED]` |
| `high polish` | polished | `[OBSERVED]` `highPolish` filter asset |

Synonyms apply at the FTS stage via a mapping applied to the query terms, not by duplicating catalogue rows. A synonym never creates a second variety or a second facet value.

## Facets

Computed in a single grouped pass per dimension over the filtered candidate set, so facet counts always agree with the result set. Each facet returns `value`, `count`, `selected`. Colour and variety use disjunctive handling: selecting one colour does not zero the counts of the others.

A facet consistency test asserts, for sampled queries, that `facets[x].count` equals the count of results matching that value alone.

## Pagination

Keyset only. Ranked: `(score DESC, product_id DESC)`. Sorted: `(price_amount, id)` or `(total_weight_ct, id)`. Offset pagination is forbidden for deep pages; it degrades and is unnecessary at this size.

## Caching

| Layer | Key | TTL | Invalidation |
|---|---|---|---|
| CDN | full URL | 60s | none |
| Redis | `search:{generation}:{hash}` | 60s | generation bump |
| Redis | `facets:{generation}:{hash}` | 300s | generation bump |
| Redis | `suggest:{prefix}` | 3600s | generation bump |

The hash covers query text, every filter, sort, limit and the index generation. A `search:generation` counter in Redis is folded into every key. Bumping it invalidates the entire search cache in one operation, with no key scanning. This is the safety net: even if a tag-based delete is lost, old keys become unreachable within 60 seconds.

## Reindexing

| Index | Method |
|---|---|
| `tsvector` | Expression index created in migration; maintained incrementally thereafter |
| Facet columns | Composite B-tree per high-value combination |
| `pg_trgm` | GIN maintained incrementally |
| HNSW | Maintained incrementally by inserts; a full rebuild only on a model or schema change |

Reindex is not a global rebuild. Rebuilds run as a background job with shadow-index comparison, and only for an embedding-model change (ADR-018) or a schema change.

## Search versioning

| Versioned artefact | Where | Why |
|---|---|---|
| Schema/index generation | `search:generation` counter | Cache key component |
| Ranking weights and modifiers | `feature_flags.rules` | Revert without deploy |
| Synonym map | versioned reference data | Revert and audit |
| Embedding model | `product_embeddings.embedding_model` | Enables parallel models during migration |

`search:version` is surfaced in the response `meta` so a result set can be reproduced and a regression diagnosed.

## Validation rules

1. Every filter value must resolve in taxonomy, else it lands in `rejectedFilters`.
2. `limit` between 1 and 100.
3. Cursor opaque and tamper-evident.
4. `semantic` must be a boolean; a truthy string is rejected.
5. Query length capped to prevent pathological FTS.
6. No user input reaches a raw SQL identifier; sort and direction are whitelist-enumerated.

## Error handling

| Code | Meaning |
|---|---|
| `INVALID_FILTER` | A filter value is unknown; details list the rejected values |
| `INVALID_SORT` | Sort field not whitelisted |
| `CURSOR_INVALID` | Cursor corrupt or from a different query shape |
| `SEMANTIC_UNAVAILABLE` | Vector arm requested but disabled; falls back, does not fail |
| `SEARCH_TIMEOUT` | Query exceeded budget; returns structured results, not an error page |

## Security boundaries

Search is public. It exposes only published, `ACTIVE` rows. It never exposes `price_entries.cost_component`, unpublished products, `source_sku_derived` values, or any internal identifier. Search suggestions are rate limited per IP to prevent enumeration.

## Observability

Spans per search with `strategy`, `armResults` counts and `facetTime`. Metrics: p50/p95/p99 latency, zero-result rate, strategy mix, semantic usage rate, facet computation time, rejected-filter rate, cache hit rate. Alerts on a zero-result spike (usually a parser or taxonomy regression) and on latency breach of PG-3 or PG-4.

## Testing requirements

| Test | Proves |
|---|---|
| Parser tests | Every filter maps to an indexed column |
| Full-text arm | `websearch_to_tsquery` handles quotes, OR, negation |
| Trigram arm | Single-token misspellings resolve |
| Synonym tests | Each documented synonym pair resolves |
| Ranking determinism | Fixed input, fixed ordered output |
| Treatment neutrality | No query demotes a treated stone |
| Facet consistency | Facet counts equal result counts |
| Pagination | No duplicates or gaps across pages |
| Semantic gating | Arm respects every disable condition |
| Degradation | With vectors disabled, structured plus FTS still answers |
| No model on request path | Lint plus a test asserting no gateway call |
| Cache generation | Bumping generation makes old keys unreachable |
| Load | PG-3 and PG-4 met on staging |

## Failure modes

| Failure | Response |
|---|---|
| Vector index unavailable | Circuit breaker; semantic off; structured plus FTS continues |
| Zero results for a valid query | Return zero with an explanation and relaxed-filter suggestions; never fabricate |
| Facet query times out | Return results with facets omitted and `meta.facetsOmitted: true` |
| Cache stampede | Single-flight plus stale-while-revalidate |
| Ranking regression | Revert `feature_flags.rules`; no deploy needed |

## Implementation constraints

1. No model on the search request path.
2. Deterministic, versioned ranking; no learned component.
3. Treatment is never a ranking penalty.
4. Unavailable is never presented as available.
5. Keyset pagination only.
6. No dedicated search engine without a new ADR superseding ADR-006.

## Evidence status

`[INFERRED]` for the entire search design. `[OBSERVED]` source facts used: 860 search signals, `?rs=` and `?design-styles=` query strings, 15 nav-menu colour swatches, 145 variety routes, 60 colour routes, 7 cut shapes, 13 spec fields, the `0.00ct` placeholder on ready-made products, and `stone_type` present on only 113 of 1,024 products. The source's provider, ranking algorithm, synonym set and filter precedence remain `[UNKNOWN]` and are not reconstructed.