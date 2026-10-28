/**
 * apps/web/src/routing/route-manifest.ts
 *
 * Phase 4 Task 1 — the storefront route-tree manifest.
 *
 * ONE file describes every route SoT 12.2 requires, in the SAME notation the
 * SoT uses, so the validation spec (routing/route-manifest.spec.ts) can assert
 * the file-system route tree matches this manifest: no missing folder, no
 * duplicate/conflicting dynamic segment, no inventive brand-new UI route, and
 * no invented per-record route.
 *
 * This module is data only. It does NOT import next (routing decisions stay
 * framework-independent) and it does NOT import any handler — pages own
 * their rendering; the manifest owns only the route shape.
 *
 * Authority (read at Task 1 authorisation):
 *   - PROJECT_SOURCE_OF_TRUTH.md 12.2 (route tree)
 *   - PROJECT_SOURCE_OF_TRUTH.md 13.1 (source route preservation)
 *   - PROJECT_SOURCE_OF_TRUTH.md 13.2 (new target-only routes)
 *   - technical_design/08 (route group structure)
 *   - technical_design/34 (route map doc 34, sitemap targets, robots)
 *
 * 2026-10-18 revision (frontend completion session): the `[varietySlug]-pairs`
 * / `-rings` SUFFIX FOLDERS were deleted in `082b39b` — Next.js never passed
 * `varietySlug` inside suffix folders, so every suffix route crashed. Collection
 * facets (`-pairs`, `-rings`, `-earrings`, …) now parse INSIDE
 * `[varietySlug]/page.tsx` via `lib/collection-route.ts` + the NGC landing
 * parser. The manifest previously demanded those deleted files and went stale;
 * it now models the deliberate tree (suffix parsing routes + the pages later
 * sessions added) so the tree assertion is true again.
 */

export interface RouteManifestEntry {
  /** Path in Next.js App Router notation (folder names literal). */
  readonly fsPath: string;
  /** Path in SoT 12.2 route-tree notation, for diffability. */
  readonly sotPath: string;
  /** Reason the route exists — one of the SoT authority lines. */
  readonly authority: string;
  /** Whether the route belongs to the (storefront) group. */
  readonly storefront: boolean;
  /** Route-group-relative UI segment (or null for the group's root). */
  readonly group: 'storefront' | 'admin' | 'api' | 'app-root';
  /** Extra files required by SoT 12.2 alongside page.tsx. */
  readonly extraFiles?: readonly string[];
  /** Files documented as reserved-but-unimplemented for later tasks. */
  readonly reserved?: readonly string[];
}

/** The single authoritative list. Order mirrors the SoT 12.2 block. */
export const ROUTE_MANIFEST: readonly RouteManifestEntry[] = [
  // ── app root ─────────────────────────────────────────────────────────────
  {
    fsPath: 'src/app/layout.tsx',
    sotPath: 'app/layout.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: the root of the listed app route tree; every group inherits <html>/<body> from it (not drawn as an explicit line in the SoT chart, implied as the tree root)',
    storefront: false,
    group: 'app-root',
    extraFiles: [
      'src/app/error.tsx',
      'src/app/globals.css',
      'src/app/storefront-luxury.css',
    ],
  },
  // ── (storefront) group ────────────────────────────────────────────────────
  {
    fsPath: 'src/app/(storefront)/layout.tsx',
    sotPath: 'app/(storefront)/layout.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: header, mega menu, footer, chat launcher',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/page.tsx',
    sotPath: 'app/(storefront)/page.tsx   # /',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: storefront home',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/[varietySlug]/page.tsx',
    sotPath: 'app/(storefront)/[variety]/page.tsx   # /tsavorite-garnet and /tsavorite-garnet-pairs, -rings, -earrings, -pendants, -settings (suffix facets parsed by collection-route.ts)',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2: variety index for loose stones. 13.1 preserves the observed source suffix routes; commit 082b39b parses those suffixes here instead of in suffix folders (suffix folders crash Next.js — varietySlug never resolves inside them).',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      // SoT 12.2 line + Task 5 states (loading/error/not-found).
      'src/app/(storefront)/[varietySlug]/not-found.tsx',
      'src/app/(storefront)/[varietySlug]/loading.tsx',
      'src/app/(storefront)/[varietySlug]/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/[varietySlug]/[productSlug]/page.tsx',
    sotPath: 'app/(storefront)/[variety]/[slug]/page.tsx   # /tanzanite/<product-slug> NGC product detail',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.1: source product paths preserve the /<collection>/<product-slug> shape; this segment renders the NGC research PDP (rendering-layer task added it under the variety branch).',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/[varietySlug]/[productSlug]/not-found.tsx',
      'src/app/(storefront)/[varietySlug]/[productSlug]/loading.tsx',
      'src/app/(storefront)/[varietySlug]/[productSlug]/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/about/page.tsx',
    sotPath: 'app/(storefront)/about/page.tsx   # /about index',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.1: /about/* source routes preserved; the about index segments the preserved detail slugs.',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/browse/page.tsx',
    sotPath: 'app/(storefront)/browse/page.tsx   # /browse',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.2: new target-only route ([INFERRED] storefront addition) — the vault discovery grid used by the bag/favourites empty states.',
    storefront: true,
    group: 'storefront',
      extraFiles: [
      'src/app/(storefront)/browse/loading.tsx',
      'src/app/(storefront)/browse/error.tsx',
      'src/app/(storefront)/browse/not-found.tsx',
    ],
},
  {
    fsPath: 'src/app/(storefront)/shop/page.tsx',
    sotPath: 'app/(storefront)/shop/page.tsx   # /shop',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.2: new target-only route ([INFERRED] storefront addition) — simple storefront-schema catalogue grid.',
    storefront: true,
    group: 'storefront',
      extraFiles: [
      'src/app/(storefront)/shop/loading.tsx',
      'src/app/(storefront)/shop/error.tsx',
      'src/app/(storefront)/shop/not-found.tsx',
    ],
},
  {
    fsPath: 'src/app/(storefront)/pairs/page.tsx',
    sotPath: 'app/(storefront)/pairs/page.tsx   # /pairs',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.2: new target-only route ([INFERRED] storefront addition) — matched pairs drawer (INV-02: pairs attach to EARRINGS in DYO).',
    storefront: true,
    group: 'storefront',
      extraFiles: [
      'src/app/(storefront)/pairs/loading.tsx',
      'src/app/(storefront)/pairs/error.tsx',
      'src/app/(storefront)/pairs/not-found.tsx',
    ],
},
  {
    fsPath: 'src/app/(storefront)/jewellery/page.tsx',
    sotPath: 'app/(storefront)/jewellery/page.tsx   # /jewellery',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.2: new target-only route ([INFERRED] storefront addition) — finished jewellery drawer.',
    storefront: true,
    group: 'storefront',
      extraFiles: [
      'src/app/(storefront)/jewellery/loading.tsx',
      'src/app/(storefront)/jewellery/error.tsx',
      'src/app/(storefront)/jewellery/not-found.tsx',
    ],
},
  {
    fsPath: 'src/app/(storefront)/product/[slug]/page.tsx',
    sotPath: 'app/(storefront)/product/[slug]/page.tsx   # /product/<slug> source PDP shape',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.1: the source site served product detail under /product/<slug>; preserved as the bag/favourites link target.',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/product/[slug]/not-found.tsx',
      'src/app/(storefront)/product/[slug]/loading.tsx',
      'src/app/(storefront)/product/[slug]/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/colour/[colourSlug]/page.tsx',
    sotPath: 'app/(storefront)/colour/[colour]/page.tsx   # /padparadscha-gemstones',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: colour-family listing',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/colour/[colourSlug]/not-found.tsx',
      'src/app/(storefront)/colour/[colourSlug]/loading.tsx',
      'src/app/(storefront)/colour/[colourSlug]/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/settings/page.tsx',
    sotPath: 'app/(storefront)/settings/page.tsx   # /gemstone-rings',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: settings catalog index',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      // The settings index always exists; only loading/error apply (Task 5).
      'src/app/(storefront)/settings/loading.tsx',
      'src/app/(storefront)/settings/error.tsx',
          'src/app/(storefront)/settings/not-found.tsx',
],
  },
  {
    fsPath: 'src/app/(storefront)/settings/[settingSku]/page.tsx',
    sotPath: 'app/(storefront)/settings/[sku]/page.tsx   # /gemstone-ring-settings/<slug>',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: setting variant / design core',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/search/page.tsx',
    sotPath: 'app/(storefront)/search/page.tsx   # /search',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: hybrid search',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/search/loading.tsx',
      'src/app/(storefront)/search/error.tsx',
      'src/app/(storefront)/search/not-found.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/products/[productSlug]/page.tsx',
    sotPath: 'app/(storefront)/products/[slug]/page.tsx   # canonical product detail',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: unified product detail',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/products/[productSlug]/not-found.tsx',
      'src/app/(storefront)/products/[productSlug]/loading.tsx',
      'src/app/(storefront)/products/[productSlug]/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/design-your-own/page.tsx',
    sotPath: 'app/(storefront)/design-your-own/page.tsx   # /design-your-own',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: configuration flow entry',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/design-your-own/review/[configurationCode]/page.tsx',
    sotPath: 'app/(storefront)/design-your-own/review/[code]/page.tsx   # /design-your-own/review/<code>',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: DYO review',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/ar/[assetId]/page.tsx',
    sotPath: 'app/(storefront)/ar/[assetId]/page.tsx   # /ar/<assetId>',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: WebAR (isolated)',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/ar/handoff/[handoffToken]/page.tsx',
    sotPath: 'app/(storefront)/ar/handoff/[token]/page.tsx   # QR target',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: QR handoff target',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/compare/page.tsx',
    sotPath: 'app/(storefront)/compare/page.tsx   # /compare-list',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: compare list',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/favorites/page.tsx',
    sotPath: 'app/(storefront)/favorites/page.tsx   # /favorites',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: wishlist',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/cart/page.tsx',
    sotPath: 'app/(storefront)/cart/page.tsx   # /cart',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: cart (identity 200)',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/checkout/order-summary/page.tsx',
    sotPath: 'app/(storefront)/checkout/order-summary/page.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: /cart/order-summary -> /checkout/order-summary',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/checkout/payment-order/page.tsx',
    sotPath: 'app/(storefront)/checkout/payment-order/page.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: /cart/payment-order -> /checkout/payment-order',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/checkout/secure-payment/page.tsx',
    sotPath: 'app/(storefront)/checkout/secure-payment/page.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: /cart/secure-payment -> /checkout/secure-payment',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/checkout/confirmation/[orderId]/page.tsx',
    sotPath: 'app/(storefront)/checkout/confirmation/[orderId]/page.tsx',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: checkout terminal state — order confirmation served from the authoritative order read ([INFERRED] route added with the functional checkout funnel; the funnel is the Phase 6 session flow).',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/checkout/confirmation/[orderId]/loading.tsx',
      'src/app/(storefront)/checkout/confirmation/[orderId]/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/account/[[...accountPath]]/page.tsx',
    sotPath: 'app/(storefront)/account/...',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1 + 13.2: /account/** one catch-all, sub-routes committed by Phase 6',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/account/actions.ts',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/contact/page.tsx',
    sotPath: 'app/(storefront)/contact/page.tsx   # /contact-us',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: contact (target of /contact-us 301)',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/showrooms/page.tsx',
    sotPath: 'app/(storefront)/showrooms/page.tsx   # /showroom',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: showroom index (target of /showroom 301)',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/showrooms/[showroomSlug]/page.tsx',
    sotPath: 'app/(storefront)/showrooms/[slug]/page.tsx   # /showroom/preview',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: showroom preview (target of /showroom/preview 301)',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/education/[[...educationPath]]/page.tsx',
    sotPath: 'app/(storefront)/education/...',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 34 §3: education hub (15 observed routes preserve shape)',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/blog/page.tsx',
    sotPath: 'app/(storefront)/blog/...',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1: blog (identity 200)',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/blog/[postSlug]/page.tsx',
    sotPath: 'app/(storefront)/blog/[postSlug]/page.tsx   # /blog/{slug} journal dispatch',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1 (blog identity route) + spec §7.11: journal dispatches render from the CMS (BLOG kind, published head revision only).',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/policy/page.tsx',
    sotPath: 'app/(storefront)/policy/page.tsx',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 (policy/legal hub surface): the legal-hub index from the reference applet (policy/page.tsx) ported verbatim in the M6 editorial migration; the route previously served only the detail segment.',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/policy/[policySlug]/page.tsx',
    sotPath: 'app/(storefront)/policy/[slug]/page.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: policy pages',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/financing/page.tsx',
    sotPath: 'app/(storefront)/financing',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 13.1: /financing identity 200',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/protection-plan/page.tsx',
    sotPath: 'app/(storefront)/protection-plan',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 13.1: /extend-protection-plan -> /protection-plan',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/ai-gemologist/page.tsx',
    sotPath: 'app/(storefront)/ai-gemologist/page.tsx',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 (concierge chat surface): the AI Gemologist page from the reference applet (ai-gemologist/page.tsx) ported verbatim in the M6 editorial migration and wired to the Phase 9 AI concierge API.',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/about/[aboutSlug]/page.tsx',
    sotPath: 'app/(storefront)/about/...',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 13.1: /meet-our-team, /michael-arnstein -> /about/...',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/varieties/page.tsx',
    sotPath: 'app/(storefront)/varieties/page.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 13.2: /varieties new target-only route',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/varieties/[varietySlug]/page.tsx',
    sotPath: 'app/(storefront)/varieties/[slug]/page.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 13.2: /varieties/{slug} new target-only route',
    storefront: true,
    group: 'storefront',
      extraFiles: [
      'src/app/(storefront)/varieties/[varietySlug]/loading.tsx',
      'src/app/(storefront)/varieties/[varietySlug]/error.tsx',
      'src/app/(storefront)/varieties/[varietySlug]/not-found.tsx',
    ],
},

  // ── admin & vendor operational groups ────────────────────────────────────
  {
    fsPath: 'src/app/admin/layout.tsx',
    sotPath: 'app/admin/   # separate layout, separate authz',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: separate layout, separate authz',
    storefront: false,
    group: 'admin',
  },
  {
    fsPath: 'src/app/admin/[[...adminPath]]/page.tsx',
    sotPath: 'app/admin/   # /admin/**',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 13.2: /admin/** new target-only route',
    storefront: false,
    group: 'admin',
  },
  {
    fsPath: 'src/app/vendor/layout.tsx',
    sotPath: 'app/vendor/   # trade partner layout, separate authz',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 13.2: new target-only operational route for trade partner vendors',
    storefront: false,
    group: 'admin',
  },
  {
    fsPath: 'src/app/vendor/[[...vendorPath]]/page.tsx',
    sotPath: 'app/vendor/   # /vendor/**',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 13.2: /vendor/** trade partner product & fulfilment portal',
    storefront: false,
    group: 'admin',
  },

  // ── api (what the SoT chart calls "api/ — route handlers, section 11") ───
  {
    fsPath: 'src/app/api/README.md',
    sotPath: 'app/api/   # route handlers, section 11',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2: api/ route handlers. Reserved in Task 1: the Phase 3 catalogue handler already exists outside the Next app; mounting it into this App-Router namespace is a later rendering-layer task, NOT a Task 1 decision. UI pages never mount the Phase 3 handler either.',
    storefront: false,
    group: 'api',
  },
  {
    fsPath: 'src/app/api/search/route.ts',
    sotPath: 'app/api/search/route.ts   # storefront search suggest',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 11.2 + 13.2: Next-side route handler for the storefront search bar (renders-layer task; delegates to the storefront data seam, not the Phase 3 handler).',
    storefront: false,
    group: 'api',
  },
  {
    fsPath: 'src/app/api/v1/[...path]/route.ts',
    sotPath: 'app/api/v1/...   # Next-side delegation to the app API',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.2: api/ route handlers — the App Router mounting the framework-free `(Request)=>Response` API described in the app api README and delegated per technical_design/08 ("the Phase 4 Next.js route handlers delegate to exactly this function").',
    storefront: false,
    group: 'api',
  },
  {
    fsPath: 'src/app/demo/page.tsx',
    sotPath: 'app/demo/page.tsx   # development demo surface',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.2: new target-only route ([INFERRED] development-only demo surface, never linked from the storefront chrome).',
    storefront: false,
    group: 'app-root',
  },

  // ── SEO endpoints (Phase 4 Task 7: generated, never migrated) ────────────
  {
    fsPath: 'src/app/sitemap.xml/route.ts',
    sotPath: 'app/sitemap.xml/route.ts   # sitemap index',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.8 + technical_design/34 §9: sitemaps are generated, sharded above 50,000 URLs; /sitemap-static.xml 301s here.',
    storefront: false,
    group: 'app-root',
  },
  {
    fsPath: 'src/app/sitemap-products/[shard]/route.ts',
    sotPath: 'app/sitemap-products/[shard]/route.ts   # /sitemap-products/{N}.xml',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.8 + technical_design/34 §9: the numbered product sitemap shards; /sitemap-products-N.xml 301s here.',
    storefront: false,
    group: 'app-root',
  },
  {
    fsPath: 'src/app/robots.ts',
    sotPath: 'app/robots.ts   # /robots.txt (generated)',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.8 + technical_design/34 (route map doc 34, robots target): generated robots.txt; protected portals and APIs disallowed, sitemap reference from the canonical SITE_URL only.',
    storefront: false,
    group: 'app-root',
  },
  {
    fsPath: 'src/app/loading.tsx',
    sotPath: 'app/loading.tsx   # root skeleton fallback',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 (app root) + spec §11: route-level loading skeletons (aria-busy, never spinners) — the root fallback for suspended segments.',
    storefront: false,
    group: 'app-root',
    extraFiles: [],
  },
  {
    fsPath: 'src/app/not-found.tsx',
    sotPath: 'app/not-found.tsx   # root 404 boundary',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 (app root) + spec §6.1 error states: every unmatched path gets honest 404 UI with browse/search/home recovery navigation.',
    storefront: false,
    group: 'app-root',
    extraFiles: [],
  },
];

/** Every file the manifest expects to find on disk under `apps/web/`. */
export function manifestFiles(): string[] {
  const files: string[] = [];
  for (const entry of ROUTE_MANIFEST) {
    files.push(entry.fsPath);
    for (const extra of entry.extraFiles ?? []) files.push(extra);
  }
  // Reserved (created and empty but not implemented by Task 1) — checked too.
  return files;
}

/**
 * Reserved-but-empty future phase folders. They exist but are NOT implemented
 * in Task 1: no `.tsx` page is authored for them here.
 */
export const RESERVED_VIEW_PAGES: readonly string[] = [
  // Chat launcher entry — SoT 12.2 comment "(storefront)/ layout.tsx header,
  // mega menu, footer, chat launcher"; the orch layer is Phase 10+.
  // WebAR route is NOT rendered yet (Phase 11). No file authored.
];
