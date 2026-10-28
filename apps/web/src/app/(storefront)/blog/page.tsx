import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/mgh/storefront-data';
import { listCmsPages, type CmsPage } from '@/lib/cms-pages';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: journal dispatch seam kept on the repo's locked
// `pages` table (doc 22 — BLOG kind, published head revision only). When the
// CMS holds no published dispatch, the applet's ported journal posts render
// verbatim (client-approved copy, no fabricated CMS metadata).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Field Notes & Gemological Journal',
  description:
    'Dispatches from Merelani Block D, Ratnapura, and our Geneva lapidary bench on optical orientation and crystal diaphaneity.',
  alternates: { canonical: `${SITE_URL}/blog` },
};

/** First display paragraph of the stored blocks, for honest card summaries. */
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

export default async function BlogIndexPage() {
  const posts = getAllBlogPosts();
  const cmsPages = (await listCmsPages('BLOG')).filter((page) => page.slug !== 'blog');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#141413]">Journal</li>
        </ol>
      </nav>

      <div className="border-b border-[#E2DFD7] pb-6">
        <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
          ORIGIN DISPATCHES &amp; LAPIDARY NOTES
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#141413]">
          The Maihan Journal
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(cmsPages.length > 0 ? cmsPages : posts).map((entry) => {
          // CMS dispatch row: the applet's journal card chrome driven by real
          // stored values only (title, updated date, stored paragraph).
          if ('pageKind' in entry) {
            return (
              <article
                key={entry.slug}
                className="rounded border border-[#E2DFD7] bg-white p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
                    PUBLISHED DISPATCH
                    {entry.updatedAt ? ` · ${entry.updatedAt.slice(0, 10)}` : ''}
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#141413]">
                    <Link href={`/blog/${entry.slug}`} className="hover:underline">
                      {entry.title}
                    </Link>
                  </h2>
                  <p className="text-xs text-[#52504C] leading-relaxed">{firstBlockText(entry)}</p>
                </div>
                <div className="pt-3 border-t border-[#E2DFD7] flex justify-end items-center text-xs">
                  <Link href={`/blog/${entry.slug}`} className="font-medium text-[#1E3A5F] underline">
                    Read Dispatch →
                  </Link>
                </div>
              </article>
            );
          }
          return (
            <article
              key={entry.slug}
              className="rounded border border-[#E2DFD7] bg-white p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
                  {entry.category} · {entry.publishedAt}
                </p>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#141413]">
                  <Link href={`/blog/${entry.slug}`} className="hover:underline">
                    {entry.title}
                  </Link>
                </h2>
                <p className="text-xs text-[#52504C] leading-relaxed">{entry.lede}</p>
              </div>
              <div className="pt-3 border-t border-[#E2DFD7] flex justify-between items-center text-xs">
                <span className="text-[#52504C]">{entry.author}</span>
                <Link href={`/blog/${entry.slug}`} className="font-medium text-[#1E3A5F] underline">
                  Read Dispatch →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
