/**
 * apps/web/src/app/(storefront)/blog/[postSlug]/page.tsx
 *
 * `/blog/<slug>` — one journal dispatch, rendered from the CMS (BLOG kind,
 * published head revision only). Unknown/unpublished slug → honest 404.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { CmsBlockList } from '../../../../components/cms/CmsBlockView.js';
import { getCmsPageBySlug } from '../../../../lib/cms-pages.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ postSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postSlug } = await params;
  const page = await getCmsPageBySlug(postSlug.toLowerCase());
  if (!page || page.pageKind !== 'BLOG') return { title: 'Dispatch | Maihan Gems' };
  return { title: `${page.title} | Maihan Gems Journal` };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { postSlug } = await params;
  const page = await getCmsPageBySlug(postSlug.toLowerCase());
  if (!page || page.pageKind !== 'BLOG') notFound();
  return (
    <main className="page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Journal', href: '/blog' },
          { label: page.title },
        ]}
      />
      <span className="page-eyebrow">Bourse Dispatch</span>
      <h1>{page.title}</h1>
      <CmsBlockList blocks={page.blocks} />
      <p style={{ marginTop: '2.5rem' }}>
        <Link href="/blog" className="btn-secondary">
          Back to the journal
        </Link>
      </p>
    </main>
  );
}
