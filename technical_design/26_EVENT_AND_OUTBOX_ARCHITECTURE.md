# 26 EVENT AND OUTBOX ARCHITECTURE

**Package:** `technical_design/` doc 26 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 30.
**Evidence status:** `[INFERRED]` design.

---

## Purpose

Define the domain event catalogue, the transactional outbox, the dispatcher, consumer idempotency and ordering guarantees, and the explicit reason this is not event sourcing.

## 1. Principles

| Principle | Detail |
|---|---|
| Events exist only where they create real value | No event published for the sake of symmetry |
| Transactional outbox | An event is written in the **same transaction** as the state change |
| Async publication | A dispatcher publishes after commit; the request path never waits on a broker |
| Idempotent consumers | Tracked in `event_consumers` |
| Per-aggregate ordering | Guaranteed per aggregate, never globally |

The outbox is the whole design. Writing the event in the same transaction as the state change is what makes "the order exists but the confirmation email was never queued" an impossible state rather than a distributed-systems problem to debug.

## 2. Outbox mechanism

```text
Application transaction:
    BEGIN
      UPDATE orders SET state = 'PAID' ...
      INSERT INTO outbox_events (aggregate, type, payload, occurred_at) ...
    COMMIT                            <-- state change and event are atomic

Dispatcher (separate loop):
    SELECT ... FROM outbox_events WHERE published_at IS NULL
             ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100
    -> publish to the broker
    -> mark published_at, attempts
    -> record in event_consumers for each consumer
    -> on permanent failure: dead-letter with the last error
```

| Property | Mechanism |
|---|---|
| Atomicity | Same transaction as the aggregate change |
| No lost events | `published_at IS NULL` is the only unsent condition |
| No duplicate side effects | `event_consumers` unique on `(event_id, consumer)` |
| Crash safety | `SKIP LOCKED` lets multiple dispatchers run without collision |
| Ordering | Dispatch in `id` order per aggregate |

## 3. Event catalogue

| Event | Producer | Consumers |
|---|---|---|
| `ProductCreated` | catalog | search reindex, embed, sitemap, cache invalidate |
| `ProductUpdated` | catalog | cache invalidate, search generation bump, embed if hash changed, sitemap |
| `ProductStateChanged` | catalog | search, sitemap, cache |
| `GemstoneCreated` / `GemstoneUpdated` | catalog | cache invalidate, re-embed dependent products, price recompute |
| `SettingVariantUpdated` | catalog | cache invalidate, compatibility re-check of affected DYO drafts |
| `CompatibilityRulesChanged` | dyo | re-validate live configurations, flag affected drafts |
| `DYOConfigurationCreated` | dyo | analytics |
| `DYOConfigurationValidated` | dyo | analytics, embed |
| `DYOConfigurationPriced` | dyo | analytics |
| `CertificateUploaded` | certificates | enqueue extraction, notify customer |
| `CertificateProcessed` | certificates | route to review or auto cross-check |
| `CertificateApproved` | certificates | cache invalidate, publish to search and AI, notify customer |
| `CertificateRejected` | certificates | notify customer, audit |
| `AssetProcessed` | assets | attach to entities, cache invalidate |
| `AssetIngestFailed` | assets | alert, dead-letter |
| `EmbeddingGenerated` | assets / ai | search generation bump |
| `InventoryReserved` | commerce | cache invalidate availability |
| `InventoryReleased` | commerce | cache invalidate availability |
| `OrderCreated` | commerce | confirmation job, analytics, search de-publish if made to order |
| `PaymentCaptured` | commerce | receipt, fulfilment, analytics |
| `PaymentFailed` | commerce | notification, retry, analytics |
| `RefundCreated` | commerce | refund job, notification, analytics |
| `OrderFulfilled` | commerce | notification, analytics |
| `ConversationStarted` | ai | analytics |
| `HumanHandoffRequested` | ai | agent queue notify, SLA start, alert |
| `ConversationClosed` | ai | summary generation, analytics, PII retention sweep |
| `KnowledgeDocumentUpdated` | cms | chunk and embed, cache invalidate |
| `PagePublished` | cms | sitemap, cache invalidate, knowledge ingest |
| `ImportBatchCompleted` | operations | migration report, alert |
| `DerivedReferenceApproved` | operations | publish the affected product |

`SettingVariantUpdated` and `CompatibilityRulesChanged` deserve attention: they exist so that a rule edit re-validates live DYO configurations rather than leaving a customer with a saved design that has quietly become invalid.

## 4. Naming and payload

Past tense, `Aggregate` + action.

```json
{ "event_id": "uuid", "aggregate_type": "order", "aggregate_id": "uuid",
  "aggregate_version": 3, "event_type": "PaymentCaptured",
  "occurred_at": "2026-10-05T12:00:00Z", "trace_id": "...",
  "payload": { "order_id": "...", "captured_amount": "521800",
               "currency": "USD" } }
```

| Rule | Detail |
|---|---|
| Envelope | `event_id`, `aggregate_id`, `aggregate_version`, `occurred_at`, `trace_id` |
| Payload scope | Only the fields consumers need; no PII |
| Schema evolution | Additive; a breaking change means a new event type plus a dual-publish window |
| Money in payloads | Decimal strings, never numbers |

No PII in a payload means no PII in the broker, in dead-letter storage, in consumer logs, or in any replay. An event bus is a long-lived copy of your data and is treated as one.

## 5. Ordering and idempotency

| Concern | Rule |
|---|---|
| Ordering | Per aggregate only. Global ordering is neither promised nor needed |
| Consumer dedupe | `event_consumers` unique on `(event_id, consumer)`; a duplicate is a no-op |
| Side effects | Idempotent by `job_key` (doc 27), so a redelivered event does not double-charge or double-email |
| Replay | Replaying the outbox is safe precisely because consumers are idempotent |

`PaymentCaptured` reaching a fulfilment consumer twice must not create two fulfilment orders. That is what `event_consumers` plus `job_key` together guarantee, and neither is sufficient alone.

## 6. Why not event sourcing

`[INFERRED]` The audit and trust requirements need an immutable history. `audit_logs`, `order_events` and `verification_events` (doc 17) already provide it.

Full event sourcing would add projection complexity, eventual-consistency surprises in pricing and inventory, and a substantial rebuild burden, in exchange for no requirement that the evidence or the vision actually demands.

**Commands remain the source of truth; events are a consequence.** This is the single most important framing in the document: an event describes something that happened, and nothing reads an event to decide what is currently true.

## 7. Validation rules

1. Every domain event is inserted in the same transaction as its state change.
2. Payloads carry the full envelope and no PII.
3. Consumers are idempotent via `event_consumers`.
4. Ordering guarantees are per aggregate; no consumer may assume global order.
5. Schema changes are additive, or introduce a new event type with a dual-publish window.
6. Money in payloads is a decimal string.
7. No event is published directly by application code; only the dispatcher publishes.

## 8. API

Internal only. Operational visibility is exposed through admin endpoints:

| Method | Path | Role |
|---|---|---|
| GET | `/admin/events` | `READ_ONLY_ANALYST` | filtered, paginated |
| GET | `/admin/events/{id}` | `AI_OPERATIONS`, `READ_ONLY_ANALYST` | payload and consumer states |
| POST | `/admin/events/{id}/replay` | `ADMIN_SUPER` | re-enqueue one consumer, audited |
| GET | `/admin/outbox/health` | `READ_ONLY_ANALYST` | unpublished count, oldest age |
| GET | `/admin/consumers/{name}` | `AI_OPERATIONS` | lag, failure count |

Replay is per consumer and audited, because replaying to all consumers of a `PaymentCaptured` is a financial operation.

## 9. Error handling

| Code | Behaviour |
|---|---|
| Dispatcher failure | Retried with backoff; `published_at` remains null |
| Publish exceeds 5 attempts | Dead-letter with the last error; alert |
| Consumer failure | Retried per queue policy (doc 27); then dead-letter |
| Duplicate delivery | `event_consumers` suppresses; logged as a duplicate, not an error |
| Outbox backlog > 1000 | Alert; the dispatcher is behind |
| Ordering violation detected | Consumer rejects and dead-letters rather than proceeding on bad order |

A consumer that detects an ordering violation must stop. Silently continuing on out-of-order data is how an inventory cache ends up showing a stone as available after it was sold.

## 10. Security boundaries

- No PII in any payload; the broker is not a PII store.
- Dead-letter storage inherits the same restriction.
- Replay is admin-only, per consumer, and audited.
- Broker credentials live in secrets (doc 29), never in the repository or a `feature_flags` row.
- Consumer payloads are validated against their schema before processing.

## 11. Observability

Metrics: outbox unpublished count and oldest age, publish rate, publish latency, consumer lag per consumer, duplicate-delivery count, dead-letter count, ordering violations, replay count. Alerts on backlog growth, oldest-age beyond a threshold, any ordering violation, and dead-letter volume above baseline.

Duplicate-delivery rate is a useful health signal: high rates indicate dispatcher retries working, but also consumer slowness worth investigating.

## 12. Testing requirements

| Test | Proves |
|---|---|
| Atomicity | A rolled-back transaction leaves no outbox row |
| Crash safety | A dispatcher killed mid-publish leaves the event recoverable |
| Idempotency | Delivering an event twice performs the side effect once |
| Ordering | Per-aggregate order is preserved; a cross-aggregate assumption fails a test |
| No PII | An automated scan finds no PII in payloads or dead-letter rows |
| Envelope completeness | Every event carries all six envelope fields |
| Money format | Every monetary payload value is a decimal string |
| Replay scope | Per-consumer replay affects only that consumer, and is audited |
| Ordering violation | A consumer rejects and dead-letters rather than proceeding |
| Schema evolution | An additive change needs no consumer redeploy; a breaking one dual-publishes |

## 13. Failure modes

| Failure | Behaviour |
|---|---|
| Dispatcher crash | Events remain unpublished; the next pass picks them up |
| Broker outage | Outbox grows; the request path is unaffected because it never waits on the broker |
| Consumer crash mid-handler | Lease expiry reclaims the job; `job_key` prevents a duplicate effect |
| Duplicate delivery | Suppressed by `event_consumers` |
| Poison message | Dead-letter after 5 attempts with the error retained |
| Out-of-order delivery | Consumer rejects rather than acting on bad order |
| Schema drift | Additive-only rule plus a dual-publish window for breaking changes |

## 14. Implementation constraints

1. An event is written in the same transaction as its state change; only the dispatcher publishes.
2. Consumers are idempotent via `event_consumers` plus `job_key`.
3. Ordering is per aggregate; no global ordering is assumed.
4. No PII in payloads or dead-letter storage.
5. Commands remain the source of truth; events are consequences, not the record.

## Evidence status

`[INFERRED]` throughout. No source artefact describes an event bus, outbox or dispatcher; the source was a monolithic server-rendered Nuxt application. The catalogue is derived from the state changes this architecture requires, and every consumer named in it corresponds to a documented behaviour elsewhere in the package (cache invalidation in doc 25, job enqueueing in doc 27, RAG ingest in doc 19, verification in doc 17).