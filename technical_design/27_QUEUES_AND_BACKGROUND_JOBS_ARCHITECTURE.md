# 27 QUEUES AND BACKGROUND JOBS ARCHITECTURE

**Package:** `technical_design/` doc 27 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 31.
**Evidence status:** `[INFERRED]` design.

---

## Purpose

Define the queue topology, job claiming, leases, retries, dead-lettering, idempotency keys, long-running work and the schedule.

## 1. Queues

| Queue | Work | Concurrency | Retry |
|---|---|---|---|
| `critical` | payment reconciliation, order placement side effects | low, ordered | 8, exponential |
| `default` | emails, notifications, webhooks | medium | 5, exponential |
| `assets` | fetch, validate, process, upload | high, IO-bound | 5, exponential |
| `ai` | embeddings, extraction, evaluation | low, cost-bound | 3 |
| `certificates` | OCR runs, anomaly detection | low | 3 |
| `search` | reindex, generation bumps, sitemap | medium | 5 |
| `migration` | import batches, backfills | serialised | 0, resumable |
| `maintenance` | reservation expiry, retention sweeps, orphan detection | low | 3 |

Queue separation is by **failure characteristic**, not by feature. `assets` is IO-bound and can be wide; `ai` is cost-bound and must be narrow; `critical` is ordered because a payment reconciliation running out of order against a capture is worse than waiting; `migration` has zero retries because a half-applied import batch must be resumed from cursor state, never blind-retried.

## 2. Claiming and leases

```sql
UPDATE jobs
   SET status = 'RUNNING',
       locked_until = now() + interval '30 seconds',
       attempts = attempts + 1,
       worker_id = $1
 WHERE id IN (
   SELECT id FROM jobs
    WHERE status IN ('PENDING', 'RETRY')
      AND (run_after IS NULL OR run_after <= now())
    ORDER BY priority DESC, id
    FOR UPDATE SKIP LOCKED
    LIMIT $2
 )
RETURNING *;
```

| Property | Mechanism |
|---|---|
| Concurrency safety | `FOR UPDATE SKIP LOCKED`: many workers, no collision, no blocking |
| Crash safety | `locked_until` lease; a job past its lease is reclaimable |
| Ordering | `priority DESC, id`; `critical` additionally serialised per aggregate |
| Backoff | Exponential with jitter, capped |
| Exhaustion | `DEAD_LETTER` with the last error retained, plus an alert |

`SKIP LOCKED` plus a lease is what makes the queue crash-safe. Without the lease, a worker killed mid-job leaves a row that no one will ever reclaim; with it, the job simply becomes available again after 30 seconds.

## 3. Idempotency

Every job declares a `job_key`:

```text
job_key = {jobType}:{naturalKey}:{discriminator}
```

| Example | Key |
|---|---|
| Send order confirmation | `order.confirm:{orderId}` |
| Capture fulfilment | `order.fulfil:{orderId}:{lineId}` |
| Reindex product | `search.reindex:{productId}:{contentHash}` |
| Extract certificate | `cert.extract:{certificateId}:{attemptGroup}` |

A retried job whose `job_key` already succeeded is a **no-op**, not a duplicate. Combined with `event_consumers` (doc 26), this is what makes at-least-once delivery safe: the transport may deliver twice and the effect happens once.

Including `contentHash` in a reindex key is what allows a later legitimate reindex after a content change, while still suppressing a redelivery of the same request.

## 4. Job types

| Type | Producer | Queue | Notes |
|---|---|---|---|
| `order.confirm` | `OrderCreated` | `critical` | ordered per order |
| `payment.reconcile` | schedule | `critical` | compares provider state to local |
| `inventory.release_expired` | schedule | `maintenance` | reservation sweeper |
| `asset.ingest` | media import | `assets` | high concurrency |
| `asset.process` | asset fetch | `assets` | variants |
| `ai.embed` | product or document change | `ai` | cost-bound |
| `ai.evaluate` | schedule | `ai` | evaluation suite |
| `cert.extract` | `CertificateUploaded` | `certificates` | OCR |
| `cert.anomaly` | `CertificateProcessed` | `certificates` | cross-checks |
| `search.reindex` | catalog events | `search` | keyed by content hash |
| `search.generation_bump` | catalog events | `search` | cache safety net |
| `sitemap.rebuild` | schedule | `search` | nightly |
| `migration.batch` | operator | `migration` | serialised, resumable |
| `ops.dead_letter_alert` | schedule | `maintenance` | nightly |
| `retention.sweep` | schedule | `maintenance` | monthly |
| `orphan.detect` | schedule | `maintenance` | weekly |
| `webhook.deliver` | outbound events | `default` | signed |

## 5. Long-running work

Backfills, re-embedding and reindexing run in batches with explicit cursor state and a rate limit, so they never saturate the primary.

```json
{ "cursor": { "last_id": "..." }, "batch_size": 500,
  "processed": 41200, "total_estimate": 19965, "rate_limit_per_second": 200 }
```

| Rule | Detail |
|---|---|
| Resumable | Cursor state persists; a restart continues, never restarts |
| Progress | Written to `jobs.result`, visible in admin |
| Rate limited | Explicit per-second cap, adjustable mid-run |
| Off-peak | Long jobs scheduled outside peak hours |
| Cancellable | An operator can stop a run without corrupting state |

The initial migration, the 9,812-product DYO backfill and a full re-embed are all multi-hour operations on a live database. A cursor plus a rate limit is the minimum needed to run them without a maintenance window.

## 6. Scheduling

| Cadence | Jobs |
|---|---|
| Nightly | reservation expiry, expired-quote cleanup, expired-configuration cleanup, sitemap rebuild, daily aggregate rollups, dead-letter alert |
| Weekly | orphan asset detection, dependency audit, index health check, evaluation suite run |
| Monthly | retention enforcement, PII audit |

The nightly set is exactly the set of things whose absence produces **silent** incorrectness: an unreleased reservation means an oversold stone, an unexpired quote means a stale price, an unrebuilt sitemap means lost indexing. Scheduled cleanup is not cosmetic.

## 7. Validation rules

1. Every job type declares `max_attempts` and a `job_key` strategy.
2. A job past `locked_until` is reclaimable; no job can be permanently orphaned.
3. Exhausted jobs reach `DEAD_LETTER` with the last error retained.
4. A retried job with a completed `job_key` is a no-op.
5. `migration` jobs never blind-retry; they resume from cursor state.
6. Long-running work is batched, rate-limited and resumable.
7. A job handler contains no business logic; it calls application services (doc 07).

## 8. Error handling

| Condition | Behaviour |
|---|---|
| Transient failure | Retry with exponential backoff and jitter |
| Permanent failure | `DEAD_LETTER` immediately, no retry |
| Exhaustion | `DEAD_LETTER` with the last error, alert raised |
| Lease expiry | Reclaimed by another worker |
| Duplicate `job_key` | No-op, logged as a duplicate |
| Handler throws unexpectedly | Caught, recorded, retried per policy; never kills the worker |
| Queue depth beyond threshold | Autoscale, then alert |
| Payload schema failure | `DEAD_LETTER` before any side effect; a malformed payload is not retryable |

Payload validation before execution matters: retrying a job whose payload will never be valid just delays the alert by several minutes.

## 9. API

| Method | Path | Role |
|---|---|---|
| GET | `/admin/jobs` | `READ_ONLY_ANALYST` | filtered by queue, status, age |
| GET | `/admin/jobs/{id}` | `READ_ONLY_ANALYST` | payload, attempts, error |
| POST | `/admin/jobs/{id}/retry` | `ADMIN_SUPER` | from `DEAD_LETTER` |
| POST | `/admin/jobs/{id}/cancel` | `ADMIN_SUPER` | for a running long job |
| GET | `/admin/queues/health` | `READ_ONLY_ANALYST` | depth, age, workers, rate |
| GET | `/admin/dead-letters` | `ADMIN_SUPER` | with per-type grouping |

Retrying a dead letter is admin-only and audited, because for `critical` jobs a retry is a business action.

## 10. Security boundaries

- Job payloads carry no secrets; credentials come from the secret store at execution time.
- PII is redacted from job payloads where the handler does not need it.
- Admin retry and cancel are audited with actor, reason and job id.
- A job handler runs with the same service credentials as the API; it has no additional privilege.
- Webhook delivery payloads are signed and never logged in full.

## 11. Observability

Metrics: queue depth and age per queue, job success and failure rate by type, attempts histogram, dead-letter count, lease reclamation count, duplicate-suppression count, handler duration p50/p95, cost per AI job. Alerts on depth, on oldest-job age, on any dead letter in `critical`, and on lease reclamation spikes (a sign of worker crashes).

Dead letters in `critical` alert immediately; dead letters in `assets` can wait for the nightly digest. Treating them identically trains everyone to ignore the alert.

## 12. Testing requirements

| Test | Proves |
|---|---|
| Concurrent claiming | N workers claim N distinct jobs, none twice |
| Lease reclaim | A job past `locked_until` is picked up by another worker |
| Idempotency | A retried job with a completed `job_key` performs no side effect |
| Dead-letter | Exhaustion moves the job, retains the error and raises an alert |
| Permanent failure | A non-retryable error dead-letters on the first attempt |
| Payload validation | A malformed payload dead-letters before any side effect |
| Migration resume | A killed import batch resumes from its cursor, never restarts |
| Handler discipline | Handlers call services; a lint or architecture test fails on direct repository use |
| Backoff | Delays grow exponentially with jitter and respect the cap |
| Ordering | `critical` jobs for one order execute in order |

## 13. Failure modes

| Failure | Behaviour |
|---|---|
| Worker crash mid-job | Lease expires; another worker reclaims |
| Duplicate delivery | `job_key` suppression |
| Poison payload | Dead-letter on first attempt after schema validation |
| Queue backlog | Autoscale, then alert; rate limits protect the database |
| Migration interrupted | Resume from cursor; never a partial blind retry |
| Broker or scheduler outage | Jobs accumulate; the request path is unaffected (outbox, doc 26) |
| Dead letter ignored | Nightly digest plus a per-queue depth alert |

## 14. Implementation constraints

1. `SKIP LOCKED` plus a lease; a job can never be permanently orphaned.
2. Every job type is idempotent by `job_key`; exhaustion dead-letters with the error retained.
3. `migration` work is serialised, resumable and never blind-retried.
4. Long-running work is batched, rate-limited, resumable and cancellable.
5. Handlers contain no business logic.

## Evidence status

`[INFERRED]` throughout. No source artefact describes a queue, worker or scheduler; the source was a server-rendered Nuxt application, most likely with synchronous request handling. The queue topology is derived from the side effects this architecture requires (asset ingest from 241,961 media records, OCR from the certificate artefacts, search reindexing, DYO pricing, reservation expiry), and the separation rationale in section 1 is stated as proposed.