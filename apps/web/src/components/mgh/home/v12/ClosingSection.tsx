import Link from 'next/link';

/**
 * The closing invitation. One line and one control. On a phone the control is
 * a full-width button in the thumb zone; on desktop the line and the button
 * share one row. The gold hairline above the band is this section's single
 * gold accent.
 */
export function ClosingSection() {
  return (
    <section className="mh12-closing" data-section="closing" aria-labelledby="mh12-closing-title">
      <div className="mh12-wrap mh12-closing__inner">
        <h2 id="mh12-closing-title" className="mh12-h2">
          See the stone before you decide.
        </h2>
        <Link href="/contact" className="mh12-closing__button">
          Request a private viewing
          <span aria-hidden="true" className="mh12-closing__arrow">
            &rarr;
          </span>
        </Link>
      </div>
    </section>
  );
}
