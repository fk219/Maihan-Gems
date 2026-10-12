# RB-01: Elevated Error Rate Incident Runbook

**Document ID:** `RB-01-ELEVATED-ERROR-RATE`  
**Severity:** P1  
**Trigger:** `http_request_error_rate > 0.1%` (5m window) breaching `SLO-AVAIL-01` (Storefront & API Availability $\ge 99.9\%$).  
**Owner:** `platform-oncall`  
**Escalation Path:** Platform Lead $\to$ VP Engineering  

---

## 1. Initial Triage (First 5 Minutes)

1. **Verify Alert Validity:**
   - Query `/api/v1/health/live` and `/api/v1/health/ready`.
   - Inspect Prometheus metric `http_request_error_rate` across endpoints.
   - Confirm whether errors are isolated to a single route (e.g. `/api/v1/checkout/*`, `/api/v1/products/*`) or systemic across all HTTP traffic.
2. **Examine W3C Trace IDs & Sentry Errors:**
   - Grab sample `trace_id` headers from error responses.
   - Inspect Sentry dashboard filtering by `environment=production` and `level=error`.
   - Check error classification: 500 `INTERNAL` vs 503 `SERVICE_UNAVAILABLE` vs 429 `RATE_LIMITED`.

---

## 2. Root Cause Analysis Checklist

| Symptom | Diagnostic Step | Immediate Mitigation |
|---|---|---|
| **Database connection pool exhaustion** | Check `/api/v1/health/ready` for DB component status. Inspect `db_pool_wait_p95_ms`. | Scale Neon pool size or kill runaway read locks via Neon console. Follow `RB-03`. |
| **Upstream third-party outage** | Inspect external calls (Stripe/Payment gateway, OpenRouter AI, Meta WhatsApp). | Activate circuit breakers / graceful customer-facing degradations. |
| **Bad release / deployment regression** | Check deployment timestamps and recent git commits on Vercel. | Trigger instant rollback to previous stable deployment on Vercel. |
| **DDoS / Traffic spike** | Inspect request rate per IP subnet and rate-limit gate rejections. | Enable Cloudflare / Vercel Edge firewall challenge rules. |

---

## 3. Recovery Verification

1. Verify `/api/v1/health/ready` returns HTTP 200 with `status: "HEALTHY"`.
2. Confirm error rate drops below $0.05\%$ over a continuous 10-minute observation window.
3. Verify customer shopping journeys:
   - PDP load: `GET /api/v1/products/JS1383R14-PR5681` returns 200.
   - Search: `POST /api/v1/search` returns 200.
   - Cart & Checkout initialization returns 200.

---

## 4. Post-Incident & Audit

- Write post-mortem document recording Timeline, Root Cause, Mean Time to Detect (MTTD), and Mean Time to Resolve (MTTR).
- Verify no customer PII or card credentials were leaked into logs or error breadcrumbs during the incident.
