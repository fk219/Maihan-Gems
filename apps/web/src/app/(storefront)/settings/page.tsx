/**
 * apps/web/src/app/(storefront)/settings/page.tsx
 *
 * `/gemstone-rings` — settings catalog index (Task 3, target of the observed
 * /gemstone-ring-settings and /gemstone-bracelet-settings routes). Driven by
 * the Phase 3 `listSettings` contract (design summaries + keyset pagination);
 * no invented fields, no per-design pages.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { catalogServer } from '../../../lib/catalog-server.js';
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

  return (
    <main className="page settings-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Settings' },
        ]}
      />
      <h1>Gemstone Settings</h1>
      <p className="result-count">
        {result.items.length === 0
          ? 'No settings currently listed.'
          : `${result.items.length} setting design${result.items.length === 1 ? '' : 's'}`}
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          title="No settings are currently listed."
          action={<Link href="/">Browse gemstones</Link>}
        />
      ) : (
        <ul className="settings-grid">
          {result.items.map((setting) => (
            <li key={setting.design_code}>
              <article className="card settings-card">
                <h3 className="settings-card__title">{setting.name}</h3>
                <p className="settings-card__meta">
                  {setting.jewellery_type.toLowerCase()}
                  {setting.style !== null && <> · {setting.style.label}</>}
                  {' · '}
                  {setting.variant_count} metal option{setting.variant_count === 1 ? '' : 's'}
                </p>
              </article>
            </li>
          ))}
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
