import { ArrowLink } from './ArrowLink';

const STEPS = [
  {
    number: '01',
    title: 'Choose the stone',
    line: 'Carat, shape and treatment come from the record, not from a preset.',
  },
  {
    number: '02',
    title: 'Fit the mounting',
    line: 'Only the settings whose rules accept that stone are offered.',
  },
  {
    number: '03',
    title: 'Price the commission',
    line: 'Metal and size are added, and the whole price is shown before you commit.',
  },
] as const;

/**
 * Three steps, no photograph. This is the page's text-only band, set on
 * obsidian so the rhythm breaks hard between the jewellery and the
 * gemologist. The step numbers are the only gold on the surface.
 */
export function DesignYourOwnSection() {
  return (
    <section className="mh12-dyo" data-section="design-your-own" aria-labelledby="mh12-dyo-title">
      <div className="mh12-wrap mh12-dyo__grid">
        <div className="mh12-dyo__head">
          <h2 id="mh12-dyo-title" className="mh12-h2">
            Design it stone first.
          </h2>
          <p className="mh12-dyo__lede">
            The studio starts with a stone it can evidence, then fits the mounting to its shape
            and carat.
          </p>
          <ArrowLink href="/design-your-own">Open the configurator</ArrowLink>
        </div>

        <ol className="mh12-dyo__steps">
          {STEPS.map((step) => (
            <li key={step.number} className="mh12-dyo__step">
              <span className="mh12-label mh12-dyo__num">{step.number}</span>
              <h3 className="mh12-h3">{step.title}</h3>
              <p className="mh12-meta">{step.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
