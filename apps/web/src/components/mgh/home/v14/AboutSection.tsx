import { SectionAction } from './SectionAction';

/**
 * The house, compact: one statement, one paragraph, one plate and one action.
 * The statement is centred like a chapter opener; the plate is tucked beside
 * the paragraph rather than competing with it. The plate is the illustrative
 * rough tanzanite crystal (docs/IMAGE_CREDITS.md), framed by a single gold
 * hairline, and its caption says it is a stand-in, not a pictured lot.
 */
export function AboutSection() {
  return (
    <section className="mh14-about" data-section="about" aria-labelledby="mh14-about-title">
      <div className="mh14-wrap">
        <h2 id="mh14-about-title" className="mh14-about__statement">
          A gemstone house, not a marketplace.
        </h2>

        <div className="mh14-about__body">
          <figure className="mh14-about__plate">
            <span className="mh14-about__frame">
              <img
                src="/media/stock/tanzanite-rough.jpg"
                alt="A rough violet-blue tanzanite crystal on a dark ground, an illustrative photograph"
                width={1920}
                height={2891}
                loading="lazy"
                decoding="async"
              />
            </span>
            <figcaption className="mh14-about__caption">
              Before the bench. Illustrative photograph.
            </figcaption>
          </figure>

          <div className="mh14-about__copy">
            <p className="mh14-body">
              Every stone is published with the laboratory it names and the fields its record
              actually holds. Where a field is absent, the page says so.
            </p>
            <SectionAction href="/about">Read about the house</SectionAction>
          </div>
        </div>
      </div>
    </section>
  );
}
