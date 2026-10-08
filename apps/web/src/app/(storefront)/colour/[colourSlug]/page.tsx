/**
 * apps/web/src/app/(storefront)/colour/[colourSlug]/page.tsx
 *
 * `/padparadscha-gemstones` — colour-family listing (Task 3, target of the
 * 60 observed /{colour}-gemstones 301s). Same data-driven shape as the
 * variety page: one dynamic route, taxonomy decides existence, the colour
 * filter rides the Phase 3 port.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { catalogServer } from '../../../../lib/catalog-server.js';
import { listingBasePath, listingQuery, productItems, type ListingParams } from '../../../../lib/catalog-view.js';
import { ProductCard } from '../../../../components/catalog/ProductCard.js';
import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EmptyState } from '../../../../components/design-system/EmptyState.js';
import { Pagination } from '../../../../components/design-system/Pagination.js';

interface PageProps {
  params: Promise<{ colourSlug: string }>;
  searchParams: Promise<ListingParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { colourSlug } = await params;
  return { title: `${colourSlug.replace(/-/g, ' ')} gemstones | Maihan Gems` };
}

export default async function ColourIndexPage({ params, searchParams }: PageProps) {
  const { colourSlug } = await params;
  const urlParams = await searchParams;
  const query = listingQuery(urlParams);
  const service = catalogServer();

  const taxonomy = (await service.getTaxonomy()).value;
  const colour = taxonomy.colours.find((c) => c.slug === colourSlug);
  if (colour === undefined || colour.state !== 'ACTIVE') notFound();

  const result = (await service.listProducts({ ...query, filters: { color: [colourSlug] } })).value;
  const items = productItems(result);

  return (
    <main className="page colour-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Colour', href: '/colour' },
          { label: colour.name },
        ]}
      />
      <h1>{colour.name} Gemstones</h1>
      <p className="result-count">
        {items.length === 0 ? 'No gemstones currently listed.' : `${items.length} gemstone${items.length === 1 ? '' : 's'} listed`}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title={`No ${colour.name.toLowerCase()} gemstones are currently listed.`}
          action={<Link href="/">Browse all gemstones</Link>}
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
        basePath={listingBasePath(`/colour/${colourSlug}`, urlParams)}
        previousCursor={null}
        nextCursor={result.meta.next_cursor}
        hasNext={result.meta.has_more}
      />
    </main>
  );
}
