# 25 CACHE ARCHITECTURE

**Package:** `technical_design/` doc 25 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 15.
**Evidence status:** `[INFERRED]` design. The rule it encodes is a correctness requirement, not an observation.

---

## Purpose

Define the cache inventory, TTLs, invalidation, what is never cached, stampede protection and degradation behaviour.

## 1. The rule

> **Postgres is the source of truth. Redis is acceleration and transient state only.**

A cache entry is never the only copy of an order, payment, price or inventory fact. Every entry in the inventory below names its source of truth, and no row reads "Redis" in that column except the two that are explicitly advisory.

## 2. Cache inventory

| # | Cache | Key pattern | Source of truth | TTL | Invalidation | Stale strategy |
|---|---|---|---|---|---|---|
| 1 | Product detail | `product:{slug}` | `products` + joins | 300s | `ProductUpdated` | SWR |
| 2 | Variant list | `products:list:{family}` | `products` | 60s | `ProductUpdated`, `InventoryReserved` | SWR |
| 3 | Gemstone detail | `gemstone:{gemRef}` | `gemstones` + `gemstone_stones` | 300s | `GemstoneUpdated` | SWR |
| 4 | Taxonomy | `taxonomy:varieties` | taxonomy tables | 3600s | admin taxonomy write | SWR |
| 5 | Facet definitions | `taxonomy:facets` | taxonomy tables | 3600s | taxonomy write | SWR |
| 6 | Facet counts | `facets:{hash}` | live query | 300s | `ProductUpdated` | SWR |
| 7 | Search results | `search:{generation}:{hash}` | live query | 60s | generation bump | SWR |
| 8 | Search suggestions | `suggest:{prefix}` | live query | 3600s | generation bump | SWR |
| 9 | Navigation | `nav:{key}` | `navigations` | 3600s | nav write | SWR |
| 10 | CMS page | `page:{slug}` | `pages` | 600s | `PageUpdated` | SWR |
| 11 | Availability summary | `avail:{productId}` | `products.availability` | **15s max** | `InventoryReserved`, `InventoryReleased`, `OrderCreated` | none; bypass on write |
| 12 | Price quote | `quote:{token}` | `dyo_price_snapshots` | to `expires_at` | new snapshot | none; immutable |
| 13 | DYO draft session | `dyo:draft:{sessionId}` | `dyo_configurations` | 1800s | write-through | write-through |
| 14 | AI conversation state | `ai:conv:{id}` | `conversations`, `messages` | 300s | write-through | write-through |
| 15 | Rate limit counters | `rl:{bucket}:{window}` | Redis, advisory | window | expiry | n/a |
| 16 | Idempotency records | `idem:{key}` | **Postgres unique constraint** | 24h | none | Postgres authoritative |
| 17 | Session state | `sess:{id}` | managed auth provider | provider TTL | provider | none |
| 18 | Distributed lock | `lock:{name}` | Postgres advisory lock | 30s | TTL expiry | none |
| 19 | HTTP page cache | tag-based, Next.js | Postgres | per route | tag invalidation | SWR |
| 20 | CDN | URL + surrogate key | R2 | per asset | asset revalidation | SWR |

Three rows deserve emphasis:

- **#11 availability at 15 seconds** is the shortest TTL in the inventory. This is the one place where a slightly wrong answer is a lost or oversold sale (doc 15).
- **#16 idempotency** is authoritative in Postgres. Redis is a mirror for fast rejection only; if the two disagree, Postgres wins.
- **#18 locks** are convenience over Postgres advisory locks, so a Redis flush cannot release a lock that a transaction still depends on.

## 3. Never cached, or cached only for seconds

| Data | Policy | Reason |
|---|---|---|
| Payment state | never cached | money correctness |
| Order state after placement | never cached | money and fulfilment correctness |
| Checkout session totals | never cached; recomputed per request | prevents stale-price checkout |
| Authorization decisions | never cached beyond the request | prevents privilege leakage |
| Customer PII | never in Redis; Postgres with RLS only | data protection |
| Inventory exact counts | at most 15s, invalidated on every write | stock accuracy |
| AI conversation content | write-through only, never authoritative | correctness of memory |
| Certificate verification status | at most 60s, invalidated on `CertificateApproved` | trust integrity |

Checkout totals being recomputed per request is what makes the 409 `PRICE_CHANGED` path real rather than decorative (doc 16 section 8). A cached total is a stale total waiting for a customer dispute.

## 4. Invalidation

Domain events drive invalidation (doc 26). One Pub/Sub channel per tag family lets every instance drop its local memory:

```text
ProductUpdated(productId, slug, family)
  -> DEL product:{slug}
  -> DEL products:list:{family}
  -> DEL search:*                    (via generation bump)
  -> PUBLISH cache:invalidate { tags: [...] }
  -> revalidate the Next.js cache tag
  -> enqueue EmbeddingGeneration if content_hash changed
```

**The generation bump is the safety net.** Even if a tag-based delete is lost, a generation change makes every old search key unreachable within 60 seconds. That converts "invalidation must work" from a correctness dependency into a bounded staleness window, which is the property that makes a cache safe to operate.

## 5. Stampede protection

Single-flight: the first caller to miss a key acquires `lock:{key}`, computes and populates. Concurrent callers wait up to 2s and then read, or compute themselves if the key is still empty after a 5s ceiling.

Combined with SWR, this keeps latency flat under burst. The two-stage wait is deliberate: a short wait avoids duplicate computation, and the independent ceiling prevents a slow compute from turning into a queue of blocked requests.

## 6. Key design rules

| Rule | Detail |
|---|---|
| Version prefix | Cache keys carry a schema version so a serialization change is a miss, not a deserialization error |
| Namespace | Environment-prefixed; never shared across environments |
| No PII in keys | A key containing an email or phone leaks into logs, slowlog and monitoring |
| Bounded cardinality | Search and facet keys are hash-derived; raw query strings are never keys |
| Hash includes the filter set | Two different filter combinations must never share a key |
| Serialization | One explicit codec per value type; no ad-hoc `JSON.stringify` |

Search keys embed the generation, so a bump retires them wholesale. That is far more reliable than trying to enumerate every affected query.

## 7. Validation rules

1. No cache entry is the sole copy of a business fact.
2. Payment, order, checkout totals and authorization decisions are never cached.
3. Customer PII never appears in a key or a value.
4. Availability TTL never exceeds 15 seconds.
5. Certificate status TTL never exceeds 60 seconds.
6. Idempotency resolves against Postgres on any Redis disagreement.
7. Search keys include the generation.
8. Every cache has a named source of truth in the inventory table.

## 8. Error handling

| Code | Status | Behaviour |
|---|---|---|
| `CACHE_UNAVAILABLE` | internal | Bypass to the source of truth; never a 500 to the customer |
| `CACHE_SERIALIZATION_FAILED` | internal | Treat as a miss; log with the key version |
| `LOCK_TIMEOUT` | internal | Compute without the lock rather than block |
| `RATE_LIMIT_BACKEND_DOWN` | 429 | Fall back to `rate_limit_counters`; fail closed on abuse paths |

## 9. Security boundaries

- No PII in Redis keys or values; PII lives in Postgres behind RLS.
- Certificate and report URLs are never cached as public strings; only opaque signed-URL issuance is cached, if at all.
- Authorization decisions never persist beyond the request.
- Redis requires authentication and TLS, and is not internet-reachable.
- Cache keys never encode internal identifiers that would assist enumeration.

## 10. Observability

Metrics: hit ratio per cache, miss latency, SWR serve count, stampede-lock acquisition and wait duration, invalidation event volume, generation-bump frequency, bytes resident, evictions, key cardinality growth. Alerts on any cache dropping below its expected hit ratio (a silent invalidation bug), on eviction storms (memory pressure), and on rising key cardinality (unbounded key construction).

Hit-ratio alerting matters more than hit ratio itself. A cache that quietly stops working still returns correct results, so the failure is invisible until the database falls over.

## 11. Testing requirements

| Test | Proves |
|---|---|
| Source-of-truth rule | Every inventory row names a source of truth; no business fact is Redis-only |
| Never-cached list | Payment, order, checkout and authorization paths perform no cache read |
| Generation bump | Old search keys become unreachable after a bump |
| TTL ceilings | Availability never exceeds 15s; certificate status never exceeds 60s |
| Stampede | N concurrent misses produce one compute |
| Redis down | Catalog, search and product pages still serve correctly from Postgres |
| Postgres down | Cached read pages serve; cart and checkout fail closed |
| PII scan | No key or value contains an email, phone or address |
| Idempotency | A Redis/Postgres disagreement resolves to the Postgres record |
| Lock expiry | A lock whose holder dies is released within 30s |
| Serialization version | A codec change is a miss, not an error |

## 12. Failure modes

| Failure | Behaviour |
|---|---|
| Redis down | All caches bypassed; Postgres serves directly. Catalog and search stay correct and slower. Rate limits fall back to `rate_limit_counters`. |
| Postgres down | Hard failure on transactional routes. Cached read pages continue, clearly marked stale. Cart and checkout fail closed. |
| CDN down | Origin serves directly |
| Vector index unavailable | Semantic arm disabled; structured plus full-text search continues (FR-SEARCH-05 never depends on vectors) |
| AI gateway down | Chat returns a graceful message plus handoff; catalog unaffected |
| Lost invalidation | Bounded by TTL, and immediately for search via generation bump |
| Stampede | Single-flight; bounded wait then independent compute |

## 13. Implementation constraints

1. Postgres is the source of truth; Redis never holds the only copy.
2. Availability is capped at 15 seconds; certificate status at 60 seconds.
3. Search keys embed a generation, so invalidation cannot be lost silently.
4. Checkout totals, payment, orders and authorization are never cached.
5. No PII in keys or values.
6. Every cache degrades to the source of truth rather than failing the request.

## Evidence status

`[INFERRED]` throughout. No source artefact describes a cache layer; the source was a server-rendered Nuxt application with no evidence of the caching, queueing or outbox infrastructure described here. The design is stated as proposed, and its load-bearing content is the set of *negations* in sections 1 and 3, which encode correctness requirements rather than optimisations.