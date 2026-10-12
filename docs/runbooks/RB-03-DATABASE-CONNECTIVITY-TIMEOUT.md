# RB-03: Database Connectivity & Timeout Runbook

**Document ID:** `RB-03-DATABASE-CONNECTIVITY-TIMEOUT`  
**Severity:** P1  
**Trigger:** `db_pool_wait_p95_ms > 50ms` or readiness check failure on `/api/v1/health/ready` database ping.  
**Owner:** `database-infra`  
**Escalation Path:** Lead Infrastructure Engineer $\to$ CTO  

---

## 1. Initial Triage

1. **Immediate Health Check Probe:**
   - Execute: `curl -s http://localhost:3000/api/v1/health/ready | jq .`
   - If response is HTTP 503 with `"components.database.status": "DOWN"`, classify as critical database outage.
2. **Neon Console Inspection:**
   - Inspect Neon Cloud Console for compute endpoint state (`Active`, `Suspended`, `Transitioning`).
   - Check compute utilization (CPU, RAM, max client connections).
   - Check Neon autoscaling state (is compute scaling up or stuck in a restart loop?).

---

## 2. Recovery Procedures

### Scenario A: Serverless Scale-to-Zero Latency
- **Cause:** Neon cold-start compute resume.
- **Action:** If traffic ramp is anticipated, configure compute autosuspend delay to $\ge 300\text{s}$ or set minimum compute size to 0.5 CU instead of 0.25 CU.

### Scenario B: Connection Exhaustion
- **Cause:** Long-running idle transactions or client pool misconfiguration.
- **Action:**
  1. Inspect active connections via pg_stat_activity:
     ```sql
     SELECT pid, usename, state, wait_event_type, query_start, query 
     FROM pg_stat_activity 
     WHERE state != 'idle';
     ```
  2. Terminate rogue blocking transactions:
     ```sql
     SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query_start < now() - interval '30 seconds' AND state != 'idle';
     ```
  3. Ensure application uses Neon connection pooler (port 5432 with `-pooler` hostname or PgBouncer).

### Scenario C: Neon Cloud Outage / Network Split
- **Cause:** Cloud infrastructure degradation.
- **Action:**
  - Verify Neon status page (status.neon.tech).
  - Prepare emergency point-in-time restore to replica branch if cluster corruption is detected.

---

## 3. Verification & Exit

1. Ensure `/api/v1/health/ready` returns HTTP 200 with database latency $< 10\text{ms}$.
2. Run database health suite: `pnpm --filter @maihan/web test src/api/health.spec.ts`.
3. Confirm alert `ALERT-P1-DB-CONNECTIVITY-TIMEOUT` is `RESOLVED`.
