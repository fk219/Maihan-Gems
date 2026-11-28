import Link from 'next/link';

import { SectionAction } from './SectionAction';

/**
 * The variety band. Every stone variety the catalogue taxonomy carries is
 * here, each with the catalogue's representative photograph of that variety
 * and the hardness the taxonomy records.
 *
 * From the tablet breakpoint the band is a continuous marquee: one list of
 * links plus one non-interactive duplicate (`aria-hidden`, no focus stops)
 * that makes the loop seamless. Hover or focus pauses it, and reduced motion
 * gets a static, scrollable rail instead of the loop. On a phone it is a snap
 * rail of 52vw cards, so the next stone peeks and the band reads as a rail.
 *
 * The section's one action follows the band, where the visitor has seen what
 * the varieties are. The cards are the section's content: one link per
 * record, no repeated call to action.
 */
export interface Variety {
  slug: string;
  name: string;
  fact: string;
  href: string;
  image: string;
}

function VarietyCard({ variety }: { variety: Variety }) {
  return (
    <Link href={variety.href} className="mh14-variety">
      <span className="mh14-variety__plate">
        <img
          src={variety.image}
          alt=""
          width={1152}
          height={864}
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="mh14-variety__name">{variety.name}</span>
      <span className="mh14-variety__fact">{variety.fact}</span>
    </Link>
  );
}

export function VarietyBand({ varieties }: { varieties: readonly Variety[] }) {
  if (varieties.length === 0) return null;

  return (
    <section
      className="mh14-varieties"
      data-section="varieties"
      aria-labelledby="mh14-varieties-heading"
    >
      <input
        type="checkbox"
        id="mh14-band-pause"
        className="mh14-varieties__pause-input"
      />

      <div className="mh14-wrap mh14-varieties__intro">
        <h2 id="mh14-varieties-heading" className="mh14-h2">
          Every variety, photographed.
        </h2>
        <p className="mh14-lede mh14-lede--dark">
          Eight stones, each with the hardness the catalogue records and its own page.
        </p>
        <label htmlFor="mh14-band-pause" className="mh14-varieties__pause">
          <span className="mh14-varieties__pause-play">Play the band</span>
          <span className="mh14-varieties__pause-pause">Pause the band</span>
        </label>
      </div>

      <div className="mh14-varieties__rail">
        <div className="mh14-varieties__track">
          <ul className="mh14-varieties__list" aria-labelledby="mh14-varieties-heading">
            {varieties.map((variety) => (
              <li key={variety.slug}>
                <VarietyCard variety={variety} />
              </li>
            ))}
          </ul>

          <ul className="mh14-varieties__list mh14-varieties__list--echo" aria-hidden="true">
            {varieties.map((variety) => (
              <li key={`${variety.slug}-echo`}>
                <span className="mh14-variety">
                  <span className="mh14-variety__plate">
                    <img
                      src={variety.image}
                      alt=""
                      width={1152}
                      height={864}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="mh14-variety__name">{variety.name}</span>
                  <span className="mh14-variety__fact">{variety.fact}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mh14-wrap mh14-varieties__foot">
        <p>Illustrative photographs.</p>
        <SectionAction href="/varieties" tone="dark">
          See all varieties
        </SectionAction>
      </div>
    </section>
  );
}
