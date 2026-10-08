/**
 * packages/contracts/src/dto/catalog/facets.ts
 *
 * Facet contracts (Phase 3 task 3).
 *
 * Semantic contract (doc 12 "Facets"):
 *   - Facet counts are computed in a SINGLE GROUPED PASS over the filtered
 *     candidate set, so facet counts always agree with the result set.
 *   - Colour and variety are DISJUNCTIVE: selecting one colour does not zero
 *     the counts of the others — a facet dimension's counts are taken from
 *     the filtered set MINUS that dimension's own predicate.
 *   - `selected` marks values present in the active filter; `count` for a
 *     selected value of a disjunctive dimension is the count in the set
 *     filtered on all OTHER dimensions.
 *
 * The facet dimension list is closed (doc 12 structured-filter table). A
 * facet dimension exists only where the underlying column is indexed and the
 * value list comes from a taxonomy table or a schema enum.
 */
import { z } from 'zod';

export const FACET_DIMENSIONS = [
  'variety',
  'color',
  'jewellery_type',
  'metal',
  'settingStyle',
  'shape',
  'origin',
  'treatment',
] as const;

export type FacetDimension = (typeof FACET_DIMENSIONS)[number];

export const FACET_DIMENSION_NAMES = z.enum(FACET_DIMENSIONS);
export type FacetDimensionName = z.infer<typeof FACET_DIMENSION_NAMES>;

export const FacetValueSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  count: z.number().int().min(0),
  selected: z.boolean(),
});

export type FacetValue = z.infer<typeof FacetValueSchema>;

/** Facets map: every closed dimension is present, sorted count DESC then value ASC. May be empty. */
export const FacetSetSchema = z.object({
  variety: z.array(FacetValueSchema),
  color: z.array(FacetValueSchema),
  jewellery_type: z.array(FacetValueSchema),
  metal: z.array(FacetValueSchema),
  settingStyle: z.array(FacetValueSchema),
  shape: z.array(FacetValueSchema),
  origin: z.array(FacetValueSchema),
  treatment: z.array(FacetValueSchema),
});

export type FacetSet = z.infer<typeof FacetSetSchema>;
