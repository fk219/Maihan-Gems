/**
 * apps/web/src/app/vendor/orders/page.tsx
 *
 * D3/D6 — allocations for this vendor only, joined to the order header.
 * Fulfilment actions (accept, ship, tracking) are not built yet; the page
 * states that honestly rather than showing dead buttons.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { canSell } from '@maihan/domain';
import { listVendorOrders } from '@maihan/db';
import { getServerDb } from '../../../api/next-adapter.js';
import { getVendorSession } from '../../../lib/vendor-session.js';
import { VendorStateNotice } from '../../../components/vendor/VendorStateNotice.js';
import {
  VENDOR_MUTED,
  alert,
  cell,
  link,
  notice,
  pageLead,
  pageTitle,
  table,
  tableHead,
} from '../../../components/vendor/styles.js';

export const metadata: Metadata = {
  title: 'Vendor orders — Maihan Gems',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  readonly searchParams: Promise<{ offset?: string }>;
}

function day(value: string | null): string {
  if (value === null) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toISOString().slice(0, 10);
}

export default async function VendorOrdersPage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const session = await getVendorSession();
  if (session === null) redirect('/vendor/login');

  if (!canSell(session.vendor.state)) {
    return (
      <VendorStateNotice vendorName={session.vendor.display_name} state={session.vendor.state} />
    );
  }

  const params = await searchParams;
  const rawOffset = Number(params.offset ?? '0');
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
  const limit = 50;

  let items: Awaited<ReturnType<typeof listVendorOrders>>['items'] = [];
  let total = 0;
  let failure: string | null = null;
  try {
    const db = await getServerDb();
    const page = await listVendorOrders(db, session.vendor.id, { limit, offset });
    items = page.items;
    total = page.total;
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  return (
    <>
      <h2 style={pageTitle}>Orders</h2>
      <p style={pageLead}>
        Allocations of this vendor&rsquo;s stock. {total} allocation{total === 1 ? '' : 's'} in
        total. Commission and payable are frozen at order time.
      </p>

      <p style={notice}>
        Fulfilment actions are not wired yet: this page shows what the platform has allocated to you.
        Accept, ship, tracking and cancellation arrive with the fulfilment track.
      </p>

      {failure !== null && (
        <p role="alert" style={alert}>
          {failure}
        </p>
      )}

      {failure === null && items.length === 0 && (
        <p style={{ fontSize: '13px', color: VENDOR_MUTED }}>No orders have allocated your stock yet.</p>
      )}

      {items.length > 0 && (
        <table style={table}>
          <thead>
            <tr style={tableHead}>
              <th style={cell}>Order</th>
              <th style={cell}>Placed</th>
              <th style={cell}>Order state</th>
              <th style={cell}>Allocation</th>
              <th style={cell}>Subtotal</th>
              <th style={cell}>Commission</th>
              <th style={cell}>Payable</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.allocation_id}>
                <td style={cell}>
                  <code>{row.order_number}</code>
                </td>
                <td style={cell}>{day(row.order_created_at)}</td>
                <td style={cell}>{row.order_state}</td>
                <td style={cell}>{row.allocation_state}</td>
                <td style={cell}>
                  {row.currency} {row.subtotal}
                </td>
                <td style={cell}>
                  {row.currency} {row.commission}
                </td>
                <td style={cell}>
                  {row.currency} {row.vendor_payable}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <nav
        aria-label="Order pages"
        style={{ display: 'flex', gap: '16px', margin: '16px 0', fontSize: '13px' }}
      >
        {offset > 0 && (
          <a href={`/vendor/orders?offset=${Math.max(offset - limit, 0)}`} style={link}>
            ← Previous
          </a>
        )}
        {offset + limit < total && (
          <a href={`/vendor/orders?offset=${offset + limit}`} style={link}>
            Next →
          </a>
        )}
      </nav>
    </>
  );
}
