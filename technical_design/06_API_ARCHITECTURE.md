# 06 API ARCHITECTURE

**Package:** `technical_design/` doc 06 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 10.1, 10.4, 11, 34.
**Evidence status:** `[INFERRED / PROPOSED]`. **The source exposed no observable API.** `data/functional_signals.jsonl` records only UI signals (cart, search, interactive buttons, DYO, product gallery). Original endpoint inventory, request and response schemas, authentication and error contracts are `[UNKNOWN]`. Every endpoint below is a target design.

---

## Purpose

Define the HTTP surface, its conventions, and the rules that keep business logic out of route handlers.

## Conventions

| Concern | Rule |
|---|---|
| Base path | `/api/v1` |
| Content type | `application/json`; `multipart/form-data` only for direct upload (preferred path is presigned) |
| Authentication | `Authorization: Bearer <session>` for API clients; HttpOnly cookie session for browser routes |
| Authorization | Enforced in the application service, never in the handler alone |
| Validation | Zod; **unknown fields rejected** (`.strict()`) |
| Errors | One envelope, doc 07 section 4 |
| Idempotency | `Idempotency-Key` header **required** on any state-creating `POST`/`PATCH`/`DELETE` |
| Rate limits | doc 06 section 8 |
| Caching | `Cache-Control` plus `Surrogate-Key`; doc 25 |
| Tracing | `X-Trace-Id` echoed on every response |
| Versioning | Path version. Additive changes ship in `/api/v1`; breaking changes get `/api/v2` |

## Route handler contract (the enforced rule)

A route handler may do exactly five things:

```ts
export async function POST(req: Request, ctx: Ctx): Promise<Response> {
  const session  = await resolveSession(req);              // 1 authn
  const input    = CreateProduct.parse(await req.json());   // 2 validate (strict)
  const result   = await catalogService.createProduct(     // 3 exactly one service call
    { input, actor: session.actor, traceId: ctx.traceId });
  return json(result, 201, { idempotencyKey });             // 4 serialize
}
```

Forbidden inside a handler: SQL, transaction control, business branching, model calls, direct Redis access, event emission, price computation.

Rationale: this is the rule that makes doc 07's layering observable in review, and the one that guarantees the AI layer cannot reach a write path, because tools call services, not handlers.

## API domains

| Domain | Base | Section of Source of Truth |
|---|---|---|
| Catalog reads | `/api/v1/products`, `/gemstones`, `/settings` | 11.2 |
| Search | `/api/v1/search` | 11.3 |
| DYO | `/api/v1/dyo` | 11.4 |
| Commerce | `/api/v1/carts`, `/checkout`, `/orders`, `/favorites`, `/compare` | 11.5 |
| Account | `/api/v1/account` | 11.6 |
| Content | `/api/v1/pages`, `/navigation` | 11.6 |
| Assets | `/api/v1/uploads/presign`, `/assets/{id}/url` | 11.6 |
| AI | `/api/v1/ai` | 11.7 |
| Certificates | `/api/v1/certificates` | 11.8 |
| Admin | `/api/v1/admin` | 11.9 |
| Webhooks | `/api/v1/webhooks` | 11.10 |

## Full route table

### Catalog reads (public, cacheable)

| Method | Path | Auth | Cache | Idempotency | Emits |
|---|---|---|---|---|---|
| GET | `/products` | public | 60s SWR | - | - |
| GET | `/products/{slug}` | public | 300s SWR | - | - |
| GET | `/products/{slug}/related` | public | 300s SWR | - | - |
| GET | `/gemstones` | public | 60s SWR | - | - |
| GET | `/gemstones/{gemRef}` | public | 300s SWR | - | - |
| GET | `/settings` | public | 300s SWR | - | - |
| GET | `/settings/{sku}` | public | 300s SWR | - | - |
| GET | `/settings/{sku}/compatible-gemstones` | public | 60s SWR | - | - |
| GET | `/taxonomy/varieties` | public | 1h | - | - |
| GET | `/taxonomy/colors` | public | 1h | - | - |
| GET | `/taxonomy/facets` | public | 1h | - | - |
| GET | `/taxonomy/origins` | public | 1h | - | - |
| GET | `/taxonomy/metals` | public | 1h | - | - |

Every catalog response embeds `provenance: { sourceUrl, evidenceStatus }` per entity. This is not decoration: the AI layer and the UI both require it, and it is the mechanism that makes the evidence hierarchy observable at runtime.

### Search

| Method | Path | Auth | Cache | Notes |
|---|---|---|---|---|
| POST | `/search` | public | 30s | `POST` because filters are complex and exceed clean URL length |
| GET | `/search/suggest?q=` | public | 1h | Typeahead |
| GET | `/search/similar-gemstones/{gemRef}` | public | 300s | Vector, within variety and colour family |
| GET | `/search/related-products/{productId}` | public | 300s | Embedding-based |

`POST /search` response includes `meta.rejectedFilters[]` with a reason per rejected value, and `meta.strategy` (`structured_only | hybrid | semantic_rerank`). Silently widening a filter is forbidden.

### DYO

| Method | Path | Auth | Idempotency | Emits |
|---|---|---|---|---|
| POST | `/dyo/configurations` | public | required | `DYOConfigurationCreated` |
| GET | `/dyo/configurations/{shortCode}` | public | - | - |
| PATCH | `/dyo/configurations/{shortCode}` | owner | required | `DYOConfigurationCreated` |
| POST | `/dyo/configurations/{shortCode}/validate` | public | - | `DYOConfigurationValidated` |
| POST | `/dyo/configurations/{shortCode}/quote` | public | required | `DYOConfigurationPriced` |
| GET | `/dyo/configurations/{shortCode}/compatible-settings` | public | - | - |
| POST | `/dyo/configurations/{shortCode}/render` | public | required | job enqueued |
| POST | `/dyo/configurations/{shortCode}/add-to-cart` | public | required | `DYOConfigurationPriced`, `CartItemAdded` |
| POST | `/dyo/share/{shortCode}` | public | - | - |

A configuration is resumable by `shortCode` without authentication; the anonymous session is tracked but is not an authorization boundary for reads of a configuration created by that same session. Editing requires the owning session.

### Commerce

| Method | Path | Auth | Idempotency | Emits |
|---|---|---|---|---|
| POST | `/carts` | public | required | - |
| GET | `/carts/{token}` | owner | - | - |
| POST | `/carts/{token}/items` | owner | required | `CartItemAdded` |
| PATCH | `/carts/{token}/items/{itemId}` | owner | required | - |
| DELETE | `/carts/{token}/items/{itemId}` | owner | required | `CartItemRemoved` |
| POST | `/carts/{token}/apply-discount` | owner | required | - |
| POST | `/checkout/sessions` | owner | required | `InventoryReserved` |
| POST | `/checkout/sessions/{id}/shipping` | owner | required | - |
| POST | `/checkout/sessions/{id}/payment` | owner | required | `PaymentCreated` |
| POST | `/checkout/sessions/{id}/confirm` | owner | required | `OrderCreated` |
| GET | `/orders` | owner | - | - |
| GET | `/orders/{orderNumber}` | owner | - | - |
| POST | `/orders/{orderNumber}/cancel` | owner | required | `OrderCancelled` |
| POST | `/orders/{orderNumber}/refunds` | owner | required | `RefundCreated` |
| GET | `/favorites` | owner | - | - |
| POST | `/favorites` | owner | required | - |
| DELETE | `/favorites/{productId}` | owner | required | - |
| GET | `/compare` | public | - | - |

**The four checkout steps mirror the observed source funnel** `[OBSERVED]`: `/cart` -> `/cart/order-summary` -> `/cart/payment-order` -> `/cart/secure-payment`. Each is a distinct server-side checkpoint. The mapping to target routes is `cart -> /checkout/sessions`, `order-summary -> /shipping`, `payment-order -> /payment`, `secure-payment -> /confirm`. The internal step semantics are `[INFERRED / PROPOSED]`; the existence of four steps is observed.

### Account, content, assets

| Method | Path | Auth | Idempotency |
|---|---|---|---|
| GET / PATCH | `/account/profile` | owner | PATCH required |
| GET / POST | `/account/addresses` | owner | POST required |
| PATCH / DELETE | `/account/addresses/{id}` | owner | required |
| GET | `/account/orders` | owner | - |
| POST | `/account/concierge-request` | owner | required |
| POST | `/uploads/presign` | owner | required |
| GET | `/pages/{slug}` | public | - |
| GET | `/navigation/{key}` | public | - |
| GET | `/assets/{id}/url` | owner or public | - |

`/uploads/presign` returns a short-lived signed URL. The application never proxies customer bytes.

### AI

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/ai/conversations` | public | Returns `conversationId` |
| POST | `/ai/conversations/{id}/messages` | owner | Non-streaming |
| POST | `/ai/stream` | public | **SSE**, typed frames |
| GET | `/ai/conversations/{id}/messages` | owner | History with citations |
| POST | `/ai/conversations/{id}/handoff` | owner | Force handoff |
| POST | `/ai/tools/{toolName}/invoke` | **internal only** | Never exposed to browsers; tests and admin only |

`POST /api/v1/ai/tools/{name}/invoke` is a deliberate internal surface. It exists so tool contracts can be tested directly. It is blocked at the edge for external traffic and is recorded in the security matrix.

SSE frame types: `message_start`, `tool_call`, `tool_result`, `citation`, `token`, `guardrail`, `handoff`, `message_end`. Re-framing provider streams into this protocol is what makes provider swapping invisible to the client.

### Certificates

| Method | Path | Auth | Idempotency |
|---|---|---|---|
| POST | `/certificates` | owner or admin | required |
| GET | `/certificates/{id}` | owner or admin | - |
| POST | `/certificates/{id}/extract` | admin | required |
| POST | `/certificates/{id}/review` | admin | required |
| GET | `/gemstones/{gemRef}/certificates` | public | - |
| GET | `/certificates/{id}/anomalies` | admin | - |
| POST | `/certificates/{id}/cross-check` | system | required |

Public certificate responses pass through `certificate_public` and always carry per-field `confidence` and `verificationStatus`. A field below 0.50 is absent, not empty.

### Admin

`/api/v1/admin/{products,gemstones,settings,varieties,import-batches,certificates,ai,audit-logs,jobs,assets,derived-refs}`

`POST /admin/derived-refs/{id}/approve` is the **only** route that may promote an `INFERRED` identifier to canonical, and it writes an audit row naming the approver (INV-08).

### Webhooks

| Method | Path | Verification |
|---|---|---|
| POST | `/webhooks/whatsapp` | Meta `X-Hub-Signature-256` over the raw body |
| POST | `/webhooks/payments/{provider}` | Provider signature, per provider |
| POST | `/webhooks/storage` | HMAC from the storage provider |

Handler order is fixed: **verify, then parse.** No payload field is read before verification succeeds.

## Pagination

Keyset only. `?cursor=<opaque>&limit=<1..100>`. Offset pagination is forbidden for deep pages. Sort tuples are deterministic and always tie-broken by `id`.

## Validation rules

1. Every request body and query parameter has a Zod schema in `packages/contracts`.
2. Schemas are `.strict()`: unknown fields are a 400, not ignored input.
3. Enum-typed fields accept only the enum members; a filter naming an unknown value returns `rejectedFilters` with a reason.
4. Money arrives as a decimal string; a float in a price field is a 400.
5. `gemRef`, `sku`, `slug` and UUIDs are pattern-validated before any database access.

## Idempotency

`Idempotency-Key` is stored with the request hash. A replay with the same key and a different hash is `409 IDEMPOTENCY_CONFLICT`; with the same hash it returns the original response. Uniqueness is enforced by database constraints on `orders.idempotency_key`, `payments.idempotency_key`, `dyo_quotes.idempotency_key`, `jobs.job_key`, `webhook_receipts(provider, external_event_id)` and `tool_calls` inputs.

## Error handling

One envelope, one code registry, `details` always machine-readable. Full table in doc 07. Raw SQL and provider error text never reach a client.

## Security boundaries

- Public reads are anonymous-safe: no PII, no unverified certificate values, no internal identifiers.
- Owner routes check ownership **and** RLS; RLS is defence in depth, not the primary check.
- Admin routes require an admin role with `BYPASSRLS`, and every access is audited.
- The AI tool-invoke route is internal-only.
- Webhook routes are the only unauthenticated-by-token routes and are signature-gated.

## Observability

Span per request; child spans per service call and per repository call. Metrics: rate, error rate, duration percentiles per route template (never per URL), idempotency replay rate, rejected-filter rate.

## Testing requirements

| Test | Proves |
|---|---|
| Handler purity lint | No handler imports a repository, a model SDK or `withTransaction` |
| Contract tests | Every endpoint validates, authorizes and returns the documented envelope |
| Idempotency tests | Replay returns the original result; hash mismatch 409 |
| Authorization matrix | Every role against every route |
| OpenAPI drift | Generated spec matches committed spec |
| SSE frame test | Frame protocol is provider-independent |
| Internal-route block test | `/ai/tools/*/invoke` is unreachable externally |

## Failure modes

| Failure | Behaviour |
|---|---|
| Redis down | Rate limits fall back; reads continue; 429 less precise |
| Validation storm | 400 with `details`, no database hit |
| Provider timeout on a route | 503 `DEPENDENCY_UNAVAILABLE`, never a partial success |
| Idempotency store unavailable | Fail closed on state-creating requests |

## Implementation constraints

1. No business logic in handlers. Enforced by lint.
2. No URL without a Zod schema.
3. No state-creating endpoint without idempotency.
4. `/api/v1/ai/tools/*/invoke` never exposed publicly.
5. Public catalogue responses always carry provenance.

## Evidence status

`[INFERRED / PROPOSED]` throughout. The only `[OBSERVED]` API-adjacent facts in the source are the four checkout URLs and the presence of cart, search, DYO, interactive-button and product-gallery signals. No endpoint shape, schema or auth mechanism is claimed to match the source.