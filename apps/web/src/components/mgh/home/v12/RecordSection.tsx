import type { GemstoneItem } from '@/lib/mgh/fixtures';

import { ArrowLink } from './ArrowLink';

function value(raw: string | null | undefined): string {
  const text = raw?.trim();
  return text !== undefined && text.length > 0 ? text : 'Not recorded';
}

/**
 * One record, shown as a record: the fields the row carries beside the row's
 * own photograph. A field the record does not carry prints "Not recorded" —
 * the page never fills it with a plausible value (INV-07). The evidence chip
 * states what the record actually holds; it never claims a verification the
 * record does not declare.
 */
export function RecordSection({ record }: { record: GemstoneItem | null }) {
  if (record === null) return null;
  const reportNumber = record.evidence.reportNumber?.trim() ?? '';
  const image = record.images[0] ?? null;

  return (
    <section
      className="mh12-band mh12-band--paper mh12-record"
      data-section="record"
      data-surface="paper"
      aria-labelledby="mh12-record-title"
    >
      <div className="mh12-wrap mh12-record__grid">
        <div>
          <h2 id="mh12-record-title" className="mh12-h2">
            Every claim carries its evidence.
          </h2>
          <p className="mh12-label mh12-record__chip">
            <span aria-hidden="true" className="mh12-card__dot" />
            {reportNumber.length > 0 ? `Report on record · ${reportNumber}` : 'Evidence not recorded'}
          </p>

          <dl className="mh12-record__facts">
            <div>
              <dt className="mh12-label">Laboratory</dt>
              <dd className="mh12-body">{value(record.evidence.laboratory)}</dd>
            </div>
            <div>
              <dt className="mh12-label">Report</dt>
              <dd className="mh12-body">{value(reportNumber)}</dd>
            </div>
            <div>
              <dt className="mh12-label">Specimen</dt>
              <dd className="mh12-body">{record.name}</dd>
            </div>
            <div>
              <dt className="mh12-label">Treatment</dt>
              <dd className="mh12-body">{value(record.treatmentDisclosed)}</dd>
            </div>
            <div>
              <dt className="mh12-label">Origin</dt>
              <dd className="mh12-body">{value(record.origin)}</dd>
            </div>
          </dl>

          <ArrowLink href={`/products/${record.slug}`} className="mh12-record__action">
            Open the {record.name} record
          </ArrowLink>
        </div>

        {image === null ? null : (
          <figure className="mh12-record__figure">
            <img
              src={image}
              alt=""
              width={900}
              height={1125}
              loading="lazy"
              decoding="async"
            />
            <figcaption className="mh12-price mh12-record__caption">
              {record.name} · The record&rsquo;s own photograph
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
