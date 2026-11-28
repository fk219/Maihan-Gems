import { ArrowLink } from './ArrowLink';

/**
 * Obsidian, one 3:4 photograph, one line, one action. The photograph is the
 * committed illustrative rough tanzanite and its caption says so.
 */
export function DesignYourOwnSection() {
  return (
    <section
      className="mh12-band mh12-dyo"
      data-section="dyo"
      data-surface="obsidian"
      aria-labelledby="mh12-dyo-title"
    >
      <div className="mh12-wrap mh12-dyo__grid">
        <div>
          <h2 id="mh12-dyo-title" className="mh12-h2 mh12-dyo__title">
            Design your own, stone first.
          </h2>
          <p className="mh12-lede mh12-dyo__line">
            The studio fits the mounting to the stone&rsquo;s shape and carat, then prices the whole
            commission before the bench begins.
          </p>
          <ArrowLink href="/design-your-own" className="mh12-dyo__action">
            Open the configurator
          </ArrowLink>
        </div>

        <figure className="mh12-dyo__figure">
          <img
            src="/media/stock/tanzanite-rough.jpg"
            alt="A rough violet-blue tanzanite crystal on a dark ground"
            width={1920}
            height={2891}
            loading="lazy"
            decoding="async"
          />
          <figcaption className="mh12-price mh12-dyo__caption">
            Tanzanite, before the bench · Illustrative photograph
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
