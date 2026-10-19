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
 *
 * Data: a real lookup of the locked schema (settings + setting_variants +
 * metals + setting_styles + setting_compatibility_rules + the sellable
 * SETTING_ONLY product when one exists). Unknown SKU → honest 404. Fields the
 * catalogue does not evidence render as "Not evidenced" (INV-07) — nothing on
 * this page is invented.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { Badge } from '../../../../components/design-system/Badge.js';
import { createPool } from '@maihan/db';

interface PageProps {
  params: Promise<{ settingSku: string }>;
}

interface SettingVariantRow {
  sku: string;
  slug: string;
  design_code: string;
  setting_name: string;
  description: string | null;
  jewellery_type: string;
  style_code: string | null;
  style_label: string | null;
  metal_label: string | null;
  metal_colour: string | null;
  base_price: string | null;
  price_evidence: string;
  availability: boolean;
  production_days: number | null;
  is_vedic: boolean;
  side_stone_count: number;
  product_slug: string | null;
  accepted_shapes: string[] | null;
  source_url: string | null;
}

async function loadSettingVariant(sku: string): Promise<SettingVariantRow | null> {
  const pool = createPool(process.env['DATABASE_URL'] ?? '');
  try {
    const res = await pool.query<SettingVariantRow>(
      `SELECT
        sv.sku, sv.slug, s.design_code,
        s.name AS setting_name, s.description,
        s.jewellery_type::text AS jewellery_type,
        st.code AS style_code, st.label AS style_label,
        m.label AS metal_label, m.colour AS metal_colour,
        sv.base_price::text AS base_price, sv.price_evidence::text AS price_evidence,
        sv.availability, sv.production_days,
        s.is_vedic, s.side_stone_count,
        (SELECT p.slug FROM products p
          WHERE p.setting_variant_id = sv.id AND p.kind = 'SETTING_ONLY'
            AND p.state = 'ACTIVE' AND p.deleted_at IS NULL
          LIMIT 1) AS product_slug,
        (SELECT array_agg(DISTINCT r.shape::text)
          FROM setting_compatibility_rules r
          WHERE r.setting_id = s.id AND r.state = 'ACTIVE' AND r.rule_kind = 'ALLOW'
            AND r.shape IS NOT NULL) AS accepted_shapes,
        s.source_url
      FROM setting_variants sv
      JOIN settings s ON s.id = sv.setting_id
      LEFT JOIN setting_styles st ON st.id = s.style_id
      LEFT JOIN metals m ON m.code = sv.metal_code
      WHERE LOWER(sv.sku) = LOWER($1) AND sv.deleted_at IS NULL
      LIMIT 1`,
      [sku],
    );
    return res.rows[0] ?? null;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { settingSku } = await params;
  const row = await loadSettingVariant(settingSku);
  if (!row) return { title: 'Setting not found | Maihan Gems Atelier' };
  return {
    title: `${row.setting_name} · ${row.metal_label ?? 'Mounting'} (${row.sku}) | Maihan Gems Atelier`,
    description: row.description ?? `Master goldsmith mounting ${row.sku}.`,
  };
}

export default async function SettingDetailPage({ params }: PageProps) {
  const { settingSku } = await params;
  const row = await loadSettingVariant(settingSku);
  if (!row) notFound();

  const notEvidenced = <em style={{ opacity: 0.7 }}>Not evidenced</em>;
  const priceEvidenced = row.base_price !== null && row.price_evidence === 'OBSERVED';

  return (
    <main className="page setting-detail-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Settings', href: '/settings' },
          { label: row.sku },
        ]}
      />

      <div className="product-detail__layout">
        <section className="product-detail__summary">
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
            Bespoke Atelier Mounting
          </span>
          <h1>
            {row.setting_name} · {row.metal_label ?? 'Mounting'}
          </h1>
          <p className="product-detail__subtitle">{row.description ?? row.setting_name}</p>

          <div className="product-detail__badges">
            <Badge tone={row.availability ? 'positive' : 'neutral'} live>
              {row.availability ? 'Available' : 'Unavailable'}
            </Badge>
            <Badge tone={priceEvidenced ? 'neutral' : 'warning'} live>
              {priceEvidenced ? 'Source-verified price' : `Price evidence: ${row.price_evidence}`}
            </Badge>
          </div>

          {row.base_price !== null && (
            <p className="lx-pdp-price" style={{ fontVariantNumeric: 'tabular-nums' }}>
              from US$ {row.base_price}
            </p>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
            {row.product_slug ? (
              <Link href={`/products/${row.product_slug}`} className="btn-primary">
                View orderable setting
              </Link>
            ) : null}
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
                <th style={{ width: '40%' }}>Variant SKU</th>
                <td className="font-mono">{row.sku}</td>
              </tr>
              <tr>
                <th>Design reference</th>
                <td className="font-mono">{row.design_code}</td>
              </tr>
              <tr>
                <th>Jewellery type</th>
                <td>{titleCase(row.jewellery_type)}</td>
              </tr>
              <tr>
                <th>Metal</th>
                <td>{row.metal_label ?? notEvidenced}</td>
              </tr>
              <tr>
                <th>Style</th>
                <td>{row.style_label ? titleCase(row.style_label) : notEvidenced}</td>
              </tr>
              <tr>
                <th>Base price</th>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {row.base_price !== null ? `US$ ${row.base_price}` : notEvidenced}
                </td>
              </tr>
              <tr>
                <th>Production days</th>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {row.production_days !== null ? row.production_days : notEvidenced}
                </td>
              </tr>
              <tr>
                <th>Side stones</th>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.side_stone_count}</td>
              </tr>
              <tr>
                <th>Vedic design</th>
                <td>{row.is_vedic ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <th>Accepted shapes</th>
                <td>
                  {row.accepted_shapes && row.accepted_shapes.length > 0
                    ? row.accepted_shapes.map((s) => titleCase(s)).join(', ')
                    : 'Any shape (finer acceptance ranges not evidenced for this design)'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
