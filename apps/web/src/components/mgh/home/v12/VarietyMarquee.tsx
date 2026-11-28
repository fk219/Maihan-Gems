import Link from 'next/link';

/**
 * The variety band. Every stone variety the taxonomy carries is here with the
 * catalogue's representative photograph of that variety.
 *
 * On a phone it is a horizontal snap rail of 78vw cards, so the next stone
 * peeks and the rail reads as a rail rather than a column. On desktop the same
 * cards become a continuous photographic band; the second half is a
 * non-interactive duplicate (no links, aria-hidden) so the loop never presents
 * a second tab stop. Hover and keyboard focus pause the band; reduced motion
 * gets the scrollable rail instead of the loop.
 */
export interface Variety {
  slug: string;
  name: string;
  fact: string;
  href: string;
  image: string;
  alt: string;
}

export function VarietyMarquee({ varieties }: { varieties: readonly Variety[] }) {
  if (varieties.length === 0) return null;

  return (
    <section
      className="mh12-marquee"
      data-section="varieties"
      aria-labelledby="mh12-varieties-title"
    >
      <div className="mh12-wrap mh12-marquee__head">
        <h2 id="mh12-varieties-title" className="mh12-label">
          The varieties
        </h2>
        <p className="mh12-label mh12-marquee__count">Illustrative images</p>
      </div>

      <div
        className="mh12-marquee__clip"
        role="region"
        aria-label="Gemstone varieties. Focus this band to pause it."
        tabIndex={0}
      >
        <div className="mh12-marquee__track">
          <ul className="mh12-marquee__list" role="list">
            {varieties.map((variety) => (
              <li key={variety.slug}>
                <Link href={variety.href} className="mh12-card mh12-card--dark">
                  <span className="mh12-card__frame">
                    <img
                      src={variety.image}
                      alt=""
                      width={1152}
                      height={864}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="mh12-card__fact">{variety.fact}</span>
                  <span className="mh12-card__action">
                    <span className="mh12-u">See the variety</span>
                    <span aria-hidden="true" className="mh12-card__arrow">
                      &rarr;
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mh12-marquee__list mh12-marquee__list--dup" aria-hidden="true">
            {varieties.map((variety) => (
              <li key={`${variety.slug}-dup`}>
                <div className="mh12-card mh12-card--dark">
                  <span className="mh12-card__frame">
                    <img
                      src={variety.image}
                      alt=""
                      width={1152}
                      height={864}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="mh12-card__fact">{variety.fact}</span>
                  <span className="mh12-card__action">
                    <span className="mh12-u">See the variety</span>
                    <span aria-hidden="true" className="mh12-card__arrow">
                      &rarr;
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
