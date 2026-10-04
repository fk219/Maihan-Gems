# 30 PERFORMANCE ARCHITECTURE

**Package:** `technical_design/` doc 30 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 6, NFR-02, NFR-03, NFR-14, NFR-15.
**Evidence status:** `[INFERRED]`.

---

## Purpose

Define performance budgets, the query strategies that meet them, the measurement discipline, and the explicit refusal to assert capacity that has not been load-tested.

## 1. The honesty rule

**No numeric capacity claim is asserted without load-test evidence (NFR-15).**

| Target | Value | Basis |
|---|---|---|
| Storefront p75 LCP | < 2.5s on product and category pages | NFR-02 |
| WebAR impact on LCP | must not regress it | NFR-02 |
| Search p95, filtered | < 400ms | NFR-03 |
| Search p95, with semantic re-rank | < 800ms | NFR-03 |
| Design scale | ~50,000 users without premature microservices | NFR-01 |

`[INFERRED]` NFR-14: catalog and search stay readable when AI, Redis or the vector index is down. NFR-15 is the constraint that shapes this entire document: the corpus is small (1,024 products, 19,665 stones, 10,349 variants), so the performance risk is **not** raw scale. It is query shape, facet combinations, image weight and the AI path. Optimising for throughput that will not arrive is the classic way to spend a quarter on nothing.

## 2. Where the real risk is

| Area | Risk | Mitigation |
|---|---|---|
| Faceted search | combinatorial filter combinations over 19,665 stones | indexed facets, generation-cached counts, capped combinations |
| Facet counts | a count per facet value per query | cached 300s per query hash, generation bumped on writes (doc 25) |
| Product detail joins | gemstone, setting, variant, price, media, documents | single query with explicit joins, SWR cached 300s |
| Media weight | the largest determinant of LCP | responsive variants, CDN, priority hints, below-fold lazy loading |
| Search re-rank | vector similarity over the candidate set | re-rank only the top N from the structured arm, never the full set |
| AI latency | 2 to 6s for a grounded answer | async where possible, streaming, hard timeouts, handoff |

The facet-count problem is the one that catches teams by surprise. Nine filter families over sixty colours produce thousands of distinct count queries per page load if each is computed live.

## 3. Query strategy

| Query | Strategy | Index |
|---|---|---|
| Product by slug | unique index on `products.slug` | btree unique |
| Products by family | partial index on active products per family | btree, `WHERE state='ACTIVE'` |
| Facet counts | covering index including filter columns | `INCLUDE` payload columns |
| Full-text search | generated `tsvector` plus GIN | GIN |
| Fuzzy / typo | `pg_trgm` on slug and name | GIN trigram |
| Vector similarity | `pgvector` HNSW | HNSW per doc 12 |
| Taxonomy lookups | cached 3600s | btree |
| Availability | `products.availability` partial index | btree |
| Certificate public view | `LEFT JOIN LATERAL ... LIMIT 1` per certificate | `extracted_at DESC` composite |

Every index is justified by a measured query. An index added "in case" costs write throughput and storage on every insert, and on an import of 241,961 media records and ~44,000 product-media rows that cost is immediate.

## 4. Rendering and delivery

| Route | Strategy | Cache |
|---|---|---|
| Home, category, variety | static with revalidation, tag-invalidated | SWR, tag-based |
| Product detail | static shell, streamed dynamic islands | SWR, `ProductUpdated` |
| Search | dynamic, server-rendered for SEO | 60s, generation-keyed |
| DYO configurator | client-side state, server for validation and price | `dyo:draft` |
| Cart, checkout | **never cached**, fully dynamic | none, recomputed per request |
| Admin | dynamic, no caching of PII | none |

Cart and checkout being uncached is a performance cost accepted deliberately (doc 25 section 3): the alternative is a stale total, and a stale total becomes a customer dispute.

## 5. Image performance

| Technique | Purpose |
|---|---|
| Responsive `srcset` | the device downloads one appropriate size |
| AVIF with WebP fallback | format negotiation by the CDN |
| `width`/`height` on every image | no layout shift (CLS) |
| LCP image `fetchpriority="high"`, `preload` | the hero is the LCP element |
| Below-fold `loading="lazy"` | no wasted bytes on first paint |
| Explicit dimensions for the AR canvas | the viewer does not shift when the GLB loads |
| Blur-up placeholder | perceived speed on slow connections |

Image weight is the dominant factor in LCP for a jewellery storefront, because the product hero *is* the page. This is why doc 24's variant set exists rather than a single original.

## 6. Bundle budget

| Surface | Budget | Enforcement |
|---|---|---|
| Storefront initial JS | 180 KB gzipped | CI budget check |
| Route chunk | 90 KB gzipped | CI budget check |
| WebAR chunk | 120 KB gzipped, lazy | CI budget check |
| Admin bundle | not in the storefront graph | architecture test |

The WebAR chunk carries MediaPipe WASM and Three.js, which is precisely why it must be dynamically imported and lazily triggered. Shipping it in the storefront bundle would blow the initial budget by an order of magnitude and regress LCP on every page, violating NFR-02 directly.

## 7. Database performance

| Concern | Rule |
|---|---|
| Connection pooling | pooled for serverless, a small direct pool for the worker |
| `statement_timeout` | per role, so a reporting query cannot starve a checkout |
| N+1 | forbidden in application code; a query-count assertion in tests |
| Long-running work | batched, rate-limited, off-peak (doc 27) |
| Migration backfills | batched and resumable, never in a deploy transaction |
| Index creation | `CREATE INDEX CONCURRENTLY` on populated tables |
| Autovacuum | tuned for the write patterns; verified after import |

## 8. AI performance

| Concern | Rule |
|---|---|
| Latency budget | Hard timeout per surface; on breach, handoff rather than hang |
| Streaming | Tokens stream so perceived latency is low even when total time is not |
| Retrieval | Structured tools answer first; RAG only for explanation questions |
| Re-rank | Only the top N structured results are re-ranked |
| Budget | Per-surface daily budget with a hard stop (doc 18) |
| Concurrency | Semaphore per surface; queue rather than fail |

A slow AI answer is a UX problem; a **fabricated** fast one is a trust problem. Every latency mitigation here must preserve grounding, so the timeout leads to handoff rather than to an ungrounded answer.

## 9. Measurement

| Layer | Method |
|---|---|
| Real users | `web-vitals` reported to the backend, segmented by route |
| Lab | Lighthouse CI on key routes, run per PR |
| Server | OTel spans per request, command and query (doc 28) |
| Database | `pg_stat_statements`, slow query log |
| Load | k6 scenarios against staging with production-shaped data |
| AI | Per-interaction latency, TTFB, cost |

Lab data alone is insufficient for the storefront targets; p75 LCP is a real-user metric and lab runs systematically miss actual connection quality and device mix.

## 10. Load test scenarios

| Scenario | Purpose |
|---|---|
| Browse | Category browse and product detail at expected peak |
| Search | Filtered search with facet combinations, including deep ones |
| DYO | Configuration, validation and quote, the heaviest write path |
| Checkout | Cart to order, verifying that payment is never a bottleneck |
| Asset burst | Cold-cache product page loads from the CDN |
| AI | Chat and search assist under load, verifying budget and handoff behaviour |
| Import rehearsal | Full migration against a production-shaped staging copy |

The DYO and checkout scenarios matter more than raw throughput. A platform that serves 10,000 page views per second but fails a quote is not fast.

## 11. Validation rules

1. Every performance target traces to an NFR or a charter requirement.
2. No capacity number is asserted without a load-test result.
3. No index is added without a measured query that needs it.
4. N+1 access is a test failure, not a review comment.
5. Cart, checkout and payment paths are never cached.
6. WebAR is dynamically imported and never in the initial bundle.
7. The LCP image is preloaded and has explicit dimensions.
8. AI latency mitigation never bypasses the grounding gate.

## 12. Error handling

| Condition | Behaviour |
|---|---|
| Slow query | `statement_timeout`; logged; not silently retried |
| Facet combination explosion | Combinations capped; the UI narrows rather than computing every count |
| Re-rank timeout | Return structured results; state that semantic re-rank was unavailable |
| AI timeout | Handoff with an expectation, never an ungrounded answer |
| CDN miss storm | Origin serves; monitor for a cache-key regression |
| Budget exhausted | Hard stop with handoff, not silent truncation |

## 13. Observability

Metrics: Web Vitals by route and device class, search latency by strategy, facet query time, cache hit ratio by cache id, query duration percentiles, pool wait, connection count, bundle size, LCP image bytes, AI TTFB and cost. Alerts on p75 LCP breach, p95 search breach, pool exhaustion, and bundle-budget regression in CI.

## 14. Testing requirements

| Test | Proves |
|---|---|
| Lighthouse CI | Key routes meet the LCP budget and stay there |
| Web Vitals reporting | Real-user p75 is captured per route |
| Query-count assertion | No N+1 in list or detail paths |
| Bundle budget | CI fails on budget regression, including an accidental WebAR import |
| Deep-facet load | Worst-case filter combinations stay inside the search budget |
| DYO load | Validate and quote hold their budget under concurrency |
| Checkout load | Checkout latency is independent of AI availability |
| Degradation | With AI, Redis and the vector index down, catalog and search stay readable |
| Index impact | Import throughput meets its budget with production indexes present |
| Load report | Every asserted capacity number has a dated load-test artefact |

## 15. Failure modes

| Failure | Behaviour |
|---|---|
| Regression in LCP | CI budget check blocks the release |
| Search slowdown | Structured arm still serves; semantic re-rank degrades first |
| Database saturation | Pool exhaustion alert; reporting queries shed before transactional ones |
| AI slowness | Timeout plus handoff; catalog unaffected |
| Cold cache | Origin serves; asset CDN absorbs repeat traffic |
| Unmeasured capacity claim | Blocked in review; NFR-15 makes it a defect, not an opinion |

## 16. Implementation constraints

1. No capacity claim without load-test evidence (NFR-15).
2. Cart, checkout and payment are never cached.
3. WebAR is lazily loaded and never regresses LCP (NFR-02).
4. Search re-ranks only the top N structured results.
5. Facet counts are cached and generation-bumped, never computed live per value.
6. AI latency mitigation never bypasses grounding.

## Evidence status

`[INFERRED]` throughout. No source performance data exists; the crawler artefacts contain no timing, Core Web Vitals or latency evidence. The targets come from NFR-02, NFR-03 and NFR-01, and the risk analysis in section 2 is derived from the observed corpus shape (1,024 products, 19,665 stones, 10,349 variants, 44,218 URLs) rather than from measured behaviour. Section 1's refusal to assert unmeasured capacity is the load-bearing decision in this document.