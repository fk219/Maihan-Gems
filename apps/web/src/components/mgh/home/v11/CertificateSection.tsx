import Link from 'next/link';
import type { GemstoneItem } from '@/lib/mgh/fixtures';

function value(raw: string | null | undefined, fallback = 'Not recorded'): string {
  const text = raw?.trim();
  return text && text.length > 0 ? text : fallback;
}

/**
 * Certificate intelligence is one record: the fields the record carries,
 * printed beside an illustrative photograph (docs/IMAGE_CREDITS.md). The
 * photograph is captioned as illustrative and is never presented as the
 * record's own stone; the fields are the evidence. A field the record does
 * not carry prints as "Not recorded" — the page never fills it with a
 * plausible value (INV-07).
 *
 * It renders nothing when the supplied record has no report number: a
 * certificate section with no record would be decoration.
 */
export function CertificateSection({ record }: { record: GemstoneItem | null }) {
  if (record === null) return null;
  const reportNumber = record.evidence.reportNumber?.trim() ?? '';
  if (reportNumber.length === 0) return null;

  return (
    <section className="v11-section" aria-labelledby="v11-cert-title">
      <div className="v11-wrap v11-cert__grid">
        <div className="v11-cert__copy">
          <h2 id="v11-cert-title" className="v11-statement v11-enter">
            Every claim carries its evidence.
          </h2>

          <dl className="v11-cert__facts v11-enter">
            <div>
              <dt>Laboratory</dt>
              <dd>{value(record.evidence.laboratory)}</dd>
            </div>
            <div>
              <dt>Report</dt>
              <dd className="v11-mono">{reportNumber}</dd>
            </div>
            <div>
              <dt>Specimen</dt>
              <dd>{record.name}</dd>
            </div>
            <div>
              <dt>Treatment</dt>
              <dd>{value(record.treatmentDisclosed)}</dd>
            </div>
            <div>
              <dt>Origin</dt>
              <dd>{value(record.origin)}</dd>
            </div>
          </dl>

          <Link href={`/products/${record.slug}`} className="v11-action v11-enter">
            Open the {record.name} record
            <span aria-hidden="true" className="v11-action__arrow">
              →
            </span>
          </Link>
        </div>

        <figure className="v11-cert__figure v11-enter-media">
          <div className="v11-cert__plate">
            <img
              src="/media/stock/diamond.jpg"
              alt="A large cushion-cut deep blue diamond in a white-diamond halo"
              width={2367}
              height={2193}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="v11-caption">
            Illustrative photography. Not the record's stone; the fields are the record.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
