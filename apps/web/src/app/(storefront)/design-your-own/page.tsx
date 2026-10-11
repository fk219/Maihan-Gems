/**
 * apps/web/src/app/(storefront)/design-your-own/page.tsx
 *
 * `/design-your-own` — interactive configurator entry (target of
 * /custom-design-gemstone-rings-jewelry 301 redirect).
 *
 * Authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 7 (Tasks 8, 9)
 *   - Design.md (Silk & Stone luxury brand specification)
 *   - Invariants INV-01, INV-02, INV-03 enforced.
 */
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { DyoConfigurator } from '../../../components/dyo/DyoConfigurator.js';

export const metadata: Metadata = {
  title: 'Design Your Own High Jewellery | Maihan Gems Atelier',
  description:
    'Craft a bespoke one-of-a-kind ring, earrings, or necklace. Pair ethically-sourced unheated natural gemstones with precision architectural mountings.',
};

export default function DesignYourOwnEntryPage() {
  return (
    <main className="page dyo-page" id="main-content">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-6">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Design Your Own' },
          ]}
        />
      </div>

      <DyoConfigurator />
    </main>
  );
}
