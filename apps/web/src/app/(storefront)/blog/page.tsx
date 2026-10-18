/**
 * apps/web/src/app/(storefront)/blog/page.tsx
 *
 * `/blog` — Gemmological Journal & Bourse Dispatches (SoT 12.2 + 13.1).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'Gemmological Journal | Maihan Gems',
  description: 'Field notes, origin studies, and gemmological dispatches from Dubai and Bangkok.',
};

const DISPATCHES = [
  {
    slug: 'sapphire',
    eyebrow: 'Corundum Studies',
    title: 'Understanding Unheated Ceylon & Kashmir Velvety Blue Sapphires',
    summary:
      'How trace titanium-iron intervalence charge transfer and rutile silk inclusions distinguish classic origin corundum under microscopic examination.',
    href: '/education/sapphire',
  },
  {
    slug: 'tanzanite',
    eyebrow: 'Pleochroism & Cut Geometry',
    title: 'Orienting Merelani Zoisite for Deep Violetish-Blue Face-Up Saturation',
    summary:
      'Why pavilion angle precision and table proportion determine whether a trichroic tanzanite crystal exhibits royal blue or violet dominance.',
    href: '/tanzanite',
  },
  {
    slug: 'pairs',
    eyebrow: 'Atelier Curation',
    title: 'The Discipline of Matching Natural Gemstone Suites for High Jewellery Earrings',
    summary:
      'Calibrating millimetre outline, depth, colour saturation, and internal brilliance across two independent earth-mined crystals (INV-02).',
    href: '/pairs',
  },
];

export default function BlogPage() {
  return (
    <main className="page" id="main-content">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Journal' }]} />
      <span className="page-eyebrow">Bourse Dispatches &amp; Gemmology</span>
      <h1>The Maihan Journal</h1>
      <p className="page-subtitle">
        Technical notes on mineralogical provenance, optical pleochroism, laboratory certification, and
        bespoke goldsmithing.
      </p>

      <div className="education-grid" style={{ marginTop: '2rem' }}>
        {DISPATCHES.map((post) => (
          <article key={post.slug} className="lx-account-card">
            <span className="eyebrow" style={{ marginBottom: '0.35rem' }}>
              {post.eyebrow}
            </span>
            <h2 className="lx-account-card__title">{post.title}</h2>
            <p className="lx-account-note">{post.summary}</p>
            <Link href={post.href} className="lx-text-btn">
              Read study →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
