import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug } from '@/lib/mgh/storefront-data';
import { getCmsPageBySlug } from '@/lib/cms-pages';
import { CmsBlockList } from '@/components/cms/CmsBlockView';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: one journal dispatch. CMS-first (doc 22 — BLOG
// kind, published head revision only) rendered in the reference applet's
// article chrome; the applet's ported dispatch copy renders verbatim when
// the CMS has no published row for the slug. Unknown slugs 404 honestly.
export const dynamic = 'force-dynamic';

/** First stored paragraph — the honest stand-in for the dispatch lede. */
function firstBlockText(markdownPage: { blocks: { type: string; props: Record<string, unknown> }[] }): string {
  for (const block of markdownPage.blocks) {
    if (block.type === 'RICH_TEXT') {
      const markdown = block.props['markdown'];
      if (typeof markdown === 'string' && markdown.trim()) {
        return markdown.split(/\n{2,}/)[0]!.trim();
      }
    }
  }
  return '';
}

/** Blocks minus the block that supplied the lede band paragraph. */
function blocksBeyondLede(markdownPage: { blocks: { type: string; props: Record<string, unknown> }[] }) {
  if (markdownPage.blocks.length === 0) return markdownPage.blocks;
  const first = markdownPage.blocks[0]!;
  if (first.type === 'RICH_TEXT') {
    const markdown = first.props['markdown'];
    if (
      typeof markdown === 'string' &&
      markdown.trim() &&
      markdown.split(/\n{2,}/)[0]!.trim() === firstBlockText(markdownPage)
    ) {
      return markdownPage.blocks.slice(1);
    }
  }
  return markdownPage.blocks;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postSlug: string }>;
}): Promise<Metadata> {
  const { postSlug } = await params;
  const cmsPage = await getCmsPageBySlug(postSlug.toLowerCase());
  if (cmsPage && cmsPage.pageKind === 'BLOG') {
    return {
      title: cmsPage.title,
      description: firstBlockText(cmsPage),
      alternates: { canonical: `${SITE_URL}/blog/${cmsPage.slug}` },
    };
  }
  const post = getBlogPostBySlug(postSlug);
  if (!post) {
    return {
      title: 'Dispatch Not Found',
      description: 'The requested journal post does not exist.',
    };
  }
  return {
    title: post.title,
    description: post.lede,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ postSlug: string }>;
}) {
  const { postSlug } = await params;
  const cmsPage = await getCmsPageBySlug(postSlug.toLowerCase());

  if (cmsPage && cmsPage.pageKind === 'BLOG') {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/blog" className="hover:text-[#141413]">Journal</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-[#141413]">{cmsPage.title}</li>
          </ol>
        </nav>

        <article className="rounded border border-[#E2DFD7] bg-white p-8 space-y-6">
          <div className="border-b border-[#E2DFD7] pb-6 space-y-2">
            <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
              PUBLISHED DISPATCH
              {cmsPage.updatedAt ? ` · ${cmsPage.updatedAt.slice(0, 10)}` : ''}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-[#141413]">
              {cmsPage.title}
            </h1>
            {firstBlockText(cmsPage) && (
              <p className="text-base text-[#52504C] pt-2 leading-relaxed">{firstBlockText(cmsPage)}</p>
            )}
          </div>

          <div className="space-y-4 text-sm text-[#141413] leading-relaxed">
            <CmsBlockList blocks={blocksBeyondLede(cmsPage)} />
          </div>
        </article>
      </div>
    );
  }

  const post = getBlogPostBySlug(postSlug);
  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/blog" className="hover:text-[#141413]">Journal</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#141413]">{post.title}</li>
        </ol>
      </nav>

      <article className="rounded border border-[#E2DFD7] bg-white p-8 space-y-6">
        <div className="border-b border-[#E2DFD7] pb-6 space-y-2">
          <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
            {post.category} · PUBLISHED {post.publishedAt}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-[#141413]">
            {post.title}
          </h1>
          <p className="text-xs text-[#52504C]">
            By <strong>{post.author}</strong> — {post.authorRole}
          </p>
          <p className="text-base text-[#52504C] pt-2 leading-relaxed">{post.lede}</p>
        </div>

        <div className="space-y-4 text-sm text-[#141413] leading-relaxed">
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
