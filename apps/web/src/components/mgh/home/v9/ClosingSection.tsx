import Link from 'next/link';

/**
 * The closing section is deliberately two elements: one line and one action.
 * It carries no eyebrow, no supporting paragraph and no second link, so the
 * page ends on a decision rather than a menu.
 */
export function ClosingSection() {
  return (
    <section className="v9-close" aria-labelledby="v9-close-title" data-reveal>
      <div className="v9-wrap v9-close__inner">
        <h2 id="v9-close-title" className="v9-display v9-close__title">
          See the stone before you decide.
        </h2>
        <Link href="/contact" className="v9-close__action">
          Request an appointment
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
