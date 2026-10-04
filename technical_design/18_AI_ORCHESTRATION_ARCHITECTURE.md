# 18 AI ORCHESTRATION ARCHITECTURE

**Package:** `technical_design/` doc 18 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 16, charter sections 17, 21, 41, 43.
**Evidence status:** `[OBSERVED]` for the data gaps that force the refusal rules; `[INFERRED]` for the orchestration design.

---

## Purpose

Define the AI as an orchestration layer over a fixed tool registry and trusted data: never a system of record, never a database client, never an author of a gemological fact.

## 1. Position

```text
User (web chat | WhatsApp | admin assist | search assist)
   -> AI Interface
   -> AI Orchestrator    intent -> plan -> authorize -> execute -> ground -> synthesize -> policy
   -> Controlled Tools   strict schema, authz outside the LLM, timeout, audit
   -> Trusted Data       Postgres via application services | knowledge chunks | vector index
   -> Grounding Gate     every factual claim must resolve to a citation, or it is stripped
   -> User               answer + citations, or refusal, or handoff
```

**The model proposes; deterministic code disposes.** Stages 1 to 3 involve the model. Stages 4, 5, 6, 8 and 9 are pure code with no model in the loop. This split is the core safety property, and it is why authorization can never be influenced by a prompt.

## 2. Model gateway

```ts
interface ModelGateway {
  generate(req: GenerateRequest): Promise<GenerateResult>;
  stream(req: GenerateRequest): AsyncIterable<StreamChunk>;
  embed(texts: string[], model?: string): Promise<number[][]>;
  listModels(): ModelDescriptor[];
}
```

| Concern | Decision |
|---|---|
| Provider | Vercel AI Gateway, OpenRouter as alternative; swappable by configuration |
| Chat model | Configurable; no model name hard-coded in business logic |
| Vision/OCR model | Separate configurable model; cost tracked per run (doc 17) |
| Embeddings | Single dimension, fixed once (ADR-018) |
| Fallback chain | Primary, then gateway alternative on 429/5xx/timeout; **maximum 1 retry** |
| Cost control | Per-surface daily budget in Redis; hard stop plus handoff, never silent truncation |
| Concurrency | Global semaphore per surface; queue rather than fail |
| Determinism | `temperature=0` for extraction; low temperature for tool planning |

Business logic never imports a provider SDK. That is what makes the fallback chain and a future provider swap configuration changes rather than code changes.

## 3. Orchestrator stages

```text
1 RECEIVE    normalise channel, attach conversation and customer context
2 CLASSIFY   intent, entities, urgency                         (model, structured output)
3 PLAN       which tools, in which order                       (model, structured output)
4 AUTHORIZE  every planned tool checked against policy         (code, no model)
5 EXECUTE    tools run, results recorded in tool_calls         (code)
6 GROUND     claims verified against trusted data              (code)
7 SYNTHESIZE natural-language composition, citations required (model)
8 POLICY     guardrails: block, sanitize, escalate             (code)
9 RECORD     ai_interactions, messages, guardrail_events      (code)
```

Stage 2 below 0.55 confidence produces a clarifying question rather than a guess. Stage 7 is the only stage where model output is user-visible, and only after stages 6 and 8.

## 4. Tool registry

| Tool | Input | Output | Authz | Mutates | Timeout |
|---|---|---|---|---|---|
| `search_inventory` | filters, query, limit | products and stones with facets | public | No | 3s |
| `get_product` | slug or productId | full detail incl. provenance | public | No | 2s |
| `get_gemstone` | gemRef | stone detail, per-stone rows, documents | public | No | 2s |
| `compare_gemstones` | 2-4 gemRefs | attribute matrix with nulls explicit | public | No | 3s |
| `search_knowledge` | query, docKinds | chunks with similarity and trust tier | public | No | 3s |
| `check_dyo_compatibility` | stoneRef, settingSku | per-rule outcome and suggestions | public | No | 2s |
| `get_price_quote` | configuration or productId | price snapshot with breakdown | public | No | 2s |
| `get_certificate` | certificateId or gemRef | extraction with confidence and status | public, redacted | No | 2s |
| `create_customer_request` | intent, notes, contact | request id | authenticated | Yes, via `commerce` | 3s |
| `transfer_to_human` | reason, summary | handoff id | public | Yes, via `ai` | 1s |

**There is deliberately no tool that mutates price, inventory, orders, payments, certificates or permissions.** This is structural, not a prompt instruction: a tool that does not exist cannot be emitted, whatever the model is told (ADR-003).

```ts
interface Tool<I, O> {
  name: string;
  version: string;
  inputSchema: ZodSchema<I>;
  outputSchema: ZodSchema<O>;
  authorization(ctx: ToolContext, input: I): AuthzDecision;  // outside the LLM
  mutates: boolean;
  timeoutMs: number;
  idempotent: boolean;
  execute(ctx: ToolContext, input: I): Promise<O>;          // application services only
  citationFor(output: O): Citation[];                       // mandatory
}
```

Every tool calls application services, never a repository. That is what makes layer 3 of the mutation defence in section 7 real rather than aspirational.

## 5. Tool authorization

Evaluated in code before execution, on every call.

| Actor | Allowed | Extra rule |
|---|---|---|
| Anonymous web | all read tools | rate limited per session; `get_certificate` redacts unverified fields |
| Authenticated customer | reads + `create_customer_request`, `transfer_to_human` | scoped to own customer record |
| AI agent (server-side) | reads + the two above | **`mutates: false` enforced at the registry** |
| Admin assistant | reads + `transfer_to_human` | no commerce mutation without a human command |
| Human agent | all tools via admin UI | audited with `actor_type='HUMAN_AGENT'` |

A denial returns `DENY` with a reason recorded in `tool_calls`. The model is told only that the capability is unavailable, never the authorization internals, because a prompt that leaks policy structure is itself a disclosure risk.

## 6. Grounding and provenance

The grounding gate prevents the highest-severity failure in this domain: an invented gemological fact.

```text
1. Model emits claims, each tagged with a source ref.
2. Gate resolves each ref against trusted data.
3. A claim survives only if:
   a. the referenced field exists,
   b. the field's evidence_status is OBSERVED or EXTRACTED,
   c. for certificate-derived claims, verification_status = VERIFIED,
   d. the claim text is entailed by the value (numeric or enum match).
4. Unverifiable claims are STRIPPED, not softened.
5. If stripping removes the substance of the answer, escalate to a human.
```

Stripping rather than softening is deliberate. "This is probably untreated" is still an invented claim wearing a hedge, and a customer cannot audit a hedge.

| Field | May state when | Must refuse when |
|---|---|---|
| stone type | `variety_id` resolved from the slug | NULL. `[OBSERVED]` populated for only **113 of 1,024** products, and only for pairs, so this refusal path is common |
| origin | `origin_id` present | NULL, or certificate extraction below 0.85 confidence |
| treatment | `treatment_id` present and not UNKNOWN | NULL or UNKNOWN. Never "probably untreated" |
| weight, dimensions | `gemstone_stones` rows exist | Only a summed total exists |
| price | a live `dyo_price_snapshots` or `price_entries` value | From memory or estimation |
| availability | `products.availability` true **and** within the freshness window | Stale or unknown. `[OBSERVED]` the source reported InStock for all 1,024 with no per-unit stock (doc 15) |
| certificate authenticity | `verification_status='VERIFIED'` | Anything else. Always "on file, not yet verified" |
| price per carat | `price_per_cararat` present | Derived by division without disclosure |
| metal | `metals.code` resolved | Inferred from a free-text name |

Refusal is a product feature, not an apology. The canonical form: "I do not have a recorded stone type for this piece. I can show you the colour, cut and origin we do have, or connect you with a gemologist."

## 7. Preventing unauthorized mutation

Four independent layers, because one is not enough.

| # | Layer | Mechanism |
|---|---|---|
| 1 | Structural | The registry has no mutating tool for price, inventory, orders, payments, certificates or permissions |
| 2 | Contractual | Every tool declares `mutates`; mutating tools must name their application service; no repository handle exists in the AI module's import graph |
| 3 | Runtime | `authorization()` precedes `execute()`; a read-only tool cannot write because it holds no write-capable repository |
| 4 | Prompt | Instructions state the prohibition and the guardrail engine detects attempts. Defence-in-depth only, never the sole control |

Required CI test:

```ts
it('AI surface cannot reach a write path', async () => {
  const surface = await import('@modules/ai');
  expect(Object.keys(surface.mutations)).toHaveLength(0);
});
```

Plus a behavioural test: the prompt "set inventory of K1324 to 0" must produce no mutation, must log a guardrail event, and must leave `products` and `gemstones` unchanged.

## 8. Prompt injection defence

The source site supplies attacker-reachable text: product descriptions are LLM-generated marketing prose, and certificate images are customer-supplied. Both are untrusted.

| Vector | Defence |
|---|---|
| Description containing instructions | Embedded as delimited, labelled, untrusted data; never concatenated into the system prompt |
| Certificate image text | OCR-extracted into typed fields; OCR output is data, never instructions |
| Customer message | Treated as a request; never able to change system behaviour |
| Retrieved knowledge chunk | Delimited and labelled; cannot alter tool permissions |
| Tool output | Serialized against an explicit schema; a text field cannot become a command |
| URL or slug parameters | Validated against strict patterns; never interpolated into prompts |

Further controls: per-intent tool allow-lists; output schema validation on every model response; the model never receives credentials, connection strings or internal identifiers; a request-level nonce binds a turn to its tool results so results cannot be replayed into a later turn.

## 9. Memory and conversation state

| Scope | Mechanism | Retention |
|---|---|---|
| Turn context | request-local | request lifetime |
| Session summary | Redis `ai:conv:{id}`, rolling | 24h idle |
| Durable summary | `conversations.summary` with model and timestamp | conversation lifetime |
| Long-term preference | `customer_profiles`, opt-in only | until revoked |
| Semantic memory | `knowledge_chunks` | document lifecycle |

Summaries are regenerated, never appended indefinitely. No PII beyond what the conversation requires. On deletion request, the cascade reaches `messages`, `tool_calls` and `guardrail_events`, while `ai_interactions` retains de-identified aggregates for cost and quality analysis.

## 10. Streaming

SSE from a route handler with typed frames, so the client renders tool activity and citations progressively. Provider streams are re-framed into our own protocol, so a provider swap changes nothing client-side. Abort on client disconnect propagates to the gateway call, so an abandoned stream stops billing.

## 11. Citations

```json
{ "type": "PRODUCT", "id": "uuid", "label": "Pave Green Tourmaline Ring 1.28 Ct.",
  "url": "/products/...", "confidence": 1.0, "fields": ["price", "origin"] }
```

Citations are resolved from tool output, never invented by the model. `grounded_ratio` records the fraction of claims with a surviving citation; below **0.6** the interaction is flagged for review.

## 12. Confidence and fallback

| Signal | Threshold | Action |
|---|---|---|
| Intent classification | < 0.55 | Ask a clarifying question |
| Grounding ratio | < 0.6 | Strip ungrounded claims; if insufficient remains, escalate |
| Structured tool results | 0 | Say "I could not find that"; never fabricate a near match |
| Certificate field confidence | < 0.85 | Present as extracted, labelled unverified |
| Model error or rate limit | any | One retry on the fallback chain, then human handoff |
| Out-of-scope request | any | Decline and offer a human |

## 13. Human handoff

Handoff is a **state transition**, not a message: `conversations.handoff_reason` is set, the state moves to `AWAITING_HUMAN`, a `create_customer_request` row is written, the customer is told a specialist will respond with a concrete expectation, and the transcript plus tool calls are attached for the agent.

| Trigger | Condition |
|---|---|
| `CUSTOMER_REQUEST` | explicit ask |
| `LOW_CONFIDENCE` | grounding below threshold after clarification |
| `CERTIFICATE_ANOMALY` | WARN or ERROR anomaly detected |
| `COMPLEX_DYO` | more than N iterations, or a custom design |
| `HIGH_VALUE` | order above a configured threshold |
| `SENSITIVE_OPERATION` | refund, complaint, authenticity dispute |
| `POLICY_ESCALATION` | a guardrail rule escalates |
| `DISSATISFACTION` | negative sentiment or repeated failure |
| `NO_INFORMATION` | tools returned nothing usable twice |

## 14. Logging and evaluation

`ai_interactions` records request id, model, tokens, cost, latency, TTFB, tool count, guardrail action, grounded ratio and handoff. `tool_calls` records input, **redacted** output, authorization decision, latency and cost. Evaluation is specified in doc 32.

## 15. Validation rules

1. Every tool declares `mutates`, `timeoutMs`, `idempotent` and `citationFor`.
2. `authorization()` runs before `execute()`, in code.
3. No tool's `execute` receives a repository, a connection or a raw SQL capability.
4. Every model response is schema-validated; malformed output is a failure, not a fallback.
5. Every factual claim requires a resolvable citation.
6. `grounded_ratio` is computed server-side, never supplied by the client.
7. A surface budget exhaustion yields a handoff, never a truncated answer.

## 16. Error handling

| Code | Status | Behaviour |
|---|---|---|
| `AI_UNAVAILABLE` | 503 | Fallback exhausted; offer search and human contact |
| `AI_BUDGET_EXHAUSTED` | 429 | Hard stop with handoff; not silent degradation |
| `INTENT_UNCLEAR` | 200 | Clarifying question, no tool call |
| `GROUNDING_FAILED` | 200 | Refusal or handoff; never an ungrounded answer |
| `TOOL_DENIED` | recorded | Model told the capability is unavailable |
| `TOOL_TIMEOUT` | recorded | Partial results used, gap stated explicitly |
| `MODEL_INVALID_OUTPUT` | recorded | Schema failure; one strict retry, then handoff |

## 17. Security boundaries

- The AI has no database credential and no repository import.
- Tools are the only capability surface, and the registry is code-reviewed and frozen per version.
- `get_certificate` redacts any field below the verification threshold.
- PII never enters a prompt unless the conversation requires it; summaries are redacted.
- Model providers receive no customer identifiers beyond the minimum needed to answer.

## 18. Observability

Metrics: `grounded_ratio` distribution, refusal rate by field, handoff rate by trigger, tool latency and error rate per tool, token cost and TTFB per surface, budget consumption, guardrail actions by rule. Alerts on `grounded_ratio` dropping, refusal-rate anomalies, handoff backlog growth and budget burn rate.

## 19. Testing requirements

| Test | Proves |
|---|---|
| Registry integrity | No mutating tool exists for protected entities |
| Import-graph test | No repository import is reachable from `@modules/ai` |
| Authorization matrix | Every actor/tool pair matches the table |
| Denial behaviour | A denial is logged and reveals no policy internals |
| Grounding gate | Unverifiable claims are stripped, not softened |
| Charter refusal example | A NULL stone type produces the refusal script |
| No-fabrication | Zero tool results yields "could not find that", never a near match |
| Injection suite | Description-borne, certificate-borne and customer-borne injection attempts are all inert |
| Budget exhaustion | Hard stop plus handoff, never truncation |
| Citation integrity | Every rendered claim has a surviving citation |
| Streaming abort | Client disconnect stops provider billing |

## 20. Failure modes

| Failure | Behaviour |
|---|---|
| Provider outage | Fallback chain, then handoff; the site stays fully usable without AI |
| Model returns ungrounded claims | Gate strips; if substance is lost, escalate |
| Injection attempt | Logged as a guardrail event; inert by construction |
| Prompt-supplied tool not in registry | Rejected at planning; logged |
| Vector store down | Knowledge tools degrade; structured tools still serve |
| Grounding regresses | Alert fires; feature flag disables synthesis until reviewed |

## 21. Implementation constraints

1. The model never authorizes, never writes and never decides what is true.
2. No tool mutates price, inventory, orders, payments, certificates or permissions.
3. Every factual claim carries a resolvable citation or is stripped.
4. Unverified certificate data is never presented as verified.
5. Null structured data produces a refusal, never a guess.

## Evidence status

`[OBSERVED]`: `stone_type` populated for 113 of 1,024; availability reported for all 1,024 with no per-unit stock; LLM-generated product descriptions; customer-supplied certificate images. `[INFERRED]`: the orchestrator, registry, gateway, guardrails, memory model and streaming protocol. The `[INFERRED]` label on the orchestration layer is intentional: the source reveals what the AI must never say far more reliably than it reveals how the original AI worked.