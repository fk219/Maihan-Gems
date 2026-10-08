/**
 * tools/migrate — stage "cms-redirects" (Phase 2 Global Task 19 = plan
 * detailed task 19, epic E2.8).
 *
 * Plan task 19 (verbatim): "Generate the 44,218 redirect rows from the
 * section 13.1 mapping." Done when "Count matches; mapping applied without
 * collision".
 *
 * Doc 34 §1 states the test as absolute: every source URL either resolves
 * directly or returns a status to a target that resolves. This stage emits
 * exactly one row per source URL from `urls.jsonl` (the migration spine,
 * 44,218) — no URL is dropped, none is invented.
 *
 * STATUS (doc 34 §2, authoritative):
 *   200 — the target route is identical in shape (no redirect)
 *   301 — the target route differs
 *   302 — temporary mapping (mens filter, "all" collection)
 *   410 — confirmed no equivalent and no useful replacement
 *
 * TARGETS come from SoT 13.1 / doc 34 §3, applied through the COMMITTED
 * parse (`staging_parsed_urls`) rather than a second slug parser, so this
 * stage can never disagree with GT12's verified classification:
 *
 *   LOOSE_STONE  `/{variety}/{slug}-K#####`   -> `/products/{slug}`      301
 *   STONE_PAIR   `/{variety}-pairs/{slug}-PR#`-> `/products/{slug}`      301
 *   READY_MADE   `/{variety}-rings/{slug}-J#` -> `/products/{slug}`      301
 *   DYO          `/design-your-own/review/…`  -> `/design-your-own/review/{code}` 301
 *   SETTING      `/gemstone-*-settings/{slug}`-> `/settings/{sku}`       301
 *   category/functional/education/index routes -> §3 rows verbatim
 *
 * Slug policy (doc 34 §5): target slugs PRESERVE the source shape and are
 * derived from the source slug, never from a mutable display name. Loose
 * stones and pairs have no canonical slug column (the source URL is their
 * only slug evidence), so the source slug token is carried verbatim;
 * ready-made products use their canonical `products.slug`.
 *
 * Query strings (doc 34 §4): `?design-styles=` is mapped explicitly to
 * `?style=`; every other parameter — including the 423 `?rs=` sort/page
 * parameters whose target name is not yet defined — is PRESERVED verbatim,
 * never silently dropped.
 *
 * Two documented deviations from the §3 table, both following doc 34 §2's
 * mechanical status rule where the table's column is imprecise:
 *   - `/gemstone-bracelet-settings` -> `/settings` is recorded 301 (the
 *     route differs); the table's "no" would leave one source URL pointing
 *     at a route the new site does not serve.
 *   - 318 UNKNOWN-family URLs (`/gemstone-bracelets-bangles/{slug}-J#####`
 *     and one `S#####` reference) have NO canonical entity in the migrated
 *     catalogue, so no `/products/{slug}` target can resolve. They are
 *     recorded 410 with the reason — doc 34 §2's honest removal — never
 *     redirected to an unrelated page and never silently dropped.
 *
 * Idempotency (gate V17): NOT EXISTS-guarded insert by `from_path` plus a
 * determinism check that pre-existing rows agree with the recomputed map.
 */
import type { StageContext } from './context.js';

export const EXPECTED_REDIRECTS = 44_218;

export interface RedirectRow {
  readonly from_path: string;
  readonly to_path: string;
  readonly status_code: number;
  readonly reason: string;
}

interface Input {
  readonly url_family: string;
  readonly source_url: string;
  readonly derived_sku: string | null;
  readonly design_code: string | null;
  readonly gem_ref_derived: string | null;
  /** canonical `products.slug`, present for READY_MADE rows */
  readonly product_slug: string | null;
}

const REASON_PREFIX = 'SoT 13.1 / doc 34 §3';

/** Carry a query string to the target: map `design-styles`, preserve all else. */
function mapQuery(search: string): { original: string; mapped: string; mappedAny: boolean } {
  if (search.length === 0) return { original: '', mapped: '', mappedAny: false };
  const params = search.startsWith('?') ? search.slice(1) : search;
  let mappedAny = false;
  const out = params.split('&').map((pair) => {
    const [rawKey = '', ...rest] = pair.split('=');
    const value = rest.join('=');
    if (rawKey === 'design-styles') {
      mappedAny = true;
      return `style=${value}`;
    }
    return pair;
  });
  return { original: search, mapped: out.length > 0 ? `?${out.join('&')}` : '', mappedAny };
}

/** `/{v}/{slug}-k27053` -> `slug`; the source slug token, verbatim. */
function sourceSlugOf(pathname: string): string | null {
  const last = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (last.length === 0) return null;
  const stripped = last.replace(/-(?:k|pr|j|s)\d+$/i, '');
  return stripped.length > 0 ? stripped : null;
}

function identity(fromPath: string, reason: string): RedirectRow {
  return { from_path: fromPath, to_path: fromPath, status_code: 200, reason };
}

/**
 * Deterministic 13.1 mapping for one source URL. Throws when no rule
 * applies: an unmapped URL is a halt, never a guess.
 */
export function mapRedirect(input: Input): RedirectRow {
  const url = new URL(input.source_url);
  const pathname = url.pathname;
  const q = mapQuery(url.search);
  const fromPath = `${pathname}${q.original}`;
  const query = q.mapped;
  const preserved = q.mappedAny ? ' (design-styles mapped to style)' : (query.length > 0 ? ' (query preserved)' : '');
  const withQuery = (target: string, status: number, reason: string): RedirectRow =>
    ({ from_path: fromPath, to_path: `${target}${query}`, status_code: status, reason });
  // Identity mapping, unless a query parameter is explicitly renamed
  // (`?design-styles=` -> `?style=`, doc 34 §4): then the target differs and
  // doc 34 §2 requires a 301.
  const identityOrMapped = (reason: string): RedirectRow =>
    q.mappedAny
      ? { from_path: fromPath, to_path: `${pathname}${query}`, status_code: 301, reason: `${reason}; ?design-styles mapped to ?style (doc 34 §4)` }
      : identity(fromPath, reason);

  switch (input.url_family) {
    case 'LOOSE_STONE':
    case 'STONE_PAIR': {
      const slug = sourceSlugOf(pathname);
      if (slug === null) throw new Error(`redirects: ${fromPath} has no source slug token`);
      return withQuery(`/products/${slug}`, 301, `${REASON_PREFIX}: stone/pair -> /products/{slug} (source-shape slug)${preserved}`);
    }
    case 'READY_MADE': {
      if (input.product_slug === null) throw new Error(`redirects: ${fromPath} has no canonical products.slug`);
      return withQuery(`/products/${input.product_slug}`, 301, `${REASON_PREFIX}: ready-made -> /products/{slug} (canonical products.slug)${preserved}`);
    }
    case 'DYO': {
      // The composed configuration code, exactly as GT14 wrote it and as
      // GT15 derived it: `{design}-{gem_ref}`. For the 1,024 captured pages
      // this equals the observed `products.source_sku` verbatim (V3/V19).
      const design = input.design_code;
      const gemRef = input.gem_ref_derived;
      if (design === null || gemRef === null) {
        throw new Error(`redirects: ${fromPath} has no design/ref composition tokens`);
      }
      const code = `${design}-${gemRef}`.toUpperCase();
      return withQuery(`/design-your-own/review/${code}`, 301, `${REASON_PREFIX}: DYO -> /design-your-own/review/{code}${preserved}`);
    }
    case 'SETTING': {
      if (input.derived_sku === null) throw new Error(`redirects: ${fromPath} has no setting variant SKU`);
      return withQuery(`/settings/${input.derived_sku}`, 301, `${REASON_PREFIX}: setting -> /settings/{sku}${preserved}`);
    }
    case 'UNKNOWN':
      return { from_path: fromPath, to_path: fromPath, status_code: 410, reason: 'doc 34 §2 410: no canonical entity in the migrated catalogue (parser did not resolve this family); no useful replacement target exists — honest removal, not a redirect to an unrelated page' };
    case 'EDUCATION':
      return identityOrMapped(`${REASON_PREFIX}: /education/** route shape unchanged — served directly (doc 34 §2: 200, no redirect)`);
    case 'VARIETY_INDEX':
      // Deliberately NOT returned here: the parser classes every depth-1
      // route as VARIETY_INDEX, including /mens-gemstone-ring-settings,
      // which §3 maps to a 302. Fall through to the §3 path rules, where
      // the depth-1 index fallback yields the correct identity mapping.
      break;
    default:
      break;
  }

  // Remaining families (category indexes and functional routes) are decided
  // by exact route shape, per §3.
  if (pathname === '/') return identityOrMapped('root route shape unchanged — served directly (doc 34 §2: 200, no redirect)');
  if (pathname === '/cart') return identityOrMapped(`${REASON_PREFIX}: /cart route shape unchanged — served directly`);
  if (pathname === '/account') return identityOrMapped(`${REASON_PREFIX}: /account route shape unchanged — served directly`);
  if (pathname === '/favorites') return identityOrMapped(`${REASON_PREFIX}: /favorites route shape unchanged — served directly`);
  if (pathname === '/financing') return identityOrMapped(`${REASON_PREFIX}: /financing route shape unchanged — served directly`);
  if (pathname === '/blog') return identityOrMapped(`${REASON_PREFIX}: /blog route shape unchanged — served directly`);
  if (pathname === '/auth') return withQuery('/account/sign-in', 301, `${REASON_PREFIX}: /auth -> /account/sign-in`);
  if (pathname === '/verify-email') return withQuery('/account/verify-email', 301, `${REASON_PREFIX}: /verify-email -> /account/verify-email`);
  if (pathname === '/cart/order-summary') return withQuery('/checkout/order-summary', 301, `${REASON_PREFIX}: /cart/order-summary -> /checkout/order-summary`);
  if (pathname === '/cart/payment-order') return withQuery('/checkout/payment-order', 301, `${REASON_PREFIX}: /cart/payment-order -> /checkout/payment-order`);
  if (pathname === '/cart/secure-payment') return withQuery('/checkout/secure-payment', 301, `${REASON_PREFIX}: /cart/secure-payment -> /checkout/secure-payment`);
  if (pathname === '/compare-list') return withQuery('/compare', 301, `${REASON_PREFIX}: /compare-list -> /compare`);
  if (pathname === '/contact-us') return withQuery('/contact', 301, `${REASON_PREFIX}: /contact-us -> /contact`);
  if (pathname === '/extend-protection-plan') return withQuery('/protection-plan', 301, `${REASON_PREFIX}: /extend-protection-plan -> /protection-plan`);
  if (pathname === '/custom-design-gemstone-rings-jewelry') return withQuery('/design-your-own', 301, `${REASON_PREFIX}: /custom-design-gemstone-rings-jewelry -> /design-your-own`);
  if (pathname === '/meet-our-team') return withQuery('/about/meet-our-team', 301, `${REASON_PREFIX}: /meet-our-team -> /about/{slug}`);
  if (pathname === '/michael-arnstein') return withQuery('/about/michael-arnstein', 301, `${REASON_PREFIX}: /michael-arnstein -> /about/{slug}`);
  if (pathname === '/showroom' || pathname.startsWith('/showroom/')) {
    return withQuery(pathname.replace(/^\/showroom/, '/showrooms'), 301, `${REASON_PREFIX}: /showroom/** -> /showrooms/**`);
  }
  if (pathname === '/mens-gemstone-ring-settings') return withQuery('/settings?style=mens', 302, `${REASON_PREFIX}: /mens-gemstone-ring-settings -> /settings?style=mens (temporary, doc 34 §2)`);
  if (pathname === '/gemstone-bracelet-settings') return withQuery('/settings', 301, `${REASON_PREFIX}: /gemstone-bracelet-settings -> /settings (route differs, doc 34 §2 301)`);
  if (pathname === '/sitemap-static.xml') return { from_path: fromPath, to_path: '/sitemap.xml', status_code: 301, reason: `${REASON_PREFIX}: sitemap-static.xml -> /sitemap.xml (target generated by the new site)` };
  const sitemapProduct = /^\/sitemap-products-(\d+)\.xml$/.exec(pathname);
  if (sitemapProduct !== null) {
    return { from_path: fromPath, to_path: `/sitemap-products/${sitemapProduct[1] ?? ''}.xml`, status_code: 301, reason: `${REASON_PREFIX}: sitemap-products-N.xml -> /sitemap-products/N.xml (target generated by the new site)` };
  }
  if (pathname.startsWith('/all-')) return withQuery('/search?collection=all', 302, `${REASON_PREFIX}: /all-* -> /search?collection=all (temporary, doc 34 §2)`);
  if (pathname.startsWith('/gemstone-') && !pathname.includes('/')) {
    return identityOrMapped(`${REASON_PREFIX}: /gemstone-* category index route shape unchanged — served directly`);
  }
  const colourIndex = /^\/([a-z0-9-]+)-gemstones$/.exec(pathname);
  if (colourIndex !== null) {
    const colour = colourIndex[1] ?? '';
    return withQuery(`/colour/${colour}`, 301, `${REASON_PREFIX}: /{colour}-gemstones -> /colour/{colour}`);
  }
  if (pathname.startsWith('/') && !pathname.slice(1).includes('/')) {
    // remaining depth-1 index routes: /{variety}, /{variety}-pairs, /{variety}-rings
    return identityOrMapped(`${REASON_PREFIX}: variety/category index route shape unchanged — served directly`);
  }
  throw new Error(`redirects: no 13.1 rule maps ${fromPath} (family ${input.url_family})`);
}

/** Execute the redirect-generation stage (corpus mode holds the count). */
export async function runCmsRedirects(ctx: StageContext, options?: { corpus?: boolean }): Promise<{
  readonly rows: number;
  readonly inserted: number;
  readonly byStatus: string;
  readonly byFamily: string;
}> {
  const db = ctx.db;

  const productSlugs = new Map<string, string>();
  for (const row of (await db.query<{ source_url: string; slug: string }>('SELECT source_url, slug FROM products')).rows) {
    productSlugs.set(row.source_url, row.slug);
  }

  const parsed = (await db.query<{
    url_family: string;
    source_url: string;
    derived_sku: string | null;
    design_code: string | null;
    gem_ref_derived: string | null;
  }>('SELECT url_family, source_url, derived_sku, design_code, gem_ref_derived FROM staging_parsed_urls ORDER BY source_url')).rows;

  const rows: RedirectRow[] = parsed.map((row) => mapRedirect({
    url_family: row.url_family,
    source_url: row.source_url,
    derived_sku: row.derived_sku,
    design_code: row.design_code,
    gem_ref_derived: row.gem_ref_derived,
    product_slug: productSlugs.get(row.source_url) ?? null,
  }));

  // collision + uniqueness gate: one row per source URL, no duplicate from_path.
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.from_path)) {
      throw new Error(`redirects: duplicate source path ${row.from_path}`);
    }
    seen.add(row.from_path);
    if (!row.to_path.startsWith('/')) {
      throw new Error(`redirects: target ${row.to_path} is not an absolute path (from ${row.from_path})`);
    }
    if (row.status_code === 200 && row.to_path !== row.from_path) {
      throw new Error(`redirects: identity row ${row.from_path} points at ${row.to_path}`);
    }
  }

  if (options?.corpus !== false && rows.length !== EXPECTED_REDIRECTS) {
    throw new Error(`redirects: mapped ${rows.length} source URLs, expected the spine's ${EXPECTED_REDIRECTS}`);
  }

  // Destination validity (doc 34 §1): every 301/302 target must resolve.
  // Checked in TypeScript against the canonical tables rather than with an
  // opaque SQL pattern list: settings resolve by variant SKU, ready-made
  // products by `products.slug`, loose stones and pairs by their canonical
  // gem_ref (their slug evidence is the source URL), DYO by product SKU,
  // and the remaining targets are §3 routes that are structural by design.
  const variantSkus = new Set((await db.query<{ sku: string }>('SELECT sku FROM setting_variants')).rows.map((r) => r.sku));
  const productSlugSet = new Set(productSlugs.values());
  const dyoCodes = new Set<string>();
  for (const row of (await db.query<{ source_sku: string | null; source_sku_derived: string | null }>(
    'SELECT source_sku, source_sku_derived FROM products',
  )).rows) {
    for (const code of [row.source_sku, row.source_sku_derived]) {
      if (code !== null && code.length > 0) dyoCodes.add(code.toUpperCase());
    }
  }
  const gemRefs = new Set((await db.query<{ gem_ref: string }>('SELECT gem_ref FROM gemstones')).rows.map((r) => r.gem_ref.toUpperCase()));
  const stoneSlugs = new Set<string>();
  for (const row of parsed) {
    if (row.url_family !== 'LOOSE_STONE' && row.url_family !== 'STONE_PAIR') continue;
    const gemRef = (row.gem_ref_derived ?? '').toUpperCase();
    if (gemRef.length === 0 || !gemRefs.has(gemRef)) continue;
    const slug = sourceSlugOf(new URL(row.source_url).pathname);
    if (slug !== null) stoneSlugs.add(slug);
  }
  const structuralTargets = new Set([
    '/settings',
    '/design-your-own',
    '/compare',
    '/contact',
    '/protection-plan',
    '/account/sign-in',
    '/account/verify-email',
    '/showrooms',
  ]);
  // Depth-1 index routes (variety, category and collection indexes) are
  // observed source routes that §13.2 keeps in the new site, so a target on
  // one of them resolves — including with an explicitly mapped parameter
  // (`/gemstone-ring-settings?style=109`, doc 34 §4).
  const indexPaths = new Set<string>();
  for (const row of parsed) {
    const pathname = new URL(row.source_url).pathname;
    if (pathname.startsWith('/') && !pathname.slice(1).includes('/')) indexPaths.add(pathname);
  }
  const dangling: string[] = [];
  for (const row of rows) {
    if (row.status_code !== 301 && row.status_code !== 302) continue;
    const target = row.to_path.split('?')[0] ?? row.to_path;
    const ok =
      structuralTargets.has(target)
      || indexPaths.has(target)
      || target.startsWith('/checkout/')
      || target.startsWith('/about/')
      || target.startsWith('/showrooms/')
      || target.startsWith('/colour/')
      || target === '/sitemap.xml'
      || target.startsWith('/sitemap-products/')
      || (target.startsWith('/settings/') && variantSkus.has(target.slice('/settings/'.length)))
      || (target.startsWith('/products/') && productSlugSet.has(target.slice('/products/'.length)))
      || (target.startsWith('/products/') && stoneSlugs.has(target.slice('/products/'.length)))
      || (target.startsWith('/design-your-own/review/') && dyoCodes.has(target.slice('/design-your-own/review/'.length).toUpperCase()))
      || (target.startsWith('/search') && row.to_path.includes('collection=all'));
    if (!ok) dangling.push(`${row.from_path} -> ${row.to_path}`);
  }
  if (dangling.length > 0) {
    throw new Error(`redirects: ${String(dangling.length)} redirect target(s) do not resolve (doc 34 §1), e.g. ${dangling.slice(0, 3).join(', ')}`);
  }

  // insert (NOT EXISTS by from_path; the table's unique key)
  let inserted = 0;
  const BATCH = 5_000;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const result = await db.query(
      `INSERT INTO redirects (from_path, to_path, status_code, reason)
       SELECT x->>'from', x->>'to', (x->>'status')::smallint, x->>'reason'
         FROM jsonb_array_elements($1::jsonb) AS x
        WHERE NOT EXISTS (SELECT 1 FROM redirects r WHERE r.from_path = x->>'from')`,
      [JSON.stringify(batch.map((r) => ({ from: r.from_path, to: r.to_path, status: r.status_code, reason: r.reason })))],
    );
    inserted += result.rowCount ?? 0;
  }

  // determinism check on pre-existing rows.
  const disagree = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM redirects r
       JOIN jsonb_array_elements($1::jsonb) AS x ON x->>'from' = r.from_path
      WHERE r.to_path <> x->>'to' OR r.status_code <> (x->>'status')::smallint`,
    [JSON.stringify(rows.map((r) => ({ from: r.from_path, to: r.to_path, status: r.status_code })))],
  );
  if (Number(disagree.rows[0]?.n ?? '0') !== 0) {
    throw new Error('redirects: a stored redirect disagrees with the recomputed 13.1 mapping (determinism violation)');

  }

  const total = await db.query<{ n: string }>('SELECT count(*)::text AS n FROM redirects');
  if (Number(total.rows[0]?.n ?? '0') !== rows.length) {
    throw new Error(`redirects: ${String(total.rows[0]?.n)} redirect rows exist for ${String(rows.length)} source URLs`);
  }

  const byStatus = new Map<number, number>();
  const byFamily = new Map<string, number>();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row === undefined) continue;
    byStatus.set(row.status_code, (byStatus.get(row.status_code) ?? 0) + 1);
    const family = parsed[i]?.url_family ?? 'UNKNOWN';
    byFamily.set(family, (byFamily.get(family) ?? 0) + 1);
  }
  const fmt = (m: Map<string | number, number>): string =>
    [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([k, v]) => `${String(k)}=${String(v)}`).join(' ');

  return { rows: rows.length, inserted, byStatus: fmt(byStatus), byFamily: fmt(byFamily) };
}