/**
 * apps/web/src/app/(storefront)/products/[productSlug]/page.tsx
 *
 * `/products/<slug>` — canonical product detail (target of the four source
 * families: loose stone, pair, ready-made, and configured redirect).
 * SoT 12.2 `products/[slug]/page.tsx`. SEO, states and islands are Phase 4
 * epics E4.4/E4.5/E4.6.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product',
};

export default function ProductDetailPage() {
  return null;
}
