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
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'Gemmological Education & Standards | Maihan Gems',
  description: 'Academic guides to natural gemstone origin, crystal morphology, treatment disclosures, and lab certificates.',
};

const CHAPTERS = [
  {
    title: 'Natural vs. Treated Mineralogy',
    eyebrow: 'Fundamental Principle',
    summary: 'Why unheated and untreated natural corundum and beryl command sovereign collector premiums over thermally enhanced stones.',
  },
  {
    title: 'The 4 Cs of Colored Gemstones',
    eyebrow: 'Evaluation Standard',
    summary: 'How color saturation, tone, crystal transparency, and eye-clean inclusions dictate fine gemstone market valuations.',
  },
  {
    title: 'Geological Origin & Terroir',
    eyebrow: 'Provenance Science',
    summary: 'The geological significance of classic deposits: Kashmir, Ceylon, Mogok, Panjshir, and Muzo under FTIR spectroscopy.',
  },
  {
    title: 'Independent Laboratory Reports',
    eyebrow: 'Verification Dossier',
    summary: 'Decoding GIA, Gübelin, SSEF, and GRS gemmological dossiers, origin opinions, and non-destructive testing methodologies.',
  },
];

export default function EducationPage() {
  return (
    <main className="page education-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Education' },
        ]}
      />

      <span className="page-eyebrow">Academic Gemmology</span>
      <h1>Gemmological Compendium</h1>
      <p className="page-subtitle">
        Authoritative guides to natural untreated gemstones, crystal structures, origin terroir, and international laboratory standards.
      </p>

      <div className="education-grid">
        {CHAPTERS.map((chapter) => (
          <article key={chapter.title} className="education-card">
            <span className="eyebrow" style={{ marginBottom: '0.35rem' }}>{chapter.eyebrow}</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', margin: '0 0 0.75rem 0' }}>
              {chapter.title}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {chapter.summary}
            </p>
            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
              <Link href="/varieties" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gold)', textDecoration: 'none' }}>
                Explore Verified Gems →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
