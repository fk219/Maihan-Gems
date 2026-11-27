/**
 * apps/web/src/lib/canonical-product-route.ts
 *
 * The one canonical destination for every product-detail alias.
 *
 * Authority:
 *   - PROJECT_SOURCE_OF_TRUTH.md 12.2:
 *     `products/[slug]/page.tsx         # canonical product detail`
 *     is the single product-detail route in the route tree.
 *   - PROJECT_SOURCE_OF_TRUTH.md 13.1 maps the source families
 *     `/{variety}/{slug}-K#####`, `/{variety}-pairs/{slug}-PR#####` and
 *     `/{variety}-rings/{slug}-J#####` to `/products/{slug}` with status 301.
 *
 * Resolution rule: an alias resolves its identifier through the SAME adapter
 * the canonical page renders from (`getPdpCatalogGemstone`). A slug the
 * canonical page would render therefore always resolves here, and a slug it
 * would not render is `notFound()` at the alias too. Redirecting an unresolved
 * slug would send the visitor to a 404 through a 308, which is worse than the
 * 404 itself. A lookup FAILURE is not "missing": it is left to the route's
 * `error.tsx`, matching the canonical page's error boundary.
 */
import 'server-only';

import { notFound, permanentRedirect } from 'next/navigation';

import { getPdpCatalogGemstone } from './mgh/adapters/catalog.js';

/** The canonical product-detail path (SoT 12.2). */
export function canonicalProductPath(productSlug: string): string {
  return `/products/${encodeURIComponent(productSlug)}`;
}

/**
 * The canonical slug an alias identifier resolves to, or null when the
 * catalogue has no such product. The slug comes from the resolved record, so
 * an alias supplied by gem ref or fixture id still lands on the catalogue's
 * own slug rather than a guessed rewrite.
 */
export async function resolveCanonicalProductSlug(slugOrId: string): Promise<string | null> {
  const resolved = await getPdpCatalogGemstone(slugOrId);
  return resolved === null ? null : resolved.stone.slug;
}

/**
 * Permanent redirect from a duplicate product-detail route to the canonical
 * one. `permanentRedirect` is a 308 response in a Server Component (Next.js
 * docs, `permanentRedirect`); the SoT 13.1 table expresses the same permanent
 * intent as 301. Both are permanent, so the route manifest records "301/308".
 */
export async function redirectToCanonicalProduct(slugOrId: string): Promise<never> {
  const canonicalSlug = await resolveCanonicalProductSlug(slugOrId);
  if (canonicalSlug === null) notFound();
  permanentRedirect(canonicalProductPath(canonicalSlug));
}
