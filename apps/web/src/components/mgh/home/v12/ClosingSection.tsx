import { ArrowLink } from './ArrowLink';

/**
 * The closing is one line and one action. The gold hairline above the band is
 * the page's first gold use; the action's gradient text is the second and
 * last. Both sit on obsidian — no gold glyph ever lands on paper (2.1:1).
 */
export function ClosingSection() {
  return (
    <section
      className="mh12-band mh12-closing"
      data-section="closing"
      data-surface="obsidian"
      aria-labelledby="mh12-close-title"
    >
      <div className="mh12-wrap mh12-closing__inner">
        <div>
          <h2 id="mh12-close-title" className="mh12-h2 mh12-closing__title">
            See the stone before you decide.
          </h2>
          <p className="mh12-lede mh12-closing__line">
            A private viewing is arranged with the house, not through a form.
          </p>
        </div>
        <ArrowLink href="/contact" className="mh12-closing__action">
          Request a private viewing
        </ArrowLink>
      </div>
    </section>
  );
}
