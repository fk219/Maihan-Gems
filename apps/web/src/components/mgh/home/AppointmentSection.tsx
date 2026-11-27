import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The closing invitation: one line, one action. The light is a single low
 * falloff at the left; the rest is obsidian and space.
 */
export function AppointmentSection() {
  return (
    <section className="mh6-cta" aria-labelledby="mh6-cta-title" data-reveal>
      <div className="mh6-cta__light" aria-hidden="true" />
      <div className="mh6-home__wrap mh6-cta__grid">
        <div>
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

        <div className="mh6-cta__aside">
          <Link href="/contact" className="mh6-button mh6-button--dark">
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
