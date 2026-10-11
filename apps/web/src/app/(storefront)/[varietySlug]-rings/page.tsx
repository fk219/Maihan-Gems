/**
 * apps/web/src/app/(storefront)/[varietySlug]-rings/page.tsx
 *
 * `/tsavorite-garnet-rings` — ready-made variety rings listing (Task 3,
 * target of the 99 observed /{variety}-rings routes). Filtered through the
 * Phase 3 port's kind/jewelleryType filters; the ready-made detail route
 * ([varietySlug]-rings/[productSlug]) renders the same canonical product
 * view as /products/[slug].
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
  return { title: `${varietySlug.replace(/-/g, ' ')} rings | Maihan Gems` };
}

export default async function VarietyRingsIndexPage({ params, searchParams }: PageProps) {
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
      filters: { variety: [varietySlug], kind: ['READY_MADE'], jewelleryType: ['RING'] },
    })
  ).value;
  const items = productItems(result);

  return (
    <main className="page variety-rings-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: variety.display_name, href: `/${varietySlug}` },
          { label: 'Rings' },
        ]}
      />
      <span className="page-eyebrow">Ready-Made Fine Jewellery</span>
      <h1>{variety.display_name} Rings</h1>
      <p className="page-subtitle">
        Completed fine rings combining untreated natural {variety.display_name.toLowerCase()} gems with master goldsmith mountings.
      </p>
      <p className="result-count">
        {items.length === 0 ? 'No ready-made rings currently listed.' : `${items.length} ring${items.length === 1 ? '' : 's'} listed`}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title={`No ready-made ${variety.display_name} rings are currently listed.`}
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
        basePath={listingBasePath(`/${varietySlug}-rings`, urlParams)}
        previousCursor={null}
        nextCursor={result.meta.next_cursor}
        hasNext={result.meta.has_more}
      />
    </main>
  );
}
