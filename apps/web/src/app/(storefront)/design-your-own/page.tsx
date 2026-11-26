/**
 * apps/web/src/app/(storefront)/design-your-own/page.tsx
 *
 * `/design-your-own` — the composition entry.
 *
 * The page frame is a masthead and the configurator. The metadata no longer
 * claims "ethically-sourced unheated" stones: sourcing claims belong to a
 * record, not to a route.
 */
import type { Metadata } from 'next';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';
import { DyoConfigurator } from '../../../components/dyo/DyoConfigurator.js';

export const metadata: Metadata = {
  title: 'Design your own | Maihan Gems',
  description:
    'Compose a piece from one mounting and one stone, or a matched pair and earrings. The structural rules are enforced before review.',
};

export default function DesignYourOwnEntryPage() {
  return (
    <main className="page dyo-page mh-page" id="main-content">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Design your own' }]} />

      <EditorialMasthead
        eyebrow="The configurator"
        title="Design your own"
        lead="Three decisions: the mounting and its metal, the stone, then the options that qualify the composition. A review page records what was chosen; the atelier quotes the piece."
      />

      <DyoConfigurator />
    </main>
  );
}
