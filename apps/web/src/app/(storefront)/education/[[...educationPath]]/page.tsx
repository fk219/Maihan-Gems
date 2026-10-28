import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEducationHubData, getEducationArticleByPath } from '@/lib/mgh/storefront-data';
import { getCmsPageBySlug, listCmsPages, type CmsPage } from '@/lib/cms-pages';
import { CmsBlockList } from '@/components/cms/CmsBlockView';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: teaching-content seam kept on the repo's locked
// `pages` table (doc 22 — EDUCATION kind, published head revision only, never
// deleted rows) and styled with the reference applet's editorial chrome. When
// the CMS holds no published page the applet's ported monographs render
// verbatim (client-approved copy, no fabricated CMS metadata). Unknown slugs
// still 404 honestly.
export const dynamic = 'force-dynamic';

/** First display paragraph of the stored blocks, for honest hub summaries. */
function firstBlockText(page: CmsPage): string {
  for (const block of page.blocks) {
    if (block.type === 'RICH_TEXT') {
      const markdown = block.props['markdown'];
      if (typeof markdown === 'string' && markdown.trim()) {
        return markdown.split(/\n{2,}/)[0]!.trim();
      }
    }
  }
  return '';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ educationPath?: string[] }>;
}): Promise<Metadata> {
  const { educationPath } = await params;
  if (!educationPath || educationPath.length === 0) {
    return {
      title: 'Gemological Education Hub — Trichroism, Disclosures & Matched Pairs',
      description:
        'Scientific and lapidary monographs from the Maihan Gems Geneva laboratory covering pleochroism, treatment disclosures, and earring calibration.',
      alternates: { canonical: `${SITE_URL}/education` },
    };
  }
  const segments = educationPath;
  if (segments.length === 1) {
    const cmsPage = await getCmsPageBySlug(segments[0]!.toLowerCase());
    if (cmsPage && cmsPage.pageKind === 'EDUCATION') {
      return {
        title: cmsPage.title,
        description: firstBlockText(cmsPage),
        alternates: { canonical: `${SITE_URL}/education/${cmsPage.slug}` },
      };
    }
  }
  const article = getEducationArticleByPath(segments);
  if (!article) {
    return {
      title: 'Article Not Found — Education Hub',
      description: 'The requested gemological education monograph does not exist.',
    };
  }
  return {
    title: article.title,
    description: article.lede,
    alternates: { canonical: `${SITE_URL}/education/${article.slugKey}` },
  };
}

export default async function EducationCatchAllPage({
  params,
}: {
  params: Promise<{ educationPath?: string[] }>;
}) {
  const { educationPath } = await params;
  const articles = getEducationHubData();

  if (!educationPath || educationPath.length === 0) {
    const cmsPages = (await listCmsPages('EDUCATION')).filter((page) => page.slug !== 'education');
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-[#141413]">Education Hub</li>
          </ol>
        </nav>

        <div className="border-b border-[#E2DFD7] pb-6">
          <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
            MAIHAN GEMOLOGICAL MONOGRAPHS
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#141413]">
            Gemological Education Hub
          </h1>
          <p className="mt-2 text-sm text-[#52504C] max-w-2xl">
            Technical guides on optical crystallography, CIBJO treatment disclosures, and why
            matched gemstone pairs attach exclusively to earring mountings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(cmsPages.length > 0 ? cmsPages : articles).map((entry) => {
            if ('slugKey' in entry) {
              return (
                <article
                  key={entry.slugKey}
                  className="rounded border border-[#E2DFD7] bg-white p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
                      {entry.category} · {entry.readingMinutes} min read
                    </p>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#141413]">
                      <Link href={`/education/${entry.slugKey}`} className="hover:underline">
                        {entry.title}
                      </Link>
                    </h2>
                    <p className="text-xs text-[#52504C] leading-relaxed">{entry.lede}</p>
                  </div>
                  <div className="pt-3 border-t border-[#E2DFD7] flex justify-between items-center text-xs">
                    <span className="font-[family-name:var(--font-mono)] text-[#78756F]">
                      Updated {entry.updatedAt}
                    </span>
                    <Link href={`/education/${entry.slugKey}`} className="font-medium text-[#1E3A5F] underline">
                      Read Monograph →
                    </Link>
                  </div>
                </article>
              );
            }
            // CMS row: same card chrome, real stored values only.
            return (
              <article
                key={entry.slug}
                className="rounded border border-[#E2DFD7] bg-white p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
                    PUBLISHED CHAPTER
                    {entry.updatedAt ? ` · UPDATED ${entry.updatedAt.slice(0, 10)}` : ''}
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#141413]">
                    <Link href={`/education/${entry.slug}`} className="hover:underline">
                      {entry.title}
                    </Link>
                  </h2>
                  <p className="text-xs text-[#52504C] leading-relaxed">{firstBlockText(entry)}</p>
                </div>
                <div className="pt-3 border-t border-[#E2DFD7] flex justify-end items-center text-xs">
                  <Link href={`/education/${entry.slug}`} className="font-medium text-[#1E3A5F] underline">
                    Read Chapter →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  if (educationPath.length === 1) {
    const slug = educationPath[0]!.toLowerCase();
    const cmsPage = await getCmsPageBySlug(slug);
    if (cmsPage && cmsPage.pageKind === 'EDUCATION') {
      return (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
            <ol className="flex items-center gap-2">
              <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/education" className="hover:text-[#141413]">Education Hub</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-[#141413]">{cmsPage.title}</li>
            </ol>
          </nav>

          <article className="rounded border border-[#E2DFD7] bg-white p-8 space-y-6">
            <div className="border-b border-[#E2DFD7] pb-6 space-y-2">
              <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
                PUBLISHED CHAPTER
                {cmsPage.updatedAt ? ` · UPDATED ${cmsPage.updatedAt.slice(0, 10)}` : ''}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-[#141413]">
                {cmsPage.title}
              </h1>
              {firstBlockText(cmsPage) && (
                <p className="text-base text-[#52504C] leading-relaxed">{firstBlockText(cmsPage)}</p>
              )}
            </div>

            <div className="space-y-6">
              <CmsBlockList blocks={blocksBeyondLede(cmsPage)} />
            </div>

            <div className="pt-2 border-t border-[#E2DFD7]">
              <Link href="/education" className="font-medium text-[#1E3A5F] text-sm underline">
                Back to the Education Hub →
              </Link>
            </div>
          </article>
        </div>
      );
    }
  }

  const article = getEducationArticleByPath(educationPath);
  if (!article) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/education" className="hover:text-[#141413]">Education Hub</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#141413]">{article.title}</li>
        </ol>
      </nav>

      <article className="rounded border border-[#E2DFD7] bg-white p-8 space-y-6">
        <div className="border-b border-[#E2DFD7] pb-6 space-y-2">
          <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
            {article.category} · {article.readingMinutes} MIN READ · UPDATED {article.updatedAt}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-[#141413]">
            {article.title}
          </h1>
          <p className="text-base text-[#52504C] leading-relaxed">{article.lede}</p>
        </div>

        <div className="space-y-6">
          {article.sections.map((sec) => (
            <section key={sec.heading} className="space-y-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#141413]">
                {sec.heading}
              </h2>
              <p className="text-sm text-[#52504C] leading-relaxed">{sec.body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

/**
 * Blocks minus the block whose RICH_TEXT markdown supplied the hub lede, so a
 * single-paragraph chapter is not rendered twice (lede band AND body).
 */
function blocksBeyondLede(page: CmsPage) {
  if (page.blocks.length === 0) return page.blocks;
  const first = page.blocks[0]!;
  if (first.type === 'RICH_TEXT') {
    const markdown = first.props['markdown'];
    if (
      typeof markdown === 'string' &&
      markdown.trim() &&
      markdown.split(/\n{2,}/)[0]!.trim() === firstBlockText(page)
    ) {
      return page.blocks.slice(1);
    }
  }
  return page.blocks;
}
