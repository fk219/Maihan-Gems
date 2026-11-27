/**
 * apps/web/src/app/(storefront)/[varietySlug]/[productSlug]/page.tsx
 *
 * The variety-scoped detail is a source URL family, not a target route.
 * PROJECT_SOURCE_OF_TRUTH.md 12.2 names only `products/[slug]` as the
 * "canonical product detail", and 13.1 maps `/{variety}/{slug}-K#####` to
 * `/products/{slug}` with status 301. The SoT-shaped folder stays in the tree
 * as a permanent redirect (308 via `permanentRedirect`); the variety segment
 * is not part of the canonical path. An unresolved product slug is
 * `notFound()`, never a redirect to a 404.
 */
import { redirectToCanonicalProduct } from '../../../../lib/canonical-product-route.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug: string; productSlug: string }>;
}

export default async function VarietyScopedProductAliasPage({
  params,
}: PageProps): Promise<never> {
  const { productSlug } = await params;
  return redirectToCanonicalProduct(productSlug);
}
