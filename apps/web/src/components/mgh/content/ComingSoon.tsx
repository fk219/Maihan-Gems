import Link from 'next/link';

/**
 * F4 honest editorial placeholder (ADR-036): editorial content moves to
 * Sanity. Until the adapter lands, these routes render this state — never
 * fixture copy, never invented articles.
 */
export function ComingSoon({
  title,
  blurb,
  backHref = '/',
  backLabel = 'Back to the collection',
}: {
  title: string;
  blurb: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="golden-cloud-gallery min-h-screen text-[#181613]">
      <section className="mx-auto max-w-3xl px-6 pt-44 sm:pt-52 pb-24 text-center">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[#8A7B5C]">Maihan Gems Editorial</p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl text-[#141413]">{title}</h1>
        <p className="mt-6 text-base leading-relaxed text-[#5C4E3C]">{blurb}</p>
        <div className="mt-10 inline-flex items-center gap-3 rounded-sm border border-[#D4AF37]/40 px-6 py-3">
          <Link href={backHref} className="text-sm text-[#141413] hover:text-[#1E3A5F]">
            {backLabel} →
          </Link>
        </div>
      </section>
    </main>
  );
}
