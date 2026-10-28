# 34 URL PARITY AND REDIRECT ARCHITECTURE

> **DESCOPED 2026-10-28 (ADR-035, owner-authorized).** The fresh clean database
> starts SEO fresh: **no redirects table, no old-URL parity work**. This
> document is retained as historical reference. (Old-domain ranking equity is
> consciously not being preserved.)

**Package:** `technical_design/` doc 34 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 13, NFR-13, INV-09.
**Evidence status:** `[OBSERVED]` for every URL count and route; `[INFERRED]` for the redirect mechanics.

---

## Purpose

Guarantee that all 44,218 observed source URLs resolve, that no URL parity or SEO value is lost, and that slug changes never break a link.

## 1. Why this is a first-class concern

`[OBSERVED]` 44,218 URLs were captured. Of these, 33,934 are commerce URLs absent from `products.jsonl` (D1).

Each is a page that may have inbound links, accumulated search equity, and possibly bookmarks. Losing them is a permanent, silent loss: nothing errors, the site simply works less well.

The test is absolute and machine-checkable: **every source URL either resolves directly or returns a 301 to a target that resolves.** No sampling.

## 2. Redirect rules

| Status | When | Rationale |
|---|---|---|
| **200, no redirect** | The target route is identical in shape | Nothing to redirect; preserving the exact URL is better for SEO |
| **301** | The target route differs | Permanent, canonical, transfers equity |
| **302** | A temporary mapping, e.g. `/mens-gemstone-ring-settings` to a filtered view | The mapping may change; do not commit to it |
| **410** | A URL confirmed to have no equivalent and no useful replacement | Honest removal; better than redirecting to an unrelated page |

Redirecting a product URL to the homepage is not a fallback. It is a 404 with extra steps, and it transfers equity to the wrong page.

## 3. Route map

| Source route | Count | Target | Redirect |
|---|---:|---|---|
| `/{variety}` | 191 | `/[variety]` | no |
| `/{variety}-pairs` | 142 | `/[variety]-pairs` | no |
| `/{variety}-rings` | 99 | `/[variety]-rings` | no |
| `/{variety}/{slug}-K#####` | 19,997 | `/products/{slug}` | 301 |
| `/{variety}-pairs/{slug}-PR#####` | 3,077 | `/products/{slug}` | 301 |
| `/{variety}-rings/{slug}-J#####` | 88 | `/products/{slug}` | 301 |
| `/design-your-own/review/{slug}` | 9,812 | `/design-your-own/review/{code}` | 301 |
| `/gemstone-ring-settings/{slug}` | 8,522 | `/settings/{sku}` | 301 |
| `/gemstone-necklace-pendant-settings/{slug}` | 1,808 | `/settings/{sku}` | 301 |
| `/gemstone-earring-settings/{slug}` | 442 | `/settings/{sku}` | 301 |
| `/gemstone-bracelet-settings` | 1 | `/settings` | no |
| `/mens-gemstone-ring-settings` | 1 | `/settings?style=mens` | 302 |
| `/{colour}-gemstones` | 60 | `/colour/{colour}` | 301 |
| `/all-natural-gemstones` and siblings | 7 | `/search?collection=all` | 302 |
| `/cart` | 1 | `/cart` | no |
| `/cart/order-summary` | 1 | `/checkout/order-summary` | 301 |
| `/cart/payment-order` | 1 | `/checkout/payment-order` | 301 |
| `/cart/secure-payment` | 1 | `/checkout/secure-payment` | 301 |
| `/account` | 1 | `/account` | no |
| `/auth`, `/verify-email` | 2 | `/account/sign-in`, `/account/verify-email` | 301 |
| `/favorites` | 1 | `/favorites` | no |
| `/compare-list` | 1 | `/compare` | 301 |
| `/financing` | 1 | `/financing` | no |
| `/extend-protection-plan` | 1 | `/protection-plan` | 301 |
| `/contact-us` | 1 | `/contact` | 301 |
| `/showroom`, `/showroom/preview`, `/showroom/preview/success` | 3 | `/showrooms`, `/showrooms/{slug}` | 301 |
| `/education` and children | 15 | `/education/...` | no |
| `/blog` | 1 | `/blog` | no |
| `/meet-our-team`, `/michael-arnstein` | 2 | `/about/...` | 301 |
| `/custom-design-gemstone-rings-jewelry` | 1 | `/design-your-own` | 301 |
| `/sitemap-static.xml`, `/sitemap-products-N.xml` | 45 | `/sitemap.xml`, `/sitemap-products/N.xml` | generated |

Sixteen routes carry no redirect because the target shape is unchanged. That is a deliberate outcome, not an oversight: variety and category URLs are among the most linked pages on a store like this, and redirecting them would cost equity for no benefit.

## 4. Query-string handling

`[OBSERVED]` Query-string variants exist in the captured inventory:

| Variant | Count | Mapping |
|---|---:|---|
| `?rs=` | 423 | A sort or page parameter on the target |
| `?design-styles=` | 6 | `?style=` |

| Rule | Detail |
|---|---|
| Mapped parameters | Converted explicitly during redirect |
| Unmapped parameters | Preserved, not dropped |
| UTM and tracking parameters | Preserved so campaign attribution survives |
| Never | Silently discard a parameter whose meaning is unknown |

Dropping an unrecognised query parameter during a redirect can change what the target page shows. Preserving it is safer than guessing its meaning.

## 5. Slug strategy

Target slugs preserve the source shape: human-readable, SEO-friendly, and already carrying the semantic tokens.

```text
/design-your-own/review/blue-aquamarine-earrings-emerald-cut-5.98ct-14k-rose-gold-js1383r14-pr5681
   -> /design-your-own/review/{shortCode}

/aquamarine/blue-aquamarine-earrings-emerald-cut-5.98ct-14k-rose-gold-js1383r14-pr5681
   -> /products/halo-blue-aquamarine-earring-5-98ct-14k-rose-gold-js1383r14-pr5681
```

| Rule | Detail |
|---|---|
| Stability | Derived from the source slug, never from a mutable display name |
| Change control | A slug change **requires** a `redirects` row (INV-09) |
| Internal identifier | `product_number` is stable and independent of the slug |
| Forbidden | A slug never embeds a mutable price or availability value |

Embedding price in a slug means every price change invalidates every URL that contains it. `[OBSERVED]` the source slugs do contain `Ct.Tw.` and the metal, both of which are stable properties of the stone and the setting, so those are preserved; price and availability are not.

## 6. Storage

```sql
CREATE TABLE redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL,
  source_host text NOT NULL DEFAULT 'naturalgemstones.com',
  target_path text,
  status_code smallint NOT NULL DEFAULT 301,
  param_mapping jsonb NOT NULL DEFAULT '{}',
  is_external boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_host, source_path)
);
```

| Index | Purpose |
|---|---|
| unique on `(source_host, source_path)` | A source path maps to exactly one target; no ambiguity |
| btree on `target_path` | Reverse lookup: "which source URLs point here?" |
| btree on `created_at` | Recently added redirects, for review |

One source path to exactly one target is enforced by the unique constraint. A redirect table with two targets for one path cannot be resolved deterministically, and whichever row wins is arbitrary.

## 7. Lookup

```text
incoming request
  -> normalise path (lowercase, strip trailing slash, collapse slashes)
  -> direct route match?          serve
  -> else redirect lookup         exact path
  -> else redirect lookup         pattern match, most specific first
  -> else 404 with a search suggestion
```

| Rule | Detail |
|---|---|
| Normalisation | Lowercase, no trailing slash, collapsed separators, before lookup |
| Pattern fallbacks | `/{variety}/{slug}-K#####` as a family rule where no explicit row exists |
| Most specific first | An exact row always beats a pattern |
| Cost | The `redirects` table is fully cached in memory; lookup must not hit Postgres per request |
| Fail-open on cache miss | Fall through to a database lookup, not to a 404 |

## 8. Redirect hygiene

| Rule | Reason |
|---|---|
| No chains | A redirect to a redirect is a bug; the CI test asserts no chains exist |
| No loops | Detected in CI and by a request-depth limit |
| No redirect to a 404 | Every target must resolve; asserted in CI |
| Point to the closest equivalent | `/compare-list` to `/compare`, not to `/` |
| Never redirect to a filtered listing as a substitute for a product | A stone URL must land on that stone |
| Review high-traffic 301s quarterly | Equity should accumulate at the intended target |

Chains matter more than their technical cost. Search engines follow a small number of hops, so a three-hop chain silently truncates the equity transfer.

## 9. Sitemaps

| Source | Target | Method |
|---|---|---|
| `/sitemap-static.xml` | `/sitemap.xml` | generated |
| `/sitemap-products-N.xml` (45 observed) | `/sitemap-products/{N}.xml` | generated from the catalogue, not migrated |

Sitemaps are **generated**, never migrated. A migrated sitemap reflects the source's editorial judgement at capture time and goes stale immediately.

Only canonical 200 URLs go into a sitemap. Redirects, 404s and parameter variants are excluded; `hreflang` alternatives go in a separate sitemap.

## 10. Validation rules

1. All 44,218 source URLs have a `redirects` row or resolve directly.
2. Every redirect target resolves with 200.
3. No chains, no loops.
4. One source path maps to exactly one target.
5. Unmapped query parameters are preserved.
6. A slug change creates a `redirects` row in the same transaction (INV-09).
7. Sitemaps contain only canonical 200 URLs.
8. No slug embeds price or availability.
9. `product_number` remains stable across any slug change.

## 11. Error handling

| Condition | Behaviour |
|---|---|
| Unknown path | 404 with search and category suggestions, never a redirect to `/` |
| Redirect target missing | Redirect row flagged in admin; a broken redirect is a defect, not a silent 404 |
| Chain detected | CI failure; admin shows the chain |
| Loop detected | Request-depth limit returns 508; CI failure |
| Cache miss | Falls through to Postgres; never a 404 |
| Bulk redirect import partially fails | Batch aborted; no partial redirect set (doc 27) |

## 12. Security boundaries

- Redirect targets are validated against known internal route patterns at insert time; an open redirect is impossible.
- External redirects require `is_external = true` and an explicit allow-list of hosts.
- Redirect lookup is read-only and unauthenticated, so it is a hot path: no database write and no dynamic query construction on any request.
- Admin redirect edits are audited (doc 23).

An open redirect on a domain with stored payment flows is a phishing tool. Validating the target at insert time is the only place that reliably prevents it.

## 13. Observability

Metrics: redirect hit count by source family, 404 rate by path prefix, chains detected, broken targets, redirect lookup latency, sitemap size and last-rebuild time. Alerts on a 404-rate increase for a path family, on any broken target, and on a redirect-hit spike for a family that should be resolving directly.

## 14. Testing requirements

| Test | Proves |
|---|---|
| Full URL sweep | All 44,218 URLs resolve or 301 to a 200 |
| No chains | No redirect resolves to another redirect |
| No loops | No path revisits itself |
| Target validity | Every target resolves |
| Uniqueness | No source path has two targets |
| Parameter mapping | `?rs=` and `?design-styles=` map correctly; unmapped parameters survive |
| Slug change | Renaming a product creates a redirect in the same transaction and the old URL still works |
| Stability | `product_number` is unchanged after a slug change |
| Open redirect | An external target outside the allow-list is rejected |
| Sitemap purity | Only canonical 200 URLs appear |

## 15. Failure modes

| Failure | Behaviour |
|---|---|
| Redirect table partially loaded | Batch aborted; no partial state |
| Chain introduced by a rename | CI fails; the rename does not ship without its redirect |
| Target route renamed later | Redirect updated in the same release; CI enforces target validity |
| Cache stale after a bulk import | Cache rebuilt; fallback lookup keeps the site correct meanwhile |
| Sitemap stale | Nightly rebuild (doc 27) |
| 404 for an unrecognised legacy path | 404 with suggestions; family patterns catch most cases |

## 16. Implementation constraints

1. All 44,218 source URLs resolve or 301 to a target that resolves.
2. Redirect targets are validated against internal route patterns at insert time.
3. One source path maps to exactly one target.
4. No chains and no loops; enforced in CI.
5. Unmapped query parameters are preserved.
6. A slug change and its `redirects` row ship in the same transaction (INV-09).
7. Sitemaps are generated, never migrated.
8. Slugs never embed price or availability.

## Evidence status

`[OBSERVED][VERIFIED]`: all 44,218 URLs and every family count in section 3, the 423 `?rs=` and 6 `?design-styles=` variants, the 45 sitemap URLs, the 33,934 commerce URLs absent from `products.jsonl` (D1), and the observed slug shape containing `Ct.Tw.` and metal. `[INFERRED]`: the redirect status semantics, storage schema, lookup strategy, chain and loop policy, and the review cadence. The invariant that slugs must not embed price is `[INFERRED]` from the observed slug tokens plus NFR reasoning about mutable values.