/**
 * apps/web/src/app/(storefront)/product/[slug]/page.tsx
 *
 * `/product/<slug>` is a develop-era alias. PROJECT_SOURCE_OF_TRUTH.md 12.2
 * names exactly one product detail route — `products/[slug]/page.tsx
 * # canonical product detail` — so this route no longer renders a second
 * product page: it resolves the slug through the canonical adapter and issues
 * a permanent redirect (308 via `permanentRedirect`) to `/products/<slug>`.
 * An unresolved slug is `notFound()`, never a redirect to a 404.
 */
import { redirectToCanonicalProduct } from '../../../../lib/canonical-product-route.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: PageProps): Promise<never> {
  const { slug } = await params;
  return redirectToCanonicalProduct(slug);
}
