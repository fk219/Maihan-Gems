# RB-06: SLO Error Budget Burn & Production Hardening Runbook

**Document ID:** `RB-06-SLO-ERROR-BUDGET-BURN`  
**Severity:** P2  
**Trigger:** 14-day or 30-day Error Budget consumption $> 50\%$ within a rolling 24-hour period across `SLO-AVAIL-01` or `SLO-LAT-01`.  
**Owner:** `platform-oncall`  
**Escalation Path:** Engineering Manager $\to$ Product Director  

---

## 1. Concept & Error Budget Policy

- **Target Availability:** 99.9% uptime over a 30-day period.
- **Allowed Downtime (Error Budget):** 43.2 minutes per month (0.10%).
- **Burn Rate Definitions:**
  - **1x Burn Rate:** Consumes 100% of budget in 30 days (Normal operational limit).
  - **14.4x Burn Rate:** Consumes 2% of budget in 1 hour (Fast burn $\to$ P1 alert).
  - **6x Burn Rate:** Consumes 5% of budget in 6 hours (Medium burn $\to$ P2 alert).

---

## 2. Immediate Mitigation & Freeze Policy

If Error Budget burn exceeds 50% in a 24-hour window:

1. **Production Deployment Freeze:**
   - Immediately suspend non-critical feature deployments and non-urgent schema migrations.
   - All engineering capacity pivots to reliability, database indexing, latency regression fixes, and edge caching.
2. **Review Incident Timeline:**
   - Aggregate all Sentry alerts, trace spans, and slow query logs from the preceding 24 hours.
   - Categorize burn contributors:
     - Third-party latency (Stripe / WhatsApp / AI)
     - Database connection wait or table locks
     - Cold starts and Vercel edge runtime anomalies
3. **Capacity & Resource Scaling:**
   - If database saturation contributed to the burn, adjust Neon minimum CU autoscaling floor from 0.25 to 0.50 CU.
   - If Redis cache hit rate fell below 85%, adjust key TTLs and increase cache invalidation generation buffers.

---

## 3. Exit Criteria for Unfreezing

1. 48 consecutive hours of stable operation with $< 1\text{x}$ burn rate.
2. Root-cause corrective action verified in staging and deployed with zero regressions.
3. Sign-off by Platform On-Call and Product Lead.
