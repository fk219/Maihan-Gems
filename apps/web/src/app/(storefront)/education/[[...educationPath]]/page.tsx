/**
 * apps/web/src/app/(storefront)/education/[[...educationPath]]/page.tsx
 *
 * `/education/**` — gemmology compendium hub + articles. SoT 12.2. Content is
 * CMS-driven (doc 22): EDUCATION pages render from the locked `pages` table,
 * published head revision only. The hub lists published EDUCATION pages;
 * `/education/<slug>` renders that page's blocks. When the CMS has no rows
 * (empty database) the route renders the honest empty state — never invented
 * chapters.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { CmsBlockList } from '../../../../components/cms/CmsBlockView.js';
import { getCmsPageBySlug, listCmsPages } from '../../../../lib/cms-pages.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gemmological Education & Standards | Maihan Gems',
  description: 'Academic guides to natural gemstone origin, crystal morphology, treatment disclosures, and lab certificates.',
};

interface PageProps {
  params: Promise<{ educationPath?: string[] }>;
}

export default async function EducationPage({ params }: PageProps) {
  const { educationPath } = await params;
  const segments = educationPath ?? [];

  // Article view: /education/<slug>
  if (segments.length === 1) {
    const slug = segments[0]!.toLowerCase();
    const page = await getCmsPageBySlug(slug);
    if (!page || page.pageKind !== 'EDUCATION') notFound();
    return (
      <main className="page education-page">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Education', href: '/education' },
            { label: page.title },
          ]}
        />
        <span className="page-eyebrow">Academic Gemmology</span>
        <h1>{page.title}</h1>
        <CmsBlockList blocks={page.blocks} />
        <p style={{ marginTop: '2.5rem' }}>
          <Link href="/education" className="btn-secondary">
            Back to the compendium
          </Link>
        </p>
      </main>
    );
  }

  if (segments.length > 1) notFound();

  // Hub view: /education
  const pages = await listCmsPages('EDUCATION');
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

      {pages.length === 0 ? (
        <p role="status">
          No compendium chapters are published yet. Please check back shortly.
        </p>
      ) : (
        <div className="education-grid">
          {pages
            .filter((page) => page.slug !== 'education')
            .map((page) => (
              <article key={page.slug} className="education-card">
                <span className="eyebrow" style={{ marginBottom: '0.35rem' }}>Chapter</span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', margin: '0 0 0.75rem 0' }}>
                  {page.title}
                </h2>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  <CmsBlockList blocks={page.blocks.slice(0, 1)} />
                </div>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
                  <Link href={`/education/${page.slug}`} style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gold)', textDecoration: 'none' }}>
                    Read the chapter →
                  </Link>
                </div>
              </article>
            ))}
        </div>
      )}
    </main>
  );
}
