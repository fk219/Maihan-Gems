/**
 * apps/web/src/app/(storefront)/education/[[...educationPath]]/page.tsx
 *
 * `/education/**` — education hub. SoT 12.2 `education/...` — 15 observed
 * education routes (hub + about + gemstone-essentials + ruby-history), all
 * preserve their shape so the CMS route is a single catch-all; individual
 * page content is Phase 12 (CMS) and every observed path resolves through
 * the same dynamic page (doc 34 §3: "/education/... no redirect").
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Education',
};

export default function EducationPage() {
  return null;
}
