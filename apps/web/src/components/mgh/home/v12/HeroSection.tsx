import { HomeSearch } from '../HomeSearch';

/**
 * The hero is one photograph, one line, one search. On a phone the line and
 * the search sit in the thumb zone above the fixed demo badge; the supporting
 * sentence appears from the desktop breakpoint, where there is room for it.
 * On desktop the photograph stays full bleed and the copy takes the left six
 * columns.
 *
 * The photograph is the catalogue's representative sapphire ring, not a
 * record's own image, and the caption says so.
 */
export function HeroSection() {
  return (
    <section className="mh12-hero" data-section="hero" aria-labelledby="mh12-hero-title">
      <div className="mh12-hero__media">
        <img
          src="/media/jew-sapphire-ring.jpg"
          alt="A sapphire and diamond ring on black velvet, a catalogue photograph"
          width={1152}
          height={864}
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="mh12-hero__scrim" aria-hidden="true" />

      <div className="mh12-wrap mh12-hero__inner">
        <div className="mh12-hero__content">
          <span className="mh12-hero__rule" aria-hidden="true" />
          <h1 id="mh12-hero-title" className="mh12-display">
            The stone comes first.
          </h1>
          <p className="mh12-hero__lede">
            Loose stones, matched pairs and atelier mountings, each published with the record
            behind it.
          </p>
          <p className="mh12-label mh12-hero__note">Illustrative photography</p>
          <div className="mh12-hero__search">
            <HomeSearch />
          </div>
        </div>
      </div>
    </section>
  );
}
