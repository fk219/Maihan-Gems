/**
 * apps/web/src/app/(storefront)/[varietySlug]/page.tsx
 *
 * `/tsavorite-garnet` — variety index for loose stones.
 * SoT 12.2 `[variety]/page.tsx`. Route params are owned by the route-tree
 * manifest (src/routing/route-manifest.ts) — distinct names for every dynamic
 * segment family, so `varietySlug` never collides with the colour detail's
 * `colourSlug` under `colour/[colour]`.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Variety',
};

export default function VarietyIndexPage() {
  return null;
}
