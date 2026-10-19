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
  BackOfficeCertificateRow,
  BackOfficeDiscountRow,
  BackOfficeMigrationOverview,
  BackOfficeOperationsOverview,
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

export function AdminCmsWorkspace({
  initialPages,
}: {
  initialPages: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [pages, setPages] = useState(initialPages);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [pageKind, setPageKind] = useState<'GEMSTONE_EDUCATION' | 'GUIDE' | 'EDITORIAL' | 'LEGAL' | 'FAQ'>('GEMSTONE_EDUCATION');
  const [bodyText, setBodyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshPages() {
    const res = await fetch('/api/v1/admin/content/pages');
    if (res.ok) {
      const body = (await res.json()) as { data?: Array<Record<string, unknown>> };
      if (body.data) setPages(body.data);
    }
    router.refresh();
  }

  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/admin/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          pageKind,
          blocks: bodyText.trim()
            ? [
                {
                  kind: 'RICH_TEXT',
                  position: 0,
                  data: { text: bodyText.trim() },
                },
              ]
            : [],
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Could not create CMS page.');
        return;
      }
      setMessage(`CMS page "${title.trim()}" created in DRAFT.`);
      setSlug('');
      setTitle('');
      setBodyText('');
      await refreshPages();
    } catch {
      setError('CMS service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  async function runWorkflow(
    pageId: string,
    revisionId: string | null,
    version: number,
    action: 'SUBMIT_REVIEW' | 'APPROVE' | 'REJECT' | 'PUBLISH' | 'ARCHIVE',
  ) {
    setBusyId(pageId);
    setError(null);
    setMessage(null);
    try {
      let res: Response;
      if (action === 'SUBMIT_REVIEW' && revisionId) {
        res = await fetch(`/api/v1/admin/cms/revisions/${encodeURIComponent(revisionId)}/submit-review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedVersion: version }),
        });
      } else if ((action === 'APPROVE' || action === 'REJECT') && revisionId) {
        res = await fetch(`/api/v1/admin/cms/revisions/${encodeURIComponent(revisionId)}/decide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expectedVersion: version,
            decision: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            notes: `Editorial decision (${action}) via back office`,
          }),
        });
      } else if (action === 'PUBLISH') {
        res = await fetch(`/api/v1/admin/cms/pages/${encodeURIComponent(pageId)}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedVersion: version }),
        });
      } else {
        res = await fetch(`/api/v1/admin/cms/pages/${encodeURIComponent(pageId)}/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedVersion: version }),
        });
      }
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? `CMS action ${action} failed.`);
        return;
      }
      setMessage(`CMS action ${action} succeeded.`);
      await refreshPages();
    } catch {
      setError('CMS service is unreachable.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <form className="admin-panel" onSubmit={handleCreatePage}>
        <h2>Create Editorial / Education Page</h2>
        <div className="lx-account-form">
          <div className="lx-account-form__row lx-account-form__row--two">
            <div className="lx-account-field">
              <label htmlFor="cms-slug">Slug</label>
              <input
                id="cms-slug"
                required
                placeholder="kashmir-sapphire-provenance"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="lx-account-field">
              <label htmlFor="cms-title">Title</label>
              <input
                id="cms-title"
                required
                placeholder="Kashmir Sapphire Provenance & Grading"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="lx-account-field">
            <label htmlFor="cms-kind">Page Kind</label>
            <select
              id="cms-kind"
              value={pageKind}
              onChange={(e) => setPageKind(e.target.value as typeof pageKind)}
            >
              <option value="GEMSTONE_EDUCATION">Gemstone Education (Trust-Bearing)</option>
              <option value="GUIDE">Buying Guide (Trust-Bearing)</option>
              <option value="EDITORIAL">Editorial Feature</option>
              <option value="FAQ">FAQ</option>
              <option value="LEGAL">Legal / Policy (Trust-Bearing)</option>
            </select>
          </div>
          <div className="lx-account-field">
            <label htmlFor="cms-body">Editorial Content</label>
            <textarea
              id="cms-body"
              rows={4}
              placeholder="Authoritative gemmological education or policy prose..."
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border-warm)',
              }}
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
            {busy ? 'Creating…' : 'Create Draft Page'}
          </button>
        </div>
      </form>

      {pages.length === 0 ? (
        <div className="admin-empty">No CMS pages yet.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Kind</th>
              <th>State</th>
              <th>Review</th>
              <th>Version</th>
              <th>Workflow Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((row) => {
              const id = String(row['id']);
              const state = String(row['state']);
              const revId = row['head_revision_id'] ? String(row['head_revision_id']) : null;
              const revState = String(row['review_state'] ?? 'PENDING');
              const ver = Number(row['version'] ?? 1);
              return (
                <tr key={id}>
                  <td>{String(row['title'])}</td>
                  <td>
                    <code>{String(row['slug'])}</code>
                  </td>
                  <td>{String(row['page_kind'])}</td>
                  <td>
                    <span className={`admin-badge ${state === 'PUBLISHED' ? 'admin-badge--ok' : ''}`}>
                      {state}
                    </span>
                  </td>
                  <td>
                    <code>{revState}</code>
                  </td>
                  <td>v{ver}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {state === 'DRAFT' && revId ? (
                        <button
                          type="button"
                          className="lx-btn lx-btn--ghost"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          disabled={busyId === id}
                          onClick={() => void runWorkflow(id, revId, ver, 'SUBMIT_REVIEW')}
                        >
                          Submit Review
                        </button>
                      ) : null}
                      {state === 'IN_REVIEW' && revId && revState !== 'APPROVED' ? (
                        <>
                          <button
                            type="button"
                            className="lx-btn lx-btn--solid"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                            disabled={busyId === id}
                            onClick={() => void runWorkflow(id, revId, ver, 'APPROVE')}
                          >
                            Approve Revision
                          </button>
                          <button
                            type="button"
                            className="lx-btn lx-btn--ghost"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                            disabled={busyId === id}
                            onClick={() => void runWorkflow(id, revId, ver, 'REJECT')}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {(state === 'IN_REVIEW' || state === 'DRAFT') && revState === 'APPROVED' ? (
                        <button
                          type="button"
                          className="lx-btn lx-btn--solid"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          disabled={busyId === id}
                          onClick={() => void runWorkflow(id, revId, ver, 'PUBLISH')}
                        >
                          Publish
                        </button>
                      ) : null}
                      {state !== 'ARCHIVED' ? (
                        <button
                          type="button"
                          className="lx-btn lx-btn--ghost"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          disabled={busyId === id}
                          onClick={() => void runWorkflow(id, revId, ver, 'ARCHIVE')}
                        >
                          Archive
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AdminCertificatesWorkspace({
  initialCertificates,
}: {
  initialCertificates: BackOfficeCertificateRow[];
}) {
  const router = useRouter();
  const [certs, setCerts] = useState(initialCertificates);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleReview(certId: string, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(certId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/certificates/${encodeURIComponent(certId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: 'trust.reviewer@maihangems.com',
          decision,
          notes: `Certificate ${decision} via Trust Review Console`,
          resolve_anomaly_ids: [],
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Certificate review decision failed.');
        return;
      }
      setMessage(`Certificate ${certId.slice(0, 8)}… marked ${decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED'}.`);
      const listRes = await fetch('/api/v1/admin/certificates');
      if (listRes.ok) {
        const listBody = (await listRes.json()) as { data?: BackOfficeCertificateRow[] };
        if (listBody.data) setCerts(listBody.data);
      }
      router.refresh();
    } catch {
      setError('Certificate review service is unreachable.');
    } finally {
      setBusyId(null);
    }
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

      {certs.length === 0 ? (
        <div className="admin-empty">
          No laboratory certificates queued yet. Certificates uploaded via `/api/v1/certificates` appear here for INV-07 verification before public rendering.
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Certificate #</th>
              <th>Lab</th>
              <th>Kind</th>
              <th>Status (INV-07)</th>
              <th>Confidence</th>
              <th>Unresolved Anomalies</th>
              <th>Review Action</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((c) => (
              <tr key={c.id}>
                <td>
                  <code>{c.certificate_number ?? c.id.slice(0, 8)}</code>
                </td>
                <td>{c.lab_name ?? '—'}</td>
                <td>{c.kind}</td>
                <td>
                  <span
                    className={`admin-badge ${
                      c.verification_status === 'VERIFIED'
                        ? 'admin-badge--ok'
                        : c.verification_status === 'REJECTED'
                          ? 'admin-badge--danger'
                          : ''
                    }`}
                  >
                    {c.verification_status}
                  </span>
                </td>
                <td>{c.confidence_overall ? `${(Number(c.confidence_overall) * 100).toFixed(0)}%` : '—'}</td>
                <td>{c.anomaly_count}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {c.verification_status !== 'VERIFIED' ? (
                      <button
                        type="button"
                        className="lx-btn lx-btn--solid"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                        disabled={busyId === c.id}
                        onClick={() => void handleReview(c.id, 'APPROVED')}
                      >
                        Verify (INV-07)
                      </button>
                    ) : null}
                    {c.verification_status !== 'REJECTED' ? (
                      <button
                        type="button"
                        className="lx-btn lx-btn--ghost"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                        disabled={busyId === c.id}
                        onClick={() => void handleReview(c.id, 'REJECTED')}
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
      )}
    </div>
  );
}

export function AdminMigrationWorkspace({
  initialOverview,
}: {
  initialOverview: BackOfficeMigrationOverview;
}) {
  const router = useRouter();
  const [overview, setOverview] = useState(initialOverview);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDecideDerived(productId: string, decision: 'APPROVE' | 'REJECT') {
    setBusyId(productId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/derived-refs/${encodeURIComponent(productId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason: `INV-08 derived SKU ${decision} via Migration Console`,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Derived reference decision failed.');
        return;
      }
      setMessage(`Derived reference ${productId.slice(0, 8)}… ${decision === 'APPROVE' ? 'approved' : 'rejected'}.`);
      const refRes = await fetch('/api/v1/admin/migration');
      if (refRes.ok) {
        const refBody = (await refRes.json()) as { data?: BackOfficeMigrationOverview };
        if (refBody.data) setOverview(refBody.data);
      }
      router.refresh();
    } catch {
      setError('Migration service is unreachable.');
    } finally {
      setBusyId(null);
    }
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

      <section className="admin-panel">
        <h2>INV-08 Derived-SKU Approval Queue ({overview.derived_refs.length})</h2>
        <p className="admin-lede" style={{ marginBottom: '1rem' }}>
          An inferred identifier (`source_sku_derived`) may never become a confirmed external reference (`source_sku`) without explicit human approval (`review_state=&apos;APPROVED&apos;`).
        </p>
        {overview.derived_refs.length === 0 ? (
          <div className="admin-empty">No unapproved derived references in the queue.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product Title</th>
                <th>Derived SKU</th>
                <th>Confirmed SKU</th>
                <th>Evidence Status</th>
                <th>State</th>
                <th>Action (INV-08)</th>
              </tr>
            </thead>
            <tbody>
              {overview.derived_refs.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>
                    <code>{r.source_sku_derived ?? '—'}</code>
                  </td>
                  <td>
                    <code>{r.source_sku ?? 'NULL'}</code>
                  </td>
                  <td>
                    <span className="admin-badge">{r.sku_evidence_status}</span>
                  </td>
                  <td>{r.state}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {r.sku_evidence_status === 'INFERRED' ? (
                        <button
                          type="button"
                          className="lx-btn lx-btn--solid"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          disabled={busyId === r.id}
                          onClick={() => void handleDecideDerived(r.id, 'APPROVE')}
                        >
                          Approve Reference
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="lx-btn lx-btn--ghost"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                        disabled={busyId === r.id}
                        onClick={() => void handleDecideDerived(r.id, 'REJECT')}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-panel">
        <h2>Import Batches ({overview.batches.length})</h2>
        {overview.batches.length === 0 ? (
          <div className="admin-empty">No migration batches recorded yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Batch Key</th>
                <th>Status</th>
                <th>Seen</th>
                <th>Accepted</th>
                <th>Quarantined</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {overview.batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <code>{b.batch_key}</code>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge--ok">{b.status}</span>
                  </td>
                  <td>{b.records_seen.toLocaleString('en-US')}</td>
                  <td>{b.records_accepted.toLocaleString('en-US')}</td>
                  <td>{b.records_quarantined.toLocaleString('en-US')}</td>
                  <td>{new Date(b.started_at).toLocaleString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-panel">
        <h2>Staging Conflicts ({overview.conflicts.length})</h2>
        {overview.conflicts.length === 0 ? (
          <div className="admin-empty">Zero unresolved staging conflicts.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Conflict Kind</th>
                <th>Natural Key</th>
                <th>Source URL A</th>
                <th>Source URL B</th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {overview.conflicts.map((c) => (
                <tr key={c.id}>
                  <td>{c.conflict_kind}</td>
                  <td>
                    <code>{c.natural_key}</code>
                  </td>
                  <td>{c.source_url_a ?? '—'}</td>
                  <td>{c.source_url_b ?? '—'}</td>
                  <td>
                    <span className="admin-badge">{c.resolution}</span>
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

export function AdminOperationsWorkspace({
  overview,
}: {
  overview: BackOfficeOperationsOverview;
}) {
  return (
    <div>
      <div className="admin-tilegrid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-tile">
          <span className="admin-tile__label">Outbox · Pending</span>
          <p className="admin-tile__value">{overview.outbox.pending.toLocaleString('en-US')}</p>
          <p className="admin-tile__note">domain_events awaiting worker dispatch</p>
        </div>
        <div className="admin-tile">
          <span className="admin-tile__label">Outbox · Published</span>
          <p className="admin-tile__value">{overview.outbox.published.toLocaleString('en-US')}</p>
          <p className="admin-tile__note">dispatched to event_consumers</p>
        </div>
        <div className="admin-tile">
          <span className="admin-tile__label">Outbox · Dead Letter</span>
          <p className="admin-tile__value">{overview.outbox.dead_letter.toLocaleString('en-US')}</p>
          <p className="admin-tile__note">exhausted retry budget</p>
        </div>
      </div>

      <section className="admin-panel">
        <h2>Job Queue States</h2>
        {overview.queues.length === 0 ? (
          <div className="admin-empty">No job queue entries recorded.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>State</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {overview.queues.map((q) => (
                <tr key={`${q.queue}:${q.state}`}>
                  <td>
                    <code>{q.queue}</code>
                  </td>
                  <td>
                    <span className="admin-badge">{q.state}</span>
                  </td>
                  <td>{q.count.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-panel">
        <h2>Recent Domain Events (Outbox)</h2>
        {overview.recent_events.length === 0 ? (
          <div className="admin-empty">No domain events emitted yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Aggregate</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Occurred</th>
                <th>Last Error</th>
              </tr>
            </thead>
            <tbody>
              {overview.recent_events.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <strong>{ev.event_type}</strong>
                  </td>
                  <td>
                    {ev.aggregate_type} ({ev.aggregate_id.slice(0, 8)}…)
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        ev.status === 'PUBLISHED'
                          ? 'admin-badge--ok'
                          : ev.status === 'DEAD_LETTER'
                            ? 'admin-badge--danger'
                            : ''
                      }`}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td>{ev.attempts}</td>
                  <td>{new Date(ev.occurred_at).toLocaleString('en-GB')}</td>
                  <td>{ev.last_error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
