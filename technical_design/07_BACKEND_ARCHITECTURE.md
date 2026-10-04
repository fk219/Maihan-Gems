# 07 BACKEND ARCHITECTURE

**Package:** `technical_design/` doc 07 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 10.1-10.5, 30, 31.
**Evidence status:** `[INFERRED]`.

---

## Purpose

Define the internal server structure: modules, application services, repositories, commands, queries, DTOs, policies, transactions and events.

## Layering

```
Route handler            authn, validate, one service call, serialize
      |
Application service      orchestration, transaction, authorization, idempotency, events
      |
Domain                   pure logic, invariants, decisions
      |
Repository               SQL only, no decisions
```

The dependency arrow points downward only. `packages/domain` never imports upward. This is mechanically enforced (doc 03).

## The 14 modules

| Module | Owns tables | Public surface (examples) |
|---|---|---|
| `catalog` | `gemstones`, `gemstone_stones`, `settings`, `setting_variants`, `setting_compatibility_rules`, `products`, `product_gemstones` | `getProductBySlug`, `listProducts`, `getGemstone`, `listSettings` |
| `taxonomy` | `gemstone_species`, `gemstone_varieties`, `gemstone_colours`, `colour_intensities`, `gemstone_origins`, `treatments`, `treatment_labels`, `clarities`, `clarity_labels`, `metals`, `setting_styles`, `jewellery_types` | `getFacets`, `resolveVariety`, `getColourTree` |
| `search` | none (read-only across catalog) | `search`, `suggest`, `facetCounts` |
| `dyo` | `dyo_configurations`, `dyo_price_snapshots`, `dyo_quotes`, `setting_compatibility_rules` (rules owned by catalog, evaluated by dyo) | `createConfiguration`, `validateConfiguration`, `quoteConfiguration` |
| `pricing` | `price_lists`, `price_entries`, `price_model_observations` | `computePrice`, `explainPrice` |
| `commerce` | `carts`, `cart_items`, `orders`, `order_items`, `payments`, `refunds`, `discounts`, `product_addons`, `fulfillments`, `order_events` | `addToCart`, `beginCheckout`, `placeOrder`, `refundOrder` |
| `customers` | `customers`, `customer_profiles`, `addresses` | `getCustomer`, `updateProfile`, `listAddresses` |
| `assets` | `assets`, `asset_variants`, `asset_usages` | `ingestAsset`, `attachAsset`, `getAssetUrl` |
| `certificates` | `certificates`, `certificate_ocr_runs`, `certificate_extractions`, `certificate_anomalies`, `certificate_reviews`, `verification_events` | `uploadCertificate`, `runExtraction`, `approveCertificate` |
| `cms` | `pages`, `page_revisions`, `navigations`, `redirects`, `seo_metadata` | `getPage`, `getNavigation`, `resolveRedirect` |
| `ai` | `conversations`, `messages`, `tool_calls`, `knowledge_documents`, `knowledge_chunks`, `product_embeddings`, `ai_interactions`, `ai_evaluations`, `guardrail_events` | `converse`, `streamAnswer`, `handoff` |
| `integrations` | `webhook_receipts` | `handleWhatsAppWebhook`, `handlePaymentWebhook` |
| `operations` | `jobs`, `domain_events`, `event_consumers`, `audit_logs`, `rate_limit_counters`, `feature_flags` | `enqueue`, `publish`, `audit`, `isEnabled` |
| `admin` | none; composes the others | admin-specific queries |

`webar_assets` and `ar_handoff_tokens` are owned by `assets` (AR metadata) with the runtime route in `apps/web`.

## Cross-module rules

1. Module A calls module B **only** through B's `index.ts` public surface.
2. A module never imports another module's `infrastructure/`.
3. `search` is read-only. It never writes.
4. `pricing` is called by `dyo`, `commerce` and `catalog`; it owns no cart state and no product state.
5. `ai` may call **query** services of other modules. For any mutation it must call the target module's **command** service, with the AI as a proposed actor subject to identical authorization. In practice the only two mutations are `create_customer_request` and `transfer_to_human`.
6. `integrations` is the only module that knows provider SDKs exist.

## Application services

A service method is a use case. Its shape is fixed:

```ts
export async function addToCart(deps: Deps, cmd: AddToCartCommand): Promise<CartView> {
  return deps.tx(async (tx) => {                    // 1 one transaction
    const existing = await deps.idempotency.find(cmd.key);   // 2 replay guard
    if (existing) return existing;
    const cart    = await deps.carts.requireActive(cmd.cartToken);
    const product = await deps.catalog.requireSellable(cmd.productId);
    deps.authz.assertCanModifyCart(deps.actor, cart);        // 3 authorization
    await deps.inventory.ensureReservable(product);           // 4 domain rule
    const price   = deps.pricing.computeQuote(...);           // 5 deterministic price
    const item    = await deps.carts.addItem(tx, {...});      // 6 persist
    await deps.events.publish(tx, CartItemAdded.of(item));    // 7 outbox, same tx
    await deps.audit.write(tx, {...});                        // 8 audit
    await deps.idempotency.store(cmd.key, cmd.hash, item);    // 9
    return item;
  });
}
```

Fixed order, every time: **idempotency, authorization, domain validation, persistence, event, audit.** Reordering any of these is a defect.

## Commands and queries

| Kind | Location | Rule |
|---|---|---|
| Command | `application/commands/<verb><Noun>.ts` | Exactly one transaction; emits events; audited; idempotent |
| Query | `application/queries/<readModel>.ts` | No transaction of its own beyond the read; no writes; cacheable; may be stale within TTL |
| DTO | `application/dto/` | Zod in and Zod out; no row objects cross the boundary |

Rows never leave the repository layer. A repository returns a mapped domain object or a DTO projection, never a raw row.

## DTOs and validation

- Every input has an input Zod schema; every output has an output Zod schema.
- Output schemas are the OpenAPI source, so the committed spec cannot drift from the implementation.
- Schemas are `.strict()`.
- A DTO never exposes a column that is not in the public contract. `raw_spec`, `cost_component` and internal ids are excluded by construction, not by convention.

## Error model

One envelope, one registry:

```json
{ "error": { "code": "DYO_INCOMPATIBLE",
             "message": "This setting cannot hold the selected stone.",
             "details": [{ "rule": "max_weight", "message": "Stone 5.98ct exceeds max 4.50ct" }],
             "requestId": "req_...", "traceId": "..." } }
```

| Class | HTTP | Codes |
|---|---|---|
| Validation | 400 | `VALIDATION_FAILED`, `INVALID_FILTER` |
| AuthN | 401 | `UNAUTHENTICATED`, `EMAIL_UNVERIFIED` |
| AuthZ | 403 | `FORBIDDEN`, `TOOL_NOT_PERMITTED`, `AI_MUTATION_DENIED` |
| Not found | 404 | `PRODUCT_NOT_FOUND`, `CONFIGURATION_NOT_FOUND` |
| Conflict | 409 | `PRICE_CHANGED`, `OUT_OF_STOCK`, `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT` |
| Domain | 422 | `DYO_INCOMPATIBLE`, `CERTIFICATE_LOW_CONFIDENCE`, `DISCOUNT_INVALID`, `INV-01`..`INV-10` |
| Rate limit | 429 | `RATE_LIMITED`, `AI_QUOTA_EXCEEDED` |
| Server | 500 / 503 | `INTERNAL`, `DEPENDENCY_UNAVAILABLE`, `CIRCUIT_OPEN` |

Error codes are a closed registry. A new code requires review; an ad-hoc string is a defect. `details` is always machine-readable so the frontend and the AI layer never string-match.

`InvariantError` from `packages/domain` maps to 422 and names the violated invariant. The database may also reject with 23514; both produce the same code.

## Authorization

Policies live in `application/policies/`, one file per resource, pure functions of `(actor, resource, action)`.

```ts
type Decision = { allow: true } | { allow: false; reason: string };
```

Enforcement points, in order: route handler resolves the actor; the application service calls the policy; the database RLS is a second line. A policy denial returns 403 with a reason **internal to the policy**, never the rule text, so the rule set is not enumerable from outside.

## Transactions

| Rule | Detail |
|---|---|
| Scope | One transaction per command |
| Owner | The application service, via `withTransaction` from `packages/db` |
| Forbidden | A route handler, a repository, a query, or a domain service opening a transaction |
| Isolation | Default `READ COMMITTED`; `SELECT ... FOR UPDATE` on the rows a command mutates (cart, configuration, order, reservation) |
| Retries | Serialisation failure and deadlock retried up to 3 times with jitter; no retry on a business error |
| Timeout | `statement_timeout` per role, not globally |

## Idempotency

Implemented in the `operations` module, backed by unique database constraints so it survives a Redis flush. The idempotency record stores the request hash and the serialized response. Same key plus same hash returns the original; same key plus different hash is `409`.

## Events

Emitted only by application services, always inside the command transaction, always through the outbox (ADR-020). A module declares its event types in `application/events/` with Zod payload schemas; consumers live in `infrastructure/events/`.

Delivery is at-least-once. Consumers are idempotent and record progress in `event_consumers`. Ordering is guaranteed per aggregate, never globally.

## Jobs

Handlers are thin: load payload, call a service, return. A handler may not contain business logic, and may not emit business events (it may emit operational ones such as `AssetProcessed`). Queues, retries and dead-lettering are in doc 27.

## Validation rules (enforced in CI)

1. No SQL outside `infrastructure/repositories/`.
2. No `withTransaction` outside `application/services/`.
3. No `process.env` outside `packages/config`.
4. No import of another module's `infrastructure/`.
5. No provider SDK outside `integrations` and `packages/ai`.
6. No route handler importing a repository.

## Security boundaries

- The AI module holds no repository handle (doc 01), so it structurally cannot mutate transactional state (ADR-003).
- `integrations` verifies every webhook before parsing and never follows a URL from a payload.
- `certificates` is the only module that can move a document to `VERIFIED`, and only via a persisted human review.
- `operations.audit` is the only writer of `audit_logs`, and the application role holds no UPDATE or DELETE grant on it.

## Observability

Span per command, named `<module>.<service>.<useCase>`. Attributes: actor type, entity ids, outcome, evidence status touched. Never: prices in full, PII, raw customer text, model output. Metrics per doc 28.

## Testing requirements

| Test | Proves |
|---|---|
| Layering lint | All six validation rules hold |
| Service unit tests | Each use case's ordered behaviour |
| Transaction tests | One transaction per command; no nested transaction |
| Idempotency tests | Replay returns the original for every command |
| Policy matrix | Every role x resource x action decision |
| Outbox tests | Event written in the same transaction as state |
| Repository integration tests | Real PostgreSQL, not mocks |
| Error mapping tests | Every code maps to the right status |

## Failure modes

| Failure | Detection | Response |
|---|---|---|
| Business logic in a handler | Lint | Block merge |
| Missing transaction | Lint plus test | Block merge |
| Duplicate event emission | Outbox test | Block merge |
| Idempotency bypassed | Replay test | Block merge |
| Authorization skipped | Policy matrix | Block merge |
| Raw error leaked to client | Response snapshot test | Block merge |

## Implementation constraints

1. The ordering **idempotency, authorization, domain, persist, event, audit** is fixed.
2. One transaction per command; events inside it.
3. Rows never leave the repository layer.
4. Error codes come from the closed registry.
5. `now()` is injected once per command.

## Evidence status

`[INFERRED]`. Module boundaries, layering, error codes, policies and transaction rules all come from `PROJECT_SOURCE_OF_TRUTH.md` section 10. No new architectural element is introduced. The original system's backend framework, service topology and database engine remain `[UNKNOWN]` and are not claimed anywhere.