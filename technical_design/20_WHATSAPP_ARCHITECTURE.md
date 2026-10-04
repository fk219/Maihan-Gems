# 20 WHATSAPP ARCHITECTURE

**Package:** `technical_design/` doc 20 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 20, charter section 28.
**Related:** doc 18 (orchestration), doc 19 (RAG), doc 17 (certificate OCR).

---

## Purpose

Define the WhatsApp channel as a **transport adapter** over the existing orchestrator: one AI brain, one tool registry, one set of tables.

## Evidence status

`[OBSERVED]` WhatsApp is an observed business channel requirement in the charter; no source artefact reveals the original WhatsApp implementation.

`[INFERRED]` The entire channel design. The load-bearing constraint is not technical: it is that any divergence between channels becomes a second, unaudited AI brain.

## 1. Principle: one brain

WhatsApp uses the **same orchestrator, the same tools, the same grounding gate and the same knowledge base** as the website. Anything channel-specific belongs in the adapter: framing, transport, identity, media constraints.

CI enforcement:

```ts
it('web and whatsapp share one tool registry', () => {
  expect(toolsFor('WEB')).toEqual(toolsFor('WHATSAPP'));
  expect(toolsFor('WEB').every(t => !t.mutates || MUTATING_TOOLS.has(t.name))).toBe(true);
});
```

If this test ever needs a per-channel exception, the correct fix is to change the orchestrator, not the test.

## 2. Flow

```text
Customer WhatsApp
  -> Meta WhatsApp Cloud API
  -> POST /api/v1/webhooks/whatsapp
  -> verify X-Hub-Signature-256 over the raw body     (before parsing)
  -> dedupe on (provider, external_event_id) via webhook_receipts
  -> respond 200 immediately
  -> enqueue integrations.whatsapp.process
  -> normalise to the canonical message envelope
  -> ConversationService: resolve or create by (channel, external_ref)
  -> AI Orchestrator            <-- identical to web
       -> tools                 <-- identical to web
       -> grounding, guardrails, handoff  <-- identical to web
  -> render answer to WhatsApp constraints
  -> send via Graph API
  -> persist assistant message + tool_calls + ai_interactions
```

Signature verification **before parsing** and an immediate 200 before processing. Meta retries aggressively on slow responses, so a synchronous orchestrator call in the webhook handler would produce duplicate deliveries; the receipt table plus the queue makes the pipeline idempotent.

## 3. Channel adapter

| Concern | Web | WhatsApp |
|---|---|---|
| Transcript | `messages` | `messages`, same table |
| Thread key | `conversation_id` | `external_ref` |
| Streaming | SSE to browser | buffer, then send |
| Message length | unlimited | 4,096 chars, chunked with explicit `(1/2)` |
| Rich content | React components | text, images, document links |
| Identity | session | verified MSISDN mapped to `customers.phone` |
| Attachments | any allowed MIME | inbound images and documents, size-capped |

The orchestrator receives a `ChannelCapabilities` object. Without it the same orchestrator emits streaming-oriented or component-oriented concepts into a channel that can render neither.

## 4. WhatsApp-specific behaviour

| Concern | Behaviour |
|---|---|
| Identity | Resolve by MSISDN; on match, link the conversation to the existing `customer_id` so history is unified |
| Opt-in | Marketing requires explicit opt-in; transactional and concierge do not |
| Templates | Required outside the 24-hour customer service window; stored and versioned |
| Session window | Outside the window, restart from a summary |
| Attachments | Inbound images are stored and may enter the certificate OCR pipeline (doc 17) |
| Handoff | Notifies an agent queue, sets an SLA, and gives the customer a concrete expectation |
| Rate limiting | Per-conversation, per Meta policy, plus a global send budget |
| Delivery receipts | Persisted; failures surface in admin |

Inbound images feeding certificate OCR is the one place where a channel capability reaches into another subsystem. It is explicitly permitted because the OCR path treats every image as untrusted data and routes it to human verification (doc 17).

## 5. Rate limiting and budget

| Layer | Value | Reason |
|---|---|---|
| Inbound | per conversation, per minute | Abuse and cost protection |
| Outbound | per conversation and global daily budget | Meta policy plus cost |
| Orchestrator | per-surface semaphore, shared with web | Prevents WhatsApp from starving web chat |
| Handoff | bypasses the AI entirely | A human must never wait behind a queue |

On budget exhaustion, send an honest message and offer a human. Silent message loss is unacceptable to a customer waiting on a purchase decision.

## 6. Message formatting

| Element | Rule |
|---|---|
| Long answers | Split at 4,000 chars with `(1/2)`, `(2/2)` markers |
| Lists | Plain text with `-`; no Markdown syntax reaches the customer |
| Citations | Shortened: `Source: <slug>` and a store link, since tap handling differs from web |
| Buttons | Only where Meta policy permits; always a text fallback |
| Product links | Canonical store URLs, never temporary signed URLs |
| No HTML | Rendered as literal text on WhatsApp, which is worse than not sending it |

Every web-only affordance has a text equivalent. A message that only makes sense on the website is a bug.

## 7. Validation rules

1. `X-Hub-Signature-256` verified over the **raw** body before any parse.
2. `(provider, external_event_id)` is unique; a duplicate returns 200 and does nothing.
3. Every message writes to `conversations`, `messages`, `tool_calls` and `ai_interactions`, on both channels.
4. Outbound text respects the 4,096-character limit.
5. Marketing sends require `opt_in`; transactional and concierge do not.
6. Template sends are used outside the 24-hour window.
7. No customer PII appears in logs beyond the conversation itself.

## 8. Error handling

| Code | Status | Behaviour |
|---|---|---|
| `WHATSAPP_SIGNATURE_INVALID` | 401 | Rejected before parsing |
| `WHATSAPP_DUPLICATE` | 200 | Receipt exists; no-op |
| `WHATSAPP_PAYLOAD_TOO_LARGE` | 413 | Rejected |
| `WHATSAPP_TEMPLATE_REQUIRED` | job | Outside the window with no template: use the template path |
| `WHATSAPP_SEND_FAILED` | job retry | Graph API error; retried, then surfaced in admin |
| `WHATSAPP_BUDGET_EXHAUSTED` | 200 | Honest message plus human offer |
| `GRAPH_API_OUTAGE` | 503 | Queue, retry with backoff, alert |

## 9. Security boundaries

- Signature verification precedes parsing; the raw body is required for HMAC.
- Payload size limits are enforced at the edge and the handler.
- Agent access uses the same RBAC as the admin app, with per-agent audit.
- PII is redacted from `ai_interactions`.
- Deletion requests cascade identically on both channels because both write the same tables.
- Attachments are scanned, size-capped and never trusted as file content.

## 10. Observability

Metrics: inbound and outbound volume, webhook rejection reason, duplicate rate, response latency by channel, handoff rate, template-versus-free-form ratio, delivery failure rate, send budget consumption, orchestrator share of web versus WhatsApp load. Alerts on webhook rejection spikes (misconfiguration or forgery), delivery failures and handoff SLA breaches.

## 11. Testing requirements

| Test | Proves |
|---|---|
| Shared registry | The CI test above passes for both channels |
| Signature | Modified body is rejected; valid body accepted |
| Idempotency | Duplicate `external_event_id` produces exactly one message and one AI interaction |
| Fast ack | Webhook returns 200 without waiting for the orchestrator |
| Identity merge | Known MSISDN links to the existing `customer_id` and unifies history |
| Length handling | A long answer splits correctly with markers and no truncation |
| Opt-in | Marketing send refused without opt-in; concierge allowed |
| Template window | Outside 24h, a template is used |
| Formatting | No raw Markdown or HTML reaches the channel |
| Refusal parity | The same NULL-field question is refused identically on both channels |
| Handoff | Escalation creates the queue entry and notifies the customer |
| Budget | Exhaustion sends an honest message; no silent loss |

## 12. Failure modes

| Failure | Behaviour |
|---|---|
| Graph API outage | Queue, backoff, alert; inbound still accepted |
| Duplicate webhook | Receipt suppresses; no double reply |
| Orchestrator unavailable | Queue; customer gets an honest delayed-response message |
| MSISDN mismatch to a customer | Create a new linked conversation; never merge on a guess |
| Customer sends media | Stored, scanned; may route to OCR |
| Stale session window | Restart from the durable summary |

## 13. Implementation constraints

1. One orchestrator, one registry, one set of tables.
2. Signature verified before parsing; acknowledge fast; process asynchronously.
3. Channel differences live in the adapter, never in the orchestrator.
4. Every web affordance has a text equivalent.
5. Deletion and audit behave identically across channels.

## Evidence status

`[OBSERVED]` WhatsApp as an observed channel requirement. `[INFERRED]` the flow, adapter, formatting, limiting and handoff design. The shared-tool guarantee is the load-bearing `[INFERRED]` decision, and it exists to prevent the most likely and hardest-to-detect failure of a multi-channel AI: silent behavioural divergence between channels.