/**
 * apps/web/src/lib/redirects.ts
 *
 * Legacy URL parity (Phase 4 Task 6).
 *
 * Authority: PROJECT_SOURCE_OF_TRUTH.md section 13.1 / 12.8,
 * technical_design/34_URL_PARITY_AND_REDIRECT_ARCHITECTURE.md.
 *
 * ---------------------------------------------------------------------------
 * What this is
 * ---------------------------------------------------------------------------
 * A DETERMINISTIC, RULE-BASED resolver for the 44,218 observed source URLs.
 * It is not a 44,218-entry table: doc 34 section 3 defines the mapping as
 * ROUTE FAMILIES, and almost every family target is derivable from the source
 * URL alone. The resolver is therefore bounded in size by the number of rules
 * (a constant), not by the size of the corpus.
 *
 * Two layers, in doc 34 section 7's order:
 *
 *   1. EXPLICIT ROWS — the materialised `redirects` table (migration stage
 *      `cms-redirects`). One row per source URL, UNIQUE(from_path). Loaded
 *      once into an in-memory index; never a per-request database read.
 *   2. FAMILY RULES — the section 3 mapping, applied when no explicit row
 *      exists. These reproduce the migration's committed `mapRedirect`
 *      (`tools/migrate/src/stages/cms-redirects.ts`) for every family whose
 *      target is a function of the URL text.
 *
 * ---------------------------------------------------------------------------
 * What it deliberately does NOT do
 * ---------------------------------------------------------------------------
 *   - It NEVER redirects an unknown path to `/`, to the homepage, or to a
 *     listing "as a substitute for a product" (doc 34 section 2). An unmatched
 *     path resolves to `null`, i.e. the framework's 404 with suggestions.
 *   - It NEVER invents a destination. Where a family's target is not derivable
 *     from the URL text, the rule is absent and the exclusive row is REQUIRED.
 *     That is precisely the READY_MADE family (`/{variety}-rings/{slug}-J#####`):
 *     its target is the canonical `products.slug`, which differs from the
 *     source slug (singularisation, a descriptive prefix, `Ct.Tw.` reflow) and
 *     cannot be computed from the URL. Those 88 URLs are served by the explicit
 *     `redirects` rows the migration generates — never by a guess here.
 *   - It NEVER goes to the database at request time (doc 34 section 7:
 *     "fully cached in memory; lookup must not hit Postgres per request").
 *
 * Pure module: no Node, no `server-only`, no framework import — it runs in
 * Next middleware (Edge) and in tests unchanged.
 */

/** One materialised mapping. Mirrors the `redirects` table's usable columns. */
export interface RedirectRow {
  /** Source path, INCLUDING a query string when the row is query-specific. */
  readonly from_path: string;
  /** Absolute internal path (`/...`), already query-mapped by the migration. */
  readonly to_path: string;
  /** 200 (served, no redirect), 301, 302 or 410. */
  readonly status_code: number;
}

export type RedirectStatus = 301 | 302 | 410;

/** A redirect to apply. `null` (from `resolve`) means "not handled by us". */
export interface RedirectDecision {
  readonly target: string;
  readonly status: RedirectStatus;
}

export interface RedirectResolver {
  /**
   * Resolve an incoming request. Returns `null` when the path is not a legacy
   * URL — the caller then lets the framework serve the route or 404.
   */
  resolve(pathname: string, search?: string): RedirectDecision | null;
  /** True when this exact path (and optional query) is a known source URL. */
  recognises(pathname: string, search?: string): boolean;
  /** Number of explicit rows held in the index (diagnostics/tests). */
  readonly size: number;
}

// ---------------------------------------------------------------------------
// Normalisation (doc 34 section 7)
// ---------------------------------------------------------------------------

/**
 * Lowercase, collapse repeated separators, strip a trailing slash. The root
 * stays `/`. The source corpus is lowercase (44,218 URLs verified), so folding
 * case cannot merge two distinct source URLs.
 */
export function normalizePath(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/').toLowerCase();
  if (collapsed === '' || collapsed === '/') return '/';
  const trimmed = collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Query mapping (doc 34 section 4): `?design-styles=` is renamed to `?style=`
 * explicitly; every other parameter is PRESERVED verbatim, in order, never
 * dropped. `search` may be given with or without the leading `?`.
 */
export function mapQuery(search: string): string {
  const params = search.startsWith('?') ? search.slice(1) : search;
  if (params.length === 0) return '';
  const mapped = params.split('&').map((pair) => {
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    if (key === 'design-styles') return eq === -1 ? 'style' : `style${pair.slice(eq)}`;
    return pair;
  });
  return `?${mapped.join('&')}`;
}

function withQuery(target: string, search: string | undefined): string {
  if (search === undefined || search.length === 0) return target;
  const mapped = mapQuery(search);
  if (mapped.length === 0) return target;
  // An explicit-row target may already carry its query; never double it.
  return target.includes('?') ? target : `${target}${mapped}`;
}

// ---------------------------------------------------------------------------
// Family rules (doc 34 section 3)
// ---------------------------------------------------------------------------

/** `/{anything}/{slug}-K#####` — loose stone. */
const LOOSE_STONE = /^\/([^/]+)\/(.+)-k\d+$/;
/** `/{variety}-pairs/{slug}-PR#####` — matched pair. */
const STONE_PAIR = /^\/([^/]+)-pairs\/(.+)-pr\d+$/;
/** `/{variety}-rings/{slug}-J#####` — ready-made; needs the explicit row. */
const READY_MADE = /^\/[^/]+-rings\/.+-j\d+$/;
/** `/{dir}/{slug}-J#####` where the dir is NOT `-rings` — no canonical entity. */
const UNKNOWN_J = /^\/([^/]+)\/(.+)-j\d+$/;
/**
 * `/{dir}/{slug}-S#####` — the single `S#####` reference the migration parser
 * recorded in the UNKNOWN family (`cms-redirects.ts`: "and one `S#####`
 * reference"). No canonical entity exists, so it is an honest 410.
 */
const S_REF = /^\/([^/]+)\/(.+)-s\d+$/;
/** `/{colour}-gemstones`. */
const COLOUR_INDEX = /^\/([a-z0-9-]+)-gemstones$/;
const SETTING_RING = /^\/gemstone-ring-settings\/(.+)$/;
const SETTING_NP = /^\/gemstone-necklace-pendant-settings\/(.+)$/;
const SETTING_EAR = /^\/gemstone-earring-settings\/(.+)$/;
const DYO_REVIEW = /^\/design-your-own\/review\/(.+)$/;
const SITEMAP_PRODUCT = /^\/sitemap-products-(\d+)\.xml$/;

/** Exact depth-1 source routes whose shape is unchanged in the target (doc 34 section 3). */
const SERVED_DIRECTLY: ReadonlySet<string> = new Set([
  '/',
  '/cart',
  '/account',
  '/favorites',
  '/financing',
  '/blog',
]);

/** Exact source routes with a fixed 301/302 target. */
const FIXED_REDIRECTS: ReadonlyMap<string, RedirectDecision> = new Map<string, RedirectDecision>([
  ['/auth', { target: '/account/sign-in', status: 301 }],
  ['/verify-email', { target: '/account/verify-email', status: 301 }],
  ['/cart/order-summary', { target: '/checkout/order-summary', status: 301 }],
  ['/cart/payment-order', { target: '/checkout/payment-order', status: 301 }],
  ['/cart/secure-payment', { target: '/checkout/secure-payment', status: 301 }],
  ['/compare-list', { target: '/compare', status: 301 }],
  ['/contact-us', { target: '/contact', status: 301 }],
  ['/extend-protection-plan', { target: '/protection-plan', status: 301 }],
  ['/custom-design-gemstone-rings-jewelry', { target: '/design-your-own', status: 301 }],
  ['/meet-our-team', { target: '/about/meet-our-team', status: 301 }],
  ['/michael-arnstein', { target: '/about/michael-arnstein', status: 301 }],
  ['/gemstone-bracelet-settings', { target: '/settings', status: 301 }],
  ['/mens-gemstone-ring-settings', { target: '/settings?style=mens', status: 302 }],
  ['/sitemap-static.xml', { target: '/sitemap.xml', status: 301 }],
]);

/** New target-only routes: never intercepted, always served by the app. */
const NEW_ROUTE_PREFIXES: readonly string[] = [
  '/products/',
  '/settings/',
  '/settings',
  '/design-your-own',
  '/colour/',
  '/search',
  '/checkout/',
  '/account/',
  '/about/',
  '/policy/',
  '/showrooms',
  '/varieties',
  '/ar/',
  '/admin',
  '/_next/',
];

/** True when the path is a NEW route the app serves itself. */
export function isNewRoute(pathname: string): boolean {
  for (const prefix of NEW_ROUTE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) || pathname === prefix.replace(/\/$/, '')) {
      return true;
    }
  }
  return false;
}

/**
 * The last path segment with its trailing reference token (`-K#####`,
 * `-PR#####`, `-J#####`, `-S#####`) removed — the source slug, verbatim
 * (doc 34 section 5: the target slug preserves the source shape).
 */
export function sourceSlugOf(pathname: string): string | null {
  const last = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (last.length === 0) return null;
  const stripped = last.replace(/-(?:k|pr|j|s)\d+$/i, '');
  return stripped.length > 0 ? stripped : null;
}

/**
 * What the storefront does with a legacy path. Used by the resolver and by the
 * spine coverage test so both read from ONE source of logic.
 */
export type LegacyDisposition =
  /** Target route shape unchanged — served directly, no redirect. */
  | 'served'
  /** A family rule produced a target. */
  | 'redirect'
  /** Only the explicit `redirects` row can resolve this (READY_MADE). */
  | 'needs-row'
  /** 410: no equivalent and no useful replacement (doc 34 section 2). */
  | 'removed'
  /** Matches no documented family — 404 with suggestions. */
  | 'unknown';

export interface LegacyClassification {
  readonly disposition: LegacyDisposition;
  readonly decision: RedirectDecision | null;
}

/**
 * Classify a legacy path against the section 3 mapping. Pure.
 */
export function classifyLegacyPath(pathname: string): LegacyClassification {
  const p = normalizePath(pathname);
  const served = (): LegacyClassification => ({ disposition: 'served', decision: null });
  const redirect = (target: string, status: 301 | 302): LegacyClassification => ({
    disposition: 'redirect',
    decision: { target, status },
  });

  // DYO family comes FIRST: its source shape sits under a target-only prefix
  // (`/design-your-own`), so `isNewRoute` must not short-circuit it. The
  // long source slug 301s to the composed `{sku}-{ref}` code; a request that
  // already IS the code re-computes to itself and the resolver's loop guard
  // turns it into `served`.
  const dyo = DYO_REVIEW.exec(p);
  if (dyo !== null) {
    const tokens = dyo[1]?.split('-') ?? [];
    const sku = tokens[tokens.length - 2] ?? '';
    const ref = tokens[tokens.length - 1] ?? '';
    if (/^js\d+[a-z]*\d*$/i.test(sku) && /^(?:k|pr)\d+$/i.test(ref)) {
      return redirect(`/design-your-own/review/${sku.toUpperCase()}-${ref.toUpperCase()}`, 301);
    }
    // Under the DYO review prefix but not the documented shape: not ours.
    return { disposition: 'unknown', decision: null };
  }

  // A new target-only route is never a legacy URL.
  if (isNewRoute(p)) return served();

  // Served directly: the target route is identical in shape (doc 34 section 2).
  if (SERVED_DIRECTLY.has(p)) return served();

  const fixed = FIXED_REDIRECTS.get(p);
  if (fixed !== undefined) return { disposition: 'redirect', decision: fixed };

  // Showroom family: /showroom/** -> /showrooms/**.
  if (p === '/showroom') return redirect('/showrooms', 301);
  if (p.startsWith('/showroom/')) return redirect(`/showrooms/${p.slice('/showroom/'.length)}`, 301);

  // Generated sitemap family.
  if (p === '/sitemap.xml') return served();
  const sitemap = SITEMAP_PRODUCT.exec(p);
  if (sitemap !== null) return redirect(`/sitemap-products/${sitemap[1] ?? ''}.xml`, 301);

  // Collection family: /all-* -> /search?collection=all (temporary).
  if (p.startsWith('/all-')) return redirect('/search?collection=all', 302);

  // Stone families. Pairs first, then the loose-stone rule.
  if (STONE_PAIR.test(p)) {
    const slug = sourceSlugOf(p);
    if (slug !== null) return redirect(`/products/${slug}`, 301);
  }
  if (READY_MADE.test(p)) {
    // Target is the canonical products.slug — NOT derivable from the URL; the
    // explicit `redirects` row owns this URL. Never guessed here.
    return { disposition: 'needs-row', decision: null };
  }
  if (UNKNOWN_J.test(p)) {
    // `/gemstone-bracelets-bangles/{slug}-J#####` and friends: the parser
    // resolved no canonical entity, so no target resolves (doc 34 section 2).
    return { disposition: 'removed', decision: { target: p, status: 410 } };
  }
  if (LOOSE_STONE.test(p)) {
    const slug = sourceSlugOf(p);
    if (slug !== null) return redirect(`/products/${slug}`, 301);
  }
  if (S_REF.test(p)) {
    // The one `S#####` source URL: no canonical entity (doc 34 section 2).
    return { disposition: 'removed', decision: { target: p, status: 410 } };
  }

  // Settings family: the SKU is the slug's trailing `js<core><metal>` token.
  for (const re of [SETTING_RING, SETTING_NP, SETTING_EAR]) {
    if (re.test(p)) {
      const slug = p.slice(p.lastIndexOf('/') + 1);
      const sku = (slug.split('-').pop() ?? '').toUpperCase();
      if (sku.startsWith('JS')) return redirect(`/settings/${sku}`, 301);
      return { disposition: 'unknown', decision: null };
    }
  }

  // Colour family. `/all-*` already ran, so this is a colour index.
  const colour = COLOUR_INDEX.exec(p);
  if (colour !== null) return redirect(`/colour/${colour[1] ?? ''}`, 301);

  // Education and /gemstone-* category indexes keep their shape.
  if (p.startsWith('/education')) return served();
  if (p.startsWith('/gemstone-') && !p.slice(1).includes('/')) return served();

  // Remaining depth-1 route: a variety / category index (shape unchanged).
  if (!p.slice(1).includes('/')) return served();

  return { disposition: 'unknown', decision: null };
}

/**
 * Apply the section 3 family rules. `null` when no family rule produces a
 * redirect (served directly, needs an explicit row, or unknown → 404).
 */
export function familyRedirect(pathname: string): RedirectDecision | null {
  return classifyLegacyPath(pathname).decision;
}

// ---------------------------------------------------------------------------
// The resolver
// ---------------------------------------------------------------------------

function isRedirectStatus(code: number): code is RedirectStatus {
  return code === 301 || code === 302 || code === 410;
}

/**
 * Build a resolver from the materialised `redirects` rows (may be empty — the
 * family rules then carry every derivable URL).
 */
export function createRedirectResolver(rows: Iterable<RedirectRow> = []): RedirectResolver {
  const byPath = new Map<string, RedirectRow>();
  const byPathAndQuery = new Map<string, RedirectRow>();
  for (const row of rows) {
    const q = row.from_path.indexOf('?');
    if (q === -1) {
      byPath.set(normalizePath(row.from_path), row);
    } else {
      byPathAndQuery.set(`${normalizePath(row.from_path.slice(0, q))}${row.from_path.slice(q)}`, row);
    }
  }

  const lookup = (pathname: string, search?: string): RedirectDecision | null => {
    const p = normalizePath(pathname);
    let row: RedirectRow | undefined;
    if (search !== undefined && search.length > 0) {
      row = byPathAndQuery.get(`${p}${search.startsWith('?') ? search : `?${search}`}`);
    }
    row ??= byPath.get(p);
    if (row !== undefined) {
      if (row.status_code === 200) return null; // served directly — no redirect
      if (isRedirectStatus(row.status_code)) {
        const target = row.to_path;
        // Shield against a self-redirect loop.
        if (normalizePath(target.split('?')[0] ?? target) === p) return null;
        return { target, status: row.status_code };
      }
    }
    const family = familyRedirect(p);
    if (family === null) return null;
    if (family.status === 410) return family;
    const target = withQuery(family.target, search);
    if (normalizePath(target.split('?')[0] ?? target) === p) return null; // no loop
    return { target, status: family.status };
  };

  return {
    resolve: lookup,
    recognises: (pathname: string, search?: string): boolean => {
      const p = normalizePath(pathname);
      if (byPath.has(p)) return true;
      if (search !== undefined && search.length > 0 && byPathAndQuery.has(`${p}${search.startsWith('?') ? search : `?${search}`}`)) return true;
      return familyRedirect(p) !== null;
    },
    get size(): number {
      return byPath.size + byPathAndQuery.size;
    },
  };
}
