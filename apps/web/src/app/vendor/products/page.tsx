/**
 * apps/web/src/app/vendor/products/page.tsx
 *
 * D4/D5 — the vendor's own stock, plus DRAFT intake. The list is read through
 * `listVendorProducts(db, session.vendor.id, …)`; there is no query parameter
 * that can change the vendor.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { canSell } from '@maihan/domain';
import { listVendorProducts, type VendorProductState } from '@maihan/db';
import { getServerDb } from '../../../api/next-adapter.js';
import { getVendorSession } from '../../../lib/vendor-session.js';
import { VendorProductForm } from '../../../components/vendor/VendorProductForm.js';
import { VendorStateNotice } from '../../../components/vendor/VendorStateNotice.js';
import {
  VENDOR_MUTED,
  alert,
  badge,
  card,
  cell,
  link,
  pageLead,
  pageTitle,
  table,
  tableHead,
} from '../../../components/vendor/styles.js';

export const metadata: Metadata = {
  title: 'Vendor stock — Maihan Gems',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  readonly searchParams: Promise<{ state?: string; offset?: string }>;
}

const FILTERS = ['', 'DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

function parseFilter(raw: string | undefined): VendorProductState | undefined {
  if (raw === undefined) return undefined;
  const upper = raw.trim().toUpperCase();
  return upper === 'DRAFT' || upper === 'ACTIVE' || upper === 'ARCHIVED'
    ? (upper as VendorProductState)
    : undefined;
}

function parseOffset(raw: string | undefined): number {
  const parsed = Number(raw ?? '0');
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 0) : 0;
}

function day(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toISOString().slice(0, 10);
}

export default async function VendorProductsPage({
  searchParams,
}: PageProps): Promise<React.JSX.Element> {
  const session = await getVendorSession();
  if (session === null) redirect('/vendor/login');

  if (!canSell(session.vendor.state)) {
    return (
      <VendorStateNotice vendorName={session.vendor.display_name} state={session.vendor.state} />
    );
  }

  const params = await searchParams;
  const state = parseFilter(params.state);
  const offset = parseOffset(params.offset);
  const limit = 50;

  let items: Awaited<ReturnType<typeof listVendorProducts>>['items'] = [];
  let total = 0;
  let failure: string | null = null;
  try {
    const db = await getServerDb();
    const page = await listVendorProducts(db, session.vendor.id, {
      ...(state === undefined ? {} : { state }),
      limit,
      offset,
    });
    items = page.items;
    total = page.total;
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  const filterHref = (filter: string): string =>
    filter.length === 0 ? '/vendor/products' : `/vendor/products?state=${filter}`;
  const pageHref = (nextOffset: number): string => {
    const query = new URLSearchParams();
    if (state !== undefined) query.set('state', state);
    query.set('offset', String(nextOffset));
    return `/vendor/products?${query.toString()}`;
  };

  return (
    <>
      <h2 style={pageTitle}>Stock</h2>
      <p style={pageLead}>
        {total} line{total === 1 ? '' : 's'} owned by {session.vendor.display_name}. Vendor-created
        stock is DRAFT with price evidence UNKNOWN until the platform verifies and publishes it.
      </p>

      {failure !== null && (
        <p role="alert" style={alert}>
          {failure}
        </p>
      )}

      <nav aria-label="Filter stock" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {FILTERS.map((filter) => (
          <a key={filter.length === 0 ? 'all' : filter} href={filterHref(filter)} style={link}>
            {filter.length === 0 ? 'All states' : filter}
          </a>
        ))}
      </nav>

      {failure === null && items.length === 0 && (
        <p style={{ fontSize: '13px', color: VENDOR_MUTED }}>
          No stock matches this filter yet. Add the first line below.
        </p>
      )}

      {items.length > 0 && (
        <table style={table}>
          <thead>
            <tr style={tableHead}>
              <th style={cell}>Title</th>
              <th style={cell}>Kind</th>
              <th style={cell}>State</th>
              <th style={cell}>Price</th>
              <th style={cell}>Evidence</th>
              <th style={cell}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td style={cell}>
                  <strong>{row.title}</strong>
                  <br />
                  <code style={{ fontSize: '11px', color: VENDOR_MUTED }}>{row.slug}</code>
                </td>
                <td style={cell}>{row.kind}</td>
                <td style={cell}>
                  <span style={badge(row.state)}>{row.state}</span>
                </td>
                <td style={cell}>
                  {row.currency} {row.price_amount}
                </td>
                <td style={cell}>{row.price_evidence}</td>
                <td style={cell}>{day(row.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <nav
        aria-label="Stock pages"
        style={{ display: 'flex', gap: '16px', margin: '16px 0 30px', fontSize: '13px' }}
      >
        {offset > 0 && (
          <a href={pageHref(Math.max(offset - limit, 0))} style={link}>
            ← Previous
          </a>
        )}
        {offset + limit < total && (
          <a href={pageHref(offset + limit)} style={link}>
            Next →
          </a>
        )}
      </nav>

      <section style={card}>
        <h3 style={{ margin: '0 0 6px', fontSize: '18px' }}>Add a draft line</h3>
        <p style={{ margin: '0 0 18px', fontSize: '13px', lineHeight: 1.6, color: VENDOR_MUTED }}>
          Saved as DRAFT. A platform reviewer verifies the price evidence and publishes. Images are
          not part of this form yet.
        </p>
        <VendorProductForm />
      </section>

      <p style={{ marginTop: '18px', fontSize: '12px', color: VENDOR_MUTED }}>
        <a href="/vendor" style={link}>
          Back to dashboard
        </a>
      </p>
    </>
  );
}
