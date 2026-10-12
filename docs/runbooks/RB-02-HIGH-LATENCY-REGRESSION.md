# RB-02: High Latency & Catalog Query Regression Runbook

**Document ID:** `RB-02-HIGH-LATENCY-REGRESSION`  
**Severity:** P2  
**Trigger:** `catalog_query_duration_p95_ms > 400ms` (5m window) breaching `SLO-LAT-01` (Catalog Query Latency p95 $\le 400\text{ms}$).  
**Owner:** `catalog-team`  
**Escalation Path:** Catalog Technical Lead $\to$ Principal Database Engineer  

---

## 1. Initial Triage

1. **Verify Latency Distribution:**
   - Review p50, p95, p99 latency in metrics dashboard.
   - Determine whether latency affects all catalog endpoints or specific filter combinations (e.g. multi-facet queries, heavy origin/colour filters, unbounded page offsets).
2. **Examine Span Attributes:**
   - Sample slow spans with `span.name = 'db.catalog.listProducts'` or `'db.search.execute'`.
   - Inspect statement hash, duration, and returned row counts (remember: zero bound parameter values logged per technical_design/28 §5).

---

## 2. Diagnostics & Mitigation

| Area | Diagnostic Command / Metric | Mitigation |
|---|---|---|
| **Cache Miss / Cold Cache** | Check Redis cache hit rate `ops.cache.hit_rate`. | Warm cache for top categories; verify Redis instance memory and eviction metrics. |
| **Missing / Inefficient Index** | Check slow query log in Neon Postgres; verify `pg_stat_statements`. | Validate index usage on `(family, variety, is_active)` and `(carat_weight)`; rebuild bloat if necessary. |
| **Connection Pooling Queuing** | Review `db_pool_wait_p95_ms`. | Increase connection pool limits or reduce client concurrency per serverless instance. |
| **Large Response Payloads** | Check response body byte sizes and serialized JSON depth. | Ensure keyset pagination cursor is strictly bounded ($\le 24$ items per page). |

---

## 3. Resolution Verification

1. Observe `catalog_query_duration_p95_ms` returns below $300\text{ms}$ for 15 consecutive minutes.
2. Run automated sanity check on critical category endpoints (`/sapphire`, `/ruby`, `/emerald`, `/api/v1/products`).
3. Confirm alert `ALERT-P2-CATALOG-LATENCY-BREACH` transitions from `FIRING` to `RESOLVED`.
