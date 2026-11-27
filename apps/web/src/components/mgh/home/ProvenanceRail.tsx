import Link from 'next/link';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { certificateReference, formatCarat } from './format';

/**
 * The marquee is a ledger, not a slogan. Each tile carries a real record:
 * variety, carat, origin and the certificate reference (or the honest
 * absence of one). One record per variety, read from the catalogue.
 *
 * The second copy of the track is purely visual: it is hidden from assistive
 * technology and removed from the tab order, so every record is announced and
 * reachable once. Under reduced motion the track becomes a scrollable rail.
 */
export function ProvenanceRail({ records }: { records: readonly GemstoneItem[] }) {
  if (records.length === 0) return null;

  const set = (duplicate: boolean) => (
    <ul className="mh6-rail__set" aria-hidden={duplicate ? true : undefined}>
      {records.map((record) => (
        <li key={record.id}>
          <Link href={`/products/${record.slug}`} className="mh6-rail__item" tabIndex={-1}>
            <span className="mh6-rail__variety">{record.variety || 'Gemstone'}</span>
            <span className="mh6-rail__facts">
              <span>{formatCarat(record.carat)}</span>
              <span>{record.origin || 'Origin not recorded'}</span>
              <span>{certificateReference(record.evidence)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="mh6-rail" aria-labelledby="mh6-rail-title" data-reveal>
      <div className="mh6-home__wrap mh6-rail__head">
        <h2 id="mh6-rail-title" className="mh6-rail__title">
          The vault, as recorded
        </h2>
        <Link href="/gemstones" className="mh6-link">
          All gemstones
          <span aria-hidden="true"> →</span>
        </Link>
      </div>

      <div className="mh6-rail__viewport">
        <div className="mh6-rail__track">
          {set(false)}
          {set(true)}
        </div>
      </div>
    </section>
  );
}
