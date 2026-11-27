/**
 * apps/web/src/app/(storefront)/[varietySlug]-rings/[productSlug]/page.tsx
 *
 * PROJECT_SOURCE_OF_TRUTH.md 12.2 names `[variety]-rings/[slug]` (ready-made)
 * AND `products/[slug]` with the explicit label "canonical product detail";
 * 13.1 maps `/{variety}-rings/{slug}-J#####` to `/products/{slug}` with status
 * 301. The SoT-named folder therefore stays in the tree as a permanent
 * redirect (308 via `permanentRedirect`) to the one canonical detail, instead
 * of rendering a second copy of the same product record. An unresolved slug is
 * `notFound()`, never a redirect to a 404.
 */
import { redirectToCanonicalProduct } from '../../../../lib/canonical-product-route.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug: string; productSlug: string }>;
}

export default async function ReadyMadeProductAliasPage({
  params,
}: PageProps): Promise<never> {
  const { productSlug } = await params;
  return redirectToCanonicalProduct(productSlug);
}
