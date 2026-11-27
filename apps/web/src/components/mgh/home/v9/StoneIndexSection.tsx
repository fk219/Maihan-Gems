import Link from 'next/link';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { certificateReference, formatCarat } from '../format';

/**
 * The collection is the page's first full-bleed moment: one stone photographed
 * at scale, and the ledger that proves the range is made of records, not
 * adjectives. Each row is a real catalogue row; a variety with no record is
 * omitted rather than filled.
 *
 * The photograph is the catalogue's representative tanzanite, so the caption
 * names the material and calls it a catalogue photograph. It never wears a
 * product name it does not belong to.
 */
export function StoneIndexSection({ records }: { records: readonly GemstoneItem[] }) {
  if (records.length === 0) return null;

  const origins = new Set(
    records.map((record) => record.origin.trim()).filter((origin) => origin.length > 0),
  );
  return (
    <section className="v9-gallery" aria-labelledby="v9-gallery-title" data-reveal>
      <div className="v9-gallery__grid">
        <figure className="v9-gallery__plate">
          <img
            src="/media/stone-tanzanite.jpg"
            alt="A violet-blue tanzanite photographed on dark velvet"
            width={1152}
            height={864}
            loading="lazy"
            decoding="async"
          />
          <figcaption className="v9-gallery__caption">
            Tanzanite. Catalogue photograph.
          </figcaption>
        </figure>

        <div className="v9-gallery__panel">
          <p className="v9-eyebrow">The collection</p>
          <h2 id="v9-gallery-title" className="v9-display v9-gallery__title">
            Eight varieties. One record each.
          </h2>
          <p className="v9-promise">
            See the stone, the carat it weighs, the origin it carries and the certificate it
            references, before you ask a question.
          </p>

          <p className="v9-count">
            {records.length} {records.length === 1 ? 'variety' : 'varieties'} with a record
            {origins.size > 0
              ? ` · ${origins.size} ${origins.size === 1 ? 'origin' : 'origins'}`
              : ''}
          </p>

          <ol className="v9-gallery__index">
            {records.map((record, index) => (
              <li key={record.id}>
                <Link href={`/products/${record.slug}`} className="v9-gallery__row">
                  <span className="v9-gallery__num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="v9-gallery__variety">{record.variety || 'Gemstone'}</span>
                  <span className="v9-gallery__carat">{formatCarat(record.carat)}</span>
                  <span className="v9-gallery__origin">
                    {record.origin || 'Origin not recorded'}
                  </span>
                  <span className="v9-gallery__cert">
                    {certificateReference(record.evidence)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <Link href="/gemstones" className="v9-action">
            See every gemstone
            <span aria-hidden="true" className="v9-action__arrow">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
