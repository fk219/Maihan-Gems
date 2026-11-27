import Link from 'next/link';
import type { GemstoneItem } from '@/lib/mgh/fixtures';

function value(raw: string | null | undefined, fallback = 'Not recorded'): string {
  const text = raw?.trim();
  return text && text.length > 0 ? text : fallback;
}

/**
 * Certificate intelligence is a proof section: a real certificate dossier
 * captured from a real product record, the fields the record carries printed
 * beside it, and the fields it does not carry left visibly empty.
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
          <img
            src="/proof/certificate.jpg"
            alt={`The ${record.name} certificate dossier, showing the laboratory, report number, specimen, carat, origin, treatment and dimensions`}
            width={576}
            height={425}
            loading="lazy"
            decoding="async"
          />
          <figcaption className="v9-certificate__caption">
            The {record.name} certificate dossier, captured from{' '}
            <span className="v9-mono">/products/{record.slug}</span>.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
