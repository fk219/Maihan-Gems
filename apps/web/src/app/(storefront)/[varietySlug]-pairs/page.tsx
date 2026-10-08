/**
 * apps/web/src/app/(storefront)/[varietySlug]-pairs/page.tsx
 *
 * `/tsavorite-garnet-pairs` — matched-pair variety index.
 * SoT 12.2 `[variety]-pairs/page.tsx`.
 *
 * NOTE: App Router dynamic segments are whole-directory `[name]`; the SoT's
 * `[variety]-pairs` notation is its own shorthand for "the variety token is
 * embedded in this route's leading segment", realised here as a distinct
 * `[varietySlug]-pairs` folder. If Next's routing engine treats the bracketed
 * portion as the whole segment (meaning this directory only matches
 * `anything-pairs` exactly one level deep), that is the intended semantics;
 * validation (routing/route-manifest.ts) documents this as a Task 1 finding.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Variety pairs',
};

export default function VarietyPairsIndexPage() {
  return null;
}
