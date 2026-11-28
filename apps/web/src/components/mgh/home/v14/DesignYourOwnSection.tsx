import { SectionAction } from './SectionAction';

/**
 * Design your own: the three real stages of a commission, nothing else. The
 * numbers are a sequence, not decoration: the studio genuinely moves from the
 * stone to the mounting to the price in that order.
 *
 * The band is the page's text-only surface on navy, so the rhythm breaks
 * between the house and the gemologist without another photograph.
 */
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

export function DesignYourOwnSection() {
  return (
    <section className="mh14-dyo" data-section="design-your-own" aria-labelledby="mh14-dyo-title">
      <div className="mh14-wrap mh14-dyo__grid">
        <div className="mh14-dyo__head">
          <h2 id="mh14-dyo-title" className="mh14-h2">
            Design it stone first.
          </h2>
          <p className="mh14-lede mh14-lede--dark">
            The studio starts with a stone it can evidence, then fits the mounting to its shape
            and carat.
          </p>
          <SectionAction href="/design-your-own" tone="dark">
            Open the configurator
          </SectionAction>
        </div>

        <ol className="mh14-dyo__steps">
          {STEPS.map((step) => (
            <li key={step.number} className="mh14-dyo__step">
              <span className="mh14-label mh14-dyo__num">{step.number}</span>
              <h3 className="mh14-h3">{step.title}</h3>
              <p className="mh14-meta mh14-meta--dark">{step.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
