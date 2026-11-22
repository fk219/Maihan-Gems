/**
 * apps/web/src/app/vendor/page.tsx
 *
 * D3 — the vendor dashboard: state, stock counts, recent allocations and the
 * payable balance reconstructed from `vendor_ledger`.
 *
 * Server component: reads through the vendor-scoped repositories, never
 * through a client fetch. A vendor that is not APPROVED sees the state notice
 * and no data at all.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { canSell } from '@maihan/domain';
import { listVendorOrders, listVendorProducts, vendorBalance } from '@maihan/db';
import { getServerDb } from '../../api/next-adapter.js';
import { getVendorSession } from '../../lib/vendor-session.js';
import { VendorStateNotice } from '../../components/vendor/VendorStateNotice.js';
import {
  VENDOR_MUTED,
  alert,
  badge,
  card,
  cell,
  grid,
  link,
  metricLabel,
  metricValue,
  pageLead,
  pageTitle,
  table,
  tableHead,
} from '../../components/vendor/styles.js';

export const metadata: Metadata = {
  title: 'Vendor dashboard — Maihan Gems',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

function day(value: string | null): string {
  if (value === null) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toISOString().slice(0, 10);
}

export default async function VendorDashboardPage(): Promise<React.JSX.Element> {
  const session = await getVendorSession();
  if (session === null) redirect('/vendor/login');

  if (!canSell(session.vendor.state)) {
    return (
      <VendorStateNotice vendorName={session.vendor.display_name} state={session.vendor.state} />
    );
  }

  let draft = 0;
  let active = 0;
  let totalStock = 0;
  let balance = '0';
  let recent: Awaited<ReturnType<typeof listVendorOrders>>['items'] = [];
  let failure: string | null = null;

  try {
    const db = await getServerDb();
    const [draftPage, activePage, allStock, orderPage, ledgerBalance] = await Promise.all([
      listVendorProducts(db, session.vendor.id, { state: 'DRAFT', limit: 1, offset: 0 }),
      listVendorProducts(db, session.vendor.id, { state: 'ACTIVE', limit: 1, offset: 0 }),
      listVendorProducts(db, session.vendor.id, { limit: 1, offset: 0 }),
      listVendorOrders(db, session.vendor.id, { limit: 5, offset: 0 }),
      vendorBalance(db, session.vendor.id),
    ]);
    draft = draftPage.total;
    active = activePage.total;
    totalStock = allStock.total;
    recent = orderPage.items;
    balance = ledgerBalance;
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  return (
    <>
      <h2 style={pageTitle}>{session.vendor.display_name}</h2>
      <p style={pageLead}>
        Signed in as {session.displayName} ({session.email}) · member role {session.role}. Commission
        is {(session.vendor.commission_bps / 100).toFixed(2)}% and payouts settle in{' '}
        {session.vendor.payout_currency}.
      </p>

      {failure !== null && (
        <p role="alert" style={alert}>
          {failure}
        </p>
      )}

      <div style={grid}>
        <div style={card}>
          <p style={metricLabel}>Vendor state</p>
          <p style={metricValue}>
            <span style={badge(session.vendor.state)}>{session.vendor.state}</span>
          </p>
        </div>
        <div style={card}>
          <p style={metricLabel}>Stock lines</p>
          <p style={metricValue}>{totalStock}</p>
        </div>
        <div style={card}>
          <p style={metricLabel}>Draft · awaiting platform</p>
          <p style={metricValue}>{draft}</p>
        </div>
        <div style={card}>
          <p style={metricLabel}>Published</p>
          <p style={metricValue}>{active}</p>
        </div>
        <div style={card}>
          <p style={metricLabel}>Payable balance · ledger</p>
          <p style={metricValue}>
            {session.vendor.payout_currency} {balance}
          </p>
        </div>
      </div>

      <section style={{ marginTop: '8px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '10px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px' }}>Recent allocations</h3>
          <a href="/vendor/orders" style={link}>
            All orders
          </a>
        </div>

        {failure === null && recent.length === 0 && (
          <p style={{ fontSize: '13px', color: VENDOR_MUTED }}>
            No orders have allocated stock to this vendor yet. When an order splits, its allocation
            appears here and the commission line posts to the ledger.
          </p>
        )}

        {recent.length > 0 && (
          <table style={table}>
            <thead>
              <tr style={tableHead}>
                <th style={cell}>Order</th>
                <th style={cell}>Placed</th>
                <th style={cell}>State</th>
                <th style={cell}>Payable</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.allocation_id}>
                  <td style={cell}>
                    <code>{row.order_number}</code>
                  </td>
                  <td style={cell}>{day(row.order_created_at)}</td>
                  <td style={cell}>{row.allocation_state}</td>
                  <td style={cell}>
                    {row.currency} {row.vendor_payable}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ marginTop: '26px', fontSize: '12px', lineHeight: 1.6, color: VENDOR_MUTED }}>
        New stock is created as DRAFT with price evidence UNKNOWN. Publishing is a platform
        decision; the portal has no publish action by design (gate V15).
      </p>
    </>
  );
}
