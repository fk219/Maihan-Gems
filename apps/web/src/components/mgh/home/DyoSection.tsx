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
 * The three steps are the real configurator's steps, combined honestly:
 * stone, mounting (setting + metal), review. One action only — the studio
 * begins with the stone.
 */
export function DyoSection() {
  return (
    <section className="mh6-dyo" aria-labelledby="mh6-dyo-title" data-reveal>
      <div className="mh6-home__wrap mh6-dyo__grid">
        <div className="mh6-dyo__text">
          <h2 id="mh6-dyo-title" className="mh6-section-title">
            Made around the stone.
          </h2>
          <p className="mh6-dyo__copy">
            Start with a record, not a template. The stone sets the mounting that fits it, and
            the dossier shows the whole piece before anything is made.
          </p>

          <ol className="mh6-dyo__steps">
            {STEPS.map((step) => (
              <li key={step.number} className="mh6-dyo__step">
                <span className="mh6-dyo__num" aria-hidden="true">
                  {step.number}
                </span>
                <div className="mh6-dyo__step-body">
                  <h3 className="mh6-dyo__step-title">{step.title}</h3>
                  <p className="mh6-dyo__step-copy">{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link
            href="/design-your-own?step=stone#dyoj-studio"
            className="mh6-button"
          >
            Begin with a stone
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="mh6-dyo__plate">
          <img
            src="/mgh/images/gems/setting-ring.jpg"
            alt="A diamond ring in a halo setting, lit from the left on a dark chase"
            width={1200}
            height={800}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
