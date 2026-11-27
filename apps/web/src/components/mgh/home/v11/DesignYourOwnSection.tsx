import Link from 'next/link';

/**
 * Design your own is a dark screen with one line. The photograph is the
 * committed illustrative rough tanzanite (docs/IMAGE_CREDITS.md): the stone as
 * it arrives, before the bench. The caption names it as illustrative and the
 * site-wide demo badge stands over it.
 */
export function DesignYourOwnSection() {
  return (
    <section className="v11-section v11-dark v11-dyo" aria-labelledby="v11-dyo-title">
      <div className="v11-wrap">
        <h2 id="v11-dyo-title" className="v11-statement v11-enter">
          Design your own, stone first.
        </h2>
        <p className="v11-line v11-enter">
          The studio fits the mounting to the stone's shape and carat, then prices the whole
          commission before the bench begins.
        </p>

        <figure className="v11-dyo__figure v11-enter-media">
          <img
            src="/media/stock/tanzanite-rough.jpg"
            alt="A rough violet-blue tanzanite crystal on a dark ground"
            width={1920}
            height={2891}
            loading="lazy"
            decoding="async"
          />
          <figcaption className="v11-caption">
            Tanzanite, before the bench. Illustrative photograph.
          </figcaption>
        </figure>

        <Link href="/design-your-own" className="v11-action v11-enter">
          Open the configurator
          <span aria-hidden="true" className="v11-action__arrow">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
