'use client';

/**
 * apps/web/src/components/admin/AdminBulkCatalogue.tsx
 *
 * The catalogue bulk-edit panel (Track C1): preview → apply → bounded undo.
 *
 * The preview is a real dry run — the API runs the same read and the same
 * planner and writes nothing — so what the operator sees is what the apply
 * will do. The panel never decides eligibility: the server reports each row
 * as CHANGED or SKIPPED with a reason, and gate V15 / UNKNOWN price evidence
 * are enforced in the repository.
 */
import { useState } from 'react';

export interface BulkCatalogueProduct {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly state: string;
  readonly priceAmount: string;
  readonly priceEvidence: string;
}

export interface RecentBulkOperation {
  readonly operation_id: string;
  readonly action: string;
  readonly created_at: string;
  readonly changed_rows: number;
  readonly undo_expires_at: string;
  readonly within_window: boolean;
  readonly already_undone: boolean;
}

interface RowSnapshot {
  readonly priceAmount: string;
  readonly state: string;
  readonly publishedAt: string | null;
}

interface RowOutcome {
  readonly productId: string;
  readonly slug: string | null;
  readonly title: string | null;
  readonly outcome: 'CHANGED' | 'SKIPPED';
  readonly reason: string | null;
  readonly before: RowSnapshot | null;
  readonly after: RowSnapshot | null;
  readonly publishesNow: boolean;
}

interface BulkResult {
  readonly operationId: string | null;
  readonly action: string;
  readonly dryRun: boolean;
  readonly requested: number;
  readonly changed: number;
  readonly skipped: number;
  readonly rows: readonly RowOutcome[];
  readonly undoExpiresAt: string | null;
}

type Operation = 'PRICES' | 'STATE';

export function AdminBulkCatalogue({
  products,
  recentOperations,
  canUndo,
}: {
  readonly products: readonly BulkCatalogueProduct[];
  readonly recentOperations: readonly RecentBulkOperation[];
  /** `products/approve`: the console must not offer an action the policy denies. */
  readonly canUndo: boolean;
}): React.JSX.Element {
  const [operation, setOperation] = useState<Operation>('PRICES');
  const [mode, setMode] = useState<'SET' | 'ADJUST_PERCENT'>('SET');
  const [value, setValue] = useState('');
  const [targetState, setTargetState] = useState<'DRAFT' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [preview, setPreview] = useState<BulkResult | null>(null);
  const [applied, setApplied] = useState<BulkResult | null>(null);
  const [undone, setUndone] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string): void {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    setPreview(null);
    setApplied(null);
    setUndone(null);
  }

  function selectAll(): void {
    setSelected(new Set(products.map((product) => product.id)));
    setPreview(null);
    setApplied(null);
    setUndone(null);
  }

  function clearSelection(): void {
    setSelected(new Set());
    setPreview(null);
    setApplied(null);
    setUndone(null);
  }

  async function call(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: true; result: BulkResult } | { ok: false; message: string }> {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: BulkResult; error?: { message?: string } }
        | null;
      if (!response.ok || payload?.data === undefined) {
        return { ok: false, message: payload?.error?.message ?? 'The operation was refused.' };
      }
      return { ok: true, result: payload.data };
    } catch {
      return { ok: false, message: 'The service is unreachable.' };
    }
  }

  function payload(dryRun: boolean): Record<string, unknown> {
    const ids = Array.from(selected);
    if (operation === 'PRICES') {
      return {
        productIds: ids,
        mode,
        value: Number(value),
        reason: reason.trim(),
        dryRun,
      };
    }
    return { productIds: ids, to: targetState, reason: reason.trim(), dryRun };
  }

  async function run(dryRun: boolean): Promise<void> {
    if (selected.size === 0) {
      setError('Select at least one product.');
      return;
    }
    if (reason.trim().length === 0) {
      setError('A reason is required for every bulk operation.');
      return;
    }
    if (operation === 'PRICES' && (value.trim().length === 0 || !Number.isFinite(Number(value)))) {
      setError('Enter a numeric value.');
      return;
    }
    setBusy(true);
    setError(null);
    setUndone(null);
    const path =
      operation === 'PRICES'
        ? '/api/v1/admin/catalogue/bulk/prices'
        : '/api/v1/admin/catalogue/bulk/state';
    const outcome = await call(path, payload(dryRun));
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    if (dryRun) {
      setPreview(outcome.result);
      setApplied(null);
    } else {
      setApplied(outcome.result);
      setPreview(null);
    }
  }

  async function undo(operationId: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/admin/catalogue/bulk/${encodeURIComponent(operationId)}/undo`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: 'Reversed from the bulk console' }),
          credentials: 'same-origin',
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { data?: { reversed?: number }; error?: { message?: string } }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? 'The undo was refused.');
        return;
      }
      setUndone(payload?.data?.reversed ?? 0);
      setApplied(null);
      setPreview(null);
      window.location.reload();
    } catch {
      setError('The service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? applied;
  const appliedOperationId = applied === null ? null : applied.operationId;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>1. Operation</h3>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={label}>
            <input
              type="radio"
              name="operation"
              checked={operation === 'PRICES'}
              onChange={() => setOperation('PRICES')}
            />{' '}
            Price
          </label>
          <label style={label}>
            <input
              type="radio"
              name="operation"
              checked={operation === 'STATE'}
              onChange={() => setOperation('STATE')}
            />{' '}
            Publication state
          </label>

          {operation === 'PRICES' ? (
            <>
              <label style={label}>
                Mode{' '}
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as 'SET' | 'ADJUST_PERCENT')}
                  style={input}
                >
                  <option value="SET">SET (absolute)</option>
                  <option value="ADJUST_PERCENT">ADJUST_PERCENT</option>
                </select>
              </label>
              <label style={label}>
                Value{' '}
                <input
                  aria-label="Bulk price value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={mode === 'SET' ? '1250.00' : '-10'}
                  style={{ ...input, width: '110px' }}
                />
              </label>
            </>
          ) : (
            <label style={label}>
              Target state{' '}
              <select
                value={targetState}
                onChange={(event) =>
                  setTargetState(event.target.value as 'DRAFT' | 'ACTIVE' | 'ARCHIVED')
                }
                style={input}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE (gate V15)</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
          )}

          <label style={{ ...label, flex: '1 1 240px' }}>
            Reason{' '}
            <input
              aria-label="Bulk operation reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              placeholder="Why this change is being made"
              style={{ ...input, width: '100%' }}
            />
          </label>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#5A5448' }}>
          A price SET is refused on a row whose price evidence is UNKNOWN, and a bulk
          publish still enforces gate V15. Evidence is never promoted by a bulk edit.
        </p>
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>
            2. Selection{' '}
            <span style={{ fontWeight: 400, color: '#5A5448', fontSize: '13px' }}>
              ({selected.size} of {products.length} shown)
            </span>
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={selectAll} style={secondary}>
              Select all shown
            </button>
            <button type="button" onClick={clearSelection} style={secondary}>
              Clear
            </button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
              <th style={cell}> </th>
              <th style={cell}>Title</th>
              <th style={cell}>Slug</th>
              <th style={cell}>Price</th>
              <th style={cell}>Evidence</th>
              <th style={cell}>State</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                <td style={cell}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${product.title}`}
                    checked={selected.has(product.id)}
                    onChange={() => toggle(product.id)}
                  />
                </td>
                <td style={cell}>{product.title}</td>
                <td style={cell}>
                  <code>{product.slug}</code>
                </td>
                <td style={cell}>{product.priceAmount}</td>
                <td style={cell}>{product.priceEvidence}</td>
                <td style={cell}>{product.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>3. Preview, apply, undo</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" disabled={busy} onClick={() => void run(true)} style={secondary}>
            Preview (dry run)
          </button>
          <button type="button" disabled={busy} onClick={() => void run(false)} style={primary}>
            Apply
          </button>
          {canUndo && appliedOperationId !== null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void undo(appliedOperationId)}
              style={danger}
            >
              Undo within the window
            </button>
          )}
        </div>
        {error !== null && (
          <p role="alert" style={{ color: '#B3261E', fontSize: '13px', margin: '12px 0 0' }}>
            {error}
          </p>
        )}
        {undone !== null && (
          <p style={{ color: '#1B5E20', fontSize: '13px', margin: '12px 0 0' }}>
            Reversed {undone} row{undone === 1 ? '' : 's'}.
          </p>
        )}
        {appliedOperationId !== null && applied !== null && (
          <p style={{ fontSize: '12px', color: '#5A5448', margin: '12px 0 0' }}>
            Operation <code>{appliedOperationId}</code> · undo closes{' '}
            {applied.undoExpiresAt === null ? '—' : new Date(applied.undoExpiresAt).toLocaleString()}.
          </p>
        )}

        {shown !== null && (
          <>
            <p style={{ margin: '14px 0 8px', fontSize: '13px' }}>
              {shown.dryRun ? 'Preview' : 'Applied'}: {shown.changed} changed, {shown.skipped} skipped
              of {shown.requested}.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                  <th style={cell}>Product</th>
                  <th style={cell}>Outcome</th>
                  <th style={cell}>Reason</th>
                  <th style={cell}>Before</th>
                  <th style={cell}>After</th>
                </tr>
              </thead>
              <tbody>
                {shown.rows.map((row) => (
                  <tr key={row.productId} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                    <td style={cell}>
                      <code>{row.slug ?? row.productId}</code>
                    </td>
                    <td style={cell}>{row.outcome}</td>
                    <td style={cell}>{row.reason ?? '—'}</td>
                    <td style={cell}>
                      {row.before === null
                        ? '—'
                        : `${row.before.priceAmount} · ${row.before.state}`}
                    </td>
                    <td style={cell}>
                      {row.after === null
                        ? '—'
                        : `${row.after.priceAmount} · ${row.after.state}${
                            row.publishesNow ? ' · published now' : ''
                          }`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section style={card}>
        <h3 style={{ margin: '0 0 6px', fontSize: '15px' }}>4. Recent operations</h3>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#5A5448' }}>
          The undo list is read from the append-only audit ledger, so it survives a
          reload. An operation is undoable only while its window is open, only once, and
          only if no affected product changed since.
        </p>
        {recentOperations.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#5A5448' }}>No bulk operation is recorded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                <th style={cell}>Operation</th>
                <th style={cell}>Action</th>
                <th style={cell}>Rows</th>
                <th style={cell}>Applied</th>
                <th style={cell}>Undo closes</th>
                <th style={cell}>State</th>
              </tr>
            </thead>
            <tbody>
              {recentOperations.map((operation) => (
                <tr key={operation.operation_id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                  <td style={cell}>
                    <code>{operation.operation_id.slice(0, 8)}</code>
                  </td>
                  <td style={cell}>{operation.action}</td>
                  <td style={cell}>{operation.changed_rows}</td>
                  <td style={cell}>{new Date(operation.created_at).toLocaleString()}</td>
                  <td style={cell}>{new Date(operation.undo_expires_at).toLocaleString()}</td>
                  <td style={cell}>
                    {operation.already_undone ? (
                      <span style={{ color: '#5A5448' }}>Undone</span>
                    ) : !canUndo ? (
                      <span style={{ color: '#5A5448' }}>Your role cannot reverse</span>
                    ) : operation.within_window ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void undo(operation.operation_id)}
                        style={danger}
                      >
                        Undo
                      </button>
                    ) : (
                      <span style={{ color: '#5A5448' }}>Window closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid rgba(201,168,76,0.35)',
  borderRadius: '10px',
  padding: '18px',
};

const cell: React.CSSProperties = { padding: '8px 10px', verticalAlign: 'middle' };

const label: React.CSSProperties = {
  fontSize: '12px',
  color: '#5A5448',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const input: React.CSSProperties = {
  border: '1px solid rgba(8,18,30,0.2)',
  borderRadius: '6px',
  padding: '6px 8px',
  fontSize: '12px',
  background: '#FFFFFF',
};

const primary: React.CSSProperties = {
  background: '#C9A84C',
  color: '#08121E',
  border: 'none',
  borderRadius: '6px',
  padding: '9px 16px',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const secondary: React.CSSProperties = {
  background: 'transparent',
  color: '#08121E',
  border: '1px solid rgba(8,18,30,0.25)',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const danger: React.CSSProperties = {
  background: 'transparent',
  color: '#B3261E',
  border: '1px solid rgba(179,38,30,0.5)',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
