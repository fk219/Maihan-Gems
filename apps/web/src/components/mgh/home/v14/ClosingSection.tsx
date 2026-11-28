import Link from 'next/link';

/**
 * The closing invitation. One line and one control, and the page's only
 * filled gold button. On a phone the button is full width in the thumb zone;
 * from 768 the line and the button share one baseline. The gold hairline
 * above the band is this section's single accent.
 */
export function ClosingSection() {
  return (
    <section className="mh14-closing" data-section="closing" aria-labelledby="mh14-closing-title">
      <div className="mh14-wrap mh14-closing__inner">
        <h2 id="mh14-closing-title" className="mh14-closing__line">
          See the stone before you decide.
        </h2>
        <Link href="/contact" className="mh14-closing__button">
          <span>Request a private viewing</span>
          <span aria-hidden="true" className="mh14-closing__arrow">
            &rarr;
          </span>
        </Link>
      </div>
    </section>
  );
}
