import type { GemstoneItem } from '@/lib/mgh/fixtures';

import { SectionAction } from './SectionAction';

/**
 * Certificate intelligence: one record, printed as a dossier.
 *
 * The fields are the record's own evidence plate. A field the record does not
 * carry prints as "Not recorded" rather than as a plausible value (INV-07).
 * Nothing is inferred from a neighbouring stone, and no verification state is
 * claimed beyond what the record returns.
 *
 * On a phone the dossier prints the five fields that answer "what is this and
 * where is it from" in a two-column sheet; the report date and the dimensions
 * join them from the tablet breakpoint, where the sheet has room. The full set
 * is always on the record's own page.
 *
 * The dossier is the page's document composition: ruled fields in one bordered
 * sheet, named at the top by the specimen and its report number.
 */
function value(raw: string | null | undefined): string {
  const text = raw?.trim();
  return text !== undefined && text.length > 0 ? text : 'Not recorded';
}

interface Field {
  label: string;
  value: string;
  optional?: boolean;
  wide?: boolean;
}

export function CertificateSection({ record }: { record: GemstoneItem | null }) {
  if (record === null) return null;
  const report = record.evidence.reportNumber?.trim() ?? '';
  if (report.length === 0) return null;

  const fields: Field[] = [
    { label: 'Laboratory', value: value(record.evidence.laboratory) },
    { label: 'Origin', value: value(record.evidence.miningDistrict) },
    { label: 'Refractive index', value: value(record.evidence.refractiveIndex) },
    { label: 'Specific gravity', value: value(record.evidence.specificGravity) },
    { label: 'Treatment', value: value(record.treatmentDisclosed), wide: true },
    { label: 'Report date', value: value(record.evidence.reportDate), optional: true },
    { label: 'Dimensions', value: value(record.evidence.dimensionsMm), optional: true },
  ];

  return (
    <section
      className="mh14-certificate"
      data-section="certificate"
      aria-labelledby="mh14-certificate-title"
    >
      <div className="mh14-wrap mh14-certificate__grid">
        <div className="mh14-certificate__head">
          <h2 id="mh14-certificate-title" className="mh14-h2">
            Every field the laboratory returned.
          </h2>
          <p className="mh14-lede">
            One record, opened. A field the record does not carry prints as not recorded.
          </p>
          <div className="mh14-certificate__action">
            <SectionAction href={`/products/${record.slug}`}>Open the record</SectionAction>
          </div>
        </div>

        <article className="mh14-dossier" aria-label={`Certificate fields for ${record.name}`}>
          <header className="mh14-dossier__head">
            <h3 className="mh14-dossier__specimen">{record.name}</h3>
            <p className="mh14-dossier__number">{report}</p>
          </header>

          <dl className="mh14-dossier__fields">
            {fields.map((field) => (
              <div
                className={[
                  'mh14-dossier__row',
                  field.optional === true ? 'mh14-dossier__row--optional' : '',
                  field.wide === true ? 'mh14-dossier__row--wide' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={field.label}
              >
                <dt className="mh14-dossier__term">{field.label}</dt>
                <dd className="mh14-dossier__value">{field.value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </div>
    </section>
  );
}
