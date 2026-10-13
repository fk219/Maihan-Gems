'use client';

import { useMemo, useState } from 'react';

import {
  applyCatalogFilters,
  emptyFilterState,
  facetsFromProducts,
  type CatalogFilterState,
  type CatalogSort,
  type CatalogView,
} from '../../lib/collection-filters.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';
import { ProductGrid } from './LuxuryProductCard.js';

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FacetChecks({
  values,
  selected,
  onToggle,
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (values.length === 0) return <p className="lx-card__specs">None recorded.</p>;
  return (
    <ul className="lx-filter__list">
      {values.map((value) => (
        <li key={value}>
          <button
            type="button"
            className={selected.includes(value) ? 'is-on' : ''}
            aria-pressed={selected.includes(value)}
            onClick={() => onToggle(value)}
          >
            {value}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CollectionBrowser({ products }: { products: StorefrontCard[] }) {
  const facets = useMemo(() => facetsFromProducts(products), [products]);
  const [state, setState] = useState<CatalogFilterState>(() => emptyFilterState(facets));
  const [open, setOpen] = useState(false);

  const [page, setPage] = useState(1);
  const visible = useMemo(() => applyCatalogFilters(products, state), [products, state]);
  const pageSize = 60;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = visible.slice((page - 1) * pageSize, page * pageSize);

  const patch = (partial: Partial<CatalogFilterState>) => {
    setPage(1);
    setState((prev) => ({ ...prev, ...partial }));
  };
  const toggle = (key: 'shapes' | 'colours' | 'origins' | 'treatments' | 'labs', value: string) => {
    setState((prev) => ({ ...prev, [key]: toggleValue(prev[key], value) }));
  };

  const filters = (
    <aside className={`lx-filters${open ? ' is-open' : ''}`} aria-label="Collection filters">
      <div className="lx-filters__head">
        <h2>Filter</h2>
        <button type="button" className="lx-text-btn" onClick={() => setState(emptyFilterState(facets))}>
          Clear
        </button>
      </div>

      {facets.shapes.length > 0 ? (
      <section className="lx-filter">
        <h3>Shape</h3>
        <FacetChecks values={facets.shapes} selected={state.shapes} onToggle={(v) => toggle('shapes', v)} />
      </section>
      ) : null}

      <section className="lx-filter">
        <h3>Carat</h3>
        <div className="lx-filter__range">
          <input
            type="range"
            min={facets.carat.min}
            max={facets.carat.max}
            step={0.1}
            value={state.minCarat}
            aria-label="Minimum carat"
            onChange={(e) => {
              const n = Number(e.target.value);
              setState((prev) => ({ ...prev, minCarat: Math.min(n, prev.maxCarat) }));
            }}
          />
          <input
            type="range"
            min={facets.carat.min}
            max={facets.carat.max}
            step={0.1}
            value={state.maxCarat}
            aria-label="Maximum carat"
            onChange={(e) => {
              const n = Number(e.target.value);
              setState((prev) => ({ ...prev, maxCarat: Math.max(n, prev.minCarat) }));
            }}
          />
          <div className="lx-filter__vals">
            <span>{state.minCarat.toFixed(1)} ct</span>
            <span>{state.maxCarat.toFixed(1)} ct</span>
          </div>
        </div>
      </section>

      <section className="lx-filter">
        <h3>Price (USD)</h3>
        <div className="lx-filter__range">
          <input
            type="range"
            min={facets.price.min}
            max={facets.price.max}
            step={50}
            value={state.minPrice}
            aria-label="Minimum price"
            onChange={(e) => {
              const n = Number(e.target.value);
              setState((prev) => ({ ...prev, minPrice: Math.min(n, prev.maxPrice) }));
            }}
          />
          <input
            type="range"
            min={facets.price.min}
            max={facets.price.max}
            step={50}
            value={state.maxPrice}
            aria-label="Maximum price"
            onChange={(e) => {
              const n = Number(e.target.value);
              setState((prev) => ({ ...prev, maxPrice: Math.max(n, prev.minPrice) }));
            }}
          />
          <div className="lx-filter__vals">
            <span>{state.minPrice.toLocaleString('en-US')}</span>
            <span>{state.maxPrice.toLocaleString('en-US')}</span>
          </div>
        </div>
      </section>

      {facets.colours.length > 0 ? (
      <section className="lx-filter">
        <h3>Colour</h3>
        <FacetChecks values={facets.colours} selected={state.colours} onToggle={(v) => toggle('colours', v)} />
      </section>
      ) : null}

      {facets.origins.length > 0 ? (
      <section className="lx-filter">
        <h3>Origin</h3>
        <FacetChecks values={facets.origins} selected={state.origins} onToggle={(v) => toggle('origins', v)} />
      </section>
      ) : null}

      {facets.treatments.length > 0 ? (
      <section className="lx-filter">
        <h3>Treatment</h3>
        <FacetChecks values={facets.treatments} selected={state.treatments} onToggle={(v) => toggle('treatments', v)} />
      </section>
      ) : null}

      {facets.labs.length > 0 ? (
      <section className="lx-filter">
        <h3>Lab</h3>
        <FacetChecks values={facets.labs} selected={state.labs} onToggle={(v) => toggle('labs', v)} />
      </section>
      ) : null}
    </aside>
  );

  return (
    <div className="lx-catalog">
      {open ? <button type="button" className="lx-filters-scrim" aria-label="Close filters" onClick={() => setOpen(false)} /> : null}
      {filters}
      <div>
        <div className="lx-toolbar">
          <span className="lx-toolbar__count">
            {visible.length} piece{visible.length === 1 ? '' : 's'}
            {visible.length > pageSize ? ` · page ${page} of ${pages}` : ''}
          </span>
          <div className="lx-toolbar__tools">
            <button type="button" className="lx-btn lx-btn--ghost lx-drawer-btn" onClick={() => setOpen(true)}>
              Filters
            </button>
            <label>
              <span className="visually-hidden">Sort</span>
              <select
                aria-label="Sort"
                value={state.sort}
                onChange={(e) => patch({ sort: e.target.value as CatalogSort })}
              >
                <option value="price-desc">Featured first</option>
                <option value="title-asc">New first</option>
                <option value="price-asc">Price · low to high</option>
                <option value="carat-desc">Carat · high to low</option>
              </select>
            </label>
            <div className="lx-view-toggle" role="group" aria-label="Layout">
              <button type="button" className={state.view === 'grid' ? 'is-on' : ''} onClick={() => patch({ view: 'grid' as CatalogView })}>
                Grid
              </button>
              <button type="button" className={state.view === 'list' ? 'is-on' : ''} onClick={() => patch({ view: 'list' as CatalogView })}>
                List
              </button>
            </div>
          </div>
        </div>
        {paged.length > 0 ? (
          <>
            <ProductGrid products={paged} view={state.view} />
            {pages > 1 ? (
              <nav className="lx-pager" aria-label="Catalogue pages">
                <button type="button" className="lx-btn lx-btn--ghost" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                  Previous
                </button>
                <span>
                  {page} / {pages}
                </span>
                <button type="button" className="lx-btn lx-btn--ghost" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
                  Next
                </button>
              </nav>
            ) : null}
          </>
        ) : (
          <p className="lx-empty-copy">No pieces match these filters. Clear them to return to the full drawer.</p>
        )}
      </div>
    </div>
  );
}
