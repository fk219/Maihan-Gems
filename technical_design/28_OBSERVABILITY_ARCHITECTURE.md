# 28 OBSERVABILITY ARCHITECTURE

**Package:** `technical_design/` doc 28 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 32.
**Evidence status:** `[INFERRED]` design.

---

## Purpose

Define the telemetry stack, signals per layer, business metrics, instrumentation rules, alerting policy and the operational dashboards.

## 1. Stack

OpenTelemetry traces and metrics, a Prometheus-compatible metrics backend, structured JSON logs with `trace_id` correlation, and Sentry for frontend and server errors.

No vendor is mandated. The instrumentation is standard OTel precisely so the backend is swappable; a vendor lock-in in the observability layer is self-inflicted and hard to reverse.

## 2. Signals by layer

| Layer | Traces | Metrics | Logs | Alerts |
|---|---|---|---|---|
| Frontend | route transitions, Web Vitals | LCP, INP, CLS, TTFB by route | client errors, WebAR failures | LCP regression, WebAR error rate |
| API | per request, per command | rate, error rate, duration p50/p95/p99 | request logs with `trace_id` | error budget burn, p95 breach |
| Database | per query | connections, pool wait, slow queries, cache hit | slow query log | pool exhaustion, slow query |
| Redis | - | hit rate, memory, evictions, latency | - | hit rate drop, memory pressure |
| Search | per search | latency, zero-result rate, strategy mix, facet time | - | zero-result spike, latency |
| AI | per interaction | tokens, cost, latency, TTFB, tool count, grounded ratio, handoff rate | interaction logs | cost anomaly, grounded-ratio drop |
| Tools | per call | latency, error rate, denial rate | tool-call log | denial spike, error spike |
| Certificate OCR | per run | runs, mean confidence, review rate, cost | run logs | failure rate, confidence drop |
| WhatsApp | per message | messages, delivery, response time, template failures | message logs | webhook failures, delivery failures |
| Payments | per payment | success rate, capture latency, webhook lag | payment logs | failure-rate spike |
| WebAR | per session | load time, fps, tracking-loss rate, device tier | session logs | load failure, fps drop |
| Jobs | per job | depth, age, success, failure, dead letters | job logs | backlog, dead letters |
| Integrations | per webhook | in, out, signature failures, processing lag | webhook logs | signature-failure spike |

The AI rows deserve emphasis because they measure **correctness**, not just uptime: `grounded_ratio` and `tool_denial_rate` detect a system that is answering confidently and wrongly.

## 3. Key business metrics

```text
catalog.gemstones.available            gauge
catalog.settings.active                gauge
dyo.configurations.created             counter
dyo.compatibility.rejected            counter by rule_id
dyo.quote.total.value                  histogram
commerce.cart.abandonment_rate         gauge
commerce.checkout.step_completion      funnel
commerce.order.conversion_rate        gauge
commerce.order.aov                     gauge
commerce.refund.rate                   gauge
search.zero_result_rate                gauge
search.semantic_usage_rate             gauge
ai.handoff_rate                        gauge by reason
ai.grounded_ratio                      histogram
ai.cost_per_conversation               gauge
ai.tool_denial_rate                    counter
trust.certificate.auto_verify_rate     gauge
trust.certificate.mean_confidence      gauge
trust.review_queue_depth               gauge
migration.records_quarantined          gauge
migration.conflicts.unresolved         gauge
ops.cache.hit_rate                     gauge by cache id
```

`dyo.compatibility.rejected` carries a `rule_id` label deliberately: it is the signal that tells a curator which rule is doing the most harm, which is the only way to turn under-curated rules (doc 14 section 5) into a work queue.

## 4. Instrumentation rules

| Rule | Detail |
|---|---|
| Trace propagation | Every request gets a `trace_id` that flows into commands, tool calls, jobs and events |
| Domain spans | Domain operations are spans, not only log lines |
| Cardinality | **No user id, email, SKU or URL in metric labels** |
| Log safety | Structured and PII-safe; `content_redacted` is the only AI content retained |
| Alert routing | Every alert has an owning channel and a runbook |
| Thresholds | Derived from SLOs, never from arbitrary numbers |

The cardinality rule is enforced in CI. A `user_id` label on a metric will work perfectly in development and take down the metrics backend in production, and it will do so on the busiest day.

## 5. Tracing design

| Span | Attributes | Never |
|---|---|---|
| HTTP request | method, route template, status, `trace_id` | full URL with query |
| Command | command name, actor type, outcome | PII |
| Tool call | tool name, version, latency, decision | full tool output, credentials |
| Job | job type, `job_key`, attempts, outcome | payload contents |
| Query | statement hash, duration, rows | bound parameter values |
| Model call | model, tokens, cost, latency, TTFB | prompt or completion text |

Query spans use a statement hash rather than SQL text. The shape is what is diagnostically useful; the values are where the PII is.

## 6. Logging

```json
{ "timestamp": "2026-10-05T12:00:00.000Z", "level": "info",
  "service": "commerce", "env": "production", "trace_id": "...",
  "span_id": "...", "event": "order.placed", "actor_type": "CUSTOMER",
  "order_id": "...", "outcome": "success", "duration_ms": 142 }
```

| Field | Rule |
|---|---|
| `event` | Dotted `domain.action`, stable and greppable |
| `actor_type` | Role or agent class; never an actor identifier in a searchable field |
| Identifiers | Present where operationally necessary, documented per event type |
| Secrets | Never, in any field, at any level |
| Stack traces | Only at `error` and above |

## 7. Alerting policy

| Severity | Meaning | Response |
|---|---|---|
| P1 | Revenue loss, data loss, security exposure, or trust violation | Immediate page |
| P2 | Degradation with a workaround | Business-hours ticket |
| P3 | Detection-only, needs a human decision | Digest |

P1 examples: payment success rate below threshold, `grounded_ratio` collapse, certificate auto-verify publishing unverified data, dead letters in `critical`, authorization-denial spike.

| Rule | Detail |
|---|---|
| Every alert | Has an owner, a runbook link and a recorded resolution |
| No alert without an action | If nothing should be done, it is a dashboard, not an alert |
| Thresholds | Derived from SLOs |
| Suppression | Planned maintenance windows suppress by design, not by deletion |
| Review | Alerts are reviewed quarterly; a noisy alert is deleted, not tolerated |

## 8. Dashboards

| Dashboard | Audience | Content |
|---|---|---|
| Executive | ownership | sales, conversion, AOV, refund rate, order funnel |
| Catalog | curators | availability counts, untyped stones, review queues, orphan assets |
| Trust | `TRUST_REVIEWER` | certificate queue depth, mean confidence, auto-verify rate, anomalies |
| DYO | product | funnel `created → validated → quoted → cart → ordered`, rule rejections by id |
| AI | `AI_OPERATIONS` | grounded ratio, handoffs by reason, refusals by field, cost per conversation |
| Platform | engineering | latency, error rate, saturation, queue depth, cache hit ratio |
| Migration | `MIGRATION_ENGINEER` | quarantined records, unresolved conflicts, batch progress |

## 9. Validation rules

1. No user id, email, SKU or URL appears in any metric label; enforced by an automated check.
2. No secret appears in any log, span attribute or trace.
3. Every alert names an owner and links a runbook.
4. Every alert threshold derives from a documented SLO.
5. `trace_id` propagates from HTTP through commands, jobs and events.
6. AI content is retained only as `content_redacted`.
7. Money in telemetry is a decimal string, matching the money type.

## 10. Error handling

| Condition | Behaviour |
|---|---|
| Telemetry backend down | Application continues; telemetry is buffered then dropped with a counter, never blocks a request |
| Log volume spike | Sampling for high-volume low-value events; P1 signals never sampled |
| Trace export backlog | Bounded queue; drop oldest traces, count them |
| Sentry unavailable | Errors still logged; alert on the absence of error reporting itself |

Instrumentation must never be able to fail a request. A telemetry outage degrading checkout would be a self-inflicted outage of a revenue path.

## 11. Security boundaries

- PII is redacted before logging, not after collection.
- Card data never enters telemetry; only provider references and last-four at most, and not even that in metrics.
- Telemetry access follows the admin RBAC model (doc 23); `READ_ONLY_ANALYST` sees no PII.
- Retention for telemetry is defined in doc 31.
- Audit data (`audit_logs`, `verification_events`) is never sampled or dropped; it is a record, not telemetry.

## 12. Observability

Meta-observability is itself monitored: metric emission rate, trace export rate, log volume, dropped-telemetry counter, and an alert when the telemetry pipeline itself goes quiet. A silent observability stack looks exactly like a healthy system.

## 13. Testing requirements

| Test | Proves |
|---|---|
| Cardinality guard | An automated scan fails CI if a high-cardinality label is added |
| PII scan | Sampled logs and spans contain no PII or secrets |
| Trace continuity | A `trace_id` from an HTTP request appears on its job and its event |
| Sampling | P1 signals are never sampled out |
| Non-blocking | Telemetry failure never fails a request |
| Alert hygiene | Every alert has an owner and a runbook link; the check runs in CI |
| Dashboard queries | Each dashboard query is verified against the metric definitions |
| Money format | Monetary telemetry values are decimal strings |

## 14. Failure modes

| Failure | Behaviour |
|---|---|
| Metrics backend down | Buffered, then dropped with a counter; requests unaffected |
| Log volume spike | Sampling on low-value events; alerts unsampled |
| Trace backend down | Bounded queue, drop oldest, count |
| Alert fatigue | Quarterly review; a noisy alert is removed |
| Missing instrumentation on a new path | Code review checklist plus a coverage check on critical paths |
| `grounded_ratio` drop | P1; feature flag disables AI synthesis until reviewed |

## 15. Implementation constraints

1. No PII, secret, SKU or URL in metric labels; enforced automatically.
2. Instrumentation never blocks or fails a request.
3. Every alert has an owner, a runbook and an SLO-derived threshold.
4. Trust-correctness metrics are first-class signals, not diagnostics.
5. Audit data is a record and is never sampled or dropped.

## Evidence status

`[INFERRED]` throughout. No source artefact describes a telemetry pipeline. The metric set is derived from the domain requirements in this package: the DYO funnel (doc 14), trust verification (doc 17), pricing correctness (doc 16), inventory accuracy (doc 15), migration integrity (doc 33) and AI grounding (doc 18). The emphasis on `grounded_ratio` and `trust.*` reflects that in this business the most damaging failure is a confident incorrect answer, not an outage.