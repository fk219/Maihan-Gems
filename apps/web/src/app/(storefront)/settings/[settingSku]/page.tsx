/**
 * apps/web/src/app/(storefront)/settings/[settingSku]/page.tsx
 *
 * `/settings/{designCode}` — one setting-design record.
 *
 * DATA DISCIPLINE: the previous implementation rendered a fixed list of four
 * metals and a table of "specifications" (prong alloy, finish, compatibility)
 * that did not come from any record. That is exactly the kind of quiet
 * fabrication INV-07 forbids. The page now loads the design through the
 * catalog service and renders only fields the contract carries. A missing
 * price is "Price on request", not a guess; a missing description is absent,
 * not invented.
 *
 * Layout: the same two-column editorial opening as the product detail
 * (light study | identity and actions), followed by a hairline record.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { catalogServer } from '../../../../lib/catalog-server.js';
import { isProductNotFound } from '../../../../lib/catalog-errors.js';
import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { Badge } from '../../../../components/design-system/Badge.js';
import { LightPlate } from '../../../../components/design-system/LightPlate.js';
import { Money } from '../../../../components/design-system/Money.js';
import { SpecTable, type SpecRow } from '../../../../components/design-system/SpecTable.js';
import type { EvidenceStatus, SettingDesignReadModel } from '@maihan/contracts';

// A design record is request-time data. Force-dynamic keeps `next build`
// database-free while the service cache remains the runtime cache.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ settingSku: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { settingSku } = await params;
  return {
    title: `Setting ${settingSku} | Maihan Gems Atelier`,
    description: `Setting design ${settingSku} with its recorded metal variants and provenance.`,
  };
}

function specRows(design: SettingDesignReadModel): SpecRow[] {
  const rows: SpecRow[] = [
    { label: 'Design reference', value: design.design_code },
    { label: 'Jewellery class', value: design.jewellery_type.toLowerCase() },
    { label: 'Metal options', value: String(design.variant_count) },
    { label: 'Side stones', value: String(design.side_stone_count) },
    { label: 'Record state', value: design.state },
  ];
  if (design.style !== null) {
    rows.splice(2, 0, { label: 'Style', value: design.style.label });
  }
  return rows;
}

function Evidence({ value }: { readonly value: EvidenceStatus }) {
  return <span className={`mh-evidence mh-evidence--${value.toLowerCase()}`}>{value}</span>;
}

export default async function SettingDetailPage({ params }: PageProps) {
  const { settingSku } = await params;

  let design: SettingDesignReadModel;
  try {
    design = (await catalogServer().getSettingByDesignCode(settingSku)).value;
  } catch (error) {
    if (isProductNotFound(error)) notFound();
    throw error;
  }

  return (
    <main className="page setting-detail-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: design.name },
        ]}
      />

      <article className="mh-pdp">
        <div className="mh-pdp__top">
          <section className="mh-pdp__study" aria-label="Setting study">
            <LightPlate className="mh-plate--tall" hold caption="No photograph on file" />
            <p className="mh-pdp__study-note">
              A study of light through a step-cut stone. It is not a photograph of this mounting.
            </p>
          </section>

          <section className="mh-pdp__summary">
            <p className="mh-masthead__eyebrow">{design.jewellery_type.toLowerCase()} mounting</p>
            <h1>{design.name}</h1>

            <p className="mh-pdp__ref">
              Design <span className="tabular">{design.design_code}</span>
            </p>

            <div className="mh-pdp__badges">
              <Badge tone={design.state === 'ACTIVE' ? 'positive' : 'neutral'}>
                {design.state === 'ACTIVE' ? 'Active design' : design.state}
              </Badge>
              <Badge tone={design.provenance.evidence_status === 'OBSERVED' ? 'neutral' : 'warning'} live>
                Design evidence: {design.provenance.evidence_status}
              </Badge>
            </div>

            {design.description !== null && (
              <p className="mh-pdp__short">{design.description}</p>
            )}

            <p className="mh-pdp__short">
              Metal variants are listed below with the price and evidence status carried on each
              record. A design does not carry a single headline price, so this page does not invent one.
            </p>

            <div className="mh-pdp__actions">
              <Link href="/design-your-own" className="mh-cta">
                Customise in the atelier
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/contact" className="mh-cta mh-cta--quiet">
                Inquire with the concierge
              </Link>
            </div>
          </section>
        </div>

        <div className="mh-pdp__details">
          <section className="mh-pdp__panel" aria-labelledby="mh-setting-variants-heading">
            <h2 id="mh-setting-variants-heading">Metal variants</h2>
            {design.variants.length === 0 ? (
              <p className="mh-pdp__muted">No metal variants are recorded for this design.</p>
            ) : (
              <div className="mh-table-scroll" tabIndex={0} role="region" aria-label="Metal variants table">
                <table className="mh-table">
                  <caption className="visually-hidden">Recorded metal variants</caption>
                  <thead>
                    <tr>
                      <th scope="col">Metal</th>
                      <th scope="col">Price</th>
                      <th scope="col">Availability</th>
                      <th scope="col">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {design.variants.map((variant) => (
                      <tr key={variant.sku}>
                        <th scope="row">
                          <span className="tabular">{variant.metal}</span>
                          <span className="mh-table__sub tabular">{variant.sku}</span>
                        </th>
                        <td>
                          {variant.base_price === null ? (
                            <span className="mh-pdp__muted">Price on request</span>
                          ) : (
                            <Money amount={variant.base_price} currency={variant.currency} />
                          )}
                        </td>
                        <td>{variant.availability ? 'Available' : 'Unavailable'}</td>
                        <td><Evidence value={variant.provenance.evidence_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mh-pdp__panel" aria-labelledby="mh-setting-specs-heading">
            <h2 id="mh-setting-specs-heading">Specifications</h2>
            <SpecTable caption="Mounting specifications" rows={specRows(design)} />
          </section>

          <section className="mh-pdp__panel mh-pdp__panel--wide" aria-labelledby="mh-setting-provenance-heading">
            <h2 id="mh-setting-provenance-heading">Provenance</h2>
            <dl className="mh-provenance">
              <dt>Design evidence</dt>
              <dd><Evidence value={design.provenance.evidence_status} /></dd>
              {design.provenance.source_url !== null && (
                <>
                  <dt>Source page</dt>
                  <dd className="mh-provenance__url">{design.provenance.source_url}</dd>
                </>
              )}
              {design.provenance.import_batch !== null && (
                <>
                  <dt>Import batch</dt>
                  <dd className="tabular">{design.provenance.import_batch}</dd>
                </>
              )}
            </dl>
            <p className="mh-pdp__evidence-note">
              Evidence statuses are shown exactly as stored. Nothing on this page promotes a field
              beyond the evidence the record carries (INV-07).
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
