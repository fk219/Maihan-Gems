import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The closing invitation is the one place where gold holds the action: the
 * copy sits on warm black, and the appointment sits on a gold plaque with ink
 * type, so the page ends on the metal rather than on another black rectangle.
 * The plaque is a flat sheet with a hairline, not glass; it is the only gold
 * surface outside the atelier band.
 */
export function AppointmentSection() {
  return (
    <section className="mh6-cta" aria-labelledby="mh6-cta-title" data-reveal>
      <div className="mh6-cta__light" aria-hidden="true" />
      <div className="mh6-home__wrap mh6-cta__grid">
        <div className="mh6-cta__copy-col">
          <p className="mh6-eyebrow mh6-eyebrow--dark">Appointments</p>
          <h2 id="mh6-cta-title" className="mh6-cta__title">
            See the stone
            <br />
            before you decide.
          </h2>
          <p className="mh6-cta__copy">
            Private appointments in New York, Geneva and London, with the stones you are
            considering on the table.
          </p>
        </div>

        <div className="mh6-cta__plaque">
          <p className="mh6-cta__plaque-line">By appointment</p>
          <Link href="/contact" className="mh6-button mh6-button--ink">
            Request an appointment
            <ArrowRight aria-hidden="true" />
          </Link>
          <p className="mh6-cta__note">
            No obligation. If what you want is not in the vault, we will say so.
          </p>
        </div>
      </div>
    </section>
  );
}
