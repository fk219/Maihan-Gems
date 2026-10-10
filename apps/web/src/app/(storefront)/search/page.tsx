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
 *   - Design.md (Swiss Private Banking precision combined with modern Dubai luxury)
 *
 * Invariants:
 *   - INV-01, INV-02, INV-03, INV-07, INV-08 honoured.
 *   - Zero LLM on synchronous search path.
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
import { EmptyState } from '../../../components/design-system/EmptyState.js';
import { Pagination } from '../../../components/design-system/Pagination.js';
import { Badge } from '../../../components/design-system/Badge.js';

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  readonly searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp['q'] === 'string' ? sp['q'].trim() : '';
  return {
    title: q.length > 0 ? `Search: "${q}" | Maihan Gems` : 'Search gemstones & fine settings | Maihan Gems',
    description: 'Explore certified natural untreated gemstones and fine settings with hybrid search and faceted filtering.',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const query = parseSearchParamsToSearchQuery(sp);
  const service = catalogServer();

  const searchResult = (await service.search(query)).value;
  const { items, facets, rejected_filters, meta } = searchResult;
  const activeChips = extractActiveFilterChips(sp);

  return (
    <main className="search-page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Search' },
        ]}
      />

      <div className="search-header" style={{ marginBottom: '2rem' }}>
        <span className="section-eyebrow">Mineralogical Discovery &amp; Intelligent Search</span>
        <h1 className="section-title text-gold-gradient" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
          Search Catalogue
        </h1>

        {/* Search Input Bar */}
        <form action="/search" method="GET" className="search-bar-form" role="search">
          <input
            type="search"
            name="q"
            defaultValue={query.query}
            placeholder="Search by variety, colour, shape, origin, or SKU..."
            className="search-input"
            aria-label="Search gemstones and jewellery catalogue"
          />
          {/* Preserve active filters in form submission if present */}
          {Array.isArray(query.filters.variety) &&
            query.filters.variety.map((v) => <input key={v} type="hidden" name="variety" value={v} />)}
          {Array.isArray(query.filters.color) &&
            query.filters.color.map((c) => <input key={c} type="hidden" name="color" value={c} />)}
          {Array.isArray(query.filters.shape) &&
            query.filters.shape.map((s) => <input key={s} type="hidden" name="shape" value={s} />)}
          {query.sort !== 'relevance' && <input type="hidden" name="sort" value={query.sort} />}
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="active-chips-bar" aria-label="Active filters">
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Active Filters:
            </span>
            {activeChips.map((chip) => (
              <Link
                key={`${chip.key}-${chip.value}`}
                href={chip.removeHref}
                className="active-chip"
                title={`Remove ${chip.label}`}
              >
                <span>{chip.label}</span>
                <span className="active-chip__remove" aria-hidden="true">
                  ×
                </span>
              </Link>
            ))}
            <Link href="/search" className="clear-all-link">
              Clear all
            </Link>
          </div>
        )}
      </div>

      {/* Main 2-Column Search Layout */}
      <div className="search-layout">
        {/* Left Column: Facet Panel */}
        <SearchFilterPanel facets={facets} searchParams={sp} />

        {/* Right Column: Search Results */}
        <div className="search-results-area">
          {/* Status & Observability Bar */}
          <div className="search-meta-bar">
            <div className="search-meta-stats">
              <span className="font-mono font-bold" style={{ color: '#ffffff' }}>
                {meta.candidate_count ?? items.length}
              </span>
              <span>item{items.length === 1 ? '' : 's'} found</span>
              {query.query.length > 0 && (
                <span>
                  for &ldquo;<strong style={{ color: 'var(--color-gold-light)' }}>{query.query}</strong>&rdquo;
                </span>
              )}
            </div>

            <div className="search-meta-badges">
              <Badge tone="neutral">{meta.strategy}</Badge>
              <Badge tone="neutral">{meta.intent}</Badge>
              {meta.degraded && (
                <Badge tone="warning" live>
                  Degraded Mode
                </Badge>
              )}
            </div>
          </div>

          {/* Sort Selector Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Sort By:</span>
            <Link
              href={buildSearchHref(sp, 'sort', 'relevance')}
              style={{
                color: query.sort === 'relevance' ? 'var(--color-gold)' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: query.sort === 'relevance' ? 700 : 400,
                textDecoration: 'none',
                padding: '0.2rem 0.5rem',
              }}
            >
              Relevance
            </Link>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
            <Link
              href={buildSearchHref(sp, 'sort', 'price')}
              style={{
                color: query.sort === 'price' ? 'var(--color-gold)' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: query.sort === 'price' ? 700 : 400,
                textDecoration: 'none',
                padding: '0.2rem 0.5rem',
              }}
            >
              Price
            </Link>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
            <Link
              href={buildSearchHref(sp, 'sort', 'weight')}
              style={{
                color: query.sort === 'weight' ? 'var(--color-gold)' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: query.sort === 'weight' ? 700 : 400,
                textDecoration: 'none',
                padding: '0.2rem 0.5rem',
              }}
            >
              Carat Weight
            </Link>
          </div>

          {/* Degraded Search Warning */}
          {meta.degraded && (
            <div
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.8125rem',
                color: '#fbbf24',
              }}
              role="status"
            >
              <strong>Notice:</strong> Semantic vector ranking is currently operating in degraded mode
              ({meta.degradation_reason ?? 'Service fallback'}). Deterministic structured filtering and full-text search remain active.
            </div>
          )}

          {/* Rejected Filters Notification */}
          {rejected_filters.length > 0 && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(201, 168, 76, 0.2)',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.8125rem',
                color: 'rgba(255, 255, 255, 0.75)',
              }}
              role="status"
            >
              <strong>Filter Notice:</strong> The following unrecognized filter parameters were disregarded:
              {' '}
              {rejected_filters.map((rf) => `${rf.filter}: "${rf.value}"`).join(', ')}.
            </div>
          )}

          {/* Product Items or Empty State */}
          {items.length === 0 ? (
            <EmptyState
              title={
                query.query.length > 0
                  ? `No items found matching "${query.query}"`
                  : 'No items currently match the selected filters.'
              }
              action={
                <Link href="/search" className="btn-primary">
                  Clear All Filters
                </Link>
              }
            >
              Try expanding your search query, selecting different colour or variety facets, or browsing
              the general catalogue collections.
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
        </div>
      </div>
    </main>
  );
}
