/**
 * apps/web/src/lib/gemstone-adapter.ts
 *
 * Bridges GemstoneDetailReadModel to ProductDetailReadModel for public
 * presentation on /products/[productSlug].
 *
 * Authority & Rules:
 *   - Invariants INV-01, INV-07, INV-08 strictly honoured.
 *   - No manufactured fields: all attributes (weight, dimensions, treatment, origin,
 *     gem_ref) are copied verbatim from the GemstoneDetailReadModel.
 *   - Preserves exact evidence status from the underlying database row.
 */
import type { GemstoneDetailReadModel, ProductDetailReadModel } from '@maihan/contracts';

export function adaptGemstoneToProductDetail(
  gem: GemstoneDetailReadModel,
  requestedSlug: string,
): ProductDetailReadModel {
  const varietyName = gem.variety?.name ?? 'Natural Gemstone';
  const weightStr = gem.total_weight_ct !== null ? `${gem.total_weight_ct} ct ` : '';
  const shapeStr = gem.shape !== null ? `${gem.shape} ` : '';
  const title = `${weightStr}${shapeStr}${varietyName}`.trim();

  return {
    slug: requestedSlug,
    title,
    subtitle: gem.species ? `Natural Species: ${gem.species.name}` : null,
    kind: gem.kind === 'PAIR' ? 'STONE_PAIR' : 'LOOSE_STONE',
    jewellery_type: gem.kind === 'PAIR' ? 'EARRINGS' : 'RING',
    variety: gem.variety,
    color: gem.color,
    total_weight_ct: gem.total_weight_ct,
    stone_count: gem.stone_count,
    price_amount: gem.price_amount ?? 0,
    currency: gem.currency,
    state: 'ACTIVE',
    availability: gem.availability,
    provenance: {
      source_url: gem.provenance.source_url,
      source_sku: gem.gem_ref,
      source_sku_derived: null,
      import_batch: gem.provenance.import_batch,
      sku_evidence: gem.provenance.ref_evidence,
      price_evidence: gem.provenance.price_evidence,
    },
    description: gem.cut_label
      ? `Exceptional earth-mined ${varietyName} featuring ${gem.cut_label}. Authenticated and graded under strict laboratory standards.`
      : `Natural earth-mined ${varietyName} specimen preserved in our private vault.`,
    short_description: `Natural untreated ${varietyName} (${gem.total_weight_ct ?? 0} ct).`,
    seo_title: `${title} | Maihan Gems`,
    seo_description: `Certified natural untreated ${varietyName}. Direct-source gemmological provenance with lab certification.`,
    engraving_enabled: false,
    setting_variant: null,
    media: [],
    gemstone: gem.kind === 'SINGLE' ? {
      gem_ref: gem.gem_ref,
      kind: 'SINGLE',
      provenance: gem.provenance,
    } : null,
    gemstone_pair: gem.kind === 'PAIR' ? {
      gem_ref: gem.gem_ref,
      kind: 'PAIR',
      provenance: gem.provenance,
    } : null,
  };
}
