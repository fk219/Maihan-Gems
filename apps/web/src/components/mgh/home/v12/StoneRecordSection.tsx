import { ArrowLink } from './ArrowLink';

/**
 * One 21:9 full-bleed photograph, one line at its foot, one action. The image
 * is the committed illustrative tanzanite (docs/IMAGE_CREDITS.md) and the
 * caption under the band says exactly that.
 */
export function StoneRecordSection() {
  return (
    <section
      className="mh12-band mh12-band--paper mh12-stone"
      data-section="stone"
      data-surface="paper"
      aria-labelledby="mh12-stone-title"
    >
      <figure className="mh12-stone__figure">
        <img
          src="/media/stock/tanzanite.jpg"
          alt="A faceted violet-blue tanzanite with bright facet flashes, photographed on black"
          width={1444}
          height={1141}
          loading="lazy"
          decoding="async"
        />
        <div className="mh12-wrap mh12-stone__copy">
          <h2 id="mh12-stone-title" className="mh12-h2 mh12-stone__title">
            The stone, and the record behind it.
          </h2>
          <ArrowLink href="/gemstones" className="mh12-stone__action">
            See every gemstone
          </ArrowLink>
        </div>
      </figure>
      <div className="mh12-wrap">
        <p className="mh12-price mh12-stone__caption">Tanzanite · Illustrative photograph</p>
      </div>
    </section>
  );
}
