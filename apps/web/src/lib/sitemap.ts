/**
 * apps/web/src/lib/sitemap.ts
 *
 * Sitemap generation (Phase 4 Task 7).
 *
 * Authority: PROJECT_SOURCE_OF_TRUTH.md 12.8 ("Sitemaps generated from
 * products, gemstone_varieties, pages; sharded above 50,000 URLs"),
 * technical_design/34 section 9 ("Only canonical 200 URLs go into a sitemap.
 * Redirects, 404s and parameter variants are excluded"), section 16.
 *
 * Rules honoured here:
 *   - Shard size is the protocol limit (50,000 URLs per file). A URL set is
 *     NEVER emitted larger than that.
 *   - Only canonical, indexable, 200 URLs are listed. Redirect sources,
 *     parameter variants, private routes (`/account`, `/admin`, `/checkout`,
 *     `/cart`, `/favorites`, `/ar`), non-canonical search (`/search`) and the
 *     compare tool are excluded.
 *   - Every `<loc>` is absolute, built from the configured canonical base.
 *   - XML is escaped; no untrusted value is ever concatenated raw into markup.
 *   - Nothing is fabricated: no `<lastmod>`, no `<priority>`, no `<changefreq>`
 *     and no image/video extension where the data does not support it.
 *
 * The source site served 45 sitemap files / 44 shards. That is an artefact of
 * ITS editorial sharding at capture time, not a target: we shard by the actual
 * canonical URL count, so a catalogue under 50,000 canonical URLs produces ONE
 * shard. Emitting empty or misleading shards to reach "44" is forbidden.
 */
import type {
  ProductListQuery,
  ProductListResult,
  SettingListQuery,
  SettingListResult,
  TaxonomyReadModel,
} from '@maihan/contracts';

/** The sitemaps.org protocol limit: 50,000 URLs per file. */
export const SITEMAP_MAX_URLS = 50_000;

/** The canonical production base URL, from configuration. Never invented. */
export function siteBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env['SITE_URL'];
  if (raw === undefined || raw.trim() === '') {
    throw new Error(
      'SITE_URL is not set. The sitemap must use the configured canonical base URL; there is no default (a guessed domain would emit wrong canonicals).',
    );
  }
  return raw.replace(/\/+$/, '');
}

/** Absolute URL for a path against the canonical base. */
export function absoluteUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '');
  if (path === '/' || path === '') return `${b}/`;
  return `${b}${path.startsWith('/') ? path : `/${path}`}`;
}

/** XML-escape a value for use in character data or an attribute. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Routes that are never canonical 200 URLs and must never appear in a sitemap:
 * private surfaces, transactional surfaces, and non-indexable tooling.
 */
const NON_INDEXABLE_PREFIXES: readonly string[] = [
  '/search',
  '/cart',
  '/checkout',
  '/account',
  '/admin',
  // The whole AR subtree is non-indexable: both /ar/{assetId} and
  // /ar/handoff/{token} declare `robots: { index: false, follow: false }`,
  // and bare /ar is not a route (404). Excluding the prefix '/ar' covers
  // /ar and /ar/... without touching slugs that merely begin with "ar".
  '/ar',
  '/compare',
  '/favorites',
];

/** Static, canonical, indexable pages that always exist. */
export function canonicalStaticPaths(): string[] {
  return ['/', '/varieties', '/settings', '/design-your-own', '/contact', '/financing', '/blog', '/protection-plan'];
}

export function isIndexablePath(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (path.includes('?')) return false; // parameter variants are excluded (doc 34 section 9)
  for (const prefix of NON_INDEXABLE_PREFIXES) {
    if (path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)) return false;
  }
  return true;
}

/** Remove duplicates while preserving first-seen order. */
export function dedupePaths(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/** Number of shards for a URL count, never below 1 for a non-empty set. */
export function shardCount(total: number): number {
  return total === 0 ? 0 : Math.ceil(total / SITEMAP_MAX_URLS);
}

/** Split into shards of at most `size` (default the protocol limit). */
export function shards<T>(items: readonly T[], size: number = SITEMAP_MAX_URLS): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Render a `<urlset>` document. Throws above the protocol limit. */
export function renderUrlset(urls: readonly string[]): string {
  if (urls.length > SITEMAP_MAX_URLS) {
    throw new Error(`sitemap: ${String(urls.length)} URLs exceed the ${String(SITEMAP_MAX_URLS)} protocol limit`);
  }
  const body = urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Render a `<sitemapindex>` document referencing each shard's absolute URL. */
export function renderSitemapIndex(shardLocs: readonly string[]): string {
  const body = shardLocs.map((u) => `  <sitemap><loc>${escapeXml(u)}</loc></sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

// ---------------------------------------------------------------------------
// Canonical URL collection
// ---------------------------------------------------------------------------

/** The minimal catalogue surface the sitemap needs (satisfied by the service). */
export interface SitemapDataSource {
  getTaxonomy(): Promise<{ value: TaxonomyReadModel }>;
  listProducts(query: ProductListQuery): Promise<{ value: ProductListResult }>;
  listSettings(query: SettingListQuery): Promise<{ value: SettingListResult }>;
}

const PAGE_LIMIT = 100;
/** Bound paging so a pathological `next_cursor` can never loop forever. */
const MAX_PAGES = 5_000;

async function pageAll<T>(
  fetchPage: (cursor: string | undefined) => Promise<{ items: readonly T[]; hasMore: boolean; nextCursor: string | null }>,
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(cursor);
    out.push(...result.items);
    if (!result.hasMore || result.nextCursor === null || result.nextCursor === '') break;
    cursor = result.nextCursor;
  }
  return out;
}

/**
 * Build the canonical, indexable URL set from the catalogue. Every entry is a
 * path that exists in the route tree; nothing is fabricated.
 */
export async function collectCanonicalPaths(source: SitemapDataSource): Promise<string[]> {
  const paths: string[] = canonicalStaticPaths();

  const taxonomy = (await source.getTaxonomy()).value;
  for (const variety of taxonomy.varieties) {
    if (variety.state !== 'ACTIVE') continue;
    paths.push(`/${variety.slug}`, `/${variety.slug}-pairs`, `/${variety.slug}-rings`, `/varieties/${variety.slug}`);
  }
  for (const colour of taxonomy.colours) {
    if (colour.state !== 'ACTIVE') continue;
    paths.push(`/colour/${colour.slug}`);
  }

  const products = await pageAll(async (cursor) => {
    const result = (
      await source.listProducts({ limit: PAGE_LIMIT, sort: 'recency', direction: 'asc', ...(cursor === undefined ? {} : { cursor }) })
    ).value;
    return { items: result.items, hasMore: result.meta.has_more, nextCursor: result.meta.next_cursor };
  });
  for (const product of products) {
    if (product.state !== 'ACTIVE') continue;
    paths.push(`/products/${product.slug}`);
  }

  const settings = await pageAll(async (cursor) => {
    const result = (await source.listSettings({ limit: PAGE_LIMIT, ...(cursor === undefined ? {} : { cursor }) })).value;
    return { items: result.items, hasMore: result.meta.has_more, nextCursor: result.meta.next_cursor };
  });
  for (const design of settings) {
    for (const variant of design.variants) {
      if (variant.state !== 'ACTIVE') continue;
      paths.push(`/settings/${variant.sku}`);
    }
  }

  return dedupePaths(paths.filter(isIndexablePath));
}

/** Absolute shard locations referenced by the sitemap index. */
export function shardLocations(base: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => absoluteUrl(base, `/sitemap-products/${String(i + 1)}.xml`));
}
