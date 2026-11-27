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
  readonly group: 'storefront' | 'admin' | 'vendor' | 'api' | 'app-root';
  /** Extra files required by SoT 12.2 alongside page.tsx. */
  readonly extraFiles?: readonly string[];
  /** Files documented as reserved-but-unimplemented for later tasks. */
  readonly reserved?: readonly string[];
  /**
   * Set when the route file exists only to issue a permanent redirect. Names
   * both codes the stack can emit for that intent — `301` in the SoT 13.1
   * migration table, `308` from `permanentRedirect` — and the canonical path.
   */
  readonly redirect?: string;
}

/**
 * The citation every develop-parity route carries. The client asked for the
 * storefront to look exactly like develop (verbatim design), so these routes
 * are copied from the develop worktree as demo surfaces and are cited to the
 * SoT route tree they extend plus that instruction. They do not create a new
 * business rule and they do not replace a SoT route.
 */
const DEVELOP_PARITY =
  'PROJECT_SOURCE_OF_TRUTH.md 12.2 (the route tree this extends) + docs/AUDIT_MAIN_VS_DEVELOP.md §6 Phase 2 step 9 and the client decision of 2026-11-26: a develop-parity demo route copied verbatim from develop so the storefront renders develop\'s design. It reads main\'s catalogue through lib/mgh/adapters and falls back to labelled demo content.';

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
      'src/app/not-found.tsx',
      // develop's root stylesheets, adopted with develop's root layout so the
      // storefront renders the design it was drawn against.
      'src/app/globals.css',
      'src/app/storefront-luxury.css',
      // main's two non-storefront sign-in frames, kept out of develop's sheet.
      'src/app/console-auth.css',
      // the fixture-content notice (one rule set, separate by design).
      'src/app/demo-content.css',
      // two mobile-fit rules over develop's copied sheets.
      'src/app/storefront-overrides.css',
      // the v4 craft layer (type scale, contrast, states, motion, details);
      // loaded last by the storefront layout only.
      'src/app/storefront-craft.css',
    ],
  },
  // ── (storefront) group ────────────────────────────────────────────────────
  {
    fsPath: 'src/app/(storefront)/layout.tsx',
    sotPath: 'app/(storefront)/layout.tsx',
    authority: 'PROJECT_SOURCE_OF_TRUTH.md 12.2: header, mega menu, footer, chat launcher',
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/error.tsx',
      'src/app/(storefront)/loading.tsx',
      'src/app/(storefront)/template.tsx',
      'src/app/(storefront)/not-found.tsx',
    ],
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
    fsPath: 'src/app/(storefront)/[varietySlug]/[productSlug]/page.tsx',
    sotPath:
      'app/(storefront)/[variety]/[productSlug]/page.tsx   # 301/308 redirect to /products/[slug]',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.1: `/{variety}/{slug}-K#####` (19,997 observed URLs) -> `/products/{slug}` 301, and 12.2: `products/[slug]/page.tsx   # canonical product detail`. The variety-scoped detail is a source URL family whose target is the canonical product detail, so the SoT-shaped route stays registered only as a permanent redirect to it rather than a second renderer of the same record.',
    storefront: true,
    group: 'storefront',
    redirect: '301/308 redirect to /products/[slug]',
    extraFiles: [
      'src/app/(storefront)/[varietySlug]/[productSlug]/not-found.tsx',
      'src/app/(storefront)/[varietySlug]/[productSlug]/loading.tsx',
      'src/app/(storefront)/[varietySlug]/[productSlug]/error.tsx',
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
    sotPath:
      'app/(storefront)/[variety]-rings/[slug]/page.tsx   # ready-made detail -> 301/308 redirect to /products/[slug]',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 names `[variety]-rings/[slug]/page.tsx` (ready-made) and the explicit label `products/[slug]/page.tsx   # canonical product detail`; 13.1 maps `/{variety}-rings/{slug}-J#####` (88 observed URLs) -> `/products/{slug}` 301. The SoT-named ready-made folder therefore stays registered only as a permanent redirect to the one canonical detail, not a second renderer of the same product record.',
    storefront: true,
    group: 'storefront',
    redirect: '301/308 redirect to /products/[slug]',
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
    fsPath: 'src/app/(storefront)/account/[[...accountPath]]/page.tsx',
    sotPath: 'app/(storefront)/account/...',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 + 13.1 + 13.2: /account/** one catch-all. It mounts develop\'s CustomerAccountApp (docs/AUDIT_MAIN_VS_DEVELOP.md §6 Phase 2 step 11) over main\'s ADR-027 session and the /api/fresh/auth/** adapters; static /account/login and /account/register keep main\'s sign-in pages. The app derives its section (overview, orders, saved, addresses, settings) from the trailing segments.',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/account/login/page.tsx',
    sotPath: 'app/(storefront)/account/login/page.tsx   # /account/login',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.1 (/auth -> /account/sign-in) + plan 37 P2.4 customer identity: the customer sign-in surface. A static segment outranks the optional `[[...accountPath]]` catch-all, so the page renders without the catch-all redirect guard.',
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/account/register/page.tsx',
    sotPath: 'app/(storefront)/account/register/page.tsx   # /account/register',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.2 (/account/** target-only route) + plan 37 P2.4 customer identity: self-registration creates the `users` row (admin_role NULL, unverified) that the account surface reads.',
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
    extraFiles: [
      'src/app/(storefront)/varieties/[varietySlug]/not-found.tsx',
      'src/app/(storefront)/varieties/[varietySlug]/loading.tsx',
      'src/app/(storefront)/varieties/[varietySlug]/error.tsx',
    ],
  },

  // ── develop-parity route families (client decision 2026-11-26) ───────────
  // Copied verbatim from develop so the storefront renders develop's design.
  // Each entry's authority cites both the SoT route tree it extends and the
  // audit's parity instruction; none of them invents a business rule.
  {
    fsPath: 'src/app/(storefront)/about/page.tsx',
    sotPath: 'app/(storefront)/about/page.tsx   # /about',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/ai-gemologist/page.tsx',
    sotPath: 'app/(storefront)/ai-gemologist/page.tsx   # /ai-gemologist',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/blog/[postSlug]/page.tsx',
    sotPath: 'app/(storefront)/blog/[postSlug]/page.tsx   # /blog/<post>',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/browse/page.tsx',
    sotPath: 'app/(storefront)/browse/page.tsx   # /browse',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/browse/not-found.tsx',
      'src/app/(storefront)/browse/loading.tsx',
      'src/app/(storefront)/browse/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/card-preview/page.tsx',
    sotPath: 'app/(storefront)/card-preview/page.tsx   # /card-preview',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/checkout/layout.tsx',
    sotPath: 'app/(storefront)/checkout/layout.tsx',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/checkout/confirmation/[orderId]/page.tsx',
    sotPath: 'app/(storefront)/checkout/confirmation/[orderId]/page.tsx',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/checkout/confirmation/[orderId]/loading.tsx',
      'src/app/(storefront)/checkout/confirmation/[orderId]/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/concierge/page.tsx',
    sotPath: 'app/(storefront)/concierge/page.tsx   # /concierge',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/demo/page.tsx',
    sotPath: 'app/(storefront)/demo/page.tsx   # /demo',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/gemstones/page.tsx',
    sotPath: 'app/(storefront)/gemstones/page.tsx   # /gemstones',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/jewellery/page.tsx',
    sotPath: 'app/(storefront)/jewellery/page.tsx   # /jewellery',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/jewellery/not-found.tsx',
      'src/app/(storefront)/jewellery/loading.tsx',
      'src/app/(storefront)/jewellery/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/pairs/page.tsx',
    sotPath: 'app/(storefront)/pairs/page.tsx   # /pairs',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/pairs/not-found.tsx',
      'src/app/(storefront)/pairs/loading.tsx',
      'src/app/(storefront)/pairs/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/policy/page.tsx',
    sotPath: 'app/(storefront)/policy/page.tsx   # /policy',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
  },
  {
    fsPath: 'src/app/(storefront)/product/[slug]/page.tsx',
    sotPath: 'app/(storefront)/product/[slug]/page.tsx   # 301/308 redirect to /products/[slug]',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 lists exactly one product detail route — `products/[slug]/page.tsx   # canonical product detail`. `/product/<slug>` is a develop-era alias with no SoT line naming it as a page, so it stays registered only as a permanent redirect to the canonical detail.',
    storefront: true,
    group: 'storefront',
    redirect: '301/308 redirect to /products/[slug]',
    extraFiles: [
      'src/app/(storefront)/product/[slug]/not-found.tsx',
      'src/app/(storefront)/product/[slug]/loading.tsx',
      'src/app/(storefront)/product/[slug]/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/shop/page.tsx',
    sotPath: 'app/(storefront)/shop/page.tsx   # /shop',
    authority: DEVELOP_PARITY,
    storefront: true,
    group: 'storefront',
    extraFiles: [
      'src/app/(storefront)/shop/not-found.tsx',
      'src/app/(storefront)/shop/loading.tsx',
      'src/app/(storefront)/shop/error.tsx',
    ],
  },
  {
    fsPath: 'src/app/(storefront)/unsubscribe/page.tsx',
    sotPath: 'app/(storefront)/unsubscribe/page.tsx   # /unsubscribe',
    authority: DEVELOP_PARITY,
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
  {
    fsPath: 'src/app/admin/login/page.tsx',
    sotPath: 'app/admin/login/page.tsx   # /admin/login',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.2 (/admin/**) + plan 37 P2 + ADR-027: the administrative sign-in surface. A static segment outranks the optional catch-all so the console guard cannot redirect-loop.',
    storefront: false,
    group: 'admin',
  },

  // ── vendor group (BUILD_BACKLOG Track D, ADR-026) ────────────────────────
  // A third non-storefront surface with its own chrome and its own authz, in
  // the same shape as admin: no storefront header/cart/chat, noindex.
  {
    fsPath: 'src/app/vendor/layout.tsx',
    sotPath: 'app/vendor/layout.tsx',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 (separate layout, separate authz) + BUILD_BACKLOG.md Track D (D1/D3): the vendor portal is an operator surface, delivered by ADR-026 as vendor-owned catalogue and order allocations.',
    storefront: false,
    group: 'vendor',
  },
  {
    fsPath: 'src/app/vendor/[[...vendorPath]]/page.tsx',
    sotPath: 'app/vendor/...   # /vendor/**',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 (separate layout, separate authz) + 13.2 (/admin/** new target-only surface, applied to vendors) + docs/AUDIT_MAIN_VS_DEVELOP.md §6 Phase 2 step 11: one optional catch-all renders develop\'s vendor portal (dashboard, analytics, submissions, inventory, settings) for every /vendor/** path after the session + membership guard. A static /vendor/login segment outranks it.',
    storefront: false,
    group: 'vendor',
  },
  {
    fsPath: 'src/app/vendor/login/page.tsx',
    sotPath: 'app/vendor/login/page.tsx   # /vendor/login',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 13.2 + BUILD_BACKLOG.md Track D (D1) + ADR-027: vendor sign-in reuses the first-party session and then checks vendor membership.',
    storefront: false,
    group: 'vendor',
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
    fsPath: 'src/app/api/[...path]/route.ts',
    sotPath: 'app/api/[...path]/route.ts   # /api/**',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 + plan 37 P1.1: the Phase 3 handler pipeline (createCatalogApi) is mounted into the App Router as ONE catch-all, because src/api/routes.ts is the single routing authority and the OpenAPI parity spec already proves handler coverage. Node runtime only (pg/ioredis are not Edge APIs).',
    storefront: false,
    group: 'api',
  },
  {
    fsPath: 'src/app/api/fresh/[...path]/route.ts',
    sotPath: 'app/api/fresh/[...path]/route.ts   # /api/fresh/**',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 (api/ route handlers) + docs/AUDIT_MAIN_VS_DEVELOP.md §6 Phase 2 step 10 (re-point the UI at main without editing it): the develop-UI compatibility surface. develop\'s console and vendor portal call /api/fresh/**, so main answers those exact paths from the locked schema (src/api/fresh/**, packages/db/src/compat/**). A static segment outranks the generic catch-all above.',
    storefront: false,
    group: 'api',
  },
  {
    fsPath: 'src/app/api/fresh-auth/[...path]/route.ts',
    sotPath: 'app/api/fresh-auth/[...path]/route.ts   # /api/fresh-auth/**',
    authority:
      'PROJECT_SOURCE_OF_TRUTH.md 12.2 (api/ route handlers) + ADR-027 (one session model): develop\'s CustomerAccountApp posts to /api/fresh-auth/{login,register,request-reset,logout}. Those four paths are thin adapters over main\'s existing auth handlers; they set the same maihan_session cookie and add no second identity table. The first path segment is fresh-auth, so this needs its own mount.',
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
