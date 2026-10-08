/**
 * apps/web/src/app/(storefront)/ar/handoff/[handoffToken]/page.tsx
 *
 * `/ar/handoff/<token>` — QR handoff target (disallow in robots, doc 12.8).
 * SoT 12.2 `ar/handoff/[token]/page.tsx`.
 *
 * Segment name `handoffToken` — a short-lived QR handoff token, distinct
 * identity from both asset IDs and product slugs.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AR handoff',
  robots: { index: false, follow: false },
};

export default function ArHandoffPage() {
  return null;
}
