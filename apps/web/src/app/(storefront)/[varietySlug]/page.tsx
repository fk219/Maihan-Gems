/**
 * apps/web/src/app/(storefront)/[varietySlug]/page.tsx
 *
 * `/tsavorite-garnet` — variety landing for loose stones (Task 3).
 *
 * Data-driven: the slug is validated against the taxonomy the Phase 3 port
 * serves; products are fetched through the cached CatalogQueryService with
 * the variety filter. NO per-variety page exists — this ONE dynamic route
 * renders every variety (SoT 12.1 rule 1, doc 08 catalogue rule).
 *
 * 404 semantics: a slug that is not an ACTIVE variety in the taxonomy is a
 * not-found (notFound()), not an empty list — the variety must exist.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { catalogServer } from '../../../lib/catalog-server.js';
import { listingBasePath, listingQuery, productItems, type ListingParams } from '../../../lib/catalog-view.js';
import { ProductCard } from '../../../components/catalog/ProductCard.js';
import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';
import { Pagination } from '../../../components/design-system/Pagination.js';

// Route segment config. Catalog views render per request from the cached
// CatalogQueryService (doc 12.3: Server-rendered, cacheable, no per-user
// state); there is deliberately no build-time catalogue, so Next must not
// prerender this route (it would otherwise invoke the page with empty params
// during `next build`). Runtime caching stays in the service, not in Next.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug: string }>;
  searchParams: Promise<ListingParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { varietySlug } = await params;
  return { title: `${varietySlug.replace(/-/g, ' ')} gemstones | Maihan Gems` };
}

export default async function VarietyIndexPage({ params, searchParams }: PageProps) {
  const { varietySlug } = await params;
  const query = listingQuery(await searchParams);
  const service = catalogServer();

  // Taxonomy decides existence (doc 12: filters validate against a whitelist
  // derived from the taxonomy tables).
  const taxonomy = (await service.getTaxonomy()).value;
  const variety = taxonomy.varieties.find((v) => v.slug === varietySlug);
  if (variety === undefined || variety.state !== 'ACTIVE') notFound();

  const result = (await service.listProducts({ ...query, filters: { variety: [varietySlug] } })).value;
  const items = productItems(result);

  return (
    <main className="page variety-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Varieties', href: '/varieties' },
          { label: variety.display_name },
        ]}
      />
      <h1>{variety.display_name}</h1>
      <p className="result-count">
        {items.length === 0 ? 'No gemstones currently listed.' : `${items.length} gemstone${items.length === 1 ? '' : 's'} listed`}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title={`No ${variety.display_name} gemstones are currently listed.`}
          action={<Link href="/">Browse all gemstones</Link>}
        >
          The catalogue is updated as stones are graded and photographed.
        </EmptyState>
      ) : (
        <ul className="product-grid">
          {items.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product.summary} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath={listingBasePath(`/${varietySlug}`, await searchParams)}
        previousCursor={null}
        nextCursor={result.meta.next_cursor}
        hasNext={result.meta.has_more}
      />
    </main>
  );
}
