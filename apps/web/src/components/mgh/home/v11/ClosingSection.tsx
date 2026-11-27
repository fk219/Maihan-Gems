import Link from 'next/link';

/**
 * The closing is deliberately two elements: one line and one action. The
 * page's one gold hairline rule sits at its top edge and the one gold-bordered
 * CTA closes the page — gold is spent here, and nowhere else on the homepage.
 */
export function ClosingSection() {
  return (
    <section className="v11-dark v11-close" aria-labelledby="v11-close-title">
      <div className="v11-wrap v11-close__inner">
        <h2 id="v11-close-title" className="v11-statement v11-enter">
          See the stone before you decide.
        </h2>
        <Link href="/contact" className="v11-action v11-action--gold v11-enter">
          <span className="v11-close__label">Request an appointment</span>
          <span aria-hidden="true" className="v11-action__arrow">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
