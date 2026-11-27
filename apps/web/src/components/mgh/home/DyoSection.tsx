import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Choose the stone',
    copy: 'Filter the vault by variety, weight, origin and price. The certificate reference travels with the record.',
  },
  {
    number: '02',
    title: 'Choose the mounting',
    copy: 'Ring, pendant and earring settings in 950 platinum and 18k gold, filtered to the stone’s shape and carat.',
  },
  {
    number: '03',
    title: 'Review the commission',
    copy: 'The stone, the metal, the size and the price snapshot in one dossier, before the bench begins.',
  },
];

/**
 * The atelier band is the page's one sheet of gold: a warm metal field with
 * the light falling from the top left, and a photograph whose own background
 * is the same warm stone, masked so it dissolves into the field instead of
 * sitting on it in a box.
 *
 * The three steps are the real configurator's steps: stone, mounting
 * (setting + metal), review. Text sits in the ink-safe range of the gradient;
 * every stop is measured, not eyeballed.
 */
export function DyoSection({ image }: { image: string }) {
  return (
    <section className="mh6-atelier" aria-labelledby="mh6-atelier-title" data-reveal>
      <figure className="mh6-atelier__figure">
        <img
          src={image}
          alt="An emerald-cut diamond in a yellow-gold solitaire, lit on warm stone"
          width={900}
          height={1200}
          loading="lazy"
          decoding="async"
        />
      </figure>

      <div className="mh6-home__wrap mh6-atelier__inner">
        <div className="mh6-atelier__copy">
          <p className="mh6-eyebrow mh6-eyebrow--field">Design your own</p>
          <h2 id="mh6-atelier-title" className="mh6-atelier__title">
            Made around the stone.
          </h2>
          <p className="mh6-atelier__lede">
            The stone is chosen first. The mounting is fitted to its shape and carat, and the
            price of the whole piece is fixed before the bench begins.
          </p>

          <ol className="mh6-atelier__steps">
            {STEPS.map((step) => (
              <li key={step.number} className="mh6-atelier__step">
                <span className="mh6-atelier__num" aria-hidden="true">
                  {step.number}
                </span>
                <div className="mh6-atelier__step-body">
                  <h3 className="mh6-atelier__step-title">{step.title}</h3>
                  <p className="mh6-atelier__step-copy">{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link href="/design-your-own?step=stone#dyoj-studio" className="mh6-button mh6-button--ink">
            Begin with a stone
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
