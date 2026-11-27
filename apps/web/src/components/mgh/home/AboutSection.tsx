import Link from 'next/link';
import { ORGANIZATION_EVIDENCE } from '@/lib/jsonld';

/**
 * The text-only composition: no photograph stands in for a house history the
 * application does not yet publish. What is stated is the method and the
 * observed identity — the address and the salons already emitted on every
 * page — not a founding year, a client count or a press claim.
 */
export function AboutSection() {
  const identity = ORGANIZATION_EVIDENCE;

  return (
    <section className="mh6-about" aria-labelledby="mh6-about-title" data-reveal>
      <div className="mh6-home__wrap">
        <div className="mh6-about__plate">
          <div className="mh6-about__head">
            <p className="mh6-about__kicker">The house</p>
            <h2 id="mh6-about-title" className="mh6-about__title">
              An independent house for coloured stones.
            </h2>
          </div>

          <div className="mh6-about__body">
            <p className="mh6-about__lead">
              Maihan Gems handles loose stones, matched pairs and atelier mountings as one
              continuous record: the stone first, the mounting that fits it second, the dossier
              last.
            </p>
            <p className="mh6-about__copy">
              The catalogue is built as a record, not a feed. Every stone is one row, every field
              shows the evidence it carries, and a value the row does not hold is printed as
              missing rather than filled with a plausible number.
            </p>

            <dl className="mh6-about__facts">
              <div>
                <dt>New York</dt>
                <dd>
                  {identity.streetAddress}
                  <br />
                  {identity.addressLocality}, {identity.addressRegion} {identity.postalCode}
                </dd>
              </div>
              <div>
                <dt>Salons</dt>
                <dd>New York · Geneva · London, by appointment</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>One stone, one record. Price is the record’s price, never a per-carat estimate.</dd>
              </div>
            </dl>

            <div className="mh6-about__links">
              <Link href="/varieties" className="mh6-link">
                Read the varieties
                <span aria-hidden="true"> →</span>
              </Link>
              <Link href="/contact" className="mh6-link">
                Request a viewing
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
