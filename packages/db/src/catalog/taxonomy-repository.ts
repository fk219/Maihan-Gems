/**
 * packages/db/src/catalog/taxonomy-repository.ts
 *
 * Taxonomy read queries (Phase 3 task 1 read model + task 5 provenance).
 *
 * Taxonomy rows are small reference data; each family is read as ONE ordered
 * list, deterministically ordered by its natural sort key. Every family row
 * carries the evidence status the migration recorded, echoed VERBATIM
 * (Phase 2 semantics — never re-labelled).
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from './executor.js';

export async function loadTaxonomy(db: CatalogDatabase): Promise<Record<string, unknown>> {
  const statement = sql`
    SELECT
      COALESCE((SELECT json_agg(t ORDER BY t.code) FROM (
        SELECT sp.code AS code, sp.name AS name, sp.mineral_name AS mineral_name,
               sp.mohs_min::float8 AS mohs_min, sp.mohs_max::float8 AS mohs_max,
               sp.evidence_status::text AS evidence_status
          FROM gemstone_species sp) t), '[]'::json) AS species,
      COALESCE((SELECT json_agg(t ORDER BY t.slug) FROM (
        SELECT v.slug AS slug, v.name AS name, v.display_name AS display_name,
               s2.code AS species_code, v.source_route AS source_route,
               v.is_organic AS is_organic, v.state::text AS state,
               v.evidence_status::text AS evidence_status
          FROM gemstone_varieties v
          LEFT JOIN gemstone_species s2 ON s2.id = v.species_id
         WHERE v.deleted_at IS NULL) t), '[]'::json) AS varieties,
      COALESCE((SELECT json_agg(t ORDER BY t.sort_order, t.slug) FROM (
        SELECT c.slug AS slug, c.name AS name, pc.slug AS parent_slug,
               c.modifier AS modifier, c.hue AS hue, c.is_chromatic AS is_chromatic,
               c.sort_order::int AS sort_order, c.state::text AS state,
               c.evidence_status::text AS evidence_status
          FROM gemstone_colours c
          LEFT JOIN gemstone_colours pc ON pc.id = c.parent_id) t), '[]'::json) AS colours,
      COALESCE((SELECT json_agg(t ORDER BY t.rank, t.code) FROM (
        SELECT i.code AS code, i.name AS name, i.rank::int AS rank,
               i.evidence_status::text AS evidence_status
          FROM colour_intensities i) t), '[]'::json) AS intensities,
      COALESCE((SELECT json_agg(t ORDER BY t.rank, t.code) FROM (
        SELECT k.code AS code, k.label AS label, k.rank::int AS rank,
               k.is_eye_clean AS is_eye_clean,
               k.evidence_status::text AS evidence_status
          FROM clarities k) t), '[]'::json) AS clarities,
      COALESCE((SELECT json_agg(t ORDER BY t.slug) FROM (
        SELECT o.slug AS slug, o.name AS name, o.country_code AS country_code,
               o.region AS region, o.evidence_status::text AS evidence_status
          FROM gemstone_origins o) t), '[]'::json) AS origins,
      COALESCE((SELECT json_agg(t ORDER BY t.code) FROM (
        SELECT tr.code AS code, tr.label AS label,
               tr.requires_disclosure AS requires_disclosure,
               tr.evidence_status::text AS evidence_status
          FROM treatments tr) t), '[]'::json) AS treatments,
      COALESCE((SELECT json_agg(t ORDER BY t.sort_order, t.code) FROM (
        SELECT m.code AS code, m.label AS label, m.purity_label AS purity_label,
               m.colour AS colour, m.is_two_tone AS is_two_tone,
               m.slug_phrase AS slug_phrase, m.sort_order::int AS sort_order,
               m.state::text AS state, m.evidence_status::text AS evidence_status
          FROM metals m) t), '[]'::json) AS metals,
      COALESCE((SELECT json_agg(t ORDER BY t.code) FROM (
        SELECT st.code AS code, st.label AS label, st.slug AS slug,
               st.state::text AS state, st.evidence_status::text AS evidence_status
          FROM setting_styles st) t), '[]'::json) AS setting_styles,
      COALESCE((SELECT json_agg(t ORDER BY t.code) FROM (
        SELECT jt.code AS code, jt.label AS label, jt.state::text AS state,
               jt.evidence_status::text AS evidence_status
          FROM jewellery_types jt) t), '[]'::json) AS jewellery_types
  `;
  const result = await db.execute(statement);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (row === undefined) throw new Error('[BUG] taxonomy statement returned no row');
  return row;
}
