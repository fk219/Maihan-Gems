import Link from 'next/link';

const STEPS = [
  {
    number: '01',
    title: 'Choose the stone',
    copy: 'Filter the vault by variety, weight, origin and price. The certificate reference travels with the record.',
  },
  {
    number: '02',
    title: 'Choose the mounting',
    copy: 'Ring, pendant and earring mountings in 950 platinum and 18k gold, filtered to the stone’s shape and carat.',
  },
  {
    number: '03',
    title: 'Review the commission',
    copy: 'Stone, metal, size and price in one dossier, before the bench begins.',
  },
];

/**
 * The configurator section sells the sequence, not a mood. The plate is an
 * illustrative photograph of a rough tanzanite crystal — the stone as it is
 * before the bench — and the caption says so. The studio itself configures the
 * record: shape, carat and certificate reference, never a stand-in stone.
 *
 * The steps carry no photograph; they are the sequence the studio enforces.
 */
export function ConfiguratorSection() {
  return (
    <section className="v9-dyo" aria-labelledby="v9-dyo-title" data-reveal>
      <div className="v9-wrap v9-dyo__head">
        <div>
          <p className="v9-eyebrow v9-eyebrow--dark">Design your own</p>
          <h2 id="v9-dyo-title" className="v9-display v9-dyo__title">
            Stone. Mounting. Review.
          </h2>
        </div>
        <p className="v9-promise v9-promise--dark">
          Choose the stone first. The studio fits the mounting to its shape and carat, then
          prices the whole commission before the bench begins.
        </p>
      </div>

      <figure className="v9-dyo__figure">
        <div className="v9-plate v9-dyo__media">
          <img
            src="/media/stock/tanzanite-rough.jpg"
            alt="A rough violet-blue tanzanite crystal with parallel striations, photographed on a dark ground"
            width={1920}
            height={2891}
            loading="lazy"
            decoding="async"
            style={{ objectPosition: '50% 22%' }}
          />
        </div>
        <figcaption className="v9-dyo__caption">
          Illustrative photograph — a rough tanzanite crystal, the stone before the bench. The
          studio configures the record: shape, carat and certificate reference, never a stand-in
          stone.
        </figcaption>
      </figure>

      <div className="v9-wrap v9-dyo__foot">
        <ol className="v9-steps">
          {STEPS.map((step) => (
            <li key={step.number} className="v9-step">
              <span className="v9-step__num" aria-hidden="true">
                {step.number}
              </span>
              <h3 className="v9-step__title">{step.title}</h3>
              <p className="v9-step__copy">{step.copy}</p>
            </li>
          ))}
        </ol>

        <Link href="/design-your-own" className="v9-action v9-action--dark">
          Open the configurator
          <span aria-hidden="true" className="v9-action__arrow">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
