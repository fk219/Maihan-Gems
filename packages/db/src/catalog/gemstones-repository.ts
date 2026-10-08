/**
 * packages/db/src/catalog/gemstones-repository.ts
 *
 * Gemstone read queries (Phase 3 task 1 read model + task 5 provenance).
 *
 * Provenance contract: source_url, gem_ref and price evidence statuses plus
 * the import batch key are read straight off the Phase 2 rows. The statuses
 * are echoed verbatim (INFERRED stays INFERRED — a canonical fact of the
 * derived-identity corpus: the 221 derived DYO identities and their 8+40
 * INFERRED stone references are read as exactly what Phase 2 wrote, never
 * re-labelled).
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from './executor.js';

const GEMSTONE_DETAIL_COLUMNS = sql`
  g.gem_ref          AS gem_ref,
  g.kind::text       AS kind,
  g.total_weight_ct::float8 AS total_weight_ct,
  g.stone_count      AS stone_count,
  g.length_mm::float8    AS length_mm,
  g.width_mm::float8     AS width_mm,
  g.depth_mm::float8     AS depth_mm,
  g.shape::text      AS shape,
  g.cut_label        AS cut_label,
  g.cutting_style::text AS cutting_style,
  g.price_per_carat::float8 AS price_per_carat,
  g.price_amount::float8 AS price_amount,
  g.currency         AS currency,
  g.availability     AS availability,
  g.state::text      AS state,
  gv.slug            AS variety_slug,
  gv.name            AS variety_name,
  gs.code            AS species_code,
  gs.name            AS species_name,
  gc.slug            AS color_slug,
  gc.name            AS color_name,
  ci.code            AS intensity_code,
  ci.name            AS intensity_name,
  cl.code            AS clarity_code,
  cl.label           AS clarity_label,
  t.code             AS treatment_code,
  t.label            AS treatment_label,
  t.requires_disclosure AS treatment_requires_disclosure,
  o.slug             AS origin_slug,
  o.name             AS origin_name,
  g.source_url       AS source_url,
  g.ref_evidence_status::text AS ref_evidence,
  g.price_evidence::text AS price_evidence,
  ib.batch_key       AS import_batch
`;

const GEMSTONE_DETAIL_JOINS = sql`
  LEFT JOIN gemstone_varieties gv ON gv.id = g.variety_id
  LEFT JOIN gemstone_species  gs ON gs.id = g.species_id
  LEFT JOIN gemstone_colours  gc ON gc.id = g.colour_id
  LEFT JOIN colour_intensities ci ON ci.id = g.intensity_id
  LEFT JOIN clarities         cl ON cl.id = g.clarity_id
  LEFT JOIN treatments         t ON t.id = g.treatment_id
  LEFT JOIN gemstone_origins   o ON o.id = g.origin_id
  LEFT JOIN import_batches    ib ON ib.id = g.import_batch_id
`;

/**
 * Gemstone detail by gem_ref. Identity lookup: gemstones are inventory
 * facts, not catalogue publications, so the read is NOT state-gated (the
 * publication gate lives on products). A soft-deleted gemstone is not found;
 * the state travels in the response so a caller below the port can reason
 * about DRAFT rows without a second query.
 */
export async function findGemstoneByGemRef(
  db: CatalogDatabase,
  gemRef: string,
): Promise<Record<string, unknown> | null> {
  const statement = sql`
    SELECT ${GEMSTONE_DETAIL_COLUMNS}
      FROM gemstones g
      ${GEMSTONE_DETAIL_JOINS}
     WHERE g.gem_ref = ${gemRef}
       AND g.deleted_at IS NULL
     LIMIT 1
  `;
  const result = await db.execute(statement);
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}

export interface GemstoneStoneRow {
  readonly position: number;
  readonly weight_ct: number | null;
  readonly length_mm: number | null;
  readonly width_mm: number | null;
  readonly depth_mm: number | null;
  readonly raw_weight_text: string | null;
  readonly raw_dimensions_text: string | null;
  readonly evidence_status: string;
}

/**
 * Per-stone measurement rows (gemstone_stones; doc 10 constraint 5 —
 * measurements are rows, never a concatenated string). One row for SINGLE,
 * two for PAIR, ordered by position.
 */
export async function findGemstoneStones(
  db: CatalogDatabase,
  gemstoneId: string,
): Promise<GemstoneStoneRow[]> {
  const statement = sql`
    SELECT position,
           weight_ct::float8     AS weight_ct,
           length_mm::float8     AS length_mm,
           width_mm::float8      AS width_mm,
           depth_mm::float8      AS depth_mm,
           raw_weight_text       AS raw_weight_text,
           raw_dimensions_text   AS raw_dimensions_text,
           evidence_status::text AS evidence_status
      FROM gemstone_stones
     WHERE gemstone_id = ${gemstoneId}::uuid
     ORDER BY position
  `;
  const result = await db.execute(statement);
  return result.rows as unknown as GemstoneStoneRow[];
}
