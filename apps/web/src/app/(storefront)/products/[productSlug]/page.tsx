import { notFound } from 'next/navigation';

import { isProductNotFound } from '../../../../lib/catalog-errors.js';
import { loadProductDetail, loadGemstoneDetail } from '../../../../lib/catalog-server.js';
import { siteBaseUrl, productJsonLd } from '../../../../lib/jsonld.js';
import { JsonLd } from '../../../../components/seo/JsonLd.js';
import { ProductDetailContent } from '../../../../components/catalog/ProductDetailContent.js';
import { adaptGemstoneToProductDetail } from '../../../../lib/gemstone-adapter.js';

// Route segment config. Catalog views render per request from the cached
// CatalogQueryService (doc 12.3: Server-rendered, cacheable, no per-user
// state); there is deliberately no build-time catalogue, so Next must not
// prerender this route (it would otherwise invoke the page with empty params
// during `next build`). Runtime caching stays in the service, not in Next.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ productSlug: string }>;
}

async function resolveProductOrGemstone(slug: string) {
  const detail = await loadProductDetail(slug);
  if (detail.ok) {
    return { ok: true as const, value: detail.value };
  }
  // If product not found, check if slug corresponds to a gemstone reference (e.g. K1324, PR5681)
  const gemRefUpper = slug.toUpperCase();
  const gemResult = await loadGemstoneDetail(gemRefUpper);
  if (gemResult.ok) {
    return { ok: true as const, value: adaptGemstoneToProductDetail(gemResult.value, slug) };
  }
  return { ok: false as const, error: detail.error };
}

export async function generateMetadata({ params }: PageProps): Promise<{ title: string }> {
  const { productSlug } = await params;
  const resolved = await resolveProductOrGemstone(productSlug);
  return resolved.ok ? { title: `${resolved.value.title} | Maihan Gems` } : { title: 'Product | Maihan Gems' };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { productSlug } = await params;
  const resolved = await resolveProductOrGemstone(productSlug);
  if (!resolved.ok) {
    if (isProductNotFound(resolved.error)) notFound();
    throw resolved.error; // route error boundary renders the recovery view (Task 5)
  }
  // Task 8: JSON-LD from the SAME server data the page renders — the contract
  // DTO plus the breadcrumb trail the page itself builds. SITE_URL provides the
  // canonical base; without it the page must not emit wrong canonical URLs.
  const base = siteBaseUrl();
  const crumbs = [
    { label: 'Home', href: '/' },
    ...(resolved.value.variety !== null
      ? [{ label: resolved.value.variety.name, href: `/${resolved.value.variety.slug}` }]
      : []),
    { label: resolved.value.title },
  ];
  return (
    <>
      <JsonLd payload={productJsonLd(base, resolved.value, crumbs)} />
      <ProductDetailContent detail={resolved.value} />
    </>
  );
}

