/**
 * apps/web/src/app/(storefront)/settings/[settingSku]/page.tsx
 *
 * `/gemstone-ring-settings/<slug>` -> `/settings/{sku}` — setting variant or
 * design core detail. SoT 12.2 `settings/[sku]/page.tsx`.
 *
 * Segment name `settingSku` (not `slug`) — the identifier here is a setting
 * variant SKU, a DIFFERENT keyed entity from the product slug used by
 * /products/[productSlug]; folding both into a generic `slug` branch weakened
 * the distinction the SoT's own route map draws (products vs settings).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';

interface PageProps {
  params: Promise<{ settingSku: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { settingSku } = await params;
  return {
    title: `Setting ${settingSku} | Maihan Gems Atelier`,
    description: `Master goldsmith mounting ${settingSku} in 18K gold and platinum. Handcrafted for natural earth-mined gemstones.`,
  };
}

export default async function SettingDetailPage({ params }: PageProps) {
  const { settingSku } = await params;

  return (
    <main className="page setting-detail-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: settingSku },
        ]}
      />

      <div className="product-detail__layout">
        <section className="product-detail__summary">
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
            Bespoke Atelier Mounting
          </span>
          <h1>Setting Reference {settingSku}</h1>
          <p className="product-detail__subtitle">
            Master goldsmith mounting engineered for structural longevity, maximum optical scintillation,
            and secure gemstone prong placement. Hand-finished in our high-jewellery atelier.
          </p>

          <div style={{ margin: '2rem 0' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)' }}>
              Available Noble Metals
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['18K Yellow Gold', '18K White Gold', '18K Rose Gold', '950 Platinum'].map((metal) => (
                <li
                  key={metal}
                  style={{
                    background: '#FAFAF8',
                    border: '1px solid rgba(201, 168, 76, 0.25)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}
                >
                  {metal}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
            <Link href="/design-your-own" className="btn-primary">
              Customise in Atelier
            </Link>
            <Link href="/settings" className="btn-secondary">
              Browse All Mountings
            </Link>
          </div>
        </section>

        <section className="product-detail__specs">
          <h2>Mounting Specifications</h2>
          <table className="cart-items-table" style={{ marginTop: '1rem' }}>
            <tbody>
              <tr>
                <th style={{ width: '40%' }}>Design Reference</th>
                <td className="font-mono">{settingSku}</td>
              </tr>
              <tr>
                <th>Jewellery Class</th>
                <td>Fine Ring / Solitaire Mounting</td>
              </tr>
              <tr>
                <th>Prong Alloy</th>
                <td>Cold-drawn high-tensile wire</td>
              </tr>
              <tr>
                <th>Finish</th>
                <td>Haute Joaillerie Mirror Polish</td>
              </tr>
              <tr>
                <th>Compatibility</th>
                <td>Cushion, Oval, Round, Emerald Cut loose stones</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
