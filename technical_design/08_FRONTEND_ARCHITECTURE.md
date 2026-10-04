# 08 FRONTEND ARCHITECTURE

**Package:** `technical_design/` doc 08 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 11.3 (route map), 12 (frontend architecture), 13 (route map).
**Evidence status:** `[INFERRED]`. The source frontend was Nuxt/Vue SSR `[OBSERVED]`; nothing about its component design is reused.

---

## Purpose

Define the Next.js application: routes, rendering strategy, server/client boundaries, data access, state, forms, states, SEO, accessibility and performance budget.

## Route tree

```
app/
  (storefront)/
    layout.tsx                     header, mega menu, footer, chat launcher
    page.tsx                       /
    [variety]/page.tsx             /tsavorite-garnet
    [variety]-pairs/page.tsx       /tsavorite-garnet-pairs
    [variety]-rings/page.tsx       /tsavorite-garnet-rings
    colour/[colour]/page.tsx       /padparadscha-gemstones
    settings/page.tsx              /gemstone-rings
    settings/[sku]/page.tsx        /gemstone-ring-settings/<slug>
    search/page.tsx                /search
    products/[slug]/page.tsx       /products/<slug>              canonical product detail
    design-your-own/page.tsx       /design-your-own
    design-your-own/review/[code]/page.tsx
    ar/[assetId]/page.tsx          /ar/<assetId>                 AR, isolated, ssr:false
    ar/handoff/[token]/page.tsx    QR target
    compare/page.tsx  favorites/page.tsx
    cart/page.tsx
    checkout/order-summary/page.tsx
    checkout/payment-order/page.tsx
    checkout/secure-payment/page.tsx
    account/**  contact/  showrooms/**  education/**  blog/**  policy/[slug]/
    financing/  protection-plan/
  admin/                           separate layout, separate authz
  api/                             route handlers (doc 06)
```

Route-to-source mapping and the 44,218 redirects are in doc 33 and `PROJECT_SOURCE_OF_TRUTH.md` section 13.1.

## Rendering strategy

| Route group | Rendering | Reason |
|---|---|---|
| Home, variety, colour, category, settings index | Server | SEO, cacheable, no per-user state |
| Product detail | Server shell + client islands | SEO-critical content; gallery and CTAs interactive |
| Search results | Server first page, client for refinements | SEO plus interactivity |
| DYO configurator | Client | Multi-step stateful interaction |
| Cart and checkout | Client-heavy, server-validated | Money correctness over instant feedback |
| Chat | Client island, lazy | Never in the initial bundle |
| WebAR | Client only, `ssr: false`, dynamic import | GPU and camera |
| Account, admin | Server | Per-user, non-cacheable |

Rule: a component is a Server Component unless it declares `'use client'`. `'use client'` appears at the leaf of an interactive island, never at a layout that wraps server content.

## Data fetching

```ts
// Server Component
const product = await getProductBySlug(slug, { tags: [`product:${slug}`] });
```

- Reads go through the catalogue API layer, never directly to a database.
- Cache tags per doc 25, invalidated by domain events.
- No client-side data-fetching library. Server Components fetch; client islands receive props.
- URL is the source of truth for all shareable state: filters, sort, pagination, tab.

## Cache tags

| Tag | Invalidated by |
|---|---|
| `product:{slug}` | `ProductUpdated`, `ProductStateChanged` |
| `gemstone:{gemRef}` | `GemstoneUpdated` |
| `variety:{slug}` | taxonomy write |
| `taxonomy` | taxonomy write |
| `nav:{key}` | navigation write |
| `page:{slug}` | `PagePublished` |
| `search:{generation}:{hash}` | generation bump |

## State management

| State | Mechanism | Rationale |
|---|---|---|
| Server data | Server Components + cache tags | No duplicated client cache |
| URL state | `searchParams` | Shareable, back-button safe |
| DYO draft | Client reducer + server persistence | Explicit state machine; Redis session, Postgres record |
| Cart | Server-authoritative, client-optimistic | Money correctness beats instant feedback |
| Chat | Server stream + client transcript | Streaming is server-driven |
| Filters | URL + `useOptimistic` | Shareability is a feature |
| AR | Client-only store, route-scoped | Isolated to `/ar` |

No global client store. React context only for genuinely cross-island concerns (cart count, session).

## Forms

| Form | Validation | Behaviour |
|---|---|---|
| Search | URL params, no submit required | Debounced, `useOptimistic` |
| Filters | Facet values validated against taxonomy | Immediate, reflected in URL |
| DYO step | Client for feedback, **server authoritative** on each transition | Server rejects with `DYO_INCOMPATIBLE` and per-rule detail |
| Address | Zod shared with the API contract | Blocked on client, re-validated server-side |
| Payment | Provider-hosted fields | Card data never enters our DOM or server |
| Concierge request | Zod | Idempotency key |

Client validation is a UX affordance. Server validation is the enforcement. Shared Zod schemas in `packages/contracts` guarantee both use the same rules.

## The four states

Every data-dependent view implements all four. A missing state is a defect, reviewed as one.

| State | Implementation |
|---|---|
| Loading | Route-level `loading.tsx` skeleton matching final layout; inline `Suspense` for islands; no spinner-only loaders |
| Error | Route-level `error.tsx` with a real recovery action (retry, search, return to category), never a bare message |
| Empty | Purpose-built empty state with a next action, e.g. "No tsavorites match these filters. Clear filters" |
| Not found | `not-found.tsx` with search and category suggestions |

## Component architecture

```
components/
  design-system/   Button, Input, Select, Dialog, Sheet, Tabs, Badge, Card, Table,
                  Toast, Skeleton, Price, Money, Pagination, EmptyState, ErrorState
  catalog/         ProductCard, ProductGrid, ProductGallery, SpecTable, StoneSpecPanel,
                  FacetChips, CertificateBadge, AvailabilityBadge, ProvenanceBadge,
                  ProvenanceDetail, WeightBreakdown
  filters/         FacetPanel, FacetGroup, FacetCheckbox, RangeSlider, ActiveFilterChips,
                  SortSelect, MobileFilterSheet
  dyo/             StonePicker, SettingPicker, MetalPicker, CompatibilityPanel,
                  PriceBreakdown, ReviewStep, ConfigurationSummary, ShareButton
  cart/            CartLine, CartSummary, QuantityStepper, AddOnSelector
  checkout/        CheckoutSteps, AddressForm, ShippingSelector, PaymentForm,
                  OrderReview, FinancingSelector
  ai/              ChatPanel, ChatMessage, ToolTrace, CitationChip, HandoffNotice, FeedbackWidget
  documents/       CertificateCard, CertificateField, ConfidenceBadge, VerificationBadge, DocumentViewer
  ar/              ARLauncher, ARViewer, HandTrackingStatus, DeviceFallback, QrHandoff, CalibrationPrompt
  layout/          Header, MegaMenu, MobileNav, Footer, AnnouncementBar, Breadcrumbs
  cms/             one renderer per content_block_type (20)
  account/         OrderCard, AddressCard, ProfileForm, WishlistGrid
```

Rules: no component imports a repository or calls a database; components receive view models; one component per file; no page-local copies of design-system primitives.

## The catalogue rule in the UI

No component special-cases a variety, colour or product. Every catalogue page is the same components plus data. A hard-coded variety anywhere in `components/` fails review. `[OBSERVED]` The source has 145 variety route slugs and 60 colour categories; hard-coding is not viable and would be a defect regardless.

## SEO

| Concern | Implementation |
|---|---|
| Metadata | `generateMetadata` from `seo_metadata`, falling back to derived title and description |
| Canonical | Single trailing-slash policy; the source used trailing-slash canonicals `[OBSERVED]`, we normalise to none and 301 the source form |
| Structured data | `Product` with `offers`, `BreadcrumbList`, `Organization`, `Article` |
| Sitemap | Generated from products, varieties, pages; sharded above 50,000 URLs, matching the source's observed 44 shards `[OBSERVED]` |
| Robots | Disallow `/admin`, `/api`, `/ar/handoff` |
| Redirects | Served from the `redirects` table |

`[OBSERVED]` The source already emitted Product JSON-LD including `sku`, `mpn`, `brand` and `offers.price`, plus a `WebSite` and a `LocalBusiness` with an address and phone. We reproduce and extend that markup. The address and phone are **source facts about the source business**, and are not asserted as this business's details; they are configuration, not code.

## Accessibility

- Semantic landmarks and a skip link.
- Gallery keyboard-operable with arrow keys; focus trapped in dialogs.
- Chat is `role="log"` with `aria-live="polite"`.
- AR controls have large touch targets and explicit `aria-label`.
- All form fields labelled; errors linked via `aria-describedby`.
- Contrast at least 4.5:1.
- `prefers-reduced-motion` honoured for every animation.
- Zero blocking violations is the release gate.

## Responsive behaviour

| Breakpoint | Behaviour |
|---|---|
| `< 640px` | Single column; filters in a bottom sheet; gallery swipeable; AR on its own route |
| `640-1024px` | Two-column product grid; filters in a collapsible panel |
| `> 1024px` | Full mega menu; three-to-four column grid; facets in a sticky sidebar |
| Any | DYO and checkout are single-column and step-based |

`[OBSERVED]` The source shipped separate mobile logos (`/images/normal/logos/mob-logo.png`, `laptop-logo.png`, `full-logo.png` via `srcset`), confirming a mobile-first responsive source. We do not copy that implementation, only the intent.

## Performance budget

| Metric | Budget | Enforcement |
|---|---|---|
| Initial JS, category page | <= 170 KB gzip | CI bundle analysis |
| Initial JS, product page | <= 190 KB gzip | CI |
| Chat bundle | <= 90 KB gzip, lazy | CI |
| WebAR bundle | <= 650 KB gzip, lazy, plus lazy 3D | CI |
| Fonts | self-hosted, subset, `font-display: swap`, max 2 families | CI |
| Images | AVIF then WebP, `srcset`, explicit dimensions | CI plus LCP gate |
| Third-party scripts | none on the critical path | CI |

## Validation rules

1. No `'use client'` above an island leaf.
2. No direct database access from any component.
3. No hard-coded variety, colour or product identifier in `components/`.
4. Every data-dependent route has all four states.
5. Every component is keyboard reachable and labelled.

## Security boundaries

- Session cookie is HttpOnly and never read by client JavaScript.
- No PII in client-side logging or analytics.
- Payment fields are provider-hosted; card data never enters our DOM.
- Chat renders model output as text, never as HTML.
- Documents use signed URLs; the URL is not embedded in public page source.

## Observability

Web Vitals reported per route template; client errors with `trace_id`; AR session telemetry (load time, fps, tracking loss, device tier). Analytics via a thin adapter with no PII in properties. No third-party script on the critical path.

## Testing requirements

| Test | Proves |
|---|---|
| Component tests | Each component's states and accessibility |
| Route smoke tests | Every route renders in all four states |
| Redirect completeness | All 44,218 source URLs resolve or 301 |
| Structured-data validity | JSON-LD parses and validates |
| Lighthouse CI | Performance and accessibility budgets |
| axe CI | Zero blocking violations |
| Visual regression | Six representative templates |
| Bundle budget CI | No budget breach lands |

## Failure modes

| Failure | Behaviour |
|---|---|
| Client island fails to hydrate | Static server HTML remains usable; island degrades |
| API slow or down | Route-level error state with retry; cached reads serve marked stale |
| Chat gateway down | Chat shows a graceful message and offers a human |
| AR unsupported | Fallback matrix (doc 21); page unaffected |
| Images fail to load | Explicit dimension reserves space; gallery shows alt |

## Implementation constraints

1. Server-first; client islands only where interaction demands.
2. The frontend never parses source slugs or reconstructs SKU grammar. That is server and migration logic.
3. All four states on every data view.
4. Budgets are CI-enforced, not aspirational.

## Evidence status

`[INFERRED]`. `[OBSERVED]` source facts used: Nuxt/Vue SSR, 145 variety routes, 60 colour routes, four checkout URLs, product JSON-LD shape, `LocalBusiness` address and phone, responsive `srcset` logo pattern, and the presence of a third-party chat widget. No source component, framework or rendering strategy is reused.