/**
 * apps/web/src/modules/catalog/application/facet-definitions.ts
 *
 * Task 8 — the `/api/v1/taxonomy/facets` read model: the CLOSED facet
 * dimension list (doc 12 structured-filter table, FacetSetSchema dimensions)
 * with each dimension's filter vocabulary, derived from the taxonomy read
 * model.
 *
 * Value forms are exactly what the filter whitelist resolves against
 * (packages/db whitelists: variety/colour/origin/style by SLUG;
 * intensity/clarity/treatment by CODE; jewellery type and metal by enum
 * CODE), so every value published here is a value a caller can filter on.
 * Shape has no taxonomy table — its vocabulary is the schema enum
 * (migrations/0002_enums.sql), echoed verbatim with no invented labels.
 *
 * Counts are deliberately absent: value counts are computed per query over
 * the filtered result set on the list endpoints (single grouped pass,
 * task 3). There is no global counts source in the Phase 3 port, and
 * fabricating one would be invented data.
 */
import {
  FACET_DIMENSIONS,
  STONE_SHAPE_VALUES,
  type FacetDefinition,
  type FacetDefinitionList,
  type TaxonomyReadModel,
} from '@maihan/contracts';

export function buildFacetDefinitions(taxonomy: TaxonomyReadModel): FacetDefinitionList {
  const byDimension: Record<string, FacetDefinition['values']> = {
    variety: taxonomy.varieties.map((row) => ({
      value: row.slug,
      label: row.display_name,
    })),
    color: taxonomy.colours.map((row) => ({ value: row.slug, label: row.name })),
    jewellery_type: taxonomy.jewellery_types.map((row) => ({
      value: row.code,
      label: row.label,
    })),
    metal: taxonomy.metals.map((row) => ({ value: row.code, label: row.label })),
    settingStyle: taxonomy.setting_styles.map((row) => ({ value: row.slug, label: row.label })),
    shape: STONE_SHAPE_VALUES.map((value) => ({ value, label: value })),
    origin: taxonomy.origins.map((row) => ({ value: row.slug, label: row.name })),
    treatment: taxonomy.treatments.map((row) => ({ value: row.code, label: row.label })),
  };

  return FACET_DIMENSIONS.map((dimension) => ({
    dimension,
    values: byDimension[dimension] ?? [],
  }));
}
