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

function getSettingImage(jewelleryType: string, styleLabel: string | null): string {
  if (jewelleryType.toUpperCase() === 'EARRINGS') {
    return '/assets/settings/stud_earrings.svg';
  }
  const s = (styleLabel ?? '').toLowerCase();
  if (s.includes('halo')) {
    return '/assets/settings/halo_ring.svg';
  }
  if (s.includes('three') || s.includes('trilogy') || s.includes('side')) {
    return '/assets/settings/three_stone_ring.svg';
  }
  return '/assets/settings/solitaire_ring.svg';
}

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
      <span className="page-eyebrow">Master Goldsmith Mountings</span>
      <h1>Gemstone Settings</h1>
      <p className="page-subtitle">
        Precision hand-crafted fine jewellery mountings in 18K gold and platinum.
        Engineered with exact millimeter tolerances for natural certified gemstones.
      </p>
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
              <article className="card settings-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '16/10',
                    background: '#FAFAF8',
                    borderRadius: 'calc(var(--radius) - 4px)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <img
                    src={getSettingImage(setting.jewellery_type, setting.style?.label ?? null)}
                    alt={setting.name}
                    loading="lazy"
                    style={{
                      maxWidth: '85%',
                      maxHeight: '85%',
                      objectFit: 'contain',
                      transition: 'transform 0.4s ease',
                    }}
                  />
                  <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(201, 168, 76, 0.3)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--color-gold-dark)',
                      }}
                    >
                      {setting.jewellery_type.toLowerCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      color: '#8a867e',
                      background: 'rgba(255, 255, 255, 0.85)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                    }}
                  >
                    {setting.design_code}
                  </div>
                </div>

                <div>
                  <h2 className="settings-card__title">{setting.name}</h2>
                  <p className="settings-card__meta">
                    {setting.jewellery_type.toLowerCase()}
                    {setting.style !== null && <> · {setting.style.label}</>}
                    {' · '}
                    <span className="font-mono tabular-nums">
                      {setting.variant_count} metal option{setting.variant_count === 1 ? '' : 's'}
                    </span>
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Link
                    href={`/settings/${setting.design_code}`}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#4a4740',
                      textDecoration: 'none',
                    }}
                  >
                    Details →
                  </Link>
                  <Link href="/design-your-own" className="settings-card__action">
                    Configure in Atelier <span aria-hidden="true">→</span>
                  </Link>
                </div>
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
