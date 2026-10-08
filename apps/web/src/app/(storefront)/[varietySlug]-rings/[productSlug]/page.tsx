/**
 * apps/web/src/app/(storefront)/[varietySlug]-rings/[productSlug]/page.tsx
 *
 * `/tsavorite-garnet-rings/<slug>` — ready-made product detail.
 * SoT 12.2 `[variety]-rings/[slug]/page.tsx`.
 *
 * Segment name `productSlug` — this nested slug is the SAME canonical
 * product slug the products detail route uses, not a different token family;
 * the manifest records it as an alias of `productSlug` so docs and phases 5-6
 * agree on which identifier owns which segment.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ready-made product',
};

export default function VarietyRingDetailPage() {
  return null;
}
