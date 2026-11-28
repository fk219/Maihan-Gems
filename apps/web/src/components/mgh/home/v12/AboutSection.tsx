import { ArrowLink } from './ArrowLink';

/**
 * The house, restored. One statement, one paragraph, one gold-lit plate and
 * one action. The plate is the committed illustrative rough tanzanite
 * (docs/IMAGE_CREDITS.md), framed by a single gold hairline; it is the stone
 * before the bench, not a record's own photograph, and the caption says so.
 */
export function AboutSection() {
  return (
    <section className="mh12-about" data-section="about" aria-labelledby="mh12-about-title">
      <div className="mh12-wrap mh12-about__grid">
        <h2 id="mh12-about-title" className="mh12-h2 mh12-about__title">
          A gemstone house, not a marketplace.
        </h2>

        <figure className="mh12-about__plate">
          <span className="mh12-about__frame">
            <img
              src="/media/stock/tanzanite-rough.jpg"
              alt="A rough violet-blue tanzanite crystal on a dark ground, an illustrative photograph"
              width={1920}
              height={2891}
              loading="lazy"
              decoding="async"
            />
          </span>
          <figcaption className="mh12-label mh12-about__caption">
            Before the bench. Illustrative photograph.
          </figcaption>
        </figure>

        <div className="mh12-about__copy">
          <p className="mh12-body">
            Every stone is published with the laboratory it names and the fields its record
            actually holds. Where a field is absent, the page says so.
          </p>
          <ArrowLink href="/about">Read about the house</ArrowLink>
        </div>
      </div>
    </section>
  );
}
