import Link from 'next/link';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { certificateLine, formatCarat, formatUsd } from './format';

/**
 * One record, shown as a record. This is the page's text-only composition:
 * no photograph stands in for a stone the catalogue has not photographed.
 * Every value is read from the row; an absent value is printed as absent
 * (INV-07), never filled with a plausible number.
 */
export function RecordSection({ stone }: { stone: GemstoneItem | null }) {
  if (!stone) return null;

  return (
    <section className="mh6-record" aria-labelledby="mh6-record-title" data-reveal>
      <div className="mh6-home__wrap mh6-record__grid">
        <div className="mh6-record__head">
          <h2 id="mh6-record-title" className="mh6-record__title">
            Nothing here is described better than it is.
          </h2>
          <p className="mh6-record__copy">
            Every field is read from the record. Weight, origin, treatment, certificate and
            price appear as the record carries them; where it is silent, the page says so
            instead of filling the space.
          </p>
          <Link href={`/products/${stone.slug}`} className="mh6-link">
            Open the record
            <span aria-hidden="true"> →</span>
          </Link>
        </div>

        <div className="mh6-record__body">
          <p className="mh6-record__kicker">A record from the vault</p>
          <h3 className="mh6-record__stone">{stone.name}</h3>

          <dl className="mh6-record__table">
            <div className="mh6-record__row">
              <dt>Variety</dt>
              <dd>{stone.variety || 'Not recorded'}</dd>
            </div>
            <div className="mh6-record__row">
              <dt>Weight</dt>
              <dd>{formatCarat(stone.carat)}</dd>
            </div>
            <div className="mh6-record__row">
              <dt>Origin</dt>
              <dd>{stone.origin || 'Not recorded'}</dd>
            </div>
            <div className="mh6-record__row">
              <dt>Treatment</dt>
              <dd>{stone.treatmentDisclosed || 'Not recorded'}</dd>
            </div>
            <div className="mh6-record__row">
              <dt>Certificate</dt>
              <dd>{certificateLine(stone.evidence)}</dd>
            </div>
            <div className="mh6-record__row mh6-record__row--price">
              <dt>Price</dt>
              <dd>{formatUsd(stone.price)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
