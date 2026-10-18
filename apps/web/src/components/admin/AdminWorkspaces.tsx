'use client';

/**
 * apps/web/src/components/admin/AdminWorkspaces.tsx
 *
 * Interactive administrative controls connected to real `/api/v1/admin/**`
 * and `/api/v1/refunds/**` endpoints:
 * - AdminProductModerationTable: Approve, Reject (with reason), Publish, Unpublish, Archive
 * - AdminVendorModerationTable: Approve, Suspend, Reactivate, Reject vendor onboarding
 * - AdminRefundsTable: Approve, Reject, Execute refund requests
 * - AdminDiscountsWorkspace: Create & view promotional discount codes
 * - AdminUsersTable: View accounts & assign RBAC roles (ADMIN_SUPER only)
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  BackOfficeDiscountRow,
  BackOfficeRefundRow,
  CatalogueProductRow,
  VendorProfileDto,
} from '@maihan/db';

const ALL_ROLES = [
  'CUSTOMER',
  'VENDOR',
  'ADMIN_SUPER',
  'CATALOG_MANAGER',
  'CONTENT_EDITOR',
  'CONTENT_PUBLISHER',
  'COMMERCE_OPERATOR',
  'TRUST_REVIEWER',
  'CONCIERGE_AGENT',
  'AI_OPERATIONS',
  'MIGRATION_ENGINEER',
  'READ_ONLY_ANALYST',
] as const;

export function AdminProductModerationTable({
  initialProducts,
}: {
  initialProducts: CatalogueProductRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CatalogueProductRow[]>(initialProducts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function moderate(
    productId: string,
    action: 'APPROVE' | 'REJECT' | 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE',
    reason?: string,
  ) {
    setBusyId(productId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/products/${encodeURIComponent(productId)}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? `Could not perform ${action}.`);
        return;
      }
      setMessage(`Product ${action.toLowerCase()} action recorded and audited.`);
      setRejectingId(null);
      setRejectReason('');
      const listRes = await fetch('/api/v1/admin/products');
      if (listRes.ok) {
        const listBody = (await listRes.json()) as { data?: CatalogueProductRow[] };
        if (listBody.data) setRows(listBody.data);
      }
      router.refresh();
    } catch {
      setError('Admin product moderation service is unreachable.');
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return <div className="admin-empty">No product records in the catalogue yet.</div>;
  }

  return (
    <div>
      {error ? (
        <p className="lx-account-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="lx-account-success" role="status" style={{ marginBottom: '1rem' }}>
          {message}
        </p>
      ) : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>SKU</th>
            <th>Vendor</th>
            <th>Kind</th>
            <th>Moderation</th>
            <th>Storefront</th>
            <th>Stock</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.title}</strong>
                {row.rejection_reason ? (
                  <div style={{ color: '#8a2424', fontSize: '0.75rem' }}>
                    Reason: {row.rejection_reason}
                  </div>
                ) : null}
              </td>
              <td>
                <code>{row.sku}</code>
              </td>
              <td>{row.vendor_name ?? 'Maihan Vault'}</td>
              <td>{row.kind}</td>
              <td>
                <span
                  className={`admin-badge ${
                    row.moderation_status === 'PUBLISHED' || row.moderation_status === 'APPROVED'
                      ? 'admin-badge--ok'
                      : row.moderation_status === 'REJECTED'
                        ? 'admin-badge--danger'
                        : ''
                  }`}
                >
                  {row.moderation_status}
                </span>
              </td>
              <td>
                <span className={`admin-badge ${row.state === 'ACTIVE' ? 'admin-badge--ok' : ''}`}>
                  {row.state}
                </span>
              </td>
              <td>{row.inventory_quantity}</td>
              <td>{row.price_amount ? `$${row.price_amount}` : '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {row.moderation_status !== 'APPROVED' && row.moderation_status !== 'PUBLISHED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === row.id}
                      onClick={() => void moderate(row.id, 'APPROVE')}
                    >
                      Approve
                    </button>
                  ) : null}
                  {row.state !== 'ACTIVE' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === row.id}
                      onClick={() => void moderate(row.id, 'PUBLISH')}
                    >
                      Publish
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === row.id}
                      onClick={() => void moderate(row.id, 'UNPUBLISH')}
                    >
                      Unpublish
                    </button>
                  )}
                  <button
                    type="button"
                    className="lx-text-btn"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setRejectingId(row.id);
                      setRejectReason('');
                    }}
                  >
                    Reject
                  </button>
                  {row.state !== 'ARCHIVED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === row.id}
                      onClick={() => void moderate(row.id, 'ARCHIVE')}
                    >
                      Archive
                    </button>
                  ) : null}
                </div>
                {rejectingId === row.id ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                    <input
                      aria-label="Rejection reason"
                      placeholder="Rejection reason (required)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                    />
                    <button
                      type="button"
                      className="lx-btn lx-btn--solid"
                      disabled={busyId === row.id || !rejectReason.trim()}
                      onClick={() => void moderate(row.id, 'REJECT', rejectReason)}
                    >
                      Confirm Reject
                    </button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminVendorModerationTable({
  initialVendors,
}: {
  initialVendors: VendorProfileDto[];
}) {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorProfileDto[]>(initialVendors);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function moderate(
    vendorId: string,
    action: 'APPROVE' | 'SUSPEND' | 'REACTIVATE' | 'REJECT',
    reason?: string,
  ) {
    setBusyId(vendorId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/vendors/${encodeURIComponent(vendorId)}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? `Vendor ${action} failed.`);
        return;
      }
      setMessage(`Vendor status updated (${action}) and recorded in audit logs.`);
      const listRes = await fetch('/api/v1/admin/vendors');
      if (listRes.ok) {
        const listBody = (await listRes.json()) as { data?: VendorProfileDto[] };
        if (listBody.data) setVendors(listBody.data);
      }
      router.refresh();
    } catch {
      setError('Admin vendor service is unreachable.');
    } finally {
      setBusyId(null);
    }
  }

  if (vendors.length === 0) {
    return <div className="admin-empty">No trade partner vendors registered yet.</div>;
  }

  return (
    <div>
      {error ? (
        <p className="lx-account-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="lx-account-success" role="status" style={{ marginBottom: '1rem' }}>
          {message}
        </p>
      ) : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Display Name</th>
            <th>Email</th>
            <th>Bourse City</th>
            <th>Bourse Member</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr key={v.id}>
              <td>
                <strong>{v.display_name}</strong>
              </td>
              <td>{v.email}</td>
              <td>
                {v.city}, {v.country_code}
              </td>
              <td>{v.bourse_member ? 'Yes' : 'No'}</td>
              <td>
                <span
                  className={`admin-badge ${
                    v.status === 'APPROVED'
                      ? 'admin-badge--ok'
                      : v.status === 'REJECTED' || v.status === 'SUSPENDED'
                        ? 'admin-badge--danger'
                        : ''
                  }`}
                >
                  {v.status}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {v.status === 'PENDING' || v.status === 'REJECTED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === v.id}
                      onClick={() => void moderate(v.id, 'APPROVE')}
                    >
                      Approve
                    </button>
                  ) : null}
                  {v.status === 'APPROVED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === v.id}
                      onClick={() => void moderate(v.id, 'SUSPEND', 'Administrative suspension')}
                    >
                      Suspend
                    </button>
                  ) : null}
                  {v.status === 'SUSPENDED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === v.id}
                      onClick={() => void moderate(v.id, 'REACTIVATE')}
                    >
                      Reactivate
                    </button>
                  ) : null}
                  {v.status !== 'REJECTED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === v.id}
                      onClick={() => void moderate(v.id, 'REJECT', 'Did not meet bourse criteria')}
                    >
                      Reject
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminRefundsTable({
  initialRefunds,
}: {
  initialRefunds: BackOfficeRefundRow[];
}) {
  const router = useRouter();
  const [refunds, setRefunds] = useState<BackOfficeRefundRow[]>(initialRefunds);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(refundId: string, action: 'approve' | 'reject' | 'execute') {
    setBusyId(refundId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/refunds/${encodeURIComponent(refundId)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { reason: 'Rejected by commerce operator' } : {}),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? `Refund ${action} failed.`);
        return;
      }
      setMessage(`Refund ${action} completed.`);
      const listRes = await fetch('/api/v1/admin/refunds');
      if (listRes.ok) {
        const listBody = (await listRes.json()) as { data?: BackOfficeRefundRow[] };
        if (listBody.data) setRefunds(listBody.data);
      }
      router.refresh();
    } catch {
      setError('Refund service is unreachable.');
    } finally {
      setBusyId(null);
    }
  }

  if (refunds.length === 0) {
    return <div className="admin-empty">No refund requests recorded.</div>;
  }

  return (
    <div>
      {error ? (
        <p className="lx-account-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="lx-account-success" role="status" style={{ marginBottom: '1rem' }}>
          {message}
        </p>
      ) : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Amount</th>
            <th>Reason</th>
            <th>State</th>
            <th>Requested</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((r) => (
            <tr key={r.id}>
              <td>
                <code>{r.order_number}</code>
              </td>
              <td>
                {r.currency} {r.amount}
              </td>
              <td>{r.reason}</td>
              <td>
                <span
                  className={`admin-badge ${
                    r.state === 'SUCCEEDED'
                      ? 'admin-badge--ok'
                      : r.state === 'REJECTED'
                        ? 'admin-badge--danger'
                        : ''
                  }`}
                >
                  {r.state}
                </span>
              </td>
              <td>{new Date(r.requested_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {r.state === 'REQUESTED' ? (
                    <>
                      <button
                        type="button"
                        className="lx-text-btn"
                        disabled={busyId === r.id}
                        onClick={() => void act(r.id, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="lx-text-btn"
                        disabled={busyId === r.id}
                        onClick={() => void act(r.id, 'reject')}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {r.state === 'APPROVED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busyId === r.id}
                      onClick={() => void act(r.id, 'execute')}
                    >
                      Execute Settlement
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDiscountsWorkspace({
  initialDiscounts,
}: {
  initialDiscounts: BackOfficeDiscountRow[];
}) {
  const router = useRouter();
  const [discounts, setDiscounts] = useState<BackOfficeDiscountRow[]>(initialDiscounts);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING'>('PERCENTAGE');
  const [value, setValue] = useState('10');
  const [minSubtotal, setMinSubtotal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          type,
          value: type === 'FREE_SHIPPING' ? undefined : Number(value),
          min_subtotal: minSubtotal.trim() ? Number(minSubtotal) : undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Discount could not be created.');
        return;
      }
      setMessage(`Promotional code ${code.toUpperCase()} created.`);
      setCode('');
      setName('');
      const listRes = await fetch('/api/v1/admin/discounts');
      if (listRes.ok) {
        const listBody = (await listRes.json()) as { data?: BackOfficeDiscountRow[] };
        if (listBody.data) setDiscounts(listBody.data);
      }
      router.refresh();
    } catch {
      setError('Admin discount service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form className="admin-panel" onSubmit={handleCreate}>
        <h2>Create Promotional Discount Code</h2>
        <div className="lx-account-form">
          <div className="lx-account-form__row lx-account-form__row--two">
            <div className="lx-account-field">
              <label htmlFor="dc-code">Promo Code</label>
              <input
                id="dc-code"
                required
                placeholder="DIFC10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="lx-account-field">
              <label htmlFor="dc-name">Campaign Name</label>
              <input
                id="dc-name"
                required
                placeholder="Private Salon Invitation"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="lx-account-form__row lx-account-form__row--two">
            <div className="lx-account-field">
              <label htmlFor="dc-type">Discount Type</label>
              <select
                id="dc-type"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (USD)</option>
                <option value="FREE_SHIPPING">Complimentary Shipping</option>
              </select>
            </div>
            {type !== 'FREE_SHIPPING' ? (
              <div className="lx-account-field">
                <label htmlFor="dc-val">Value ({type === 'PERCENTAGE' ? '%' : 'USD'})</label>
                <input
                  id="dc-val"
                  type="number"
                  step="0.01"
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="lx-account-field">
            <label htmlFor="dc-min">Minimum Subtotal (USD, optional)</label>
            <input
              id="dc-min"
              type="number"
              step="0.01"
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value)}
            />
          </div>
          {error ? (
            <p className="lx-account-error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="lx-account-success" role="status">
              {message}
            </p>
          ) : null}
          <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
            {busy ? 'Creating…' : 'Create Discount Code'}
          </button>
        </div>
      </form>

      {discounts.length === 0 ? (
        <div className="admin-empty">No discount codes configured yet.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Value</th>
              <th>Min Subtotal</th>
              <th>Redemptions</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <tr key={d.id}>
                <td>
                  <code>{d.code ?? '—'}</code>
                </td>
                <td>{d.name}</td>
                <td>{d.type}</td>
                <td>
                  {d.type === 'PERCENTAGE'
                    ? `${d.value ?? 0}%`
                    : d.value
                      ? `$${d.value}`
                      : '—'}
                </td>
                <td>{d.min_subtotal ? `$${d.min_subtotal}` : '—'}</td>
                <td>
                  {d.redemption_count}
                  {d.max_redemptions ? ` / ${d.max_redemptions}` : ''}
                </td>
                <td>
                  <span className="admin-badge admin-badge--ok">{d.state}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AdminUsersTable({
  initialUsers,
}: {
  initialUsers: Array<{
    customer_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    state: string;
    email_verified: boolean;
    created_at: string;
  }>;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function changeRole(userId: string, newRole: string) {
    setBusyId(userId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, reason: 'Assigned via admin console' }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Role assignment failed.');
        return;
      }
      setMessage(`Account role updated to ${newRole}.`);
      const listRes = await fetch('/api/v1/admin/users');
      if (listRes.ok) {
        const listBody = (await listRes.json()) as { data?: typeof initialUsers };
        if (listBody.data) setUsers(listBody.data);
      }
      router.refresh();
    } catch {
      setError('Admin users service is unreachable.');
    } finally {
      setBusyId(null);
    }
  }

  if (users.length === 0) {
    return <div className="admin-empty">No user accounts found.</div>;
  }

  return (
    <div>
      {error ? (
        <p className="lx-account-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="lx-account-success" role="status" style={{ marginBottom: '1rem' }}>
          {message}
        </p>
      ) : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Verified</th>
            <th>Status</th>
            <th>Assigned Role</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.customer_id}>
              <td>{u.email}</td>
              <td>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
              <td>{u.email_verified ? 'Verified' : 'Unverified'}</td>
              <td>
                <span className="admin-badge admin-badge--ok">{u.state}</span>
              </td>
              <td>
                <select
                  aria-label={`Role for ${u.email}`}
                  value={u.role}
                  disabled={busyId === u.customer_id}
                  onChange={(e) => void changeRole(u.customer_id, e.target.value)}
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
