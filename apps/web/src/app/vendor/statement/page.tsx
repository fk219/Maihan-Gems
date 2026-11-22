/**
 * apps/web/src/app/vendor/statement/page.tsx
 *
 * D8 — the payout statement reconstructed from `vendor_ledger` (append-only).
 * Running balance is cumulative over the vendor's whole ledger; the period
 * total is the movement inside the selected window. Both are labelled, because
 * they answer different questions.
 *
 * The filter is a plain GET form: no client component needed, and the page
 * still works with JavaScript disabled.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { canSell } from '@maihan/domain';
import { vendorStatement } from '@maihan/db';
import { getServerDb } from '../../../api/next-adapter.js';
import { getVendorSession } from '../../../lib/vendor-session.js';
import { VendorStateNotice } from '../../../components/vendor/VendorStateNotice.js';
import {
  VENDOR_MUTED,
  alert,
  cell,
  field,
  fieldLabel,
  input,
  notice,
  pageLead,
  pageTitle,
  primaryButton,
  table,
  tableHead,
} from '../../../components/vendor/styles.js';

export const metadata: Metadata = {
  title: 'Vendor statement — Maihan Gems',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  readonly searchParams: Promise<{ from?: string; to?: string }>;
}

function instant(raw: string | undefined, endOfDay: boolean): string | undefined {
  if (raw === undefined || raw.trim().length === 0) return undefined;
  const value = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : raw;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('Use a valid date (YYYY-MM-DD).');
  return parsed.toISOString();
}

function day(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

export default async function VendorStatementPage({
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
  let from: string | undefined;
  let to: string | undefined;
  let rangeError: string | null = null;
  try {
    from = instant(params.from, false);
    to = instant(params.to, true);
    if (from !== undefined && to !== undefined && from >= to) {
      rangeError = '"From" must be earlier than "To".';
    }
  } catch (error) {
    rangeError = error instanceof Error ? error.message : 'Invalid date range.';
  }

  let statement: Awaited<ReturnType<typeof vendorStatement>> | null = null;
  let failure: string | null = null;
  if (rangeError === null) {
    try {
      const db = await getServerDb();
      statement = await vendorStatement(db, session.vendor.id, {
        ...(from === undefined ? {} : { from }),
        ...(to === undefined ? {} : { to }),
      });
    } catch (error) {
      failure = error instanceof Error ? error.message : 'The database is unavailable.';
    }
  }

  return (
    <>
      <h2 style={pageTitle}>Statement</h2>
      <p style={pageLead}>
        Ledger movements for {session.vendor.display_name}, in {session.vendor.payout_currency}.
        The ledger is append-only: refunds and payouts are new rows, never edits.
      </p>

      <form
        method="get"
        action="/vendor/statement"
        style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'end',
          flexWrap: 'wrap',
          marginBottom: '22px',
        }}
      >
        <label style={field}>
          <span style={fieldLabel}>From</span>
          <input type="date" name="from" defaultValue={params.from ?? ''} style={input} />
        </label>
        <label style={field}>
          <span style={fieldLabel}>To</span>
          <input type="date" name="to" defaultValue={params.to ?? ''} style={input} />
        </label>
        <button type="submit" style={primaryButton}>
          Apply
        </button>
      </form>

      <p style={{ ...notice, marginTop: 0 }}>
        Running balance includes every earlier ledger entry; the period total counts only the rows
        shown. Payout execution is not wired yet, so a PAYOUT row appears only when the platform
        writes one.
      </p>

      {rangeError !== null && (
        <p role="alert" style={alert}>
          {rangeError}
        </p>
      )}
      {failure !== null && (
        <p role="alert" style={alert}>
          {failure}
        </p>
      )}

      {statement !== null && statement.entries.length === 0 && (
        <p style={{ fontSize: '13px', color: VENDOR_MUTED }}>
          No ledger movements in this window.
        </p>
      )}

      {statement !== null && statement.entries.length > 0 && (
        <>
          <table style={table}>
            <thead>
              <tr style={tableHead}>
                <th style={cell}>Date</th>
                <th style={cell}>Entry</th>
                <th style={cell}>Reference</th>
                <th style={cell}>Amount</th>
                <th style={cell}>Running balance</th>
              </tr>
            </thead>
            <tbody>
              {statement.entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={cell}>{day(entry.created_at)}</td>
                  <td style={cell}>{entry.entry_type}</td>
                  <td style={cell}>{entry.reference ?? '—'}</td>
                  <td style={cell}>
                    {entry.currency} {entry.amount}
                  </td>
                  <td style={cell}>
                    {entry.currency} {entry.running_balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: '14px', fontSize: '13px' }}>
            <strong>Period total:</strong> {session.vendor.payout_currency} {statement.total}
          </p>
        </>
      )}

      {statement !== null && statement.entries.length === 0 && (
        <p style={{ marginTop: '14px', fontSize: '13px' }}>
          <strong>Period total:</strong> {session.vendor.payout_currency} {statement.total}
        </p>
      )}
    </>
  );
}
