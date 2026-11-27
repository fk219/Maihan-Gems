import Link from 'next/link';

/**
 * The collection: one statement, one action, and one full-bleed photograph with
 * no card chrome. The photograph is the committed illustrative tanzanite
 * (provenance in docs/IMAGE_CREDITS.md); the caption names it as illustrative
 * and the site-wide demo badge stands over it. It never wears a product name
 * that is not its own.
 */
export function CollectionSection() {
  return (
    <section className="v11-section" aria-labelledby="v11-collection-title">
      <div className="v11-wrap v11-collection__head">
        <h2 id="v11-collection-title" className="v11-statement v11-enter">
          The stone, and the record behind it.
        </h2>
        <Link href="/gemstones" className="v11-action v11-enter">
          See every gemstone
          <span aria-hidden="true" className="v11-action__arrow">
            →
          </span>
        </Link>
      </div>

      <figure className="v11-collection__figure v11-enter-media">
        <img
          src="/media/stock/tanzanite.jpg"
          alt="A faceted violet-blue tanzanite with bright facet flashes, photographed on black"
          width={1444}
          height={1141}
          loading="lazy"
          decoding="async"
        />
      </figure>
      <div className="v11-collection__figcap">
        <p className="v11-caption v11-collection__figcap-inner">
          Tanzanite. Illustrative photograph.
        </p>
      </div>
    </section>
  );
}
