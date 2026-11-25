/**
 * apps/web/src/components/catalog/ProductDetailContent.tsx
 *
 * The ONE product-detail renderer (Task 4): /products/[productSlug] and the
 * ready-made route [varietySlug]-rings/[productSlug] both render this. Every
 * displayed field comes verbatim from the Phase 3 ProductDetail contract —
 * nothing inferred, no pricing engine, no availability derivation.
 *
 * Layout: a two-column editorial opening (light study | identity, price and
 * dual action), then a two-column record (specifications | provenance). The
 * specification table uses hairline rules rather than a filled card; the
 * provenance list keeps every evidence status beside the value it qualifies
 * (INV-07).
 *
 * MEDIA (documented contract limitation): the ProductDetail DTO carries NO
 * media/asset field (verified against packages/contracts entities.ts), so the
 * left column is the design-system LightPlate — a CSS light study explicitly
 * captioned "No photograph on file". No image, alt text or colour is invented.
 */
import type { EvidenceStatus } from '@maihan/contracts';
import type { ProductDetailReadModel, WebarAssetReadModel } from '@maihan/contracts';

import { WebArLauncher } from '../webar/WebArLauncher.js';
import { Breadcrumbs } from '../design-system/Breadcrumbs.js';
import { Badge } from '../design-system/Badge.js';
import { LightPlate } from '../design-system/LightPlate.js';
import { Money } from '../design-system/Money.js';
import { SpecTable, type SpecRow } from '../design-system/SpecTable.js';

export interface ProductDetailContentProps {
  readonly detail: ProductDetailReadModel;
  readonly webarAsset?: WebarAssetReadModel | null;
}

const KIND_LABEL: Record<ProductDetailReadModel['kind'], string> = {
  CONFIGURED: 'Configured piece',
  READY_MADE: 'Ready-made setting',
  LOOSE_STONE: 'Loose gemstone',
  STONE_PAIR: 'Matched pair',
  SETTING_ONLY: 'Setting',
};

function specRows(detail: ProductDetailReadModel): SpecRow[] {
  const rows: SpecRow[] = [
    { label: 'Type', value: KIND_LABEL[detail.kind] },
    { label: 'Jewellery', value: detail.jewellery_type },
  ];
  if (detail.variety !== null) rows.push({ label: 'Variety', value: detail.variety.name });
  if (detail.color !== null) rows.push({ label: 'Colour', value: detail.color.name });
  if (detail.total_weight_ct !== null) rows.push({ label: 'Total weight', value: `${detail.total_weight_ct} ct` });
  rows.push({ label: 'Stones', value: String(detail.stone_count) });
  if (detail.setting_variant !== null) {
    rows.push({ label: 'Setting SKU', value: detail.setting_variant.sku });
    rows.push({ label: 'Design', value: detail.setting_variant.design_code });
  }
  if (detail.gemstone !== null) rows.push({ label: 'Stone reference', value: detail.gemstone.gem_ref });
  if (detail.gemstone_pair !== null) rows.push({ label: 'Pair reference', value: detail.gemstone_pair.gem_ref });
  return rows;
}

/** Evidence status as a labelled token, never as a colour-only signal. */
function Evidence({ value }: { readonly value: EvidenceStatus }) {
  return <span className={`mh-evidence mh-evidence--${value.toLowerCase()}`}>{value}</span>;
}

export function ProductDetailContent({ detail, webarAsset }: ProductDetailContentProps) {
  const isAvailable = detail.availability;

  return (
    <main className="page product-detail mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          ...(detail.variety !== null
            ? [{ label: detail.variety.name, href: `/${detail.variety.slug}` }]
            : []),
          { label: detail.title },
        ]}
      />

      <article className="mh-pdp">
        <div className="mh-pdp__top">
          <section className="mh-pdp__study" aria-label="Stone study">
            <LightPlate className="mh-plate--tall" hold caption="No photograph on file" />
            <p className="mh-pdp__study-note">
              A study of light through a step-cut stone. It is not a photograph of this piece.
            </p>
          </section>

          <section className="mh-pdp__summary">
            <p className="mh-masthead__eyebrow">{KIND_LABEL[detail.kind]}</p>
            <h1>{detail.title}</h1>
            {detail.subtitle !== null && <p className="mh-pdp__subtitle">{detail.subtitle}</p>}

            <p className="mh-pdp__ref">
              {detail.setting_variant !== null ? (
                <>
                  Design <span className="tabular">{detail.setting_variant.design_code}</span>
                </>
              ) : detail.gemstone !== null ? (
                <>
                  Stone reference <span className="tabular">{detail.gemstone.gem_ref}</span>
                </>
              ) : detail.gemstone_pair !== null ? (
                <>
                  Pair reference <span className="tabular">{detail.gemstone_pair.gem_ref}</span>
                </>
              ) : (
                <>Recorded piece</>
              )}
            </p>

            <div className="mh-pdp__badges">
              <Badge tone={isAvailable ? 'positive' : 'neutral'} live>
                {isAvailable ? 'Available' : 'Unavailable'}
              </Badge>
              {/* Provenance: evidence statuses travel VERBATIM (INV-07: a field
                  that is not VERIFIED may never render as verified truth). */}
              <Badge tone={detail.provenance.sku_evidence === 'OBSERVED' ? 'neutral' : 'warning'} live>
                {detail.provenance.sku_evidence === 'OBSERVED' ? 'Source-verified SKU' : `SKU evidence: ${detail.provenance.sku_evidence}`}
              </Badge>
              <Badge tone={detail.provenance.price_evidence === 'OBSERVED' ? 'neutral' : 'warning'} live>
                {detail.provenance.price_evidence === 'OBSERVED' ? 'Source-verified price' : `Price evidence: ${detail.provenance.price_evidence}`}
              </Badge>
            </div>

            <div className="mh-pdp__price-block">
              <p className="mh-pdp__price">
                <Money amount={detail.price_amount} currency={detail.currency} />
              </p>
              <p className="mh-pdp__price-note">
                Price evidence <Evidence value={detail.provenance.price_evidence} />
              </p>
            </div>

            {detail.short_description !== null && (
              <p className="mh-pdp__short">{detail.short_description}</p>
            )}

            <div className="mh-pdp__actions">
              <a href="/design-your-own" className="mh-cta">
                Customise in the atelier
                <span aria-hidden="true">→</span>
              </a>
              <a href="/contact" className="mh-cta mh-cta--quiet">
                Inquire with the concierge
              </a>
            </div>

            {/* WebAR & 3D Interactive Viewer Slot (Phase 11): rendered ONLY when a real asset is present. */}
            {webarAsset && (
              <div className="mh-pdp__webar">
                <WebArLauncher
                  assetId={webarAsset.id}
                  glbUrl={webarAsset.cdnUrl}
                  title={detail.title}
                  fitRule={webarAsset.fitRule}
                  jewelleryType={webarAsset.jewelleryType}
                />
              </div>
            )}
          </section>
        </div>

        <div className="mh-pdp__details">
          <section className="mh-pdp__panel" aria-labelledby="mh-specs-heading">
            <h2 id="mh-specs-heading">Specifications</h2>
            <SpecTable caption="Specifications" rows={specRows(detail)} />
          </section>

          <section className="mh-pdp__panel" aria-labelledby="mh-provenance-heading">
            <h2 id="mh-provenance-heading">Provenance</h2>
            <dl className="mh-provenance">
              <dt>SKU evidence</dt>
              <dd><Evidence value={detail.provenance.sku_evidence} /></dd>
              <dt>Price evidence</dt>
              <dd><Evidence value={detail.provenance.price_evidence} /></dd>

              {detail.provenance.source_url !== null && (
                <>
                  <dt>Source page</dt>
                  <dd className="mh-provenance__url">{detail.provenance.source_url}</dd>
                </>
              )}
              {detail.provenance.source_sku !== null && (
                <>
                  <dt>Source SKU</dt>
                  <dd className="tabular">{detail.provenance.source_sku}</dd>
                </>
              )}
              {detail.provenance.source_sku_derived !== null && (
                <>
                  <dt>Derived SKU</dt>
                  <dd>
                    <span className="tabular">{detail.provenance.source_sku_derived}</span>{' '}
                    <small>(derived, not an observed source SKU)</small>
                  </dd>
                </>
              )}
              {detail.provenance.import_batch !== null && (
                <>
                  <dt>Import batch</dt>
                  <dd className="tabular">{detail.provenance.import_batch}</dd>
                </>
              )}
            </dl>
            <p className="mh-pdp__evidence-note">
              Evidence statuses are shown exactly as stored. Nothing on this page promotes a field
              beyond the evidence the record carries (INV-07).
            </p>
          </section>

          {detail.description !== null && (
            <section className="mh-pdp__panel mh-pdp__panel--wide" aria-labelledby="mh-description-heading">
              <h2 id="mh-description-heading">Description</h2>
              <p className="mh-pdp__description">{detail.description}</p>
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
