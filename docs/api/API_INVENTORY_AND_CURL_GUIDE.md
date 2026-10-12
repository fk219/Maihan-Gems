# Maihan Gems API inventory and local test guide

**Scope:** the checked-out implementation at `1444dd9`, inspected on 2026-10-12. This is an implementation inventory, not a claim that the full API architecture is complete.

## Start here

The API is a framework-free `Request => Response` handler served by a separate Node HTTP adapter. It is **not** mounted under the Next.js `app/api` directory. The API listener defaults to port `3000`; Next.js development also defaults to `3000`, so run the API on a different local port if the web app is running:

```powershell
# Configure DATABASE_URL to a local PostgreSQL 16 development database using
# the project's existing local configuration. Do not paste a production URL.
$env:API_PORT = '3001'
pnpm --filter @maihan/web run build
pnpm --filter @maihan/web run start
```

```bash
# Configure DATABASE_URL to a local PostgreSQL 16 development database.
API_PORT=3001 pnpm --filter @maihan/web run build
API_PORT=3001 pnpm --filter @maihan/web run start
```

`DATABASE_URL` is required; `REDIS_URL` is optional. `pnpm dev` starts Next.js, not this API. `pnpm --filter @maihan/web run start:web` also starts Next.js. Keep the two servers on separate ports. For API calls use `http://localhost:3001`; the two XML sitemap handlers are Next.js routes and use the web server base URL instead.

Use the route paths below with `BASE_URL` set to the **local API listener**:

```powershell
$BaseUrl = 'http://localhost:3001'
```

```bash
BASE_URL='http://localhost:3001'
```

### Scope and verification method

- The runtime router (`apps/web/src/api/routes.ts`) registers **143 distinct API method/path pairs** across **76 handler IDs**: 11 catalog paths, 66 `/api/v1` paths and 66 unprefixed aliases. For the non-catalog families, the canonical `/api/v1` path and its registered alias share one handler. One compatible-settings route currently has no unprefixed alias.
- Two additional Next.js `GET` route handlers generate XML sitemaps: `/sitemap.xml` and `/sitemap-products/{shard}.xml`. They are included in the collection but are not API-router routes.
- **145 total HTTP handler registrations** are therefore listed here (143 API pairs + 2 sitemap routes). Dynamic paths count once per route template, not once per possible value.
- The `apps/web/src/app/api/README.md` explicitly says there are no Next.js API route handlers there. The sitemap route files are the only other `route.ts` handlers found under `src/app`.
- `packages/contracts/src/generated/openapi.json` covers only the 11 catalog operations. It is **not** a complete specification of the 143-route API surface. For non-catalog routes, request behavior below is transcribed from the router, handler, DTO, repository, and tests; the guide identifies cases where the handler has no request schema.
- Existing API tests prove handler behavior using in-memory doubles and/or isolated database fixtures. They do not prove every endpoint succeeds against a running local server.

## Important safety and authentication limits

1. There is no login, token-issuance, refresh, cookie-session, or bearer-authentication endpoint in the router. Do not invent a bearer token or use one in these requests.
2. Account and favorites handlers accept `x-customer-id` **or** the `customer_id` query parameter. This is only an asserted customer ID; no identity provider verifies it. It is not secure authentication. Use only disposable local development data and never expose this API publicly in its current form.
3. Most other handlers, including refund approval/execution, certificate review, reservation sweep, order access/mutation, DYO conversion, and AR handoff creation, have no HTTP role/authorization check in the current route pipeline. “No auth required” below describes current code, **not** a recommendation or production-ready security posture.
4. Webhook signature checks exist, but the WhatsApp handler falls back to a fixed in-code development value when the environment variable is absent. The payment adapter similarly has an in-code test signer. These are not production credentials; do not copy them into this guide or collection, and do not expose a server using them to the Internet.
5. Payments use `TestPaymentProvider`; the WhatsApp outbound template handler returns a simulated `queued` result and does not call Meta. AI has a simulated default model gateway, deterministic/test-style tool adapters, a hard-coded pricing result, and non-persisted handoff/request IDs. Certificate “OCR” accepts caller-supplied extraction data, and its upload URL is a constructed placeholder rather than a configured object-storage presign. Those results are not proof of live provider integration.
6. Every API route is passed through the same `public_get` 300-per-minute limiter when the standalone server wires the API, including mutations. No separate search, checkout, webhook, AI, or admin limits are active in this router. Direct handler tests can omit the limiter.
7. Read-only requests can still expose customer, order, conversation, certificate, or operational data where the handler allows it. Keep testing on a throwaway local development database. Do not run state-changing requests or use cleanup/reset commands against production.

## Wire conventions and common errors

- JSON requests: `Content-Type: application/json`; request JSON examples below also use `Accept: application/json`.
- JSON responses include `X-Trace-Id`. SSE chat responses use `text/event-stream`; metrics use `text/plain; version=0.0.4`.
- The common error body is `{"error":{"code":"…","message":"…","details":[…],"requestId":"…","traceId":"…"}}`; `details` is omitted if absent. Unexpected errors become `500 INTERNAL` with the fixed message `Internal error.`.
- Registered error statuses include `400 VALIDATION_FAILED` / `INVALID_FILTER`, `401 UNAUTHORIZED`, `402 PAYMENT_FAILED`, `403 FORBIDDEN`, `404 NOT_FOUND` and resource-specific not-found codes, `405 METHOD_NOT_ALLOWED`, `409` conflicts (including `IDEMPOTENCY_CONFLICT`, `PRICE_CHANGED`, `OUT_OF_STOCK`), `422` unprocessable/invalid business requests, `429 RATE_LIMITED`, and `500 INTERNAL`. A raw repository error may map to `500`.
- Catalog list inputs reject unknown query keys and invalid enum/range values with 400. Catalog success uses `data`, `meta`, `facets`, and `rejectedFilters`; detail responses use `data`.
- Handler responses and status codes below are the actual outcomes returned by code. Some response objects are DB rows, so their complete field set depends on the corresponding repository/model.

## Registered endpoint inventory

The `Full URL` values use `{{baseUrl}}` for the API server. Where an alias is shown, it is a separately registered route with the same method and handler. All endpoint-specific response bodies are JSON wrapped in `data` unless stated otherwise.

### Catalog and taxonomy — 11 routes

| ID | Method / path (alias) | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| listProducts | GET `/api/v1/products` | `{{baseUrl}}/api/v1/products` | Public | `limit` 1–100 (default from contract); `cursor`; `sort=price\|weight\|recency`; `direction=asc\|desc`; flat repeatable filters: `kind`, `jewelleryType`, `gemstoneKind`, `variety`, `color`, `intensity`, `clarity`, `treatment`, `origin`, `shape`, `metal`, `settingStyle`, `certified`, `available`, `minPrice`, `maxPrice`, `minWeightCt`, `maxWeightCt`. | 200 `{data:[],meta,facets,rejectedFilters:[]}` | Read-only DB/catalogue query; requires DB; active published records only. OpenAPI + query/envelope contracts and `api.spec.ts`. |
| productDetail | GET `/api/v1/products/{slug}` | `{{baseUrl}}/api/v1/products/{{productSlug}}` | Public | Path `slug` identifier. | 200 `{data: product}`; 404 `PRODUCT_NOT_FOUND`. | Read-only; requires an existing public slug. `endpoints.ts`, handler, detail envelope tests. |
| gemstoneDetail | GET `/api/v1/gemstones/{gemRef}` | `{{baseUrl}}/api/v1/gemstones/{{gemRef}}` | Public | Path `gemRef` identifier, e.g. an existing `K…` or `PR…` reference. | 200 `{data: gemstone}`; 404 `GEMSTONE_NOT_FOUND`. | Read-only; existing gem ref required. `endpoints.ts`, handler and envelope tests. |
| listSettings | GET `/api/v1/settings` | `{{baseUrl}}/api/v1/settings` | Public | `limit` 1–100, `cursor`; `jewellery_type`, `style`, `metal` (repeatable); `vedic` boolean. | 200 `{data:[],meta,facets,rejectedFilters:[]}` | Read-only; requires DB. Strict query DTO and catalog tests. |
| settingVariant | GET `/api/v1/settings/{sku}` | `{{baseUrl}}/api/v1/settings/{{settingSku}}` | Public | Path `sku`, existing setting-variant SKU. | 200 `{data:{variant,design}}`; 404 `SETTING_VARIANT_NOT_FOUND`. | Read-only; existing SKU required. OpenAPI contract and envelope tests. |
| settingDesign | GET `/api/v1/settings/designs/{designCode}` | `{{baseUrl}}/api/v1/settings/designs/{{designCode}}` | Public | Path `designCode`. | 200 `{data: design}`; 404 `SETTING_NOT_FOUND`. | Read-only; existing design required. OpenAPI contract and envelope tests. |
| taxonomyVarieties | GET `/api/v1/taxonomy/varieties` | `{{baseUrl}}/api/v1/taxonomy/varieties` | Public | None. | 200 `{data:[variety…]}` | Read-only taxonomy query/cache; requires DB. `handlers.ts`, DTO and API tests. |
| taxonomyColours | GET `/api/v1/taxonomy/colors` | `{{baseUrl}}/api/v1/taxonomy/colors` | Public | None. | 200 `{data:[colour…]}` | Read-only taxonomy query/cache; requires DB. Route spelling is `colors`. |
| taxonomyOrigins | GET `/api/v1/taxonomy/origins` | `{{baseUrl}}/api/v1/taxonomy/origins` | Public | None. | 200 `{data:[origin…]}` | Read-only taxonomy query/cache; requires DB. |
| taxonomyMetals | GET `/api/v1/taxonomy/metals` | `{{baseUrl}}/api/v1/taxonomy/metals` | Public | None. | 200 `{data:[metal…]}` | Read-only taxonomy query/cache; requires DB. |
| taxonomyFacets | GET `/api/v1/taxonomy/facets` | `{{baseUrl}}/api/v1/taxonomy/facets` | Public | None. | 200 `{data:[facetDefinition…]}` | Read-only taxonomy query/cache; no computed result counts. OpenAPI contract and API tests. |

### Search — 3 operations, 6 registered paths

| ID | Method / path (alias) | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| search | POST `/api/v1/search` (alias POST `/search`) | `{{baseUrl}}/api/v1/search` | None | JSON: `query` (≤300 chars), `filters` object, `semantic` boolean (default true), `limit` 1–100, `cursor`, `sort=relevance\|price\|weight\|recency`, `direction=asc\|desc`. | 200 `{data:[],facets,rejectedFilters:[],meta}` | Read-only search service; DB required. Search query contract; `search.spec.ts`. |
| searchSuggest | GET `/api/v1/search/suggest` (alias GET `/search/suggest`) | `{{baseUrl}}/api/v1/search/suggest?q=sapp&limit=5` | None | `q` or `prefix` (required after parsing, 1–100 chars); `limit` 1–20, default 5. | 200 `{data:[suggestion…],prefix}` | Read-only; DB/search data required. Suggestion DTO and search tests. |
| similarGemstones | GET `/api/v1/search/similar-gemstones/{gemRef}` (alias without `/api/v1`) | `{{baseUrl}}/api/v1/search/similar-gemstones/{{gemRef}}?limit=6` | None | Path `gemRef`; `limit` 1–20, default 6. | 200 `{data:[product…],sourceGemRef}` | Read-only; source gem ref and DB required. Handler and search tests. |

### Cart, checkout, orders, inventory, and payment — 17 operations

| ID | Method / path (alias) | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| createCart | POST `/api/v1/carts` (alias POST `/carts`) | `{{baseUrl}}/api/v1/carts` | None | `{}` or `{customer_id?:uuid,anonymous_session_id?:string,currency?:"USD"}` | 201 `{data: cart}` | Creates cart record/token; DB write. |
| getCart | GET `/api/v1/carts/{cartToken}` (alias without prefix) | `{{baseUrl}}/api/v1/carts/{{cartToken}}` | Token-like path value; no separate auth | Path `cartToken`. | 200 `{data: cart}` | Read-only; requires cart token. Token is sensitive; do not share it. |
| addCartItem | POST `/api/v1/carts/{cartToken}/items` (alias without prefix) | `{{baseUrl}}/api/v1/carts/{{cartToken}}/items` | No separate auth | `{product_id:uuid,configuration_id?:uuid,quantity?:1..99,engraving_text?:string≤50,options?:object,expected_unit_price?:string}` | 200 `{data: cart}` | Mutates cart; requires existing cart and active product/configuration. |
| updateCartItem | PATCH `/api/v1/carts/{cartToken}/items/{itemId}` (alias without prefix) | `{{baseUrl}}/api/v1/carts/{{cartToken}}/items/{{itemId}}` | No separate auth | `{quantity:1..99,expected_unit_price?:string}` | 200 `{data: cart}` | Mutates cart; existing item required. |
| removeCartItem | DELETE `/api/v1/carts/{cartToken}/items/{itemId}` (alias without prefix) | `{{baseUrl}}/api/v1/carts/{{cartToken}}/items/{{itemId}}` | No separate auth | None. | 200 `{data: cart}` | Destructive to cart contents; existing cart/item required. |
| mergeCart | POST `/api/v1/carts/{cartToken}/merge` (alias without prefix) | `{{baseUrl}}/api/v1/carts/{{cartToken}}/merge` | No separate auth | `{guest_cart_token:string}` | 200 `{data: cart}` | Mutates/merges cart; requires two existing carts. |
| createCheckoutSession | POST `/api/v1/checkout/sessions` (alias POST `/checkout/sessions`) | `{{baseUrl}}/api/v1/checkout/sessions` | No separate auth | `{cart_token:string,expected_total?:string,email?:email,customer_id?:uuid}` | 201 `{data: session}` | Creates session and inventory reservations; existing cart required. |
| getCheckoutSession | GET `/api/v1/checkout/sessions/{sessionId}` (alias without prefix) | `{{baseUrl}}/api/v1/checkout/sessions/{{sessionId}}` | No separate auth | Path `sessionId`. | 200 `{data: session}` | Read-only; existing session required. |
| submitShipping | POST `/api/v1/checkout/sessions/{sessionId}/shipping` (alias without prefix) | `{{baseUrl}}/api/v1/checkout/sessions/{{sessionId}}/shipping` | No separate auth | `{shipping_address:{full_name,line1,city,postal_code,country_code?,…},shipping_method?:{code,name,amount?,estimated_days?}}` | 200 `{data: session}` | Mutates checkpoint; prior session required. Use fictitious local-only test address. |
| submitPayment | POST `/api/v1/checkout/sessions/{sessionId}/payment` (alias without prefix) | `{{baseUrl}}/api/v1/checkout/sessions/{{sessionId}}/payment` | No separate auth | `{method_type?:"CARD"\|"FINANCING"\|"WALLET"\|"TEST"}`; default `TEST`. | 200 `{data: session}` | Mutates session/payment intent; uses the test payment adapter. Never submit real card details. |
| submitConfirm | POST `/api/v1/checkout/sessions/{sessionId}/confirm` (alias without prefix) | `{{baseUrl}}/api/v1/checkout/sessions/{{sessionId}}/confirm` | No separate auth | `{idempotency_key:string,customer_note?:string}` | 200 `{data: session}` | Mutates checkpoint/reservation state; requires prior shipping/payment checkpoints. |
| placeOrder | POST `/api/v1/orders` (alias POST `/orders`) | `{{baseUrl}}/api/v1/orders` | No separate auth | `{checkout_session_id:string,idempotency_key:string,customer_note?:string,billing_address?:address}` | 201 `{data: order}` | Creates order and immutable snapshots; requires completed checkout. Controlled test data only. |
| getOrder | GET `/api/v1/orders/{orderId}` (alias without prefix) | `{{baseUrl}}/api/v1/orders/{{orderId}}` | No separate auth | Path `orderId`. | 200 `{data: order}` | Read-only, but order data may contain PII; existing order required. |
| getOrderTimeline | GET `/api/v1/orders/{orderId}/events` and `/timeline` (both also without prefix) | `{{baseUrl}}/api/v1/orders/{{orderId}}/events` | No separate auth | Path `orderId`; `/timeline` is an additional alias. | 200 `{data:[event…]}` | Read-only, potentially sensitive; existing order required. |
| cancelOrder | POST `/api/v1/orders/{orderId}/cancel` (alias without prefix) | `{{baseUrl}}/api/v1/orders/{{orderId}}/cancel` | No separate auth | `{reason?:string}`; default reason is `Cancelled by customer`. | 200 `{data: order}` | Changes order state. Do not call outside a disposable local test order. |
| handlePaymentWebhook | POST `/api/v1/webhooks/payments/{provider}` (alias without prefix) | `{{baseUrl}}/api/v1/webhooks/payments/TEST` | HMAC signature required (`x-maihan-signature`, `x-webhook-signature`, or `stripe-signature`); current adapter is `TEST` | Raw JSON payload; valid HMAC is over the exact raw bytes. Optional `created_at` must be within 300 seconds. | 200 `{status:"processed"\|"unreconciled"\|"duplicate",…}`; invalid signature 401 | Reconciles webhook and can change payment/order state. Test adapter only; use the signing procedure below and an isolated DB. |
| sweepInventoryReservations | POST `/api/v1/inventory/sweep-expired` (alias without prefix) | `{{baseUrl}}/api/v1/inventory/sweep-expired` | No auth/role check | No body. | 200 `{data:{count,released}}` | Releases expired reservations; operational mutation. Local disposable DB only. |

### Account and customer addresses — 8 operations

All `/api/v1/account/*` routes also have the same unprefixed `/account/*` alias. Despite the handler's “Authentication required” message, `x-customer-id` / `customer_id` is **not authenticated** by middleware.

| ID | Method / path | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| getProfile | GET `/api/v1/account/profile` | `{{baseUrl}}/api/v1/account/profile` | Requires `x-customer-id` or `?customer_id=`; no actual authentication | No body. | 200 `{data:profile}`; absent ID 401 | Reads profile; customer row required. PII, local only. |
| updateProfile | PATCH `/api/v1/account/profile` | `{{baseUrl}}/api/v1/account/profile` | Same asserted customer ID | Partial `{first_name?,last_name?,phone?,preferred_currency?,birth_date?,birth_place?,zodiac_sign?,ring_size?}` | 200 `{data:profile}` | Writes profile/PII. Local only. |
| getAddresses | GET `/api/v1/account/addresses` | `{{baseUrl}}/api/v1/account/addresses` | Same asserted customer ID | No body. | 200 `{data:[address…]}` | Reads customer addresses/PII. |
| createAddress | POST `/api/v1/account/addresses` | `{{baseUrl}}/api/v1/account/addresses` | Same asserted customer ID | `{kind?:"SHIPPING"\|"BILLING"\|"SHOWROOM"\|"PICKUP",full_name,line1,city,postal_code,country_code?:"US",recipient?,line2?,line3?,region?,phone?,is_default?}` | 201 `{data:address}` | Creates address/PII. Local only. |
| updateAddress | PATCH `/api/v1/account/addresses/{addressId}` | `{{baseUrl}}/api/v1/account/addresses/{{addressId}}` | Same asserted customer ID; repository scopes by customer | Partial address body. | 200 `{data:address}` | Writes address/PII. |
| deleteAddress | DELETE `/api/v1/account/addresses/{addressId}` | `{{baseUrl}}/api/v1/account/addresses/{{addressId}}` | Same asserted customer ID; repository scopes by customer | No body. | 200 `{success:true}` | Deletes address; local disposable record only. |
| getOrders | GET `/api/v1/account/orders` | `{{baseUrl}}/api/v1/account/orders` | Same asserted customer ID | No body. | 200 `{data:{orders,total_count}}` | Reads customer order history/PII. |
| getCustomerOrderDetail | GET `/api/v1/account/orders/{orderId}` | `{{baseUrl}}/api/v1/account/orders/{{orderId}}` | Same asserted customer ID; repository scopes by customer | Path `orderId`. | 200 `{data:order}` | Reads customer order/PII. |

### Favorites, compare, and add-ons — 7 operations

| ID | Method / path (alias) | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| getFavorites | GET `/api/v1/favorites` (alias `/favorites`) | `{{baseUrl}}/api/v1/favorites` | `x-customer-id` or `customer_id`; asserted ID only | None. | 200 `{data:[favorite…]}` | Reads customer-linked data; local only. |
| addFavorite | POST `/api/v1/favorites` (alias `/favorites`) | `{{baseUrl}}/api/v1/favorites` | Same asserted customer ID | `{product_id:uuid}` | 201 `{data:[favorite…]}` | Writes favorite; requires existing product and customer. |
| removeFavorite | DELETE `/api/v1/favorites/{productId}` (alias without prefix) | `{{baseUrl}}/api/v1/favorites/{{productId}}` | Same asserted customer ID | Path `productId`. | 200 `{data:[favorite…]}` | Deletes favorite for this customer. |
| getCompare | GET `/api/v1/compare`, `/compare`, or `/compare-list` | `{{baseUrl}}/api/v1/compare?ids={{productId}},{{secondProductId}}` | None | `ids` comma-separated **or** repeated `id`; handler requires 2–4 IDs. | 200 `{data:{products,attributes}}` | Read-only; products should exist for a meaningful result. |
| listAddons | GET `/api/v1/addons` (alias `/addons`) | `{{baseUrl}}/api/v1/addons?product_id={{productId}}&addon_type=FINANCING` | None | Optional `product_id` UUID, `addon_type` string. | 200 `{data:[addon…]}` | Read-only DB query. |
| getAddon | GET `/api/v1/addons/{addonId}` (alias without prefix) | `{{baseUrl}}/api/v1/addons/{{addonId}}` | None | Path `addonId`. | 200 `{data:addon}` | Read-only; existing add-on required. |
| attachAddon | POST `/api/v1/orders/{orderId}/addons` (alias without prefix) | `{{baseUrl}}/api/v1/orders/{{orderId}}/addons` | No auth/role check | `{addon_id:uuid,target_product_id?:uuid}` | 201 `{data:{order,addon_item_id}}` | Mutates order; existing mutable order/add-on required. Local only. |

### Discounts and refunds — 7 operations

| ID | Method / path (alias) | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| validateDiscountEndpoint | POST `/api/v1/discounts/validate` (alias `/discounts/validate`) | `{{baseUrl}}/api/v1/discounts/validate` | None | `{code:string,subtotal:number≥0,customer_id?:uuid,shipping_total?:number≥0,items?:[{product_id?,variety?,line_total?}]}` | 200 `{data:{valid,discount,discount_amount,final_subtotal}}` | Reads discount rules; existing code/customer optional. |
| getDiscountEndpoint | GET `/api/v1/discounts/{code}` (alias without prefix) | `{{baseUrl}}/api/v1/discounts/{{discountCode}}` | None | Path `code`. | 200 `{data:discount}` | Read-only; known code required. |
| requestRefundHandler | POST `/api/v1/orders/{orderId}/refunds` (alias without prefix) | `{{baseUrl}}/api/v1/orders/{{orderId}}/refunds` | No auth/role check | `{amount:number>0,reason:string}` | 201 `{data:refund}` | Creates refund request; existing paid order required. Local only. |
| listOrderRefundsHandler | GET `/api/v1/orders/{orderId}/refunds` (alias without prefix) | `{{baseUrl}}/api/v1/orders/{{orderId}}/refunds` | No auth/role check | Path `orderId`. | 200 `{data:[refund…]}` | Reads refund data; existing order required. |
| approveRefundHandler | POST `/api/v1/refunds/{refundId}/approve` (alias without prefix) | `{{baseUrl}}/api/v1/refunds/{{refundId}}/approve` | **No admin/role check implemented** | `{approved_by?:uuid}` | 200 `{data:refund}` | Privileged state mutation, local-only. |
| rejectRefundHandler | POST `/api/v1/refunds/{refundId}/reject` (alias without prefix) | `{{baseUrl}}/api/v1/refunds/{{refundId}}/reject` | **No admin/role check implemented** | `{reason?:string}` | 200 `{data:refund}` | Privileged state mutation, local-only. |
| executeRefundHandler | POST `/api/v1/refunds/{refundId}/execute` (alias without prefix) | `{{baseUrl}}/api/v1/refunds/{{refundId}}/execute` | **No admin/role check implemented** | No body. | 200 `{data:refund}` | Calls the test payment adapter and writes state. Never use as a live refund API. |

### Design Your Own — 6 operations

Each path except `compatible-settings` has an unprefixed alias. These handlers do not use one shared Zod request schema; several values are cast in the handler and DB constraints provide further validation.

| ID | Method / path | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| createDyoConfigurationHandler | POST `/api/v1/dyo/configurations` | `{{baseUrl}}/api/v1/dyo/configurations` | None | Handler reads `jewelleryType` (default `RING`), `settingVariantSku` (default `JS1150W14`, must parse as SETTING), optional `gemRef`, `options`, `shortCode`, `settingId`, `settingVariantId`, `gemstoneId`, `gemstonePairId`, `engravingText`, `sessionId`. | 201 `{data:{configuration:row}}` | Writes DYO config. Use existing compatible records; no sample record is asserted to exist. |
| getDyoConfigurationHandler | GET `/api/v1/dyo/configurations/{shortCode}` | `{{baseUrl}}/api/v1/dyo/configurations/{{shortCode}}` | Possession of short code only | Path `shortCode`. | 200 `{data:{configuration}}`; 404 missing | Read-only; requires prior create. |
| validateDyoConfigurationHandler | POST `/api/v1/dyo/configurations/{shortCode}/validate` | `{{baseUrl}}/api/v1/dyo/configurations/{{shortCode}}/validate` | None | No body. | 200 `{data:{configuration}}` | Mutates validation state; prior configuration and valid referenced records required. |
| quoteDyoConfigurationHandler | POST `/api/v1/dyo/configurations/{shortCode}/quote` | `{{baseUrl}}/api/v1/dyo/configurations/{{shortCode}}/quote` | None | No body. | 200 `{data:{priceSnapshot,quoteToken}}` | Writes price quote/state; needs valid/priced components. |
| getCompatibleSettingsHandler | GET `/api/v1/dyo/configurations/{shortCode}/compatible-settings` | `{{baseUrl}}/api/v1/dyo/configurations/{{shortCode}}/compatible-settings` | None | Path `shortCode`. | 200 `{data:{compatibleSettings:[]}}` | Read-only; prior config required. Empty when it has no stone. |
| addDyoToCartHandler | POST `/api/v1/dyo/configurations/{shortCode}/add-to-cart` | `{{baseUrl}}/api/v1/dyo/configurations/{{shortCode}}/add-to-cart` | No auth | `{cartToken:string}` | 200 `{data:{cart,configurationId,state:"ADDED_TO_CART"}}` | Mutates cart/config. Requires PRICED, compatible config and cart; handler has a fallback product ID if no active product is found—do not test except on isolated local DB. |

### Certificates — 5 operations

All certificate routes except the public gemstone certificate read have unprefixed aliases. There is no HTTP reviewer-role check in these handlers.

| ID | Method / path | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| createCertificateHandler | POST `/api/v1/certificates` | `{{baseUrl}}/api/v1/certificates` | None (owner/admin check absent) | Handler reads `kind` (default `CERTIFICATE`), optional `gemstoneId`, `configurationId`, `productId`, `sourceUrl`. No presign DTO. | 201 `{data:{certificate,upload_url}}` | Writes unverified certificate; requires a valid related record where schema constraints require it. Returned URL is constructed placeholder, not verified storage integration. |
| getCertificateHandler | GET `/api/v1/certificates/{certificateId}` | `{{baseUrl}}/api/v1/certificates/{{certificateId}}` | None (owner/admin check absent) | Path `certificateId`. | 200 `{data:{certificate}}`; 404 | Read-only; existing certificate required; potentially sensitive. |
| processOcrRunHandler | POST `/api/v1/certificates/{certificateId}/ocr` | `{{baseUrl}}/api/v1/certificates/{{certificateId}}/ocr` | None (admin check absent) | Requires `extraction` with `lab_name`, `report_type`, `certificate_number`, `issue_date`, `stone.weight_ct/length_mm/width_mm/depth_mm`, `treatments[]`, `origin`; each extracted field has `{value,confidence}`. Optional `runId`, `modelProvider`, `modelName`, `modelVersion`, `promptVersion`, `structuredGemstone` (default `{stoneCount:1}`). | 200 `{data:{certificateId,runId,status,anomalies,requiresHumanReview}}` | Persists caller-supplied extraction and audit records; it does not invoke OCR. Local test records only. |
| reviewCertificateHandler | POST `/api/v1/certificates/{certificateId}/review` | `{{baseUrl}}/api/v1/certificates/{{certificateId}}/review` | **No reviewer-role check implemented**; body `reviewerId` is not authentication | `decision:"REJECT"` plus optional `notes`, or `decision:"APPROVE"` plus required `extraction`, optional `fieldsOverridden`; `reviewerId` required. | 200 `{data:{certificateId,status,…}}`; 422 when approval confidence threshold fails | Writes trust-bearing verification/audit state. Never mark live data VERIFIED through an unauthenticated handler; use isolated fixtures only. |
| getPublicGemstoneCertificatesHandler | GET `/api/v1/gemstones/{gemRef}/certificates/public` | `{{baseUrl}}/api/v1/gemstones/{{gemRef}}/certificates/public` | Public | Path `gemRef`. | 200 `{data:{gemRef,certificates,notice}}` | Read-only public view; requires gemstone; view filters certificate fields per INV-07. |

### AI Concierge — 3 operations

The two non-catalog routes with `/api/v1/ai` also have unprefixed aliases.

| ID | Method / path | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| aiChatHandler | POST `/api/v1/ai/chat` | `{{baseUrl}}/api/v1/ai/chat` | None | `{message:string,conversationKey?:string,surface?:"chat_panel"\|…,customerId?:string,stream?:boolean}`. `stream:true` selects SSE. | 200 JSON `{data:{conversationKey,response,citations,groundedRatio,toolCalls,handoff}}`; SSE frames: `start`, zero or more `tool_call` and `citation`, `content_delta`, `grounding`, optional `handoff`, then `done`; runtime errors emit `error`. | Both modes create/find a conversation row. JSON mode also persists messages and interaction telemetry; streaming currently does **not** persist messages or interaction telemetry. Provider gateway currently simulates a response by default. A real model may incur provider cost if substituted/configured. |
| aiHandoffHandler | POST `/api/v1/ai/handoff` | `{{baseUrl}}/api/v1/ai/handoff` | None | `{conversationKey:string,reason?:string,summary?:string}` | 200 `{data:{conversationKey,state:"AWAITING_HUMAN",reason,specialistNotice}}` | Writes conversation state; generated notice does not prove a specialist assignment. Prior conversation optional (handler creates one). |
| aiGetConversationHandler | GET `/api/v1/ai/conversations/{conversationKey}` | `{{baseUrl}}/api/v1/ai/conversations/{{conversationKey}}` | Possession of key only; no ownership check | Path `conversationKey`. | 200 `{data:{conversation}}`; 404 missing | Read-only but can expose conversation/customer data. Use disposable local conversation. |

### WhatsApp — 3 operations

Both webhook paths and outbound send paths have unprefixed aliases. POST webhook signatures are calculated over the **raw request body before JSON parsing**.

| ID | Method / path | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| whatsappVerificationHandler | GET `/api/v1/webhooks/whatsapp` | `{{baseUrl}}/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token={{waVerifyToken}}&hub.challenge=LOCAL_TEST_CHALLENGE` | Meta verification token in query, compared to `WHATSAPP_VERIFY_TOKEN` or the unsafe fixed development fallback | Required query keys `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`. | 200 plain-text challenge; 403 if invalid | No data write. Never configure the fixed fallback in an exposed environment. |
| whatsappWebhookHandler | POST `/api/v1/webhooks/whatsapp` | `{{baseUrl}}/api/v1/webhooks/whatsapp` | `X-Hub-Signature-256: sha256=<HMAC-SHA256(raw body)>`; secret is `WHATSAPP_APP_SECRET` | Provider JSON with `entry[0].changes[0].value.messages[0]`; message requires `from`, `id`, and optionally `text.body`, `timestamp`. | 200 acknowledgement/status, duplicate response, or success with `conversationKey`, chunks and capabilities; invalid signature 401 | Writes receipt/conversation/messages, invokes AI; may incur external cost if live provider replaces current simulated gateway. Duplicate `id` is idempotently ignored. Local-only fixture. |
| whatsappSendTemplateHandler | POST `/api/v1/whatsapp/send-template` | `{{baseUrl}}/api/v1/whatsapp/send-template` | No auth; marketing path checks opt-in only | `{recipientPhone:string,templateName:string,isMarketing?:boolean}` | 200 `{status:"queued",recipientPhone,templateName,providerMessageId}`; 403 if marketing not opted in | Current handler is a simulated response and does not send a WhatsApp message. Never test with customer PII or treat its fake provider ID as delivery. |

### WebAR / AR handoff — 3 operations

Create/redeem routes also have unprefixed aliases; asset lookup has both forms.

| ID | Method / path | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| getWebarAssetHandler | GET `/api/v1/webar/{assetId}` (alias without prefix) | `{{baseUrl}}/api/v1/webar/{{webarAssetId}}` | Public | Path `assetId` (repository key; existing READY asset needed for usable model). | 200 `{data:asset}`; 404 missing | Read-only; returns CDN/storage metadata. |
| createArHandoffHandler | POST `/api/v1/ar/handoff` (alias `/ar/handoff`) | `{{baseUrl}}/api/v1/ar/handoff` | None | `{webarAssetId:uuid,productId?:uuid}` | 201 `{data:{rawToken,handoffUrl,expiresAt}}` | Writes one-time token; requires existing asset and expires after 10 minutes. Raw token is sensitive; do not log/share. |
| redeemArHandoffHandler | GET `/api/v1/ar/handoff/{token}` (alias without prefix) | `{{baseUrl}}/api/v1/ar/handoff/{{arHandoffToken}}` | Possession of one-time token | Path `token`. | 200 `{data:{webarAssetId,productId,cdnUrl,jewelleryType,fitRule}}`; invalid/expired 404; replay conflict | Mutates token consumption; successful redemption is single-use. Never put a production token in Postman or logs. |

### Health, readiness, metrics — 3 operations

| ID | Method / path (alias) | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| healthLiveHandler | GET `/api/v1/health/live` (alias `/health/live`) | `{{baseUrl}}/api/v1/health/live` | Public | None. | 200 `{status:"HEALTHY",timestamp,uptimeSeconds,version,components:{process:{status:"UP",latencyMs}}}` | Process-only read; safe. `health.spec.ts`. |
| healthReadyHandler | GET `/api/v1/health/ready` (alias `/health/ready`) | `{{baseUrl}}/api/v1/health/ready` | Public | None. | 200 healthy or 503 unhealthy with component states | Checks DB and memory; read-only `SELECT 1` intended. Requires local DB. The handler exposes a database error message in the component body; do not expose this endpoint publicly without review. |
| metricsHandler | GET `/api/v1/health/metrics` (alias `/metrics`) | `{{baseUrl}}/api/v1/health/metrics` | Public | None. | 200 plain text, Prometheus-style samples | Reads process-local registry. Operational data; do not expose publicly without review. |

### SEO sitemap handlers — 2 Next.js routes (not in API router)

| ID | Method / path | Full URL | Auth / authorization | Query or body | Success response | Dependencies, effects, test safety, evidence |
|---|---|---|---|---|---|---|
| sitemapIndex | GET `/sitemap.xml` | `{{webBaseUrl}}/sitemap.xml` | Public | None. | 200 `application/xml` sitemap index; DB errors can fail request. | Read-only canonical catalogue paths, edge-cache headers. Runs on Next.js server, not API server. |
| sitemapShard | GET `/sitemap-products/{shard}.xml` | `{{webBaseUrl}}/sitemap-products/{{shard}}.xml` (shard includes `.xml`, e.g. `1.xml`) | Public | Shard must match `N.xml`, 1-based and within generated range. | 200 `application/xml`; 404 invalid/out-of-range shard. | Read-only, DB-dependent. `/sitemap-products/{shard}` without `.xml` is not canonical and returns 404. |

## PowerShell cURL commands (canonical `/api/v1` paths)

These use `curl.exe` so Windows PowerShell does not resolve `curl` to the legacy web-request alias. Substitute only with local test record IDs from your own disposable database. The same JSON bodies work in Bash; use the Bash base variable form where shown.

### Safe read-only smoke calls

```powershell
curl.exe --include --request GET "$BaseUrl/api/v1/health/live" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/health/ready" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/health/metrics" --header "Accept: text/plain; version=0.0.4"
curl.exe --include --request GET "$BaseUrl/api/v1/taxonomy/metals" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/products?limit=10&sort=price&direction=asc" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/settings?jewellery_type=RING&limit=10" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/taxonomy/facets" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/search/suggest?q=sapp&limit=5" --header "Accept: application/json"
```

### Catalog, search, and WebAR reads

```powershell
curl.exe --include --request GET "$BaseUrl/api/v1/products/$env:PRODUCT_SLUG" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/gemstones/$env:GEM_REF" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/settings/$env:SETTING_SKU" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/settings/designs/$env:DESIGN_CODE" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/taxonomy/varieties" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/taxonomy/colors" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/taxonomy/origins" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/search/similar-gemstones/$env:GEM_REF?limit=6" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/search" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"query":"sapphire","filters":{},"semantic":false,"limit":10,"sort":"relevance","direction":"asc"}'
curl.exe --include --request GET "$BaseUrl/api/v1/webar/$env:WEBAR_ASSET_ID" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/gemstones/$env:GEM_REF/certificates/public" --header "Accept: application/json"
```

The canonical cURL commands above cover the route handlers. Because the unprefixed aliases are separately registered HTTP routes, the next section also gives a direct cURL command for each alias. Alias requests invoke the same handler and have the same request/response behavior as their `/api/v1` counterpart.

### Cart and checkout workflow (controlled writes; test DB only)

Save the returned `cart_token`, cart item `id`, checkout session `id`, and later order `id` into the corresponding environment variables before the next call. Use a product that is active and available in the local database.

```powershell
curl.exe --include --request POST "$BaseUrl/api/v1/carts" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{}'
curl.exe --include --request GET "$BaseUrl/api/v1/carts/$env:CART_TOKEN" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/carts/$env:CART_TOKEN/items" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"product_id":"REPLACE_WITH_ACTIVE_TEST_PRODUCT_UUID","quantity":1}'
curl.exe --include --request PATCH "$BaseUrl/api/v1/carts/$env:CART_TOKEN/items/$env:CART_ITEM_ID" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"quantity":2}'
curl.exe --include --request DELETE "$BaseUrl/api/v1/carts/$env:CART_TOKEN/items/$env:CART_ITEM_ID" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/carts/$env:CART_TOKEN/merge" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"guest_cart_token":"REPLACE_WITH_SECOND_TEST_CART_TOKEN"}'
curl.exe --include --request POST "$BaseUrl/api/v1/checkout/sessions" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"cart_token":"REPLACE_WITH_TEST_CART_TOKEN","email":"buyer@example.invalid"}'
curl.exe --include --request GET "$BaseUrl/api/v1/checkout/sessions/$env:CHECKOUT_SESSION_ID" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/checkout/sessions/$env:CHECKOUT_SESSION_ID/shipping" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"shipping_address":{"full_name":"Local Test","line1":"1 Test Street","city":"Test City","postal_code":"00000","country_code":"US"},"shipping_method":{"code":"LOCAL_TEST","name":"Local test","amount":"0.00"}}'
curl.exe --include --request POST "$BaseUrl/api/v1/checkout/sessions/$env:CHECKOUT_SESSION_ID/payment" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"method_type":"TEST"}'
curl.exe --include --request POST "$BaseUrl/api/v1/checkout/sessions/$env:CHECKOUT_SESSION_ID/confirm" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"idempotency_key":"REPLACE_WITH_UNIQUE_LOCAL_TEST_KEY","customer_note":"Local API test"}'
curl.exe --include --request POST "$BaseUrl/api/v1/orders" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"checkout_session_id":"REPLACE_WITH_COMPLETED_TEST_SESSION_ID","idempotency_key":"REPLACE_WITH_UNIQUE_LOCAL_TEST_KEY"}'
curl.exe --include --request GET "$BaseUrl/api/v1/orders/$env:ORDER_ID" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/orders/$env:ORDER_ID/events" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/orders/$env:ORDER_ID/timeline" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/orders/$env:ORDER_ID/cancel" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"reason":"Local test cleanup"}'
```

The test payment path does not contact a live processor. It still changes DB/order state. The guide intentionally does not provide cleanup SQL; use only an isolated disposable DB and the project's approved local fixture/cleanup workflow.

### Account, favorites, comparison, add-ons, and discounts

For account and favorites calls set `CUSTOMER_ID` to a disposable local customer UUID. This is the current handler's required identifier header, **not a valid login credential**.

```powershell
curl.exe --include --request GET "$BaseUrl/api/v1/account/profile" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
curl.exe --include --request PATCH "$BaseUrl/api/v1/account/profile" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-customer-id: $env:CUSTOMER_ID" --data-raw '{"first_name":"Local Test"}'
curl.exe --include --request GET "$BaseUrl/api/v1/account/addresses" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
curl.exe --include --request POST "$BaseUrl/api/v1/account/addresses" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-customer-id: $env:CUSTOMER_ID" --data-raw '{"kind":"SHIPPING","full_name":"Local Test","line1":"1 Test Street","city":"Test City","postal_code":"00000","country_code":"US"}'
curl.exe --include --request PATCH "$BaseUrl/api/v1/account/addresses/$env:ADDRESS_ID" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-customer-id: $env:CUSTOMER_ID" --data-raw '{"is_default":false}'
curl.exe --include --request DELETE "$BaseUrl/api/v1/account/addresses/$env:ADDRESS_ID" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
curl.exe --include --request GET "$BaseUrl/api/v1/account/orders" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
curl.exe --include --request GET "$BaseUrl/api/v1/account/orders/$env:ORDER_ID" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
curl.exe --include --request GET "$BaseUrl/api/v1/favorites" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
curl.exe --include --request POST "$BaseUrl/api/v1/favorites" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-customer-id: $env:CUSTOMER_ID" --data-raw '{"product_id":"REPLACE_WITH_ACTIVE_TEST_PRODUCT_UUID"}'
curl.exe --include --request DELETE "$BaseUrl/api/v1/favorites/REPLACE_WITH_TEST_PRODUCT_UUID" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
curl.exe --include --request GET "$BaseUrl/api/v1/compare?ids=REPLACE_WITH_TEST_PRODUCT_UUID,REPLACE_WITH_SECOND_TEST_PRODUCT_UUID" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/addons?product_id=REPLACE_WITH_TEST_PRODUCT_UUID&addon_type=FINANCING" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/addons/REPLACE_WITH_TEST_ADDON_UUID" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/orders/$env:ORDER_ID/addons" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"addon_id":"REPLACE_WITH_TEST_ADDON_UUID","target_product_id":"REPLACE_WITH_TEST_PRODUCT_UUID"}'
curl.exe --include --request POST "$BaseUrl/api/v1/discounts/validate" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"code":"REPLACE_WITH_LOCAL_TEST_CODE","subtotal":100.00}'
curl.exe --include --request GET "$BaseUrl/api/v1/discounts/REPLACE_WITH_LOCAL_TEST_CODE" --header "Accept: application/json"
```

### Refunds, certificates, DYO, AI, webhooks, and AR

The following commands are state-changing or depend on secrets/records. They are for manual local-only testing; do not bulk-run them or point them at production. Examples with a `REPLACE_…` value require a real local fixture; no such record is asserted to exist.

```powershell
# Refund endpoints: approval/rejection/execution are privileged operations in intent,
# but the current handlers have no role check. execute uses the TEST payment provider.
curl.exe --include --request POST "$BaseUrl/api/v1/orders/$env:ORDER_ID/refunds" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"amount":1.00,"reason":"Local test only"}'
curl.exe --include --request GET "$BaseUrl/api/v1/orders/$env:ORDER_ID/refunds" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/refunds/$env:REFUND_ID/approve" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"approved_by":"REPLACE_WITH_TEST_REVIEWER_UUID"}'
curl.exe --include --request POST "$BaseUrl/api/v1/refunds/$env:REFUND_ID/reject" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"reason":"Local fixture test"}'
curl.exe --include --request POST "$BaseUrl/api/v1/refunds/$env:REFUND_ID/execute" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/inventory/sweep-expired" --header "Accept: application/json"

# DYO config: use setting/gemstone IDs that exist in the local dev database.
curl.exe --include --request POST "$BaseUrl/api/v1/dyo/configurations" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"jewelleryType":"RING","settingVariantSku":"REPLACE_WITH_EXISTING_SETTING_SKU","shortCode":"local-test-code","settingVariantId":"REPLACE_WITH_SETTING_VARIANT_UUID","gemstoneId":"REPLACE_WITH_COMPATIBLE_GEMSTONE_UUID","options":{}}'
curl.exe --include --request GET "$BaseUrl/api/v1/dyo/configurations/$env:DYO_SHORT_CODE" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/dyo/configurations/$env:DYO_SHORT_CODE/validate" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/dyo/configurations/$env:DYO_SHORT_CODE/quote" --header "Accept: application/json"
curl.exe --include --request GET "$BaseUrl/api/v1/dyo/configurations/$env:DYO_SHORT_CODE/compatible-settings" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/dyo/configurations/$env:DYO_SHORT_CODE/add-to-cart" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"cartToken":"REPLACE_WITH_LOCAL_TEST_CART_TOKEN"}'

# Certificate records: the OCR route records the supplied extraction; it does not run OCR.
curl.exe --include --request POST "$BaseUrl/api/v1/certificates" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"kind":"CERTIFICATE","gemstoneId":"REPLACE_WITH_LOCAL_TEST_GEMSTONE_UUID"}'
curl.exe --include --request GET "$BaseUrl/api/v1/certificates/$env:CERTIFICATE_ID" --header "Accept: application/json"
curl.exe --include --request POST "$BaseUrl/api/v1/certificates/$env:CERTIFICATE_ID/ocr" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"runId":"REPLACE_WITH_UNIQUE_LOCAL_RUN_ID","extraction":{"lab_name":{"value":"GIA","confidence":0.95},"report_type":{"value":"GEM_REPORT","confidence":0.92},"certificate_number":{"value":"LOCAL-TEST-REPORT","confidence":0.96},"issue_date":{"value":"2026-01-15","confidence":0.91},"stone":{"weight_ct":{"value":3.42,"confidence":0.98},"length_mm":{"value":9.8,"confidence":0.94},"width_mm":{"value":7.9,"confidence":0.94},"depth_mm":{"value":5.2,"confidence":0.93}},"treatments":[{"value":"NO_ENHANCEMENT","confidence":0.95}],"origin":{"value":"Sri Lanka","confidence":0.92}},"structuredGemstone":{"stoneCount":1}}'
curl.exe --include --request POST "$BaseUrl/api/v1/certificates/$env:CERTIFICATE_ID/review" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"reviewerId":"REPLACE_WITH_LOCAL_TEST_REVIEWER_UUID","decision":"REJECT","notes":"Local fixture test only"}'

# AI endpoints: simulated default model; JSON chat writes a conversation.
curl.exe --include --request POST "$BaseUrl/api/v1/ai/chat" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"message":"Explain gemstone provenance using verified catalog data.","conversationKey":"REPLACE_WITH_UNIQUE_LOCAL_CONVERSATION_KEY"}'
curl.exe --include --request POST "$BaseUrl/api/v1/ai/chat" --header "Accept: text/event-stream" --header "Content-Type: application/json" --data-raw '{"message":"Explain gemstone provenance.","conversationKey":"REPLACE_WITH_UNIQUE_LOCAL_STREAM_KEY","stream":true}'
curl.exe --include --request POST "$BaseUrl/api/v1/ai/handoff" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"conversationKey":"REPLACE_WITH_EXISTING_LOCAL_CONVERSATION_KEY","reason":"CUSTOMER_REQUEST","summary":"Local-only test"}'
curl.exe --include --request GET "$BaseUrl/api/v1/ai/conversations/$env:CONVERSATION_KEY" --header "Accept: application/json"

# Meta verification and signed WhatsApp fixture. Set WHATSAPP_APP_SECRET in the
# server environment and $env:WHATSAPP_APP_SECRET in this PowerShell session to
# the same development-only secret; never echo or commit it.
curl.exe --include --request GET "$BaseUrl/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=$env:WHATSAPP_VERIFY_TOKEN&hub.challenge=LOCAL_TEST_CHALLENGE" --header "Accept: text/plain"
$WaBody = '{"object":"whatsapp_business_account","entry":[{"id":"LOCAL_TEST_ACCOUNT","changes":[{"value":{"messages":[{"from":"REPLACE_WITH_TEST_PHONE","id":"REPLACE_WITH_UNIQUE_TEST_MESSAGE_ID","timestamp":"REPLACE_WITH_CURRENT_EPOCH_SECONDS","type":"text","text":{"body":"Local API test"}}]},"field":"messages"}]}]}'
$WaSignature = node -e "process.stdout.write('sha256=' + require('node:crypto').createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(process.argv[1]).digest('hex'))" "$WaBody"
curl.exe --include --request POST "$BaseUrl/api/v1/webhooks/whatsapp" --header "Accept: application/json" --header "Content-Type: application/json" --header "X-Hub-Signature-256: $WaSignature" --data-raw $WaBody
# Outbound implementation is a simulated queue response; never use a real phone.
curl.exe --include --request POST "$BaseUrl/api/v1/whatsapp/send-template" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"recipientPhone":"REPLACE_WITH_LOCAL_TEST_PHONE","templateName":"local_test_template","isMarketing":false}'

# AR: create using a local asset, save rawToken securely, redeem once only.
curl.exe --include --request POST "$BaseUrl/api/v1/ar/handoff" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"webarAssetId":"REPLACE_WITH_EXISTING_LOCAL_WEBAR_ASSET_UUID"}'
curl.exe --include --request GET "$BaseUrl/api/v1/ar/handoff/$env:AR_HANDOFF_TOKEN" --header "Accept: application/json"
```

#### Payment webhook signer without exposing a key

The handler uses `TestPaymentProvider` and its in-code test secret; it does not currently read a payment webhook secret from runtime config. For an isolated local test only, after building the web package, calculate the signature through that same adapter without printing the key:

```powershell
$PaymentBody = '{"id":"REPLACE_WITH_UNIQUE_EVENT_ID","type":"payment.captured","created_at":"REPLACE_WITH_CURRENT_ISO_TIMESTAMP","order_id":"REPLACE_WITH_LOCAL_TEST_ORDER_UUID","provider_payment_id":"REPLACE_WITH_TEST_PAYMENT_ID","amount":"1.00","currency":"USD"}'
$PaymentSignature = node --input-type=module -e "import { TestPaymentProvider } from './apps/web/dist/integrations/payment/test-payment-provider.js'; process.stdout.write(new TestPaymentProvider().signWebhookPayload(process.argv[1] ?? ''))" "$PaymentBody"
curl.exe --include --request POST "$BaseUrl/api/v1/webhooks/payments/TEST" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-maihan-signature: $PaymentSignature" --data-raw $PaymentBody
```

`created_at` must be current to within five minutes. A valid signature does **not** make the webhook read-only: it can reconcile state. Use a unique event ID and disposable local order.

### Unprefixed route aliases — direct cURL calls

Each command below targets one of the 66 separately registered unprefixed routes. These aliases run the same handler as the matching `/api/v1` route; they do not change its authentication, validation, side effects, or response. Set `$BaseUrl` and the environment variables as described above. Replace any `REPLACE_WITH_...` values with local fixture values. Signed webhook alias calls reuse the local-only signer variables established in the webhook section. Apply the same test-safety warning attached to that endpoint in the inventory.

```powershell
# POST /search
curl.exe --include --request POST "$BaseUrl/search" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"query":"sapphire","filters":{},"semantic":false,"limit":10,"sort":"relevance","direction":"asc"}'
# GET /search/suggest?q=sapp&limit=5
curl.exe --include --request GET "$BaseUrl/search/suggest?q=sapp&limit=5" --header "Accept: application/json"
# GET /search/similar-gemstones/$env:GEM_REF?limit=6
curl.exe --include --request GET "$BaseUrl/search/similar-gemstones/$env:GEM_REF?limit=6" --header "Accept: application/json"
# POST /carts
curl.exe --include --request POST "$BaseUrl/carts" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{}'
# GET /carts/$env:CART_TOKEN
curl.exe --include --request GET "$BaseUrl/carts/$env:CART_TOKEN" --header "Accept: application/json"
# POST /carts/$env:CART_TOKEN/items
curl.exe --include --request POST "$BaseUrl/carts/$env:CART_TOKEN/items" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"product_id":"REPLACE_WITH_PRODUCT_ID","quantity":1}'
# PATCH /carts/$env:CART_TOKEN/items/$env:CART_ITEM_ID
curl.exe --include --request PATCH "$BaseUrl/carts/$env:CART_TOKEN/items/$env:CART_ITEM_ID" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"quantity":2}'
# DELETE /carts/$env:CART_TOKEN/items/$env:CART_ITEM_ID
curl.exe --include --request DELETE "$BaseUrl/carts/$env:CART_TOKEN/items/$env:CART_ITEM_ID" --header "Accept: application/json"
# POST /carts/$env:CART_TOKEN/merge
curl.exe --include --request POST "$BaseUrl/carts/$env:CART_TOKEN/merge" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"guest_cart_token":"REPLACE_WITH_GUEST_CART_TOKEN"}'
# POST /checkout/sessions
curl.exe --include --request POST "$BaseUrl/checkout/sessions" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"cart_token":"REPLACE_WITH_CART_TOKEN","email":"buyer@example.invalid"}'
# GET /checkout/sessions/$env:CHECKOUT_SESSION_ID
curl.exe --include --request GET "$BaseUrl/checkout/sessions/$env:CHECKOUT_SESSION_ID" --header "Accept: application/json"
# POST /checkout/sessions/$env:CHECKOUT_SESSION_ID/shipping
curl.exe --include --request POST "$BaseUrl/checkout/sessions/$env:CHECKOUT_SESSION_ID/shipping" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"shipping_address":{"full_name":"Local Test","line1":"1 Test Street","city":"Test City","postal_code":"00000","country_code":"US"},"shipping_method":{"code":"LOCAL_TEST","name":"Local test","amount":"0.00"}}'
# POST /checkout/sessions/$env:CHECKOUT_SESSION_ID/payment
curl.exe --include --request POST "$BaseUrl/checkout/sessions/$env:CHECKOUT_SESSION_ID/payment" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"method_type":"TEST"}'
# POST /checkout/sessions/$env:CHECKOUT_SESSION_ID/confirm
curl.exe --include --request POST "$BaseUrl/checkout/sessions/$env:CHECKOUT_SESSION_ID/confirm" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"idempotency_key":"REPLACE_WITH_IDEMPOTENCY_KEY","customer_note":"Local test"}'
# POST /orders
curl.exe --include --request POST "$BaseUrl/orders" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"checkout_session_id":"REPLACE_WITH_CHECKOUT_SESSION_ID","idempotency_key":"REPLACE_WITH_IDEMPOTENCY_KEY"}'
# GET /orders/$env:ORDER_ID
curl.exe --include --request GET "$BaseUrl/orders/$env:ORDER_ID" --header "Accept: application/json"
# POST /webhooks/payments/{provider} — use the locally signed payment fixture above.
curl.exe --include --request POST "$BaseUrl/webhooks/payments/TEST" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-maihan-signature: $PaymentSignature" --data-raw $PaymentBody
# POST /inventory/sweep-expired
curl.exe --include --request POST "$BaseUrl/inventory/sweep-expired" --header "Accept: application/json"
# GET /orders/$env:ORDER_ID/events
curl.exe --include --request GET "$BaseUrl/orders/$env:ORDER_ID/events" --header "Accept: application/json"
# GET /orders/$env:ORDER_ID/timeline
curl.exe --include --request GET "$BaseUrl/orders/$env:ORDER_ID/timeline" --header "Accept: application/json"
# POST /orders/$env:ORDER_ID/cancel
curl.exe --include --request POST "$BaseUrl/orders/$env:ORDER_ID/cancel" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"reason":"Local test only"}'
# GET /account/profile
curl.exe --include --request GET "$BaseUrl/account/profile" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
# PATCH /account/profile
curl.exe --include --request PATCH "$BaseUrl/account/profile" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-customer-id: $env:CUSTOMER_ID" --data-raw '{"first_name":"Local Test"}'
# GET /account/addresses
curl.exe --include --request GET "$BaseUrl/account/addresses" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
# POST /account/addresses
curl.exe --include --request POST "$BaseUrl/account/addresses" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-customer-id: $env:CUSTOMER_ID" --data-raw '{"kind":"SHIPPING","full_name":"Local Test","line1":"1 Test Street","city":"Test City","postal_code":"00000","country_code":"US"}'
# PATCH /account/addresses/$env:ADDRESS_ID
curl.exe --include --request PATCH "$BaseUrl/account/addresses/$env:ADDRESS_ID" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-customer-id: $env:CUSTOMER_ID" --data-raw '{"is_default":false}'
# DELETE /account/addresses/$env:ADDRESS_ID
curl.exe --include --request DELETE "$BaseUrl/account/addresses/$env:ADDRESS_ID" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
# GET /account/orders
curl.exe --include --request GET "$BaseUrl/account/orders" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
# GET /account/orders/$env:ORDER_ID
curl.exe --include --request GET "$BaseUrl/account/orders/$env:ORDER_ID" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
# GET /favorites
curl.exe --include --request GET "$BaseUrl/favorites" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
# POST /favorites
curl.exe --include --request POST "$BaseUrl/favorites" --header "Accept: application/json" --header "Content-Type: application/json" --header "x-customer-id: $env:CUSTOMER_ID" --data-raw '{"product_id":"REPLACE_WITH_PRODUCT_ID"}'
# DELETE /favorites/$env:PRODUCT_ID
curl.exe --include --request DELETE "$BaseUrl/favorites/$env:PRODUCT_ID" --header "Accept: application/json" --header "x-customer-id: $env:CUSTOMER_ID"
# GET /compare?ids=$env:PRODUCT_ID,$env:SECOND_PRODUCT_ID
curl.exe --include --request GET "$BaseUrl/compare?ids=$env:PRODUCT_ID,$env:SECOND_PRODUCT_ID" --header "Accept: application/json"
# GET /compare-list?ids=$env:PRODUCT_ID,$env:SECOND_PRODUCT_ID
curl.exe --include --request GET "$BaseUrl/compare-list?ids=$env:PRODUCT_ID,$env:SECOND_PRODUCT_ID" --header "Accept: application/json"
# GET /addons?product_id=$env:PRODUCT_ID&addon_type=FINANCING
curl.exe --include --request GET "$BaseUrl/addons?product_id=$env:PRODUCT_ID&addon_type=FINANCING" --header "Accept: application/json"
# GET /addons/$env:ADDON_ID
curl.exe --include --request GET "$BaseUrl/addons/$env:ADDON_ID" --header "Accept: application/json"
# POST /orders/$env:ORDER_ID/addons
curl.exe --include --request POST "$BaseUrl/orders/$env:ORDER_ID/addons" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"addon_id":"REPLACE_WITH_ADDON_ID","target_product_id":"REPLACE_WITH_PRODUCT_ID"}'
# POST /discounts/validate
curl.exe --include --request POST "$BaseUrl/discounts/validate" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"code":"REPLACE_WITH_DISCOUNT_CODE","subtotal":100.0}'
# GET /discounts/$env:DISCOUNT_CODE
curl.exe --include --request GET "$BaseUrl/discounts/$env:DISCOUNT_CODE" --header "Accept: application/json"
# POST /orders/$env:ORDER_ID/refunds
curl.exe --include --request POST "$BaseUrl/orders/$env:ORDER_ID/refunds" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"amount":1.0,"reason":"Local test only"}'
# GET /orders/$env:ORDER_ID/refunds
curl.exe --include --request GET "$BaseUrl/orders/$env:ORDER_ID/refunds" --header "Accept: application/json"
# POST /refunds/$env:REFUND_ID/approve
curl.exe --include --request POST "$BaseUrl/refunds/$env:REFUND_ID/approve" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"approved_by":"REPLACE_WITH_REVIEWER_ID"}'
# POST /refunds/$env:REFUND_ID/reject
curl.exe --include --request POST "$BaseUrl/refunds/$env:REFUND_ID/reject" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"reason":"Local fixture test"}'
# POST /refunds/$env:REFUND_ID/execute
curl.exe --include --request POST "$BaseUrl/refunds/$env:REFUND_ID/execute" --header "Accept: application/json"
# POST /dyo/configurations
curl.exe --include --request POST "$BaseUrl/dyo/configurations" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"jewelleryType":"RING","settingVariantSku":"REPLACE_WITH_SETTING_SKU","shortCode":"REPLACE_WITH_DYO_SHORT_CODE","settingVariantId":"REPLACE_WITH_SETTING_VARIANT_ID","gemstoneId":"REPLACE_WITH_GEMSTONE_ID","options":{}}'
# GET /dyo/configurations/$env:DYO_SHORT_CODE
curl.exe --include --request GET "$BaseUrl/dyo/configurations/$env:DYO_SHORT_CODE" --header "Accept: application/json"
# POST /dyo/configurations/$env:DYO_SHORT_CODE/validate
curl.exe --include --request POST "$BaseUrl/dyo/configurations/$env:DYO_SHORT_CODE/validate" --header "Accept: application/json"
# POST /dyo/configurations/$env:DYO_SHORT_CODE/quote
curl.exe --include --request POST "$BaseUrl/dyo/configurations/$env:DYO_SHORT_CODE/quote" --header "Accept: application/json"
# POST /dyo/configurations/$env:DYO_SHORT_CODE/add-to-cart
curl.exe --include --request POST "$BaseUrl/dyo/configurations/$env:DYO_SHORT_CODE/add-to-cart" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"cartToken":"REPLACE_WITH_CART_TOKEN"}'
# POST /certificates
curl.exe --include --request POST "$BaseUrl/certificates" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"kind":"CERTIFICATE","gemstoneId":"REPLACE_WITH_GEMSTONE_ID"}'
# GET /certificates/$env:CERTIFICATE_ID
curl.exe --include --request GET "$BaseUrl/certificates/$env:CERTIFICATE_ID" --header "Accept: application/json"
# POST /certificates/$env:CERTIFICATE_ID/ocr
curl.exe --include --request POST "$BaseUrl/certificates/$env:CERTIFICATE_ID/ocr" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"runId":"REPLACE_WITH_OCR_RUN_ID","extraction":{"lab_name":{"value":"GIA","confidence":0.95},"report_type":{"value":"GEM_REPORT","confidence":0.92},"certificate_number":{"value":"LOCAL-TEST-REPORT","confidence":0.96},"issue_date":{"value":"2026-01-15","confidence":0.91},"stone":{"weight_ct":{"value":3.42,"confidence":0.98},"length_mm":{"value":9.8,"confidence":0.94},"width_mm":{"value":7.9,"confidence":0.94},"depth_mm":{"value":5.2,"confidence":0.93}},"treatments":[{"value":"NO_ENHANCEMENT","confidence":0.95}],"origin":{"value":"Sri Lanka","confidence":0.92}},"structuredGemstone":{"stoneCount":1}}'
# POST /certificates/$env:CERTIFICATE_ID/review
curl.exe --include --request POST "$BaseUrl/certificates/$env:CERTIFICATE_ID/review" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"reviewerId":"REPLACE_WITH_REVIEWER_ID","decision":"REJECT","notes":"Local fixture test only"}'
# GET /gemstones/$env:GEM_REF/certificates/public
curl.exe --include --request GET "$BaseUrl/gemstones/$env:GEM_REF/certificates/public" --header "Accept: application/json"
# POST /ai/chat
curl.exe --include --request POST "$BaseUrl/ai/chat" --header "Accept: text/event-stream" --header "Content-Type: application/json" --data-raw '{"message":"Explain gemstone provenance using catalog data.","conversationKey":"REPLACE_WITH_CONVERSATION_KEY"}'
# POST /ai/handoff
curl.exe --include --request POST "$BaseUrl/ai/handoff" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"conversationKey":"REPLACE_WITH_CONVERSATION_KEY","reason":"CUSTOMER_REQUEST","summary":"Local test only"}'
# GET /ai/conversations/$env:CONVERSATION_KEY
curl.exe --include --request GET "$BaseUrl/ai/conversations/$env:CONVERSATION_KEY" --header "Accept: application/json"
# GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=$env:WHATSAPP_VERIFY_TOKEN&hub.challenge=LOCAL_TEST_CHALLENGE
curl.exe --include --request GET "$BaseUrl/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=$env:WHATSAPP_VERIFY_TOKEN&hub.challenge=LOCAL_TEST_CHALLENGE" --header "Accept: text/plain"
# POST /webhooks/whatsapp — use the signed fixture from the WhatsApp section above.
curl.exe --include --request POST "$BaseUrl/webhooks/whatsapp" --header "Accept: application/json" --header "Content-Type: application/json" --header "X-Hub-Signature-256: $WaSignature" --data-raw $WaBody
# POST /whatsapp/send-template
curl.exe --include --request POST "$BaseUrl/whatsapp/send-template" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"recipientPhone":"REPLACE_WITH_LOCAL_TEST_PHONE","templateName":"local_test_template","isMarketing":false}'
# GET /webar/$env:WEBAR_ASSET_ID
curl.exe --include --request GET "$BaseUrl/webar/$env:WEBAR_ASSET_ID" --header "Accept: application/json"
# POST /ar/handoff
curl.exe --include --request POST "$BaseUrl/ar/handoff" --header "Accept: application/json" --header "Content-Type: application/json" --data-raw '{"webarAssetId":"REPLACE_WITH_WEBAR_ASSET_ID"}'
# GET /ar/handoff/$env:AR_HANDOFF_TOKEN
curl.exe --include --request GET "$BaseUrl/ar/handoff/$env:AR_HANDOFF_TOKEN" --header "Accept: application/json"
# GET /health/live
curl.exe --include --request GET "$BaseUrl/health/live" --header "Accept: application/json"
# GET /health/ready
curl.exe --include --request GET "$BaseUrl/health/ready" --header "Accept: application/json"
# GET /metrics
curl.exe --include --request GET "$BaseUrl/metrics" --header "Accept: text/plain; version=0.0.4"
```

### Bash alternatives and validation probes

Every JSON body above is shell-neutral. In Bash, define/export `BASE_URL`, use `"$BASE_URL/..."`, and run `curl` instead of `curl.exe`. For example:

```bash
export BASE_URL='http://localhost:3001'
curl --include --request GET "$BASE_URL/api/v1/health/live" --header 'Accept: application/json'
curl --include --request POST "$BASE_URL/api/v1/search" --header 'Accept: application/json' --header 'Content-Type: application/json' --data-raw '{"query":"sapphire","filters":{},"semantic":false,"limit":10}'
```

The sitemap paths are served by Next.js, not the API listener:

```powershell
$WebBaseUrl = 'http://localhost:3000'
curl.exe --include --request GET "$WebBaseUrl/sitemap.xml" --header "Accept: application/xml"
curl.exe --include --request GET "$WebBaseUrl/sitemap-products/REPLACE_WITH_VALID_LOCAL_SHARD.xml" --header "Accept: application/xml"
```

Safe representative failures:

```powershell
# Strict unknown catalog parameter -> 400 VALIDATION_FAILED; read-only.
curl.exe --include --request GET "$BaseUrl/api/v1/products?notAFilter=1" --header "Accept: application/json"
# Wrong method -> 405 METHOD_NOT_ALLOWED; read-only.
curl.exe --include --request POST "$BaseUrl/api/v1/products" --header "Accept: application/json"
# Missing asserted customer ID -> 401 before DB lookup; does not prove authentication exists.
curl.exe --include --request GET "$BaseUrl/api/v1/account/profile" --header "Accept: application/json"
# Invalid/missing local WhatsApp signature -> 401; no message is processed.
curl.exe --include --request POST "$BaseUrl/api/v1/webhooks/whatsapp" --header "Content-Type: application/json" --data-raw '{"object":"whatsapp_business_account","entry":[]}'
```

## Dependency-aware local test sequence

1. Start the standalone API with a **local PostgreSQL 16** database. If `GET /api/v1/health/live` fails, stop; the API server is not reachable. A 500 from the Next.js server is not evidence that the API adapter is running.
2. Check readiness (`/api/v1/health/ready`), then catalog/taxonomy/search reads. Save only actual local IDs returned by the server; zero active products is a valid reason to stop catalog-dependent flows.
3. Cart → add active product → checkout session → shipping → `TEST` payment checkpoint → confirm → place order. Save each returned token/ID. This writes reservations, test payment state and an order.
4. Account/favorites require an existing disposable customer UUID. There is no login flow. Use the `x-customer-id` header only against local data; do not infer that it authenticates the caller.
5. DYO create → retrieve → validate → quote → compatible settings. Add-to-cart only after verifying PRICED/COMPATIBLE state and a test cart.
6. Certificate create → OCR payload → optional review. These operations write trust/audit state; OCR is caller-supplied data, not a real OCR run. Avoid approval/VERIFIED transitions outside a carefully controlled fixture.
7. AI JSON chat → retrieve by returned conversation key → handoff if needed. Default model response is simulated. JSON chat and handoff persist; stream creates/uses the conversation row but currently does not persist messages or interaction telemetry. For tool-call observability, inspect JSON `data.toolCalls` or SSE `tool_call` events; no tool event is expected if the orchestrator executes none.
8. For webhooks, use a unique local fixture and calculate HMAC over the exact body as shown. A WhatsApp inbound request writes a receipt/conversation and invokes AI; a payment webhook can reconcile order state.
9. AR create-handoff → save the raw token privately → redeem once. The token expires in ten minutes and is single-use; the redeemed token cannot be cleaned up by calling the endpoint again.
10. Avoid refund approval/execution, order cancellation, inventory sweep, address/favorite deletion, and all writes against production. There is no API cleanup endpoint. Discard/recreate the local disposable DB using the approved local-development procedure if cleanup is needed.

If any prerequisite request fails, do not substitute guessed IDs. Use an existing local test fixture or stop the dependent workflow.

## Verification coverage, stubs, and gaps

| Surface | Registered routes / paths | Evidence checked | Executed against a live local API here? |
|---|---:|---|---|
| Catalog/taxonomy | 11 | Router/catalog/OpenAPI parity specs, Zod contracts, handlers | No |
| Search | 6 | Router entries, search handler/query DTO, search specs | No |
| Cart/checkout/orders/payments/inventory | 36 | Router entries, commerce handlers, DTOs, DB-backed tests where configured | No |
| Account | 16 | Router entries, account handlers/DTOs and account specs | No |
| Favorites/compare | 9 | Router entries, handler/DTO and favorites specs | No |
| Add-ons | 6 | Router entries, handler/DTO and add-on specs | No |
| Discounts | 4 | Router entries, handler/DTO and discount specs | No |
| Refunds | 10 | Router entries, handler/DTO and refund specs | No |
| DYO | 11 | Router entries, handlers, repository and DYO specs | No |
| Certificates | 10 | Router entries, handler, domain types/repository and certificate specs | No |
| AI Concierge | 6 | Router entries, handler, orchestrator/gateway and AI specs | No |
| WhatsApp | 6 | Router entries, signature/handler code and WhatsApp specs | No |
| WebAR / AR | 6 | Router entries, request schema/repository and WebAR specs | No |
| Health / metrics | 6 | Router entries, handler and health specs | No |
| **API router total** | **143** | **76 handler IDs; both `/api/v1` and legacy aliases counted** | **No** |
| Next.js sitemap | 2 | `src/app/sitemap.xml/route.ts` and `src/app/sitemap-products/[shard]/route.ts` | No |
| **Total HTTP route registrations inventoried** | **145** | **Every matched route template represented in inventory and collection** | **No** |

The endpoint tests checked are code-level tests, not 145 live HTTP tests. A safe local `curl` probe of `http://127.0.0.1:3000/api/v1/health/live` reached a Next.js development server and returned **500** because its compilation could not resolve `@maihan/observability/client`; it did not reach this standalone API adapter. No application DB-backed request or mutating endpoint was run as part of this inventory.

### Planned API scope not present as registered routes

The current implementation does not register API routes for login/token issuance, content/pages/navigation, upload presigning or asset URLs, admin/CMS/RBAC/audit/migration-management, or storage webhooks. The plan and [06_API_ARCHITECTURE.md](../../technical_design/06_API_ARCHITECTURE.md) describe broader target surfaces. Plan §19 expects a CMS and admin modules/RBAC/audit; no `/api/v1/admin/*` handler is in the current router. The plan calls Phase 13 performance/security/observability, while current memory labels observability work “Phase 12”; the local checkout therefore has a planning/state phase-number discrepancy. Do not treat planned endpoints as implemented.

The generated OpenAPI document documents only catalog reads; the broader handler set has no parity-enforced OpenAPI coverage. Also, current route-level auth does not meet the architecture document's owner/admin/RBAC requirements for many data-bearing and privileged endpoints. These are implementation gaps, not undocumented assumptions to paper over.

## Postman and smoke test

- Collection: [Maihan-Gems-API.postman_collection.json](./postman/Maihan-Gems-API.postman_collection.json)
- Environment template: [Maihan-Gems-Local.postman_environment.json](./postman/Maihan-Gems-Local.postman_environment.json)
- Local smoke script: [api-smoke-test.ps1](../../scripts/api-smoke-test.ps1)

The collection contains 143 API route registrations (including aliases), two sitemap requests, one additional SSE variant for the chat route, and three safe negative probes: 149 requests total. Mutating requests are skipped by default unless `runMutatingRequest` exactly matches that request's name; set it only to run one request at a time against a disposable local database, then clear it. Do not bulk-run writes. The WhatsApp request computes its signature from the raw body using a Postman environment variable; payment webhook success requires the local signer procedure above. The AI SSE request validates the HTTP status and `text/event-stream` content type; inspect its response body for the event sequence documented above. Postman buffering may affect how streaming appears interactively.

```powershell
# Import collection and environment using Postman UI: Import > Files.
# Then select "Maihan Gems Local" as the active environment.
pwsh -NoProfile -File .\scripts\api-smoke-test.ps1 -BaseUrl http://localhost:3001
```

```bash
# Execute the PowerShell smoke test from Bash with PowerShell 7 installed.
pwsh -NoProfile -File ./scripts/api-smoke-test.ps1 -BaseUrl http://localhost:3001
```

The smoke test is read-only, refuses non-loopback base URLs, checks liveness/readiness and a catalog taxonomy read, prints actual statuses, marks unreachable/dependent calls distinctly, and exits non-zero unless required checks pass.
