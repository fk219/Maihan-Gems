import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug } from '@/lib/storefront-data';
import { SITE_URL } from '@/app/layout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postSlug: string }>;
}): Promise<Metadata> {
  const { postSlug } = await params;
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
