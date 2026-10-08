/**
 * apps/web/src/app/(storefront)/[varietySlug]-pairs/page.tsx
 *
 * `/tsavorite-garnet-pairs` — matched-pair variety listing (Task 3). Same
 * ONE-dynamic-route shape as the variety page, filtered to STONE_PAIR via
 * the Phase 3 port's `kind` filter. No per-variety page exists.
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

interface PageProps {
  params: Promise<{ varietySlug: string }>;
  searchParams: Promise<ListingParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { varietySlug } = await params;
  return { title: `${varietySlug.replace(/-/g, ' ')} pairs | Maihan Gems` };
}

export default async function VarietyPairsIndexPage({ params, searchParams }: PageProps) {
  const { varietySlug } = await params;
  const urlParams = await searchParams;
  const query = listingQuery(urlParams);
  const service = catalogServer();

  const taxonomy = (await service.getTaxonomy()).value;
  const variety = taxonomy.varieties.find((v) => v.slug === varietySlug);
  if (variety === undefined || variety.state !== 'ACTIVE') notFound();

  const result = (
    await service.listProducts({
      ...query,
      filters: { variety: [varietySlug], kind: ['STONE_PAIR'] },
    })
  ).value;
  const items = productItems(result);

  return (
    <main className="page variety-pairs-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: variety.display_name, href: `/${varietySlug}` },
          { label: 'Pairs' },
        ]}
      />
      <h1>{variety.display_name} Pairs</h1>
      <p className="result-count">
        {items.length === 0 ? 'No pairs currently listed.' : `${items.length} pair${items.length === 1 ? '' : 's'} listed`}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title={`No ${variety.display_name} pairs are currently listed.`}
          action={<Link href={`/${varietySlug}`}>Browse all {variety.display_name}</Link>}
        />
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
        basePath={listingBasePath(`/${varietySlug}-pairs`, urlParams)}
        previousCursor={null}
        nextCursor={result.meta.next_cursor}
        hasNext={result.meta.has_more}
      />
    </main>
  );
}
