import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEducationHubData, getEducationArticleByPath } from '@/lib/storefront-data';
import { SITE_URL } from '@/app/layout';

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
  const article = getEducationArticleByPath(educationPath);
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
          {articles.map((art) => (
            <article
              key={art.slugKey}
              className="rounded border border-[#E2DFD7] bg-white p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
                  {art.category} · {art.readingMinutes} min read
                </p>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#141413]">
                  <Link href={`/education/${art.slugKey}`} className="hover:underline">
                    {art.title}
                  </Link>
                </h2>
                <p className="text-xs text-[#52504C] leading-relaxed">{art.lede}</p>
              </div>
              <div className="pt-3 border-t border-[#E2DFD7] flex justify-between items-center text-xs">
                <span className="font-[family-name:var(--font-mono)] text-[#78756F]">
                  Updated {art.updatedAt}
                </span>
                <Link href={`/education/${art.slugKey}`} className="font-medium text-[#1E3A5F] underline">
                  Read Monograph →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
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
