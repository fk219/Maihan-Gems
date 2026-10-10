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
    sotPath: 'app/(storefront)/[variety]/page.tsx   # /tsavorite-garnet',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: variety index for loose stones',
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
    fsPath: 'src/app/(storefront)/[varietySlug]-pairs/page.tsx',
    sotPath: 'app/(storefront)/[variety]-pairs/page.tsx   # /tsavorite-garnet-pairs',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: matched-pair variety index',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/[varietySlug]-pairs/not-found.tsx',
      'src/app/(storefront)/[varietySlug]-pairs/loading.tsx',
      'src/app/(storefront)/[varietySlug]-pairs/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/[varietySlug]-rings/page.tsx',
    sotPath: 'app/(storefront)/[variety]-rings/page.tsx   # /tsavorite-garnet-rings',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: ready-made variety rings index',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/[varietySlug]-rings/not-found.tsx',
      'src/app/(storefront)/[varietySlug]-rings/loading.tsx',
      'src/app/(storefront)/[varietySlug]-rings/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/[varietySlug]-rings/[productSlug]/page.tsx',
    sotPath: 'app/(storefront)/[variety]-rings/[slug]/page.tsx   # ready-made detail',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: ready-made product detail',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/[varietySlug]-rings/[productSlug]/not-found.tsx',
      'src/app/(storefront)/[varietySlug]-rings/[productSlug]/loading.tsx',
      'src/app/(storefront)/[varietySlug]-rings/[productSlug]/error.tsx',
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
    fsPath: 'src/app/(storefront)/account/[[...accountPath]]/page.tsx',
    sotPath: 'app/(storefront)/account/...',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1 + 13.2: /account/** one catch-all, sub-routes committed by Phase 6',
    storefront: true,
    group: 'storefront',
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
  },

  // ── admin group ──────────────────────────────────────────────────────────
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

  // ── api (what the SoT chart calls "api/ — route handlers, section 11") ───
  {
    fsPath: 'src/app/api/README.md',
    sotPath: 'app/api/   # route handlers, section 11',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2: api/ route handlers. Reserved in Task 1: the Phase 3 catalogue handler already exists outside the Next app; mounting it into this App-Router namespace is a later rendering-layer task, NOT a Task 1 decision. UI pages never mount the Phase 3 handler either.',
    storefront: false,
    group: 'api',
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
