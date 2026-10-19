/**
 * apps/web/src/components/filters/SearchFilterPanel.tsx
 *
 * Faceted Filter Panel for the storefront search UI (/search).
 *
 * Authority & Design:
 *   - technical_design/08_FRONTEND_ARCHITECTURE.md (FacetPanel component inventory)
 *   - technical_design/12_SEARCH_ARCHITECTURE.md (Facets single-pass grouped CTE over filtered candidates)
 *   - Design.md (Hairline gold borders, luxury dark surface, monospace tabular counts)
 *
 * Rules:
 *   - Server-compatible Server Component. Every filter action is a semantic <Link>
 *     updating URL searchParams (shareable, back-button safe, no client JS required).
 *   - Pure presentation of the Phase 5 FacetSet contract.
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
    { key: 'variety', title: 'Gemstone Variety', items: facets.variety },
    { key: 'color', title: 'Colour Family', items: facets.color },
    { key: 'shape', title: 'Cut & Shape', items: facets.shape },
    { key: 'jewellery_type', title: 'Jewellery Type', items: facets.jewellery_type },
    { key: 'metal', title: 'Precious Metal', items: facets.metal },
    { key: 'treatment', title: 'Treatment Disclosure', items: facets.treatment },
    { key: 'origin', title: 'Geographic Origin', items: facets.origin },
  ];

  return (
    <aside className="filter-panel" aria-label="Search filter dimensions">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(212, 164, 55, 0.2)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-gold)',
            margin: 0,
          }}
        >
          Refine By Facet
        </h2>
        <Link
          href="/search"
          style={{
            fontSize: '0.6875rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
          }}
        >
          Reset All
        </Link>
      </div>

      {dimensions.map((dim) => {
        if (!dim.items || dim.items.length === 0) return null;

        return (
          <div key={dim.key} className="filter-group">
            <h3 className="filter-group__title">{dim.title}</h3>
            <ul className="filter-group__list">
              {dim.items.map((item) => {
                const href = buildSearchHref(searchParams, dim.key, item.value);
                const isSelected = item.selected;

                return (
                  <li key={item.value}>
                    <Link
                      href={href}
                      className={`filter-item-link ${isSelected ? 'filter-item-link--selected' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '3px',
                            border: isSelected
                              ? '1.5px solid var(--color-gold)'
                              : '1px solid rgba(255, 255, 255, 0.25)',
                            background: isSelected ? 'var(--color-gold)' : 'transparent',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: 'var(--navy-deep)',
                            fontWeight: 'bold',
                          }}
                          aria-hidden="true"
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      <span className="filter-item__count font-mono">
                        ({item.count})
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </aside>
  );
}
