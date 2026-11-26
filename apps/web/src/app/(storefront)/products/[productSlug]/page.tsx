/**
 * apps/web/src/app/(storefront)/products/[productSlug]/page.tsx
 *
 * M3 — replaced by the reference applet PDP (ProductDetailView, verbatim)
 * sourced through the M3 adapter (`getPdpCatalogGemstone`):
 *   - resolution order preserved from the pre-M3 page (read layer w/ NGC
 *     merge → catalogue port product → gem-ref),
 *   - the repo's productJsonLd SEO spine is still emitted, but ONLY from the
 *     catalogue-port DTO (provenance/evidence stay the row's own);
 *   - the WebAR hue asset feeds the applet's 3D/AR paths via the adapter.
 */
import { notFound } from 'next/navigation';

import { siteBaseUrl, productJsonLd } from '../../../../lib/jsonld.js';
import { JsonLd } from '../../../../components/seo/JsonLd.js';
import { ProductDetailView } from '@/components/mgh/catalog/ProductDetailView';
import { getPdpCatalogGemstone } from '@/lib/mgh/adapters/catalog';

// Route segment config. Catalog views render per request from the cached
// CatalogQueryService (doc 12.3: Server-rendered, cacheable, no per-user
// state); there is deliberately no build-time catalogue, so Next must not
// prerender this route (it would otherwise invoke the page with empty params
// during `next build`). Runtime caching stays in the service, not in Next.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ productSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<{ title: string }> {
  const { productSlug } = await params;
  // Same metadata shape the pre-M3 page kept: any failed resolution (not
  // found OR transient catalogue error) collapses to the fallback title —
  // the route body surfaces the real state.
  const resolved = await getPdpCatalogGemstone(productSlug).catch(() => null);
  return resolved ? { title: `${resolved.displayTitle} | Maihan Gems` } : { title: 'Product | Maihan Gems' };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { productSlug } = await params;
  const resolved = await getPdpCatalogGemstone(productSlug);
  if (!resolved) {
    notFound();
  }
  // Task 8 (unchanged rule): JSON-LD from the SAME server data the page
  // renders — the port DTO plus the breadcrumb trail this page builds
  // (SITE_URL provides the canonical base; the adapter keeps the row's own
  // provenance, so nothing is synthesised for the offer).
  const jsonLdPayload = resolved.productDetail
    ? (() => {
        const base = siteBaseUrl();
        const crumbs = [
          { label: 'Home', href: '/' },
          ...(resolved.productDetail.variety !== null
            ? [{ label: resolved.productDetail.variety.name, href: `/${resolved.productDetail.variety.slug}` }]
            : []),
          { label: resolved.productDetail.title },
        ];
        return productJsonLd(base, resolved.productDetail, crumbs);
      })()
    : null;
  return (
    <>
      {jsonLdPayload ? <JsonLd payload={jsonLdPayload} /> : null}
      <ProductDetailView stone={resolved.stone} />
    </>
  );
}
