/**
 * apps/web/src/components/filters/SearchFilterPanel.tsx
 *
 * Faceted filter panel for /search.
 *
 * Rules:
 *   - Server-compatible. Every filter action is a semantic <Link> that
 *     updates URL searchParams (shareable, back-button safe, no client JS).
 *   - `aria-current="true"` marks an applied facet. The previous `aria-pressed`
 *     was a toggle-button attribute on a link; this is the correct link
 *     semantic and keeps the accessibility tree honest.
 *   - No filled panel: a hairline column, one rule per group, tabular counts.
 */
import Link from 'next/link';
import type { FacetSet, FacetValue } from '@maihan/contracts';

import { buildSearchHref, type RawSearchParams } from '../../lib/search-view.js';

export interface SearchFilterPanelProps {
  readonly facets: FacetSet;
  readonly searchParams: RawSearchParams;
}

interface DimensionConfig {
  readonly key: string;
  readonly title: string;
  readonly items: readonly FacetValue[];
}

export function SearchFilterPanel({ facets, searchParams }: SearchFilterPanelProps) {
  const dimensions: readonly DimensionConfig[] = [
    { key: 'variety', title: 'Gemstone variety', items: facets.variety },
    { key: 'color', title: 'Colour family', items: facets.color },
    { key: 'shape', title: 'Cut & shape', items: facets.shape },
    { key: 'jewellery_type', title: 'Jewellery type', items: facets.jewellery_type },
    { key: 'metal', title: 'Precious metal', items: facets.metal },
    { key: 'treatment', title: 'Treatment disclosure', items: facets.treatment },
    { key: 'origin', title: 'Geographic origin', items: facets.origin },
  ];

  return (
    <section className="mh-facets" aria-labelledby="mh-facets-heading">
      <div className="mh-facets__head">
        <h2 id="mh-facets-heading">Refine by facet</h2>
        <Link href="/search" className="mh-facets__reset">
          Reset all
        </Link>
      </div>

      {dimensions.map((dim) => {
        if (!dim.items || dim.items.length === 0) return null;

        return (
          <section className="mh-facet" key={dim.key} aria-labelledby={`mh-facet-${dim.key}`}>
            <h3 id={`mh-facet-${dim.key}`} className="mh-facet__title">
              {dim.title}
            </h3>
            <ul className="mh-facet__list">
              {dim.items.map((item) => {
                const href = buildSearchHref(searchParams, dim.key, item.value);
                const isSelected = item.selected;

                return (
                  <li key={item.value}>
                    <Link
                      href={href}
                      className="mh-facet__link"
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <span className="mh-facet__mark" aria-hidden="true" />
                      <span>{item.label}</span>
                      <span className="mh-facet__count tabular">{item.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
