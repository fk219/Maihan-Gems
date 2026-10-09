/**
 * apps/web/src/app/sitemap-products/[shard]/route.ts
 *
 * One sitemap SHARD (Phase 4 Task 7).
 *
 * Authority: technical_design/34 section 9 ("`/sitemap-products-N.xml` (45
 * observed) -> `/sitemap-products/{N}.xml`"). The source's numbered sitemaps
 * 301 here (see src/lib/redirects.ts).
 *
 * Shard numbering is 1-based and matches the index exactly. Each shard holds at
 * most SITEMAP_MAX_URLS (50,000) canonical 200 URLs; a request outside the
 * current range is an honest 404, never an empty or misleading document.
 *
 * The canonical shard URL is `/sitemap-products/{N}.xml` (doc 34 section 9),
 * so the `[shard]` segment carries the `.xml` suffix — the format check MUST
 * accept `{N}.xml` and reject the bare, non-canonical `{N}`.
 */
import { catalogServer } from '../../../lib/catalog-server.js';
import { SITEMAP_MAX_URLS, absoluteUrl, collectCanonicalPaths, renderUrlset, shards, siteBaseUrl } from '../../../lib/sitemap.js';

export const dynamic = 'force-dynamic';

const SITEMAP_HEADERS = {
  'content-type': 'application/xml; charset=utf-8',
  'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
} as const;

interface RouteContext {
  params: Promise<{ shard: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { shard } = await context.params;
  const match = /^(\d+)\.xml$/.exec(shard);
  if (match === null) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  const index = Number(match[1]);
  const base = siteBaseUrl();
  const paths = await collectCanonicalPaths(catalogServer());
  const all = shards(paths, SITEMAP_MAX_URLS);
  const slice = index >= 1 && index <= all.length ? all[index - 1] : undefined;
  if (slice === undefined) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  return new Response(renderUrlset(slice.map((p) => absoluteUrl(base, p))), { headers: SITEMAP_HEADERS });
}
