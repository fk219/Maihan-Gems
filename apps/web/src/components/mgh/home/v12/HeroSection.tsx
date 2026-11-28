import { HomeSearch } from '../HomeSearch';

/**
 * The hero, kept as approved and re-measured: one stone on the right, one
 * line at 56/60, one supporting sentence, one search. One scrim, no ambient
 * light, no gold word. The photograph settles once over 600 ms.
 */
export function HeroSection() {
  return (
    <section
      className="mh12-hero"
      data-section="hero"
      data-surface="obsidian"
      aria-labelledby="mh12-hero-title"
    >
      <div className="mh12-hero__media" aria-hidden="true">
        <img
          src="/mgh/images/gems/sapphire-gem.jpg"
          alt=""
          width={1200}
          height={1800}
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="mh12-hero__scrim" aria-hidden="true" />

      <div className="mh12-wrap mh12-hero__inner">
        <div className="mh12-hero__content">
          <h1 id="mh12-hero-title" className="mh12-h1 mh12-hero__title">
            The stone comes first.
          </h1>
          <p className="mh12-lede mh12-hero__lede">
            Maihan Gems is a gemstone house: loose stones, matched pairs and atelier mountings,
            each published with the record behind it.
          </p>
          <div className="mh12-hero__search">
            <HomeSearch />
          </div>
        </div>
      </div>
    </section>
  );
}
