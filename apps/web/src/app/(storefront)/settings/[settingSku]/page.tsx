import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { Badge } from '../../../../components/design-system/Badge.js';
import { getFreshSettingBySkuOrSlug } from '@/lib/mgh/adapters/catalog';

interface PageProps {
  params: Promise<{ settingSku: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { settingSku } = await params;
  return { title: `Setting ${decodeURIComponent(settingSku)} | Maihan Gems` };
}

export default async function SettingDetailPage({ params }: PageProps) {
  const { settingSku } = await params;
  const setting = await getFreshSettingBySkuOrSlug(decodeURIComponent(settingSku));
  if (!setting) notFound();

  const price = setting.metals.length
    ? setting.metals.reduce((min, m) => Math.min(min, setting.basePrice + m.priceDelta), setting.basePrice + (setting.metals[0]?.priceDelta ?? 0))
    : setting.basePrice;

  return (
    <main className="page setting-detail-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: setting.name },
        ]}
      />
      <span className="page-eyebrow">Geneva Atelier Setting</span>
      <h1>{setting.name}</h1>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0 1.5rem' }}>
        <Badge tone="neutral">{setting.category.toUpperCase()}</Badge>
        {setting.style ? <Badge tone="neutral">{setting.style}</Badge> : null}
        <Badge tone="neutral">{setting.sku}</Badge>
      </div>
      <p className="page-subtitle">
        {setting.description || 'Precious-metal mounting crafted for a centre gemstone.'}
      </p>

      <section style={{ margin: '1.5rem 0', display: 'grid', gap: '0.75rem' }}>
        <div className="setting-fact">
          <span className="eyebrow">From</span>
          <strong style={{ fontSize: '1.35rem' }}>
            {price > 0 ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'Price on request'}
          </strong>
          
        </div>
        <div className="setting-fact">
          <span className="eyebrow">Metals available</span>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {setting.metals.map((m) => (
              <li key={m.code} style={{ border: '1px solid #E5D4B3', borderRadius: 999, padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                {m.label}
                {m.priceDelta !== 0 ? <span style={{ color: '#76726A' }}> ({m.priceDelta > 0 ? '+' : ''}${m.priceDelta.toLocaleString('en-US')})</span> : null}
              </li>
            ))}
          </ul>
        </div>
        {setting.accepts?.filter((a) => a.minCarat != null || a.maxCarat != null).length ? (
          <div className="setting-fact">
            <span className="eyebrow">Centre stone range</span>
            <span>
              {setting.accepts
                .filter((a) => a.minCarat != null || a.maxCarat != null)
                .map((a) => `${a.minCarat ?? 0}-${a.maxCarat ?? 'infinity'} ct`)
                .join(', ')}
            </span>
          </div>
        ) : null}
        {setting.compatibleShapes.length ? (
          <div className="setting-fact">
            <span className="eyebrow">Compatible shapes</span>
            <span>{setting.compatibleShapes.map((s) => s.replace(/-/g, ' ')).join(', ')}</span>
          </div>
        ) : null}
        <div className="setting-fact">
          <span className="eyebrow">Mounting sizes</span>
          <span>{setting.sizes.join(', ')}</span>
        </div>
      </section>

      <p style={{ marginTop: '2rem' }}>
        <Link href="/design-your-own" className="variety-card__sublink">
          Design your own with this setting →
        </Link>
      </p>
    </main>
  );
}
