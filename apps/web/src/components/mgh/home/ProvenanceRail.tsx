import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { certificateReference, formatCarat } from './format';

/**
 * The marquee is the taxonomy, not a slogan. Every active variety that has at
 * least one record in the loaded catalogue gets exactly one tile; a variety
 * with no record is omitted rather than filled with a stand-in. Each tile
 * carries the facts the row actually holds — carat, origin and the certificate
 * reference, or the honest absence of one.
 *
 * The second copy of the track is purely visual: it is hidden from assistive
 * technology and removed from the tab order, so every record is announced and
 * reachable once. Under reduced motion the track becomes a scrollable rail.
 */
export function ProvenanceRail({ records }: { records: readonly GemstoneItem[] }) {
  if (records.length === 0) return null;

  // Keep the typographic pass at a readable speed whether the taxonomy has
  // eight varieties or forty. This is derived from the row count, not styled
  // by hand.
  const duration = `${Math.max(64, records.length * 9)}s`;
  const style = { '--mh6-rail-duration': duration } as CSSProperties;

  const set = (duplicate: boolean) => (
    <ul className="mh6-rail__set" aria-hidden={duplicate ? true : undefined}>
      {records.map((record) => (
        <li key={`${duplicate ? 'b' : 'a'}-${record.id}`}>
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
    <section className="mh6-rail" aria-labelledby="mh6-rail-title" data-reveal style={style}>
      <div className="mh6-rail__plate">
        <div className="mh6-rail__head">
          <h2 id="mh6-rail-title" className="mh6-rail__title">
            Every variety in the vault, one record each.
          </h2>
          <p className="mh6-rail__count">
            {records.length} {records.length === 1 ? 'variety' : 'varieties'} with a record
          </p>
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
      </div>
    </section>
  );
}
