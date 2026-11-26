/**
 * apps/web/src/app/(storefront)/blog/page.tsx
 *
 * `/blog` — the journal.
 *
 * There is no published CMS content in this environment. The previous
 * implementation returned `null`, which is a blank page under a live HTTP
 * 200. This is a real empty state with a route forward.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';

export const metadata: Metadata = {
  title: 'Journal | Maihan Gems',
  description: 'Notes from the atelier and the catalogue.',
};

export default function BlogPage() {
  return (
    <main className="page blog-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Journal' }]} />

      <EditorialMasthead
        eyebrow="The journal"
        title="Notes from the atelier"
        lead="Long-form notes on stones, mountings and the decisions behind a catalogue record. The journal is published from the CMS; nothing is drafted here to fill the page."
      />

      <div className="empty-state">
        <h2 className="empty-state__title">No journal entries are published yet.</h2>
        <p className="empty-state__body">
          When an entry is published it appears here with its date and its author. Until then, the
          reading room covers the ideas a catalogue entry depends on.
        </p>
        <div className="empty-state__action">
          <Link className="mh-cta" href="/education">
            Open the reading room
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="mh-cta mh-cta--quiet" href="/varieties">
            Browse the varieties
          </Link>
        </div>
      </div>
    </main>
  );
}
