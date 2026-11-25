/**
 * apps/web/src/app/(storefront)/colour/[colourSlug]/page.tsx
 *
 * `/padparadscha-gemstones` — colour-family listing (Task 3, target of the
 * 60 observed /{colour}-gemstones 301s). Same data-driven shape as the
 * variety page: one dynamic route, taxonomy decides existence, the colour
 * filter rides the Phase 3 port.
 *
 * The breadcrumb's middle crumb is deliberately not a link: there is no
 * /colour index route in the route map, and a link to a 404 is worse than a
 * plain label.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { catalogServer } from '../../../../lib/catalog-server.js';
import { listingBasePath, listingQuery, productItems, type ListingParams } from '../../../../lib/catalog-view.js';
import { ProductCard } from '../../../../components/catalog/ProductCard.js';
import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';
import { EmptyState } from '../../../../components/design-system/EmptyState.js';
import { Pagination } from '../../../../components/design-system/Pagination.js';

// Route segment config. Catalog views render per request from the cached
// CatalogQueryService (doc 12.3: Server-rendered, cacheable, no per-user
// state); there is deliberately no build-time catalogue, so Next must not
// prerender this route (it would otherwise invoke the page with empty params
// during `next build`). Runtime caching stays in the service, not in Next.
export const dynamic = 'force-dynamic';

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
    <main className="page colour-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Colour' },
          { label: colour.name },
        ]}
      />

      <EditorialMasthead
        eyebrow="Colour family"
        title={`${colour.name} Gemstones`}
        lead={`Stones recorded in the ${colour.name.toLowerCase()} colour family. The catalogue does not promise a hue, tone or saturation beyond the fields each record carries.`}
        meta={
          items.length === 0 ? (
            <>No stones currently listed</>
          ) : (
            <>
              <span className="tabular">{items.length}</span>{' '}
              {items.length === 1 ? 'stone' : 'stones'} on this page
            </>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title={`No ${colour.name.toLowerCase()} gemstones are currently listed.`}
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
        basePath={listingBasePath(`/colour/${colourSlug}`, urlParams)}
        previousCursor={null}
        nextCursor={result.meta.next_cursor}
        hasNext={result.meta.has_more}
      />
    </main>
  );
}
