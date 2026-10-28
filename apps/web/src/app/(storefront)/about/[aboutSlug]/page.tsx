import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { getAboutPageContent } from '@/lib/mgh/storefront-data';
import { SITE_URL } from '@/lib/mgh/site-url';

// U-07 fix: the previous repo page rendered filler for ANY slug (e.g. the
// /meet-our-team and /michael-arnstein 301 targets). The reference applet's
// contract is honoured instead: only the house subpages (index/provenance/
// atelier) resolve; an unknown slug is an honest 404.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ aboutSlug: string }>;
}): Promise<Metadata> {
  const { aboutSlug } = await params;
  const content = getAboutPageContent(aboutSlug);
  if (!content) {
    return {
      title: 'Page Not Found — About Maihan Gems',
      description: 'The requested about subpage does not exist.',
    };
  }
  return {
    title: `${content.title} | Maihan Gems`,
    description: content.lede,
    alternates: { canonical: `${SITE_URL}/about/${content.slug}` },
  };
}

export default async function AboutSubpage({
  params,
}: {
  params: Promise<{ aboutSlug: string }>;
}) {
  const { aboutSlug } = await params;
  const content = getAboutPageContent(aboutSlug);
  if (!content) {
    notFound();
  }

  return (
    <div className="golden-cloud-gallery text-[#181613] font-[family-name:var(--font-eb-garamond)] min-h-[80vh]">
      <section className="border-b border-[#E5D4B3] bg-gradient-to-br from-[#FFFDF9] via-[#FAF3E3] to-[#F3E4C2]/60 py-14 sm:py-18">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
          <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.22em] text-[#7A7060]">
            <ol className="flex items-center gap-2">
              <li><Link href="/" className="hover:text-[#181613]">Home</Link></li>
              <li aria-hidden="true">·</li>
              <li><Link href="/about" className="hover:text-[#181613]">About Us</Link></li>
              <li aria-hidden="true">·</li>
              <li aria-current="page" className="font-semibold text-[#8B6B23]">{content.title}</li>
            </ol>
          </nav>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              {content.kicker}
            </p>
            <div className="w-10 h-[1.5px] bg-[#C5A059]" />
            <h1 className="text-4xl sm:text-5xl font-normal text-[#181613] tracking-tight">
              {content.title}
            </h1>
            <p className="text-base sm:text-lg text-[#4E463A] leading-relaxed max-w-3xl">
              {content.lede}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#C5A059] bg-white hover:bg-[#FAF4E6] text-xs uppercase tracking-[0.18em] text-[#181613] font-semibold transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to About Us</span>
            </Link>
            <Link
              href="/varieties"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full gold-gradient-cta text-xs uppercase tracking-[0.18em] font-bold"
            >
              <span>Explore Gemstones</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        {content.sections.map((sec) => (
          <section
            key={sec.heading}
            className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-7 sm:p-8 shadow-[0_12px_34px_rgba(185,150,75,0.08)] space-y-3"
          >
            <h2 className="text-2xl sm:text-3xl font-normal text-[#181613]">
              {sec.heading}
            </h2>
            <p className="text-base text-[#4E463A] leading-relaxed">{sec.body}</p>
          </section>
        ))}

        <div className="pt-4 flex justify-center">
          <Link
            href="/concierge"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#0A0A0B] text-[#E6C97A] hover:bg-[#1E1C18] text-xs uppercase tracking-[0.2em] font-semibold transition-colors"
          >
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            <span>Consult the AI Gemologist</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
