import Link from 'next/link';

import { HomeSearch } from '../HomeSearch';

/**
 * The restored hero: full viewport height, edge to edge, one photograph, the
 * slogan centred on both axes, the catalogue search directly beneath it, and
 * one quiet alternative below the search. Nothing else is in the section.
 *
 * The photograph is the catalogue's representative tanzanite on black velvet.
 * It is a stand-in, not a pictured lot, so it carries a descriptive alt and the
 * site-wide demo badge remains the visible notice. The veil is strongest at the
 * optical centre, where the type sits, so the slogan clears AA against the
 * brightest facet as well as the black velvet.
 */
export function HeroSection() {
  return (
    <section className="mh14-hero" data-section="hero" aria-labelledby="mh14-hero-title">
      <div className="mh14-hero__plate">
        <img
          src="/media/stone-tanzanite.jpg"
          alt="A cut violet-blue tanzanite on black velvet, an illustrative catalogue photograph"
          width={1152}
          height={864}
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="mh14-hero__veil" aria-hidden="true" />

      <div className="mh14-hero__inner">
        <h1 id="mh14-hero-title" className="mh14-hero__title">
          The stone comes first.
        </h1>

        <div className="mh14-hero__tail">
          <div className="mh14-hero__search">
            <HomeSearch />
          </div>

          <p className="mh14-hero__alt">
            <Link href="/concierge">
              <span className="mh14-hero__alt-label">Ask a gemologist</span>
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
