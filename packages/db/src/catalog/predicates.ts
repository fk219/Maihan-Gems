/**
 * packages/db/src/catalog/predicates.ts
 *
 * Structured-predicate assembly for the catalogue query port.
 *
 * ONE AUTHORITY RULE — the page query and every facet arm compose their
 * WHERE clauses from the SAME plan produced by `resolveProductFilters`
 * here, so a facet count cannot disagree with the rows it was computed
 * from: there is no second implementation of any filter to drift.
 *
 * RESOLUTION HAPPENS ONCE PER PORT CALL:
 *   1. descriptor values (slugs/codes) are resolved against the taxonomy
 *      whitelist produced by whitelists.ts; unresolvable values are reported
 *      into `rejected`, in closed-registry reasons, exactly once, and can
 *      never enter SQL (so they cannot widen the result set);
 *   2. ranges are validated once (`INVALID_RANGE` when min > max);
 *   3. the resulting `FilterPlan` is immutable and side-effect free —
 *      `buildProductsWhere(plan, group)` is a pure function of it.
 *
 * FACET GROUPS (doc 12 "Facets", disjunctive colour/variety): a facet arm
 * for dimension D is built with `group = D`, which EXCLUDES D's own
 * predicates — selecting one colour does not zero other colours' counts.
 * The page itself is built with `group = 'all'`, `others ∪ {D}` — its
 * counts agree with the displayed result set by construction because both
 * sides consume the same plan.
 *
 * INDEXED COLUMNS ONLY (doc 12 structured-filter table): kind/variety/colour
 * ride the `(kind,state)`/`(variety_id,state)`/`(colour_id,state)` indexes,
 * ranges on `price_amount WHERE state='ACTIVE'` and `total_weight_ct`,
 * certified on `certificates(verification_status)`, availability via the
 * partial-index shape, and the stone-attribute dimensions ride the
 * gemstone indexes through the (1:1, FK-indexed) joins in the star query.
 */
import { sql, type SQL } from 'drizzle-orm';
import type { RejectedFilter } from '@maihan/contracts';
import type { FilterWhitelist } from './whitelists.js';

/** The closed list of facet dimensions computed over products. */
export const PRODUCT_FACET_DIMENSIONS = [
  'variety',
  'color',
  'jewellery_type',
  'metal',
  'settingStyle',
  'shape',
  'origin',
  'treatment',
] as const;

export type ProductFacetDimension = (typeof PRODUCT_FACET_DIMENSIONS)[number];

export function isProductFacetDimension(value: string): value is ProductFacetDimension {
  return (PRODUCT_FACET_DIMENSIONS as readonly string[]).includes(value);
}

/**
 * The fully-resolved filter plan: every value list contains ONLY values that
 * survived whitelist resolution, so a plan is safe to compile to SQL as-is.
 */
export interface FilterPlan {
  kind: readonly string[];
  jewelleryType: readonly string[];
  /** gemstone-kind member flags: SINGLE realises via gemstone_id, PAIR via gemstone_pair_id. */
  singleStone: boolean;
  pairStone: boolean;
  varietyIds: readonly string[];
  colourIds: readonly string[];
  intensityIds: readonly string[];
  clarityIds: readonly string[];
  treatmentIds: readonly string[];
  originIds: readonly string[];
  shapes: readonly string[];
  metalCodes: readonly string[];
  styleIds: readonly string[];
  certified: boolean;
  available: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  minWeightCt: number | null;
  maxWeightCt: number | null;
}

/** Raw filter shape as delivered by the contract layer (all arrays defaulted). */
export interface RawSpecFilters {
  kind: readonly string[];
  jewelleryType: readonly string[];
  gemstoneKind: readonly string[];
  variety: readonly string[];
  color: readonly string[];
  intensity: readonly string[];
  clarity: readonly string[];
  treatment: readonly string[];
  origin: readonly string[];
  shape: readonly string[];
  metal: readonly string[];
  settingStyle: readonly string[];
  certified: boolean;
  available: boolean;
  minPrice?: number;
  maxPrice?: number;
  minWeightCt?: number;
  maxWeightCt?: number;
}

/**
 * Compiles raw filters into a `FilterPlan` + deterministic rejection list.
 *
 * Descriptor values were ALREADY resolved against the whitelist by
 * whitelists.ts, which owns their rejection reporting; the resolver here
 * therefore reports ONLY range problems (each reported value appears
 * exactly once across the whole port call). A value never silently widens
 * the result set: what the whitelist dropped is simply absent from the
 * plan's id lists.
 */
export function resolveProductFilters(
  raw: RawSpecFilters,
  whitelist: FilterWhitelist,
): { plan: FilterPlan; rejected: RejectedFilter[] } {
  const rejected: RejectedFilter[] = [];

  /** Descriptor values resolve silently here: the whitelist reported misses. */
  const resolveIds = (
    familyKey: keyof FilterWhitelist,
    descriptors: readonly string[],
  ): string[] => {
    const ids: string[] = [];
    for (const descriptor of descriptors) {
      const resolved = whitelist[familyKey].get(descriptor);
      if (resolved !== undefined) ids.push(resolved.id);
    }
    return ids;
  };

  const varietyIds = resolveIds('variety', raw.variety);
  const colourIds = resolveIds('color', raw.color);
  const intensityIds = resolveIds('intensity', raw.intensity);
  const clarityIds = resolveIds('clarity', raw.clarity);
  const treatmentIds = resolveIds('treatment', raw.treatment);
  const originIds = resolveIds('origin', raw.origin);
  const styleIds = resolveIds('settingStyle', raw.settingStyle);

  let minPrice: number | null = raw.minPrice ?? null;
  let maxPrice: number | null = raw.maxPrice ?? null;
  if (
    minPrice !== null &&
    maxPrice !== null &&
    minPrice > maxPrice
  ) {
    rejected.push({
      filter: 'price',
      value: `${minPrice}-${maxPrice}`,
      reason: 'INVALID_RANGE',
      message: 'minPrice must be ≤ maxPrice; the price range was rejected.',
    });
    minPrice = null;
    maxPrice = null;
  }

  let minWeightCt: number | null = raw.minWeightCt ?? null;
  let maxWeightCt: number | null = raw.maxWeightCt ?? null;
  if (
    minWeightCt !== null &&
    maxWeightCt !== null &&
    minWeightCt > maxWeightCt
  ) {
    rejected.push({
      filter: 'weight',
      value: `${minWeightCt}-${maxWeightCt}`,
      reason: 'INVALID_RANGE',
      message: 'minWeightCt must be ≤ maxWeightCt; the weight range was rejected.',
    });
    minWeightCt = null;
    maxWeightCt = null;
  }

  const plan: FilterPlan = {
    kind: raw.kind,
    jewelleryType: raw.jewelleryType,
    singleStone: raw.gemstoneKind.includes('SINGLE'),
    pairStone: raw.gemstoneKind.includes('PAIR'),
    varietyIds,
    colourIds,
    intensityIds,
    clarityIds,
    treatmentIds,
    originIds,
    shapes: raw.shape,
    metalCodes: raw.metal,
    styleIds,
    certified: raw.certified === true,
    available: raw.available === true,
    minPrice,
    maxPrice,
    minWeightCt,
    maxWeightCt,
  };

  return { plan, rejected };
}

const anyIds = (column: SQL, ids: readonly string[]): SQL =>
  sql`${column}::text = ANY(${sql.param(ids as unknown as string[])}::uuid[]::text[])`;

const anyCodes = (column: SQL, values: readonly string[]): SQL =>
  sql`${column} = ANY(${sql.param(values as unknown as string[])}::text[])`;

/**
 * Pure WHERE composition over the products star.
 *
 * BASE VISIBILITY (doc 10 read-model boundary + filters.ts contract): the
 * public catalogue reads `state = 'ACTIVE'` only, structurally — the migrated
 * corpus stays DRAFT until Phase 12 curation publishes it, so no DRAFT row
 * can cross this boundary by any input combination. The same base clause
 * feeds the page AND every facet arm, keeping counts consistent with the
 * result set. It also matches the partial index shape
 * `(price_amount) WHERE deleted_at IS NULL AND state = 'ACTIVE'`.
 *
 * @param group `'all'` includes every dimension's predicates; a facet
 *        dimension name builds the set with THAT dimension's predicates
 *        excluded (disjunctive drill-down per doc 12) . Both builds share
 *        identical predicates for everything else.
 */
export function buildProductsWhere(plan: FilterPlan, group: 'all' | ProductFacetDimension): SQL {
  const include = (dimension: ProductFacetDimension): boolean =>
    group === 'all' || group !== dimension;

  const clauses: SQL[] = [sql`p.deleted_at IS NULL`, sql`p.state = 'ACTIVE'`];

  if (plan.minPrice !== null) {
    clauses.push(sql`p.price_amount >= ${sql.param(plan.minPrice)}`);
  }
  if (plan.maxPrice !== null) {
    clauses.push(sql`p.price_amount <= ${sql.param(plan.maxPrice)}`);
  }
  if (plan.minWeightCt !== null) {
    clauses.push(sql`p.total_weight_ct >= ${sql.param(plan.minWeightCt)}`);
  }
  if (plan.maxWeightCt !== null) {
    clauses.push(sql`p.total_weight_ct <= ${sql.param(plan.maxWeightCt)}`);
  }

  if (plan.kind.length > 0) {
    clauses.push(anyCodes(sql`p.kind::text`, plan.kind));
  }
  if (plan.singleStone || plan.pairStone) {
    const parts: SQL[] = [];
    if (plan.singleStone) parts.push(sql`p.gemstone_id IS NOT NULL`);
    if (plan.pairStone) parts.push(sql`p.gemstone_pair_id IS NOT NULL`);
    clauses.push(parts.length === 2 ? sql`(${sql.join(parts, sql` OR `)})` : parts[0]!);
  }
  if (plan.jewelleryType.length > 0) {
    clauses.push(anyCodes(sql`p.jewellery_type::text`, plan.jewelleryType));
  }
  if (plan.certified) {
    clauses.push(sql`EXISTS (
      SELECT 1 FROM certificates c
       WHERE c.product_id = p.id AND c.verification_status = 'VERIFIED'
    )`);
  }
  if (plan.available) {
    clauses.push(sql`(p.availability = TRUE AND p.state = 'ACTIVE')`);
  }

  if (include('variety') && plan.varietyIds.length > 0) {
    clauses.push(anyIds(sql`p.variety_id`, plan.varietyIds));
  }
  if (include('color') && plan.colourIds.length > 0) {
    clauses.push(anyIds(sql`p.colour_id`, plan.colourIds));
  }
  if (include('metal') && plan.metalCodes.length > 0) {
    clauses.push(anyCodes(sql`sv.metal_code::text`, plan.metalCodes));
  }
  if (include('settingStyle') && plan.styleIds.length > 0) {
    clauses.push(anyIds(sql`s.style_id`, plan.styleIds));
  }
  if (include('shape') && plan.shapes.length > 0) {
    clauses.push(anyCodes(sql`coalesce(g.shape::text, gp.shape::text)`, plan.shapes));
  }
  if (include('origin') && plan.originIds.length > 0) {
    clauses.push(anyIds(sql`coalesce(g.origin_id, gp.origin_id)`, plan.originIds));
  }
  if (include('treatment') && plan.treatmentIds.length > 0) {
    clauses.push(anyIds(sql`coalesce(g.treatment_id, gp.treatment_id)`, plan.treatmentIds));
  }
  // Intensity/clarity are NOT facet dimensions but remain valid structured
  // filters (doc 12 table): they always apply to candidate filtering.
  if (plan.intensityIds.length > 0) {
    clauses.push(anyIds(sql`coalesce(g.intensity_id, gp.intensity_id)`, plan.intensityIds));
  }
  if (plan.clarityIds.length > 0) {
    clauses.push(anyIds(sql`coalesce(g.clarity_id, gp.clarity_id)`, plan.clarityIds));
  }

  return sql`(${sql.join(clauses, sql` AND `)})`;
}
