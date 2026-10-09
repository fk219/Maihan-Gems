/**
 * apps/web/src/app/sitemap.xml/route.ts
 *
 * The sitemap INDEX (Phase 4 Task 7).
 *
 * Authority: technical_design/34 section 9 ("`/sitemap-static.xml` ->
 * `/sitemap.xml` ... generated"). The source's `/sitemap-static.xml` 301s here
 * (see src/lib/redirects.ts).
 *
 * The index lists one entry per shard under `/sitemap-products/{N}.xml`. The
 * shard count follows the ACTUAL canonical URL count (50,000 per shard), never
 * a target number.
 *
 * Dynamic, because the catalogue is read at request time and there is no
 * build-time database. The response is cacheable at the edge.
 */
import { catalogServer } from '../../lib/catalog-server.js';
import { collectCanonicalPaths, renderSitemapIndex, shardCount, shardLocations, siteBaseUrl } from '../../lib/sitemap.js';

export const dynamic = 'force-dynamic';

const SITEMAP_HEADERS = {
  'content-type': 'application/xml; charset=utf-8',
  'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
} as const;

export async function GET(): Promise<Response> {
  const base = siteBaseUrl();
  const paths = await collectCanonicalPaths(catalogServer());
  const body = renderSitemapIndex(shardLocations(base, shardCount(paths.length)));
  return new Response(body, { headers: SITEMAP_HEADERS });
}
