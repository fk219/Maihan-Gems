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
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table.js';
import { Textarea } from '../ui/textarea.js';
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
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const shown = useMemo(
    () =>
      rows.filter((row) => {
        const hay = `${row.title} ${row.sku} ${row.vendor_name ?? ''}`.toLowerCase();
        const matchesQuery = query.trim() === '' || hay.includes(query.trim().toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || row.moderation_status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [rows, query, statusFilter],
  );

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

      <div className="operator-toolbar">
        <div>
          <Label htmlFor="moderation-query">Find a record</Label>
          <Input id="moderation-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, SKU, or vendor" />
        </div>
        <div>
          <Label htmlFor="moderation-status">Moderation</Label>
          <select id="moderation-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            {Array.from(new Set(rows.map((row) => row.moderation_status))).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Moderation</TableHead>
            <TableHead>Storefront</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <strong>{row.title}</strong>
                {row.rejection_reason ? <div>Reason: {row.rejection_reason}</div> : null}
              </TableCell>
              <TableCell>
                <code>{row.sku}</code>
              </TableCell>
              <TableCell>{row.vendor_name ?? 'Maihan Vault'}</TableCell>
              <TableCell>{row.kind}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    row.moderation_status === 'PUBLISHED' || row.moderation_status === 'APPROVED'
                      ? 'default'
                      : row.moderation_status === 'REJECTED'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {row.moderation_status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={row.state === 'ACTIVE' ? 'default' : 'secondary'}>{row.state}</Badge>
              </TableCell>
              <TableCell>{row.inventory_quantity}</TableCell>
              <TableCell>{row.price_amount ? `$${row.price_amount}` : '—'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {row.moderation_status !== 'APPROVED' && row.moderation_status !== 'PUBLISHED' ? (
                    <Button type="button" size="sm" variant="outline" disabled={busyId === row.id} onClick={() => void moderate(row.id, 'APPROVE')}>
                      Approve
                    </Button>
                  ) : null}
                  {row.state !== 'ACTIVE' ? (
                    <Button type="button" size="sm" variant="outline" disabled={busyId === row.id} onClick={() => void moderate(row.id, 'PUBLISH')}>
                      Publish
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => void moderate(row.id, 'UNPUBLISH')}>
                      Unpublish
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setRejectingId(row.id);
                      setRejectReason('');
                    }}
                  >
                    Reject
                  </Button>
                  {row.state !== 'ARCHIVED' ? (
                    <Button type="button" size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => void moderate(row.id, 'ARCHIVE')}>
                      Archive
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={rejectingId !== null} onOpenChange={(open) => { if (!open) setRejectingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this piece</DialogTitle>
            <DialogDescription>The reason is stored with the audit row. It is required.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea id="reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
          <Button
            type="button"
            variant="destructive"
            disabled={busyId !== null || !rejectReason.trim() || rejectingId === null}
            onClick={() => {
              if (rejectingId) void moderate(rejectingId, 'REJECT', rejectReason);
            }}
          >
            Confirm rejection
          </Button>
        </DialogContent>
      </Dialog>
      {shown.length === 0 ? <p className="admin-lede">No rows match this filter.</p> : null}
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
  const [pageKind, setPageKind] = useState<'STATIC' | 'EDUCATION' | 'BLOG' | 'POLICY' | 'LANDING' | 'SHOWROOM'>('EDUCATION');
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
              <option value="EDUCATION">Gemstone Education</option>
              <option value="BLOG">Journal / Editorial</option>
              <option value="POLICY">Legal / Policy</option>
              <option value="STATIC">Static Page</option>
              <option value="LANDING">Landing Page</option>
              <option value="SHOWROOM">Showroom Page</option>
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

  async function handleReview(certId: string, decision: 'APPROVE' | 'REJECT') {
    setBusyId(certId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/certificates/${encodeURIComponent(certId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          notes: `Certificate ${decision} via Trust Review Console`,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Certificate review decision failed.');
        return;
      }
      setMessage(`Certificate ${certId.slice(0, 8)}… marked ${decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED'}.`);
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
                        onClick={() => void handleReview(c.id, 'APPROVE')}
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
                        onClick={() => void handleReview(c.id, 'REJECT')}
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

/**
 * P3-2/P3-5 console workspaces: SEO metadata + redirects, navigation items,
 * and the AI-ops jobs/dead-letter views. Fetch-then-refresh forms talk to the
 * console API (same-origin), every write is audit-backed in the DB layer.
 */
interface SeoRow {
  id: string;
  entity_kind: string;
  entity_id: string;
  title: string | null;
  description: string | null;
  canonical_path: string | null;
  robots: string | null;
  noindex: boolean;
  updated_at: string;
}

interface RedirectItem {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  reason: string | null;
  created_at: string;
}

interface NavItem {
  id: string;
  key: string;
  label: string;
  items: unknown;
  locale: string;
  updated_at: string;
}

interface JobRow {
  id: string;
  job_key: string | null;
  queue: string;
  job_type: string;
  state: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
}

interface AiLogItem {
  id: string;
  surface: string;
  intent: string | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  error_code: string | null;
  guardrail_action: string | null;
  handoff_triggered: boolean;
  created_at: string;
}

export function AdminSeoWorkspace({
  seo,
  redirects,
}: {
  seo: SeoRow[];
  redirects: RedirectItem[];
}) {
  return (
    <div>
      <section className="admin-panel" style={{ marginBottom: '1.5rem' }}>
        <h2>SEO Metadata</h2>
        {seo.length === 0 ? (
          <div className="admin-empty">No SEO metadata rows yet — the storefront falls back to its honest defaults.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Title</th>
                <th>Robots</th>
                <th>noindex</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {seo.map((row) => (
                <tr key={row.id}>
                  <td>{row.entity_kind}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.entity_id}</td>
                  <td>{row.title ?? '—'}</td>
                  <td>{row.robots ?? 'default'}</td>
                  <td>{row.noindex ? 'yes' : 'no'}</td>
                  <td>{new Date(row.updated_at).toLocaleString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AdminRedirectManager initialRedirects={redirects} />
    </div>
  );
}

export function AdminRedirectManager({ initialRedirects }: { initialRedirects: RedirectItem[] }) {
  const [rows, setRows] = useState(initialRedirects);
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [statusCode, setStatusCode] = useState(301);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(): Promise<void> {
    const res = await fetch('/api/v1/admin/redirects?limit=200');
    if (!res.ok) return;
    const body = (await res.json()) as { data?: RedirectItem[] };
    setRows(body.data ?? []);
  }

  async function create(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/v1/admin/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fromPath, toPath, statusCode }),
    });
    setBusy(false);
    if (res.status === 409) {
      setMessage('A redirect already exists for that path.');
      return;
    }
    if (!res.ok) {
      setMessage('Redirect rejected — check the paths.');
      return;
    }
    setFromPath('');
    setToPath('');
    setMessage('Redirect created and audited.');
    await refresh();
  }

  async function remove(id: string): Promise<void> {
    const res = await fetch(`/api/v1/admin/redirects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Redirect removed (audit row written).');
      await refresh();
    }
  }

  return (
    <section className="admin-panel">
      <h2>Redirect Manager</h2>
      {message ? <p className="admin-lede">{message}</p> : null}
      <form className="admin-panel" onSubmit={create} style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem' }}>
          From path{' '}
          <input value={fromPath} onChange={(e) => setFromPath(e.target.value)} required style={{ width: '220px' }} />
        </label>
        <label style={{ marginRight: '0.5rem' }}>
          To path{' '}
          <input value={toPath} onChange={(e) => setToPath(e.target.value)} required style={{ width: '220px' }} />
        </label>
        <label style={{ marginRight: '0.5rem' }}>
          Status{' '}
          <select value={statusCode} onChange={(e) => setStatusCode(Number(e.target.value))}>
            <option value={301}>301 permanent</option>
            <option value={302}>302 temporary</option>
            <option value={307}>307 temporary (preserve method)</option>
            <option value={308}>308 permanent (preserve method)</option>
          </select>
        </label>
        <button type="submit" disabled={busy} className="admin-btn">
          Create redirect
        </button>
      </form>
      {rows.length === 0 ? (
        <div className="admin-empty">No redirects yet — the corpus run populates this table.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.from_path}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.to_path}</td>
                <td>{row.status_code}</td>
                <td>{new Date(row.created_at).toLocaleDateString('en-GB')}</td>
                <td>
                  <button type="button" className="admin-btn admin-btn--quiet" onClick={() => void remove(row.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function AdminNavigationWorkspace({ navigations }: { navigations: NavItem[] }) {
  return (
    <div>
      {navigations.length === 0 ? (
        <div className="admin-empty">No navigation sets stored — the storefront renders its structural defaults.</div>
      ) : (
        navigations.map((nav) => <AdminNavigationEditor key={`${nav.key}:${nav.locale}`} navigation={nav} />)
      )}
    </div>
  );
}

function AdminNavigationEditor({ navigation }: { navigation: NavItem }) {
  const [items, setItems] = useState(() => (Array.isArray(navigation.items) ? navigation.items : []) as NavEntry[]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patch(index: number, field: 'label' | 'href', value: string): void {
    setItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  }

  function add(): void {
    setItems((prev) => [...prev, { label: '', href: '/' }]);
  }

  function removeAt(index: number): void {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function save(): Promise<void> {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/v1/admin/navigation', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: navigation.key, locale: navigation.locale, items }),
    });
    setBusy(false);
    setMessage(res.ok ? 'Navigation saved and audited.' : 'Save rejected — validate every label and href.');
  }

  return (
    <section className="admin-panel" style={{ marginBottom: '1.25rem' }}>
      <h2>
        {navigation.key} <span className="admin-tile__note">({navigation.locale})</span>
      </h2>
      {items.length === 0 ? (
        <div className="admin-empty">Empty set.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Href</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry, index) => (
              <tr key={index}>
                <td>
                  <input value={entry.label ?? ''} onChange={(e) => patch(index, 'label', e.target.value)} />
                </td>
                <td>
                  <input value={entry.href ?? ''} onChange={(e) => patch(index, 'href', e.target.value)} />
                </td>
                <td>
                  <button type="button" className="admin-btn admin-btn--quiet" onClick={() => removeAt(index)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
        <button type="button" className="admin-btn admin-btn--quiet" onClick={add}>
          Add item
        </button>
        <button type="button" className="admin-btn" disabled={busy} onClick={() => void save()}>
          Save & audit
        </button>
      </div>
      {message ? <p className="admin-lede">{message}</p> : null}
    </section>
  );
}

interface NavEntry {
  label?: string;
  href?: string;
}

export function AdminAiOpsWorkspace({ jobs, aiLogs }: { jobs: JobRow[]; aiLogs: AiLogItem[] }) {
  const [rows, setRows] = useState(jobs);
  const [message, setMessage] = useState<string | null>(null);

  async function requeue(id: string): Promise<void> {
    const res = await fetch(`/api/v1/admin/jobs/${id}/requeue`, { method: 'POST' });
    if (res.ok) {
      setMessage('Job requeued (guarded transition, audit row written).');
      const list = await fetch('/api/v1/admin/jobs?limit=100');
      if (list.ok) {
        const body = (await list.json()) as { data?: JobRow[] };
        setRows(body.data ?? []);
      }
    } else if (res.status === 409) {
      setMessage('Only DEAD_LETTER jobs can be requeued.');
    } else {
      setMessage('Requeue failed.');
    }
  }

  return (
    <div>
      <section className="admin-panel" style={{ marginBottom: '1.5rem' }}>
        <h2>Job Queues</h2>
        {message ? <p className="admin-lede">{message}</p> : null}
        {rows.length === 0 ? (
          <div className="admin-empty">No job rows recorded.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Type</th>
                <th>State</th>
                <th>Attempts</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.queue}</td>
                  <td>{row.job_type}</td>
                  <td>
                    {row.state === 'DEAD_LETTER' ? <strong>{row.state}</strong> : row.state}
                    {row.last_error ? (
                      <p className="admin-tile__note" title={row.last_error}>
                        {row.last_error.slice(0, 120)}
                      </p>
                    ) : null}
                  </td>
                  <td>{row.attempts}</td>
                  <td>{new Date(row.updated_at).toLocaleString('en-GB')}</td>
                  <td>
                    {row.state === 'DEAD_LETTER' ? (
                      <button type="button" className="admin-btn admin-btn--quiet" onClick={() => void requeue(row.id)}>
                        Requeue
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-panel">
        <h2>AI Interaction Log</h2>
        {aiLogs.length === 0 ? (
          <div className="admin-empty">No AI interactions logged yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Surface</th>
                <th>Intent</th>
                <th>Latency</th>
                <th>Tokens in/out</th>
                <th>Status</th>
                <th>At</th>
              </tr>
            </thead>
            <tbody>
              {aiLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.surface}</td>
                  <td>{log.intent ?? '—'}</td>
                  <td>{log.latency_ms ?? '—'} ms</td>
                  <td>
                    {log.input_tokens ?? '—'} / {log.output_tokens ?? '—'}
                  </td>
                  <td>
                    {(() => {
                      const success = log.error_code === null;
                      const degraded = log.handoff_triggered || (log.guardrail_action !== null && log.guardrail_action !== 'ALLOW');
                      return success ? (degraded ? 'degraded' : 'ok') : 'failed';
                    })()}
                  </td>
                  <td>{new Date(log.created_at).toLocaleString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
