import Link from 'next/link';
import type { GemstoneItem } from '@/lib/mgh/fixtures';

function value(raw: string | null | undefined, fallback = 'Not recorded'): string {
  const text = raw?.trim();
  return text && text.length > 0 ? text : fallback;
}

/**
 * Certificate intelligence is a proof section: the record's fields are printed
 * beside an illustrative diamond photograph, and the two never blend. The
 * caption says plainly that the stone pictured is not the record's stone.
 *
 * It renders nothing when the supplied record has no report number. A
 * certificate section with no certificate would be decoration.
 */
export function CertificateSection({ record }: { record: GemstoneItem | null }) {
  if (record === null) return null;
  const reportNumber = record.evidence.reportNumber?.trim() ?? '';
  if (reportNumber.length === 0) return null;

  return (
    <section className="v9-certificate" aria-labelledby="v9-certificate-title" data-reveal>
      <div className="v9-wrap v9-certificate__grid">
        <div className="v9-certificate__copy">
          <p className="v9-eyebrow v9-eyebrow--dark">Certificate intelligence</p>
          <h2 id="v9-certificate-title" className="v9-display v9-certificate__title">
            Every claim carries its evidence.
          </h2>
          <p className="v9-promise v9-promise--dark">
            Open a certificate and see the laboratory, the report number, the specimen and the
            treatment the record discloses. Nothing is inferred from a neighbouring stone.
          </p>

          <dl className="v9-certificate__facts">
            <div>
              <dt>Laboratory</dt>
              <dd>{value(record.evidence.laboratory)}</dd>
            </div>
            <div>
              <dt>Report</dt>
              <dd className="v9-mono">{reportNumber}</dd>
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

          <p className="v9-certificate__note">
            A field the record does not carry prints as not recorded. The page never fills it
            with a plausible value.
          </p>

          <Link href={`/products/${record.slug}`} className="v9-action v9-action--dark">
            Open the {record.name} record
            <span aria-hidden="true" className="v9-action__arrow">
              →
            </span>
          </Link>
        </div>

        <figure className="v9-certificate__figure">
          <div className="v9-plate v9-certificate__media">
            <img
              src="/media/stock/diamond.jpg"
              alt="A large cushion-cut deep blue diamond ringed by white diamonds, photographed against a grey ground"
              width={2367}
              height={2193}
              loading="lazy"
              decoding="async"
              style={{ objectPosition: '50% 45%' }}
            />
          </div>
          <figcaption className="v9-certificate__caption">
            Illustrative photography — a deep blue diamond, not the record's stone. The fields at
            left belong to the <span className="v9-mono">{record.name}</span> record alone.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
