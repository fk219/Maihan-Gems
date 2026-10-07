/**
 * packages/db — reference-data seeder (Phase 1 Task 9).
 *
 * Plan task 9: "Seed reference data: 15 metals, 8 jewellery types, setting
 * styles, treatments, intensities, clarities" — the authoritative reference
 * vocabulary only. Never catalogue data, never scraped NaturalGemstones
 * records, never business data (migrations carry DDL only; the doc 04 rule
 * "Seed from evidence happens in the reference-data seeder task" applies).
 *
 * Behaviour:
 *   - deterministic: one explicit data set per category (reference-data.ts),
 *     inserted in a fixed FK-safe order;
 *   - idempotent: INSERT ... ON CONFLICT on the table's NATURAL key
 *     (metals.code, jewellery_types.code, treatments.code,
 *     treatment_labels.raw_label, colour_intensities.code, clarities.code,
 *     setting_styles.code, clarity_labels.raw_label) DO NOTHING — a second
 *     run changes zero rows and preserves the first run's state (no
 *     destructive replacement, no drift);
 *   - auditable: returns the inserted/present counts per table.
 *
 * Runs on whatever database DATABASE_URL names (the single sanctioned
 * variable, SoT 29.6); the CLI wrapper refuses any database outside the
 * maihan_dev dev contract, mirroring the migration runner.
 */
import type pg from 'pg';
import {
  METAL_SEED,
  JEWELLERY_TYPE_SEED,
  SETTING_STYLE_SEED,
  TREATMENT_SEED,
  TREATMENT_LABEL_SEED,
  COLOUR_INTENSITY_SEED,
  CLARITY_SEED,
  CLARITY_LABEL_SEED,
} from './reference-data.js';

export interface ReferenceSeedCounts {
  readonly metals: { inserted: number; present: number };
  readonly jewelleryTypes: { inserted: number; present: number };
  readonly settingStyles: { inserted: number; present: number };
  readonly treatments: { inserted: number; present: number };
  readonly treatmentLabels: { inserted: number; present: number };
  readonly colourIntensities: { inserted: number; present: number };
  readonly clarities: { inserted: number; present: number };
  readonly clarityLabels: { inserted: number; present: number };
}

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.ClientBase, 'query'>;

/** INSERT ... ON CONFLICT DO NOTHING; rowCount 1 = inserted, 0 = already present. */
async function insertIgnore(
  db: Queryable,
  sql: string,
  params: readonly unknown[],
): Promise<{ inserted: number; present: number }> {
  const result = await db.query(sql, params as unknown[]);
  const rowCount = result.rowCount ?? 0;
  return rowCount > 0 ? { inserted: 1, present: 0 } : { inserted: 0, present: 1 };
}

/**
 * Seed the reference vocabulary. Deterministic order (FK safety): metals,
 * jewellery types, setting styles, treatments -> treatment labels, colour
 * intensities, clarities -> clarity labels.
 */
export async function seedReferenceData(db: Queryable): Promise<ReferenceSeedCounts> {
  const metals = { inserted: 0, present: 0 };
  for (const m of METAL_SEED) {
    const r = await insertIgnore(
      db,
      `INSERT INTO metals (code, label, purity_label, purity_value, colour, is_two_tone, secondary_colour, slug_phrase, sort_order, evidence_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (code) DO NOTHING`,
      [m.code, m.label, m.purityLabel, m.purityValue, m.colour, m.isTwoTone, m.secondaryColour, m.slugPhrase, m.sortOrder, m.evidenceStatus],
    );
    metals.inserted += r.inserted;
    metals.present += r.present;
  }

  const jewelleryTypes = { inserted: 0, present: 0 };
  for (const t of JEWELLERY_TYPE_SEED) {
    const r = await insertIgnore(
      db,
      `INSERT INTO jewellery_types (code, label, slug, uses_pair, uses_single, state, evidence_status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
       ON CONFLICT (code) DO NOTHING`,
      [t.code, t.label, t.slug, t.usesPair, t.usesSingle, t.evidenceStatus],
    );
    jewelleryTypes.inserted += r.inserted;
    jewelleryTypes.present += r.present;
  }

  const settingStyles = { inserted: 0, present: 0 };
  for (const s of SETTING_STYLE_SEED) {
    const r = await insertIgnore(
      db,
      `INSERT INTO setting_styles (code, label, slug, state, evidence_status)
       VALUES ($1, $2, $3, 'ACTIVE', $4)
       ON CONFLICT (code) DO NOTHING`,
      [s.code, s.label, s.slug, s.evidenceStatus],
    );
    settingStyles.inserted += r.inserted;
    settingStyles.present += r.present;
  }

  const treatments = { inserted: 0, present: 0 };
  for (const t of TREATMENT_SEED) {
    const r = await insertIgnore(
      db,
      `INSERT INTO treatments (code, label, requires_disclosure, price_impact, evidence_status)
       VALUES ($1, $2, true, 0, 'OBSERVED')
       ON CONFLICT (code) DO NOTHING`,
      [t.code, t.label],
    );
    treatments.inserted += r.inserted;
    treatments.present += r.present;
  }

  const treatmentLabels = { inserted: 0, present: 0 };
  for (const l of TREATMENT_LABEL_SEED) {
    const r = await insertIgnore(
      db,
      `INSERT INTO treatment_labels (treatment_id, raw_label, evidence_status)
       SELECT t.id, $2, 'OBSERVED' FROM treatments t
       WHERE t.code = $1
         AND NOT EXISTS (SELECT 1 FROM treatment_labels tl WHERE tl.raw_label = $2)
       ON CONFLICT (raw_label) DO NOTHING`,
      [l.treatmentCode, l.rawLabel],
    );
    treatmentLabels.inserted += r.inserted;
    treatmentLabels.present += r.present;
  }

  const colourIntensities = { inserted: 0, present: 0 };
  for (const i of COLOUR_INTENSITY_SEED) {
    const r = await insertIgnore(
      db,
      `INSERT INTO colour_intensities (code, name, rank, evidence_status)
       VALUES ($1, $2, $3, 'OBSERVED')
       ON CONFLICT (code) DO NOTHING`,
      [i.code, i.name, i.rank],
    );
    colourIntensities.inserted += r.inserted;
    colourIntensities.present += r.present;
  }

  const clarities = { inserted: 0, present: 0 };
  for (const c of CLARITY_SEED) {
    const r = await insertIgnore(
      db,
      `INSERT INTO clarities (code, label, rank, is_eye_clean, evidence_status)
       VALUES ($1, $2, $3, $4, 'OBSERVED')
       ON CONFLICT (code) DO NOTHING`,
      [c.code, c.label, c.rank, c.isEyeClean],
    );
    clarities.inserted += r.inserted;
    clarities.present += r.present;
  }

  const clarityLabels = { inserted: 0, present: 0 };
  for (const l of CLARITY_LABEL_SEED) {
    const r = await insertIgnore(
      db,
      `INSERT INTO clarity_labels (raw_label, clarity_id, is_doubled, token_count, evidence_status)
       SELECT $1, id, $3, $4, 'OBSERVED' FROM clarities WHERE code = $2
       ON CONFLICT (raw_label) DO NOTHING`,
      [l.rawLabel, l.clarityCode, l.isDoubled, l.tokenCount],
    );
    clarityLabels.inserted += r.inserted;
    clarityLabels.present += r.present;
  }

  return {
    metals,
    jewelleryTypes,
    settingStyles,
    treatments,
    treatmentLabels,
    colourIntensities,
    clarities,
    clarityLabels,
  };
}
