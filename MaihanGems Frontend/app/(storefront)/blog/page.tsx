import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/storefront-data';
import { SITE_URL } from '@/app/layout';

export const metadata: Metadata = {
  title: 'Field Notes & Gemological Journal',
  description:
    'Dispatches from Merelani Block D, Ratnapura, and our Geneva lapidary bench on optical orientation and crystal diaphaneity.',
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

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
        {posts.map((post) => (
          <article
            key={post.slug}
            className="rounded border border-[#E2DFD7] bg-white p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
                {post.category} · {post.publishedAt}
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#141413]">
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="text-xs text-[#52504C] leading-relaxed">{post.lede}</p>
            </div>
            <div className="pt-3 border-t border-[#E2DFD7] flex justify-between items-center text-xs">
              <span className="text-[#52504C]">{post.author}</span>
              <Link href={`/blog/${post.slug}`} className="font-medium text-[#1E3A5F] underline">
                Read Dispatch →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
