import Link from 'next/link';
import { HomeSearch } from './HomeSearch';

/**
 * The hero is deliberately four things: one editorial line, one supporting
 * line, the search, and one quiet alternative. Everything else was removed.
 *
 * The image is a single lit still (not the old stock video), cropped so the
 * stone sits in raking light on the right; the left edge dissolves into the
 * same obsidian as the page. One light source, one scrim, no second gradient.
 */
export function HomeHero() {
  return (
    <section className="mh6-hero" aria-labelledby="mh6-hero-title">
      <div className="mh6-hero__media" aria-hidden="true">
        <img
          src="/mgh/images/gems/sapphire-gem.jpg"
          alt=""
          width={1200}
          height={1800}
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="mh6-hero__scrim" aria-hidden="true" />
      <div className="mh6-hero__light" aria-hidden="true" />

      <div className="mh6-hero__inner">
        <div className="mh6-hero__content">
          <h1 id="mh6-hero-title" className="mh6-hero__title">
            The stone comes first.
          </h1>
          <p className="mh6-hero__lede">
            Maihan Gems. Natural gemstones and atelier mountings, each shown with the evidence
            the record carries.
          </p>

          <div className="mh6-hero__search">
            <HomeSearch />
          </div>

          <p className="mh6-hero__alt">
            <Link href="/concierge" className="mh6-link">
              Ask a gemologist
              <span aria-hidden="true"> →</span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
