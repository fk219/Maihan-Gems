import Link from 'next/link';

/**
 * The gemologist section markets a bounded capability: the assistant is useful
 * because it stays inside the catalogue. The proof is a capture of the shipped
 * ask surface, not a staged transcript or a paraphrased answer.
 *
 * The refusal rule is stated in the product's own language and is enforced in
 * the handler: when the search returns nothing, the response carries the
 * refusal instead of an invented stone.
 */
export function GemologistSection() {
  return (
    <section className="v9-gemologist" aria-labelledby="v9-gemologist-title" data-reveal>
      <div className="v9-wrap v9-gemologist__head">
        <div>
          <p className="v9-eyebrow">AI gemologist</p>
          <h2 id="v9-gemologist-title" className="v9-display v9-gemologist__title">
            A grounded answer, or an honest refusal.
          </h2>
        </div>
        <p className="v9-promise">
          Ask about variety, origin, treatment, shape or budget. The concierge reads the
          catalogue and returns only what the records carry.
        </p>
      </div>

      <figure className="v9-gemologist__figure">
        <img
          src="/proof/gemologist.jpg"
          alt="The AI Gemologist ask surface: a plain-language query field and example questions"
          width={1152}
          height={451}
          loading="lazy"
          decoding="async"
        />
        <figcaption className="v9-gemologist__caption">
          The concierge surface, captured from <span className="v9-mono">/concierge</span>.
        </figcaption>
      </figure>

      <div className="v9-wrap v9-gemologist__foot">
        <dl className="v9-gemologist__facts">
          <div>
            <dt>Reads</dt>
            <dd>Variety, colour, origin, shape, treatment, carat and price.</dd>
          </div>
          <div>
            <dt>Refuses</dt>
            <dd>
              A question with no matching record comes back as a refusal, not an estimate.
            </dd>
          </div>
        </dl>

        <Link href="/concierge" className="v9-action">
          Ask the gemologist
          <span aria-hidden="true" className="v9-action__arrow">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
