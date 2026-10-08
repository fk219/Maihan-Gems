/**
 * packages/db/src/catalog/whitelists.ts
 *
 * Semantic filter-value resolution (doc 12: "Filters validate against a
 * whitelist derived from the taxonomy tables. An unknown value returns
 * rejectedFilters with a reason; it never silently widens the result set").
 *
 * Every descriptor a caller passes (variety slug, colour slug, style slug,
 * origin slug, treatment/clarity/intensity code) must resolve to a taxonomy
 * row's id. Unresolved values are REPORTED, not applied: a rejected value
 * can never widen the WHERE clause and can never become part of the result
 * set's filter — the acceptance criterion verbatim.
 *
 * One round-trip resolves all requested descriptors across the family
 * tables, keeping the whole port latency budget dominated by the page query.
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from './executor.js';
import type { RejectedFilter } from '@maihan/contracts';

export interface IdResolved {
  id: string;
  label: string;
}

export interface FilterWhitelist {
  variety: Map<string, IdResolved>;
  color: Map<string, IdResolved>;
  intensity: Map<string, IdResolved>;
  clarity: Map<string, IdResolved>;
  treatment: Map<string, IdResolved>;
  origin: Map<string, IdResolved>;
  settingStyle: Map<string, IdResolved>;
}

export type RejectedFilterSink = (rejected: RejectedFilter) => void;

/** Four whitelist source tables; `family` discriminates the source. */

/**
 * Resolves descriptor lists against the taxonomy whitelist.
 *
 * @param db executor
 * @param requested descriptors grouped by filter field, keyed by the
 *        canonical filter name.
 * @returns the resolved id/label maps and the values that did not resolve,
 *          grouped by the filter name they arrived in.
 */
export async function resolveFilterWhitelists(
  db: CatalogDatabase,
  requested: {
    variety: readonly string[];
    color: readonly string[];
    intensity: readonly string[];
    clarity: readonly string[];
    treatment: readonly string[];
    origin: readonly string[];
    settingStyle: readonly string[];
  },
): Promise<{ whitelist: FilterWhitelist; rejected: RejectedFilter[] }> {
  const unique = (xs: readonly string[]): string[] => Array.from(new Set(xs));
  const varietyList = unique(requested.variety);
  const colorList = unique(requested.color);
  const intensityList = unique(requested.intensity);
  const clarityList = unique(requested.clarity);
  const treatmentList = unique(requested.treatment);
  const originList = unique(requested.origin);
  const styleList = unique(requested.settingStyle);

  const pushing = (): SQL => sql.join(
    [
      sql`(SELECT 'variety' AS family, v.slug AS descriptor, v.id::text AS id, v.name AS label FROM gemstone_varieties v WHERE v.slug = ANY(${sql.param(varietyList)}::text[]))`,
      sql`(SELECT 'color' AS family, c.slug AS descriptor, c.id::text AS id, c.name AS label FROM gemstone_colours c WHERE c.slug = ANY(${sql.param(colorList)}::text[]))`,
      sql`(SELECT 'intensity' AS family, i.code AS descriptor, i.id::text AS id, i.name AS label FROM colour_intensities i WHERE i.code = ANY(${sql.param(intensityList)}::text[]))`,
      sql`(SELECT 'clarity' AS family, k.code AS descriptor, k.id::text AS id, k.label AS label FROM clarities k WHERE k.code = ANY(${sql.param(clarityList)}::text[]))`,
      sql`(SELECT 'treatment' AS family, t.code::text AS descriptor, t.id::text AS id, t.label AS label FROM treatments t WHERE t.code::text = ANY(${sql.param(treatmentList)}::text[]))`,
      sql`(SELECT 'origin' AS family, o.slug AS descriptor, o.id::text AS id, o.name AS label FROM gemstone_origins o WHERE o.slug = ANY(${sql.param(originList)}::text[]))`,
      sql`(SELECT 'settingStyle' AS family, s.slug AS descriptor, s.id::text AS id, s.label AS label FROM setting_styles s WHERE s.slug = ANY(${sql.param(styleList)}::text[]))`,
    ],
    sql` UNION ALL `,
  );

  const rows = await rowsOf(db, pushing());

  const maps: Record<keyof FilterWhitelist, Map<string, IdResolved>> = {
    variety: new Map(),
    color: new Map(),
    intensity: new Map(),
    clarity: new Map(),
    treatment: new Map(),
    origin: new Map(),
    settingStyle: new Map(),
  };

  for (const row of rows) {
    const family = row['family'] as keyof FilterWhitelist;
    const map = maps[family];
    if (map) map.set(String(row['descriptor']), { id: String(row['id']), label: String(row['label']) });
  }

  const rejected: RejectedFilter[] = [];
  const pairs: Array<[keyof FilterWhitelist, readonly string[], string]> = [
    ['variety', varietyList, 'variety'],
    ['color', colorList, 'color'],
    ['intensity', intensityList, 'intensity'],
    ['clarity', clarityList, 'clarity'],
    ['treatment', treatmentList, 'treatment'],
    ['origin', originList, 'origin'],
    ['settingStyle', styleList, 'settingStyle'],
  ];
  for (const [family, list, filterName] of pairs) {
    for (const value of list) {
      if (!maps[family].has(value)) {
        rejected.push({
          filter: filterName,
          value,
          reason: 'UNKNOWN_VALUE',
          message: `"${value}" is not a known ${filterName} in the taxonomy whitelist; the value was rejected instead of widening the result set.`,
        });
      }
    }
  }

  return { whitelist: maps, rejected };
}

interface WhitelistRow {
  readonly family: string;
  readonly descriptor: string;
  readonly id: string;
  readonly label: string;
}

async function rowsOf(db: CatalogDatabase, query: SQL): Promise<WhitelistRow[]> {
  const result = await db.execute(query);
  return result.rows as unknown as WhitelistRow[];
}
