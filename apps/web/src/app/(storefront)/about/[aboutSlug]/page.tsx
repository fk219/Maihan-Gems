/**
 * apps/web/src/app/(storefront)/about/[aboutSlug]/page.tsx
 *
 * `/about/<slug>` — target of the observed /meet-our-team and
 * /michael-arnstein 301s (SoT 13.1 "team history -> /about/...").
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
};

export default function AboutPage() {
  return null;
}
