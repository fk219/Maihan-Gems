import Link from 'next/link';

/**
 * The AI gemologist is one question, set enormous and in italic. The
 * photograph is the committed illustrative amethyst (docs/IMAGE_CREDITS.md),
 * full-bleed and captioned as illustrative; the refusal rule is the product's
 * own: no matching record comes back as a refusal, never an estimate.
 */
export function GemologistSection() {
  return (
    <section className="v11-section v11-dark v11-gem" aria-labelledby="v11-gem-title">
      <div className="v11-wrap v11-gem__head">
        <h2 id="v11-gem-title" className="v11-statement v11-enter">
          Where was this stone mined?
        </h2>
        <p className="v11-line v11-enter">
          Ask about variety, origin, treatment, shape or budget. The answer is what the records
          carry, or an honest refusal.
        </p>
      </div>

      <figure className="v11-gem__figure v11-enter-media">
        <img
          src="/media/stock/amethyst.jpg"
          alt="Four large cut amethysts under raking light on a grey mount"
          width={3234}
          height={2426}
          loading="lazy"
          decoding="async"
        />
        <figcaption className="v11-caption v11-wrap v11-gem__figcap">
          Illustrative photography.
        </figcaption>
      </figure>

      <div className="v11-wrap v11-gem__foot">
        <Link href="/concierge" className="v11-action v11-enter">
          Ask the gemologist
          <span aria-hidden="true" className="v11-action__arrow">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
