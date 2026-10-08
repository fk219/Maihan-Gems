/**
 * apps/web/src/app/(storefront)/design-your-own/review/[configurationCode]/page.tsx
 *
 * `/design-your-own/review/<code>` — DYO review by configuration code
 * (target of the 9,812 DYO source URLs). SoT 12.2
 * `design-your-own/review/[code]/page.tsx`.
 *
 * Segment name `configurationCode` — a configuration identity, NOT a product
 * slug; the domain primitives (packages/domain, Phase 1 Task 8) define the
 * base62 short-code shape.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DYO review',
};

export default function DyoReviewPage() {
  return null;
}
