/**
 * apps/web/src/app/(storefront)/settings/page.tsx
 *
 * `/settings` — the setting-design catalogue (target of the observed
 * /gemstone-ring-settings and /gemstone-bracelet-settings routes). Driven by
 * the Phase 3 `listSettings` contract (design summaries + keyset pagination).
 *
 * Design: the same unboxed LightPlate slot as ProductCard, because a design
 * record has no photograph either. The previous category SVG was a generic
 * drawing of a ring, not this design, so presenting it as the product image
 * would have been a quiet fabrication. A caption states the truth instead.
 *
 * No invented fields, no claims about metal purity or certification that the
 * record does not carry, no per-design page source.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { catalogServer } from '../../../lib/catalog-server.js';
import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';
import { LightPlate } from '../../../components/design-system/LightPlate.js';
import { Pagination } from '../../../components/design-system/Pagination.js';

// Route segment config. Catalog views render per request from the cached
// CatalogQueryService (doc 12.3: server-rendered, cacheable, no per-user
// state); there is deliberately no build-time catalogue, so Next must not
// prerender this route (it would otherwise invoke the page with empty params
// during `next build`). Runtime caching stays in the service, not in Next.
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ cursor?: string; limit?: string }>;
}

export const metadata: Metadata = {
  title: 'Gemstone settings | Maihan Gems',
};

export default async function SettingsIndexPage({ searchParams }: PageProps) {
  const { cursor, limit } = await searchParams;
  const limitRaw = Number(limit);
  const service = catalogServer();

  const result = (
    await service.listSettings({
      limit: Number.isInteger(limitRaw) && limitRaw >= 1 && limitRaw <= 100 ? limitRaw : 24,
      ...(cursor !== undefined && cursor !== '' ? { cursor } : {}),
    })
  ).value;

  const designCount = result.items.length;

  return (
    <main className="page settings-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Settings' },
        ]}
      />

      <EditorialMasthead
        eyebrow="Atelier mountings"
        title="Gemstone Settings"
        lead="Mounting designs recorded with their metal options. A design lists only the variants, prices and evidence its record actually carries."
        meta={
          designCount === 0 ? (
            <>No designs currently listed</>
          ) : (
            <>
              <span className="tabular">{designCount}</span>{' '}
              {designCount === 1 ? 'design' : 'designs'} shown
            </>
          )
        }
      />

      {designCount === 0 ? (
        <EmptyState
          title="No settings are currently listed."
          action={<Link href="/">Browse gemstones</Link>}
        >
          The atelier catalogue is published as designs are documented.
        </EmptyState>
      ) : (
        <ul className="mh-card-grid mh-card-grid--settings">
          {result.items.map((setting) => {
            return (
              <li key={setting.design_code}>
                <article className="mh-card">
                  <div className="mh-card__status">
                    <span className="mh-card__kind">{setting.jewellery_type.toLowerCase()}</span>
                    <span className="mh-card__ref tabular">{setting.design_code}</span>
                  </div>

                  <a
                    className="mh-card__link"
                    href={`/settings/${setting.design_code}`}
                  >
                    <LightPlate caption="No photograph on file" />

                    <div className="mh-card__body">
                      <h2 className="mh-card__title">{setting.name}</h2>

                      <p className="mh-card__meta">
                        {setting.style !== null && (
                          <>
                            <span>{setting.style.label}</span>
                            <span aria-hidden="true"> · </span>
                          </>
                        )}
                        <span className="tabular">
                          {setting.variant_count} metal option{setting.variant_count === 1 ? '' : 's'}
                        </span>
                      </p>

                      <div className="mh-card__foot">
                        <span className="mh-card__cue">
                          View design <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </div>
                  </a>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        basePath="/settings"
        previousCursor={null}
        nextCursor={result.meta.next_cursor}
        hasNext={result.meta.has_more}
      />
    </main>
  );
}
