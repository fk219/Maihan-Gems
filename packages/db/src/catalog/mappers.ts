/**
 * packages/db/src/catalog/mappers.ts
 *
 * Raw-row → contract-DTO mappers. Every output passes through its Zod
 * contract schema; a row that does not validate is a bug surfaced loudly,
 * never coerced silently (technical_design/06: contracts validate).
 *
 * Provenance rule (task 5): evidence statuses are copied VERBATIM from the
 * Phase 2 columns. No mapping layer may promote INFERRED→OBSERVED or
 * UNKNOWN→VERIFIED; the Zod schemas in @maihan/contracts bind every
 * evidence-bearing field, so an undeclared evidence status is impossible
 * in a response. The mapper simply echoes; it never re-decides.
 */
import {
  ProductSummarySchema,
  ProductDetailSchema,
  GemstoneDetailSchema,
  SettingDetailSchema,
  SettingVariantSummarySchema,
  type ProductSummary,
  type ProductDetail,
  type GemstoneDetail,
  type SettingDetail,
} from '@maihan/contracts';
import type { GemstoneStoneRow } from './gemstones-repository.js';

type Row = Record<string, unknown>;

const text = (row: Row, key: string): string | null => {
  const v = row[key];
  return v === undefined || v === null ? null : String(v);
};

const nullableTextRef = (
  row: Row,
  slugKey: string,
  nameKey: string,
): { slug: string; name: string } | null => {
  const slug = text(row, slugKey);
  const name = text(row, nameKey);
  return slug !== null && name !== null ? { slug, name } : null;
};

/** Evidence statuses echo verbatim; the Zod enum rejects any drift loudly. */
const evidenceOf = (row: Row, key: string): string => String(row[key]);

function mapProductSummaryRaw(row: Row): ProductSummary {
  return ProductSummarySchema.parse({
    slug: text(row, 'slug'),
    title: text(row, 'title'),
    subtitle: text(row, 'subtitle'),
    kind: text(row, 'kind'),
    jewellery_type: text(row, 'jewellery_type'),
    variety: nullableTextRef(row, 'variety_slug', 'variety_name'),
    color: nullableTextRef(row, 'color_slug', 'color_name'),
    total_weight_ct: row['total_weight_ct'] === null ? null : Number(row['total_weight_ct']),
    stone_count: Number(row['stone_count']),
    price_amount: Number(row['price_amount']),
    currency: text(row, 'currency'),
    state: text(row, 'state'),
    availability: row['availability'] === true,
    provenance: {
      source_url: text(row, 'source_url'),
      source_sku: text(row, 'source_sku'),
      source_sku_derived: text(row, 'source_sku_derived'),
      import_batch: text(row, 'import_batch'),
      price_evidence: evidenceOf(row, 'price_evidence'),
      sku_evidence: evidenceOf(row, 'sku_evidence_status'),
    },
  });
}

export function mapProductSummaries(rows: readonly Row[]): ProductSummary[] {
  return rows.map(mapProductSummaryRaw);
}

export function mapProductDetail(row: Row, stones: readonly GemstoneStoneRow[]): ProductDetail {
  const summary = mapProductSummaryRaw(row) as unknown as ProductDetail;
  const gemstone =
    text(row, 'gemstone_gem_ref') === null
      ? null
      : {
          gem_ref: text(row, 'gemstone_gem_ref') as string,
          kind: text(row, 'gemstone_kind') as string,
          provenance: {
            source_url: text(row, 'gemstone_source_url'),
            ref_evidence: evidenceOf(row, 'gemstone_ref_evidence'),
            price_evidence: evidenceOf(row, 'gemstone_price_evidence'),
            import_batch: text(row, 'gemstone_import_batch'),
          },
        };
  const gemstonePair =
    text(row, 'gemstone_pair_gem_ref') === null
      ? null
      : {
          gem_ref: text(row, 'gemstone_pair_gem_ref') as string,
          kind: text(row, 'gemstone_pair_kind') as string,
          provenance: {
            source_url: text(row, 'gemstone_pair_source_url'),
            ref_evidence: evidenceOf(row, 'gemstone_pair_ref_evidence'),
            price_evidence: evidenceOf(row, 'gemstone_pair_price_evidence'),
            import_batch: text(row, 'gemstone_pair_import_batch'),
          },
        };
  const detail: unknown = {
    ...summary,
    description: text(row, 'description'),
    short_description: text(row, 'short_description'),
    seo_title: text(row, 'seo_title'),
    seo_description: text(row, 'seo_description'),
    engraving_enabled: row['engraving_enabled'] === true,
    setting_variant:
      text(row, 'setting_variant_sku') === null
        ? null
        : {
            sku: text(row, 'setting_variant_sku') as string,
            slug: text(row, 'setting_variant_slug') as string,
            design_code: text(row, 'setting_variant_design_code') as string,
          },
    gemstone,
    gemstone_pair: gemstonePair,
  };
  void stones; // gemstone stones ride the gemstone detail surface, not the product's
  return ProductDetailSchema.parse(detail);
}

export function mapGemstoneDetail(row: Row, stones: readonly GemstoneStoneRow[]): GemstoneDetail {
  return GemstoneDetailSchema.parse({
    gem_ref: text(row, 'gem_ref'),
    kind: text(row, 'kind'),
    variety: nullableTextRef(row, 'variety_slug', 'variety_name'),
    species: nullableTextRef(row, 'species_code', 'species_name'),
    color: nullableTextRef(row, 'color_slug', 'color_name'),
    intensity:
      text(row, 'intensity_code') === null
        ? null
        : { code: text(row, 'intensity_code') as string, label: text(row, 'intensity_name') as string },
    clarity:
      text(row, 'clarity_code') === null
        ? null
        : { code: text(row, 'clarity_code') as string, label: text(row, 'clarity_label') as string },
    shape: text(row, 'shape'),
    cut_label: text(row, 'cut_label'),
    cutting_style: text(row, 'cutting_style'),
    total_weight_ct: row['total_weight_ct'] === null ? null : Number(row['total_weight_ct']),
    stone_count: Number(row['stone_count']),
    length_mm: row['length_mm'] === null ? null : Number(row['length_mm']),
    width_mm: row['width_mm'] === null ? null : Number(row['width_mm']),
    depth_mm: row['depth_mm'] === null ? null : Number(row['depth_mm']),
    treatment:
      text(row, 'treatment_code') === null
        ? null
        : {
            code: text(row, 'treatment_code') as string,
            label: text(row, 'treatment_label') as string,
            requires_disclosure: row['treatment_requires_disclosure'] === true,
          },
    origin: nullableTextRef(row, 'origin_slug', 'origin_name'),
    price_per_carat: row['price_per_carat'] === null ? null : Number(row['price_per_carat']),
    price_amount: row['price_amount'] === null ? null : Number(row['price_amount']),
    currency: text(row, 'currency'),
    availability: row['availability'] === true,
    state: text(row, 'state'),
    provenance: {
      source_url: text(row, 'source_url'),
      ref_evidence: evidenceOf(row, 'ref_evidence'),
      price_evidence: evidenceOf(row, 'price_evidence'),
      import_batch: text(row, 'import_batch'),
    },
    stones: stones.map((s) => ({
      position: Number(s.position),
      weight_ct: s.weight_ct === null ? null : Number(s.weight_ct),
      length_mm: s.length_mm === null ? null : Number(s.length_mm),
      width_mm: s.width_mm === null ? null : Number(s.width_mm),
      depth_mm: s.depth_mm === null ? null : Number(s.depth_mm),
      raw_weight_text: s.raw_weight_text,
      raw_dimensions_text: s.raw_dimensions_text,
      evidence_status: s.evidence_status,
    })),
  });
}

export function mapSettingDesign(
  row: Row,
  variants: readonly Row[],
): SettingDetail {
  const variantDtos = variants.map((v) =>
    SettingVariantSummarySchema.parse({
      sku: text(v, 'sku'),
      slug: text(v, 'slug'),
      metal: text(v, 'metal'),
      base_price: v['base_price'] === null ? null : Number(v['base_price']),
      currency: text(v, 'currency'),
      availability: v['availability'] === true,
      state: text(v, 'state'),
      provenance: {
        source_url: text(v, 'source_url'),
        evidence_status: evidenceOf(v, 'evidence_status'),
        price_evidence: evidenceOf(v, 'price_evidence'),
        import_batch: text(v, 'import_batch'),
      },
    }),
  );
  return SettingDetailSchema.parse({
    design_code: text(row, 'design_code'),
    name: text(row, 'name'),
    jewellery_type: text(row, 'jewellery_type'),
    style:
      text(row, 'style_code') === null
        ? null
        : { code: text(row, 'style_code') as string, label: text(row, 'style_label') as string },
    is_vedic: row['is_vedic'] === true,
    side_stone_count: Number(row['side_stone_count']),
    variant_count: variantDtos.length,
    state: text(row, 'state'),
    provenance: {
      source_url: text(row, 'source_url'),
      evidence_status: evidenceOf(row, 'evidence_status'),
      import_batch: text(row, 'import_batch'),
    },
    description: text(row, 'description'),
    variants: variantDtos,
  });
}
