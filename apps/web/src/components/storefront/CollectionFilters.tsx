'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { swatchFor } from '../../lib/ngc/colors.js';
import {
  applyCatalogFilters,
  CARAT_BUCKETS,
  emptyFilterState,
  facetsFromProducts,
  type CatalogFilterState,
  type CatalogSort,
  type CatalogView,
  type FacetValue,
} from '../../lib/collection-filters.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';
import { ProductGrid } from './LuxuryProductCard.js';
import { ShapeIcon } from './ShapeIcon.js';

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`lx-filter${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="lx-filter__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <h3>{title}</h3>
        <span aria-hidden="true">{open ? '–' : '+'}</span>
      </button>
      {open ? <div className="lx-filter__body">{children}</div> : null}
    </section>
  );
}

function FacetChecks({
  values,
  selected,
  onToggle,
  kind = 'check',
}: {
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  kind?: 'check' | 'shape' | 'swatch';
}) {
  if (values.length === 0) return null;
  return (
    <ul className={`lx-filter__list lx-filter__list--${kind}`}>
      {values.map((row) => {
        const on = selected.includes(row.value);
        return (
          <li key={row.value}>
            <label className={on ? 'is-on' : ''}>
              <input type="checkbox" checked={on} onChange={() => onToggle(row.value)} />
              {kind === 'shape' ? <ShapeIcon shape={row.value} /> : null}
              {kind === 'swatch' ? <i style={{ background: swatchFor(row.value) }} /> : null}
              <span>{row.value}</span>
              <em>{row.count}</em>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function RangePair({
  min,
  max,
  lo,
  hi,
  step,
  loLabel,
  hiLabel,
  format,
  onLo,
  onHi,
}: {
  min: number;
  max: number;
  lo: number;
  hi: number;
  step: number;
  loLabel: string;
  hiLabel: string;
  format: (n: number) => string;
  onLo: (n: number) => void;
  onHi: (n: number) => void;
}) {
  if (max <= min) return null;
  return (
    <div className="lx-filter__range">
      <input type="range" min={min} max={max} step={step} value={lo} aria-label={loLabel} onChange={(e) => onLo(Math.min(Number(e.target.value), hi))} />
      <input type="range" min={min} max={max} step={step} value={hi} aria-label={hiLabel} onChange={(e) => onHi(Math.max(Number(e.target.value), lo))} />
      <div className="lx-filter__vals">
        <span>{format(lo)}</span>
        <span>{format(hi)}</span>
      </div>
    </div>
  );
}

export function CollectionBrowser({ products }: { products: StorefrontCard[] }) {
  const facets = useMemo(() => facetsFromProducts(products), [products]);
  const [state, setState] = useState<CatalogFilterState>(() => {
    const base = emptyFilterState(facets);
    if (typeof window === 'undefined') return base;
    const params = new URLSearchParams(window.location.search);
    const list = (key: string) => {
      const val = params.get(key);
      return val ? val.split(',').filter(Boolean) : [];
    };
    const sortParam = params.get('sort') as CatalogSort | null;
    const viewParam = params.get('view') as CatalogView | null;
    return {
      ...base,
      shapes: list('shape'),
      colours: list('color'),
      origins: list('origin'),
      treatments: list('treatment'),
      metals: list('metal'),
      caratBuckets: list('carat'),
      sort: sortParam ?? base.sort,
      view: viewParam ?? base.view,
    };
  });
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const setList = (key: string, values: string[]) => {
      if (values.length > 0) url.searchParams.set(key, values.join(','));
      else url.searchParams.delete(key);
    };
    setList('shape', state.shapes);
    setList('color', state.colours);
    setList('origin', state.origins);
    setList('treatment', state.treatments);
    setList('metal', state.metals);
    setList('carat', state.caratBuckets);
    if (state.sort && state.sort !== 'price-desc') url.searchParams.set('sort', state.sort);
    else url.searchParams.delete('sort');
    if (state.view && state.view !== 'grid') url.searchParams.set('view', state.view);
    else url.searchParams.delete('view');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [state]);
  const visible = useMemo(() => applyCatalogFilters(products, state, facets), [products, state, facets]);
  const pageSize = 60;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = visible.slice((page - 1) * pageSize, page * pageSize);

  const patch = (partial: Partial<CatalogFilterState>) => {
    setPage(1);
    setState((prev) => ({ ...prev, ...partial }));
  };
  const toggle = (
    key:
      | 'shapes'
      | 'colours'
      | 'intensities'
      | 'clarities'
      | 'cuts'
      | 'cuttingStyles'
      | 'origins'
      | 'treatments'
      | 'labs'
      | 'metals'
      | 'availabilities'
      | 'caratBuckets',
    value: string,
  ) => {
    setPage(1);
    setState((prev) => ({ ...prev, [key]: toggleValue(prev[key], value) }));
  };

  const filters = (
    <aside className={`lx-filters${open ? ' is-open' : ''}`} aria-label="Collection filters">
      <div className="lx-filters__head">
        <h2>Filter</h2>
        <button type="button" className="lx-text-btn" onClick={() => { setPage(1); setState(emptyFilterState(facets)); }}>
          Clear
        </button>
      </div>

      {facets.shapes.length > 0 ? (
        <FilterSection title="Shape" defaultOpen>
          <FacetChecks kind="shape" values={facets.shapes} selected={state.shapes} onToggle={(v) => toggle('shapes', v)} />
        </FilterSection>
      ) : null}

      <FilterSection title="Carat" defaultOpen>
        <ul className="lx-filter__list">
          {CARAT_BUCKETS.map((bucket) => {
            const count = facets.caratBuckets.find((row) => row.value === bucket.id)?.count ?? 0;
            if (count === 0) return null;
            return (
              <li key={bucket.id}>
                <label className={state.caratBuckets.includes(bucket.id) ? 'is-on' : ''}>
                  <input
                    type="checkbox"
                    checked={state.caratBuckets.includes(bucket.id)}
                    onChange={() => toggle('caratBuckets', bucket.id)}
                  />
                  <span>{bucket.label}</span>
                  <em>{count}</em>
                </label>
              </li>
            );
          })}
        </ul>
        <RangePair
          min={facets.carat.min}
          max={facets.carat.max}
          lo={state.minCarat}
          hi={state.maxCarat}
          step={0.1}
          loLabel="Minimum carat"
          hiLabel="Maximum carat"
          format={(n) => `${n.toFixed(1)} ct`}
          onLo={(n) => patch({ minCarat: n })}
          onHi={(n) => patch({ maxCarat: n })}
        />
      </FilterSection>

      {facets.length.max > facets.length.min ? (
        <FilterSection title="Length (mm)">
          <RangePair
            min={facets.length.min}
            max={facets.length.max}
            lo={state.minLength}
            hi={state.maxLength}
            step={0.1}
            loLabel="Minimum length"
            hiLabel="Maximum length"
            format={(n) => `${n.toFixed(1)} mm`}
            onLo={(n) => patch({ minLength: n })}
            onHi={(n) => patch({ maxLength: n })}
          />
        </FilterSection>
      ) : null}

      {facets.width.max > facets.width.min ? (
        <FilterSection title="Width (mm)">
          <RangePair
            min={facets.width.min}
            max={facets.width.max}
            lo={state.minWidth}
            hi={state.maxWidth}
            step={0.1}
            loLabel="Minimum width"
            hiLabel="Maximum width"
            format={(n) => `${n.toFixed(1)} mm`}
            onLo={(n) => patch({ minWidth: n })}
            onHi={(n) => patch({ maxWidth: n })}
          />
        </FilterSection>
      ) : null}

      {facets.colours.length > 0 ? (
        <FilterSection title="Colour" defaultOpen>
          <FacetChecks kind="swatch" values={facets.colours} selected={state.colours} onToggle={(v) => toggle('colours', v)} />
        </FilterSection>
      ) : null}

      <FacetChecksSection title="Intensity" values={facets.intensities} selected={state.intensities} onToggle={(v) => toggle('intensities', v)} />
      <FacetChecksSection title="Clarity" values={facets.clarities} selected={state.clarities} onToggle={(v) => toggle('clarities', v)} />
      <FacetChecksSection title="Cut" values={facets.cuts} selected={state.cuts} onToggle={(v) => toggle('cuts', v)} />
      <FacetChecksSection title="Cutting style" values={facets.cuttingStyles} selected={state.cuttingStyles} onToggle={(v) => toggle('cuttingStyles', v)} />
      <FacetChecksSection title="Treatment" values={facets.treatments} selected={state.treatments} onToggle={(v) => toggle('treatments', v)} />
      <FacetChecksSection title="Origin" values={facets.origins} selected={state.origins} onToggle={(v) => toggle('origins', v)} />
      <FacetChecksSection title="Lab" values={facets.labs} selected={state.labs} onToggle={(v) => toggle('labs', v)} />
      <FacetChecksSection title="Metal" values={facets.metals} selected={state.metals} onToggle={(v) => toggle('metals', v)} />
      <FacetChecksSection title="Availability" values={facets.availabilities} selected={state.availabilities} onToggle={(v) => toggle('availabilities', v)} />

      <FilterSection title="Price (USD)" defaultOpen>
        <RangePair
          min={facets.price.min}
          max={facets.price.max}
          lo={state.minPrice}
          hi={state.maxPrice}
          step={50}
          loLabel="Minimum price"
          hiLabel="Maximum price"
          format={(n) => n.toLocaleString('en-US')}
          onLo={(n) => patch({ minPrice: n })}
          onHi={(n) => patch({ maxPrice: n })}
        />
      </FilterSection>
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
              <select aria-label="Sort" value={state.sort} onChange={(e) => patch({ sort: e.target.value as CatalogSort })}>
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

function FacetChecksSection({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (values.length === 0) return null;
  return (
    <FilterSection title={title}>
      <FacetChecks values={values} selected={selected} onToggle={onToggle} />
    </FilterSection>
  );
}
