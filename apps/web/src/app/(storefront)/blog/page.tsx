/**
 * apps/web/src/app/(storefront)/blog/page.tsx
 *
 * `/blog` — Gemmological Journal & Bourse Dispatches (SoT 12.2 + 13.1).
 * CMS-driven (doc 22): BLOG pages render from the locked `pages` table,
 * published head revision only; article links go to the journal post view.
 * No fabricated dispatches — an empty CMS renders the honest empty state.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { CmsBlockList } from '../../../components/cms/CmsBlockView.js';
import { listCmsPages } from '../../../lib/cms-pages.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gemmological Journal | Maihan Gems',
  description: 'Field notes, origin studies, and gemmological dispatches from Dubai and Bangkok.',
};

export default async function BlogPage() {
  const pages = await listCmsPages('BLOG');
  return (
    <main className="page" id="main-content">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Journal' }]} />
      <span className="page-eyebrow">Bourse Dispatches &amp; Gemmology</span>
      <h1>The Maihan Journal</h1>
      <p className="page-subtitle">
        Technical notes on mineralogical provenance, optical pleochroism, laboratory certification, and
        bespoke goldsmithing.
      </p>

      {pages.length === 0 ? (
        <p role="status">No dispatches are published yet. Please check back shortly.</p>
      ) : (
        <div className="education-grid" style={{ marginTop: '2rem' }}>
          {pages
            .filter((page) => page.slug !== 'blog')
            .map((page) => (
              <article key={page.slug} className="lx-account-card">
                <span className="eyebrow" style={{ marginBottom: '0.35rem' }}>
                  Dispatch
                </span>
                <h2 className="lx-account-card__title">{page.title}</h2>
                <div className="lx-account-note">
                  <CmsBlockList blocks={page.blocks.slice(0, 1)} />
                </div>
                <Link href={`/blog/${page.slug}`} className="lx-text-btn">
                  Read dispatch →
                </Link>
              </article>
            ))}
        </div>
      )}
    </main>
  );
}
