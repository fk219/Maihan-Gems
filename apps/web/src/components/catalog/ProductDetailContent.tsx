/**
 * apps/web/src/components/catalog/ProductDetailContent.tsx
 *
 * The ONE product-detail renderer (Task 4): /products/[productSlug] and the
 * ready-made route [varietySlug]-rings/[productSlug] both render this. Every
 * displayed field comes verbatim from the Phase 3 ProductDetail contract —
 * nothing inferred, no pricing engine, no availability derivation.
 *
 * MEDIA: the ProductDetail contract exposes `media` (resolved from
 * `asset_usages`/`assets` in the read model); the gallery renders it verbatim.
 * An empty media array renders an honest "not yet evidenced" placeholder.
 */
import type { ProductDetailReadModel, WebarAssetReadModel } from '@maihan/contracts';
import { WebArLauncher } from '../webar/WebArLauncher.js';

import { Breadcrumbs } from '../design-system/Breadcrumbs.js';
import { Badge } from '../design-system/Badge.js';
import { SpecTable, type SpecRow } from '../design-system/SpecTable.js';
import { ProductGallery } from './ProductGallery.js';
import { ProductActions } from '../storefront/ProductActions.js';
import type { AtelierItem } from '../../lib/atelier-item.js';
import { atelierItemFromDetail } from '../../lib/atelier-item.js';

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

export function ProductDetailContent({ detail, webarAsset }: ProductDetailContentProps) {
  const isAvailable = detail.availability;
  const item: AtelierItem = atelierItemFromDetail(detail);

  return (
    <main className="page product-detail">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          ...(detail.variety !== null
            ? [{ label: detail.variety.name, href: `/${detail.variety.slug}` }]
            : []),
          { label: detail.title },
        ]}
      />

      <article className="product-detail__layout">
        <ProductGallery
          media={detail.media.map((m) => ({ url: m.url, kind: m.kind, role: m.role, alt: m.alt }))}
          title={detail.title}
        />

        <section className="product-detail__summary" aria-busy="false">
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
            {KIND_LABEL[detail.kind]}
          </span>
          <h1>{detail.title}</h1>
          {detail.subtitle !== null && <p className="product-detail__subtitle">{detail.subtitle}</p>}

          <div className="product-detail__badges">
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

          <ProductActions item={item} />

          {/* WebAR & 3D Interactive Viewer Slot (Phase 11): Rendered ONLY when webarAsset is present */}
          {webarAsset && (
            <div style={{ marginTop: '2rem' }}>
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

        <section className="product-detail__specs" aria-label="Specifications">
          <h2>Specifications</h2>
          <SpecTable caption="Specifications" rows={specRows(detail)} />
        </section>

        {detail.description !== null && (
          <section className="product-detail__description">
            <h2>Description</h2>
            <p>{detail.description}</p>
          </section>
        )}

        <section className="product-detail__provenance" aria-label="Provenance">
          <h2>Provenance</h2>
          <dl className="provenance-list">
            {detail.provenance.source_url !== null && (
              <>
                <dt>Source page</dt>
                <dd>{detail.provenance.source_url}</dd>
              </>
            )}
            {detail.provenance.source_sku !== null && (
              <>
                <dt>Source SKU</dt>
                <dd>{detail.provenance.source_sku}</dd>
              </>
            )}
            {detail.provenance.source_sku_derived !== null && (
              <>
                <dt>Derived SKU</dt>
                <dd>
                  {detail.provenance.source_sku_derived}{' '}
                  <small>(derived, not an observed source SKU)</small>
                </dd>
              </>
            )}
            {detail.provenance.import_batch !== null && (
              <>
                <dt>Import batch</dt>
                <dd>{detail.provenance.import_batch}</dd>
              </>
            )}
          </dl>
        </section>
      </article>
    </main>
  );
}
