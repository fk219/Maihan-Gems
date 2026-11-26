/**
 * apps/web/src/app/(storefront)/search/page.tsx
 *
 * `/search` — hybrid search with facets, business ranking, and degradation (Phase 5).
 *
 * Authority & Architecture:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3, §14
 *   - technical_design/08_FRONTEND_ARCHITECTURE.md (Search form & facets)
 *   - technical_design/12_SEARCH_ARCHITECTURE.md (Hybrid search pipeline)
 *
 * Design: one editorial masthead, one hairline filter column, one unboxed
 * result grid. The previous page set white text on the ivory document (a
 * contrast failure) and surfaced internal ranker labels ("STRUCTURED_ONLY",
 * "PRODUCT_SEARCH") as if they were customer-facing facts. Those labels are
 * removed; only the honest degraded-mode notice remains.
 *
 * Invariants:
 *   - INV-01, INV-02, INV-03, INV-07, INV-08 honoured.
 *   - Zero LLM on the synchronous search path.
 *   - Treated stone neutrality (never demoted).
 *   - Server-rendered, cacheable, zero client-island overhead for search results.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { catalogServer } from '../../../lib/catalog-server.js';
import {
  parseSearchParamsToSearchQuery,
  extractActiveFilterChips,
  searchPaginationBasePath,
  buildSearchHref,
  type RawSearchParams,
} from '../../../lib/search-view.js';
import { SearchFilterPanel } from '../../../components/filters/SearchFilterPanel.js';
import { ProductCard } from '../../../components/catalog/ProductCard.js';
import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';
import { Pagination } from '../../../components/design-system/Pagination.js';

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  readonly searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp['q'] === 'string' ? sp['q'].trim() : '';
  return {
    title: q.length > 0 ? `Search: "${q}" | Maihan Gems` : 'Search gemstones & fine settings | Maihan Gems',
    description:
      'Search natural gemstones and fine settings by variety, colour, shape, treatment and origin. Every record shows its evidence status.',
  };
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price', label: 'Price' },
  { value: 'weight', label: 'Carat weight' },
] as const;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const query = parseSearchParamsToSearchQuery(sp);
  const service = catalogServer();

  const searchResult = (await service.search(query)).value;
  const { items, facets, rejected_filters, meta } = searchResult;
  const activeChips = extractActiveFilterChips(sp);
  const resultCount = meta.candidate_count ?? items.length;

  return (
    <main className="search-page mh-page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Search' },
        ]}
      />

      <EditorialMasthead
        eyebrow="The catalogue"
        title="Search the collection"
        lead="Search by variety, colour, cut, treatment or origin. Filters are ordinary links: the URL is the state, so every result set can be shared and revisited."
      />

      <form action="/search" method="GET" className="mh-search-form" role="search">
        <label className="visually-hidden" htmlFor="mh-search-q">
          Search gemstones and jewellery catalogue
        </label>
        <input
          id="mh-search-q"
          type="search"
          name="q"
          defaultValue={query.query}
          placeholder="Variety, colour, shape, origin, or reference…"
          className="mh-search-form__input"
        />
        {/* Preserve active filters in form submission if present */}
        {Array.isArray(query.filters.variety) &&
          query.filters.variety.map((v) => <input key={v} type="hidden" name="variety" value={v} />)}
        {Array.isArray(query.filters.color) &&
          query.filters.color.map((c) => <input key={c} type="hidden" name="color" value={c} />)}
        {Array.isArray(query.filters.shape) &&
          query.filters.shape.map((s) => <input key={s} type="hidden" name="shape" value={s} />)}
        {query.sort !== 'relevance' && <input type="hidden" name="sort" value={query.sort} />}
        <button type="submit" className="mh-cta mh-search-form__submit">
          Search
        </button>
      </form>

      {activeChips.length > 0 && (
        <div className="mh-chips" aria-label="Active filters">
          <span className="mh-chips__label">Active filters</span>
          {activeChips.map((chip) => (
            <Link
              key={`${chip.key}-${chip.value}`}
              href={chip.removeHref}
              className="mh-chip"
              title={`Remove ${chip.label}`}
            >
              <span>{chip.label}</span>
              <span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link href="/search" className="mh-chips__clear">
            Clear all
          </Link>
        </div>
      )}

      <div className="mh-search__layout">
        <SearchFilterPanel facets={facets} searchParams={sp} />

        <section className="mh-search__results" aria-label="Search results">
          <div className="mh-search__meta">
            <p className="mh-search__count">
              <span className="tabular">{resultCount}</span>{' '}
              {resultCount === 1 ? 'item' : 'items'}
              {query.query.length > 0 && (
                <>
                  {' '}for <em>“{query.query}”</em>
                </>
              )}
            </p>

            <nav className="mh-sort" aria-label="Sort results">
              <span className="mh-sort__label">Sort</span>
              {SORT_OPTIONS.map((option) => (
                <Link
                  key={option.value}
                  href={buildSearchHref(sp, 'sort', option.value)}
                  className="mh-sort__link"
                  aria-current={query.sort === option.value ? 'true' : undefined}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>

          {meta.degraded && (
            <div className="mh-notice" role="status">
              <strong>Search notice.</strong> Semantic ranking is unavailable right now, so results
              are ordered by text match and the filters you selected. Nothing has been hidden.
            </div>
          )}

          {rejected_filters.length > 0 && (
            <div className="mh-notice mh-notice--muted" role="status">
              <strong>Filter notice.</strong> These values were not recognised and were ignored:{' '}
              {rejected_filters.map((rf) => `${rf.filter}: “${rf.value}”`).join(', ')}.
            </div>
          )}

          {items.length === 0 ? (
            <EmptyState
              title={
                query.query.length > 0
                  ? `No items found matching "${query.query}"`
                  : 'No items currently match the selected filters.'
              }
              action={
                <Link href="/search" className="mh-cta">
                  Clear all filters
                </Link>
              }
            >
              Try a broader term, remove a facet, or browse the variety directory.
            </EmptyState>
          ) : (
            <>
              <ul className="product-grid">
                {items.map((product) => (
                  <li key={product.slug}>
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>

              <Pagination
                basePath={searchPaginationBasePath(sp)}
                previousCursor={null}
                nextCursor={meta.next_cursor}
                hasNext={meta.has_more}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
