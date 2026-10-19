/**
 * apps/web/src/app/admin/[[...adminPath]]/page.tsx
 *
 * `/admin/**` — the complete back office, served by ONE catch-all (SoT 13.2):
 *   /admin                      Executive Dashboard
 *   /admin/catalogue            Product Moderation & Catalogue Management
 *   /admin/vendors              Vendor Onboarding & Moderation
 *   /admin/orders               Order List & Fulfilment Oversight
 *   /admin/orders/<orderId>     Order Detail & Append-Only Timeline
 *   /admin/refunds              Return & Refund Requests Oversight
 *   /admin/discounts            Promotions & Discount Codes
 *   /admin/customers            Customer Directory
 *   /admin/users                Staff Roles & Permissions (ADMIN_SUPER)
 *   /admin/content              CMS Pages & Revisions
 *   /admin/audit                Append-Only Security Audit Logs
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type {
  BackOfficeAuditLogRow,
  BackOfficeCertificateRow,
  BackOfficeDiscountRow,
  BackOfficeMigrationOverview,
  BackOfficeOperationsOverview,
  BackOfficeRefundRow,
  CatalogueProductRow,
  VendorProfileDto,
} from '@maihan/db';

import { requireAdminAccess, AdminGateScreen } from '../../../lib/admin-server.js';
import { AdminSidebar } from '../../../components/admin/AdminSidebar.js';
import {
  AdminCertificatesWorkspace,
  AdminCmsWorkspace,
  AdminDiscountsWorkspace,
  AdminMigrationWorkspace,
  AdminOperationsWorkspace,
  AdminProductModerationTable,
  AdminRefundsTable,
  AdminUsersTable,
  AdminVendorModerationTable,
} from '../../../components/admin/AdminWorkspaces.js';
import { apiFetch, adminOriginFetch } from '../../../lib/api-origin.js';

interface PageProps {
  params: Promise<{ adminPath?: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { adminPath } = await params;
  const titles: Record<string, string> = {
    dashboard: 'Dashboard | Maihan Back Office',
    catalogue: 'Product Moderation | Maihan Back Office',
    vendors: 'Trade Vendors | Maihan Back Office',
    orders: 'Orders | Maihan Back Office',
    refunds: 'Refunds | Maihan Back Office',
    discounts: 'Promotions | Maihan Back Office',
    customers: 'Customers | Maihan Back Office',
    users: 'Roles & Permissions | Maihan Back Office',
    content: 'Content | Maihan Back Office',
    audit: 'Audit Logs | Maihan Back Office',
  };
  return {
    title: titles[adminPath?.[0] ?? 'dashboard'] ?? 'Maihan Back Office',
    robots: { index: false, follow: false },
  };
}

export default async function AdminPage({ params }: PageProps) {
  const { adminPath } = await params;
  const segments = adminPath ?? [];
  const [section, sub] = segments;

  switch (section) {
    case undefined: {
      const access = await requireAdminAccess('dashboards', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminDashboard />;
    }
    case 'catalogue': {
      const access = await requireAdminAccess('products', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminCatalogue />;
    }
    case 'vendors': {
      const access = await requireAdminAccess('products', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminVendors />;
    }
    case 'content': {
      const access = await requireAdminAccess('content', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminContent />;
    }
    case 'orders': {
      const access = await requireAdminAccess('orders', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      if (sub !== undefined) return <AdminOrderDetail orderId={sub} />;
      return <AdminOrders />;
    }
    case 'refunds': {
      const access = await requireAdminAccess('refunds', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminRefunds />;
    }
    case 'discounts': {
      const access = await requireAdminAccess('orders', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminDiscounts />;
    }
    case 'customers': {
      const access = await requireAdminAccess('orders', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminCustomers />;
    }
    case 'users': {
      const access = await requireAdminAccess('dashboards', 'write');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminUsers />;
    }
    case 'audit': {
      const access = await requireAdminAccess('dashboards', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminAuditLogs />;
    }
    case 'certificates': {
      const access = await requireAdminAccess('certificates', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminCertificates />;
    }
    case 'migration': {
      const access = await requireAdminAccess('import_batches', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminMigration />;
    }
    case 'operations': {
      const access = await requireAdminAccess('dashboards', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminOperations />;
    }
    default:
      notFound();
  }
}

function fmt(value: number): string {
  return value < 0 ? '—' : value.toLocaleString('en-US');
}

async function AdminDashboard() {
  const response = await adminOriginFetch('/api/v1/admin/dashboards/summary');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: Record<string, number> };
  const s = body.data;
  if (!s) return <AdminUnavailable status={502} />;

  const tiles: { label: string; value: number; note?: string }[] = [
    { label: 'Products · Active', value: s['products_active'] ?? -1, note: 'state = ACTIVE, live on storefront' },
    { label: 'Products · Pending Review', value: s['products_submitted'] ?? -1, note: 'vendor submissions awaiting review' },
    { label: 'Products · Draft', value: s['products_draft'] ?? -1, note: 'awaiting editorial curation' },
    { label: 'Vendors · Pending', value: s['vendors_pending'] ?? -1, note: 'onboarding queue' },
    { label: 'Vendors · Approved', value: s['vendors_approved'] ?? -1, note: 'active bourse partners' },
    { label: 'Orders', value: s['orders'] ?? -1, note: 'placed customer orders' },
    { label: 'Refunds Pending', value: s['refunds_pending'] ?? -1, note: 'awaiting decision or settlement' },
    { label: 'Gemstones', value: s['gemstones'] ?? -1, note: 'in the vault tables' },
    { label: 'Setting Variants', value: s['setting_variants'] ?? -1, note: 'design × metal' },
    { label: 'CMS Pages in Review', value: s['cms_pages_in_review'] ?? -1 },
  ];

  return (
    <AdminFrame
      active="dashboard"
      title="Executive Dashboard"
      lede="Operational counts read live from the database — no invented metrics."
    >
      <div className="admin-tilegrid">
        {tiles.map((tile) => (
          <div key={tile.label} className="admin-tile">
            <span className="admin-tile__label">{tile.label}</span>
            <p className="admin-tile__value">{fmt(tile.value)}</p>
            {tile.note ? <p className="admin-tile__note">{tile.note}</p> : null}
          </div>
        ))}
      </div>
    </AdminFrame>
  );
}

async function AdminCatalogue() {
  const response = await adminOriginFetch('/api/v1/admin/products');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: CatalogueProductRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="catalogue"
      title="Product Moderation & Catalogue"
      lede="Review vendor submissions, approve or reject with gemmological feedback, and publish verified pieces to the storefront."
    >
      <AdminProductModerationTable initialProducts={rows} />
    </AdminFrame>
  );
}

async function AdminVendors() {
  const response = await adminOriginFetch('/api/v1/admin/vendors');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: VendorProfileDto[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="vendors"
      title="Trade Partner Vendors"
      lede="Review vendor onboarding applications, approve bourse dealers, or suspend/reactivate partner access."
    >
      <AdminVendorModerationTable initialVendors={rows} />
    </AdminFrame>
  );
}

async function AdminRefunds() {
  const response = await adminOriginFetch('/api/v1/admin/refunds');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeRefundRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="refunds"
      title="Returns & Refund Requests"
      lede="Multi-stage refund approval workflow (REQUESTED -> APPROVED -> SUCCEEDED / REJECTED) bounded by captured payment amounts."
    >
      <AdminRefundsTable initialRefunds={rows} />
    </AdminFrame>
  );
}

async function AdminDiscounts() {
  const response = await adminOriginFetch('/api/v1/admin/discounts');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeDiscountRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="discounts"
      title="Promotions & Discount Codes"
      lede="Configure scoped percentage, fixed-amount, or complimentary-shipping promotional codes."
    >
      <AdminDiscountsWorkspace initialDiscounts={rows} />
    </AdminFrame>
  );
}

async function AdminCustomers() {
  const response = await adminOriginFetch('/api/v1/admin/customers');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as {
    data?: Array<{
      customer_id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      state: string;
      email_verified: boolean;
      created_at: string;
    }>;
  };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="customers"
      title="Client Directory"
      lede="Registered customer and partner accounts."
    >
      {rows.length === 0 ? (
        <div className="admin-empty">No customer accounts registered yet.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Email Verified</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.customer_id}>
                <td>{u.email}</td>
                <td>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td>
                  <code>{u.role}</code>
                </td>
                <td>{u.email_verified ? 'Yes' : 'No'}</td>
                <td>
                  <span className="admin-badge admin-badge--ok">{u.state}</span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminFrame>
  );
}

async function AdminUsers() {
  const response = await adminOriginFetch('/api/v1/admin/users');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as {
    data?: Array<{
      customer_id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      state: string;
      email_verified: boolean;
      created_at: string;
    }>;
  };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="users"
      title="Roles & Permissions Management"
      lede="Assign least-privilege RBAC roles across administrative and trade accounts. Every role change is recorded in the append-only audit log."
    >
      <AdminUsersTable initialUsers={rows} />
    </AdminFrame>
  );
}

async function AdminAuditLogs() {
  const response = await adminOriginFetch('/api/v1/admin/audit-logs');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeAuditLogRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="audit"
      title="Security & Operational Audit Logs"
      lede="Append-only record of privileged actions with before and after states."
    >
      {rows.length === 0 ? (
        <div className="admin-empty">No audit log entries recorded yet.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log) => (
              <tr key={log.id}>
                <td>
                  {new Date(log.created_at).toLocaleString('en-GB', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </td>
                <td>
                  <code>{log.actor_type}</code>
                </td>
                <td>
                  <strong>{log.action}</strong>
                </td>
                <td>
                  {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}…)` : ''}
                </td>
                <td>{log.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminFrame>
  );
}

async function AdminContent() {
  const response = await adminOriginFetch('/api/v1/admin/content/pages');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: Record<string, unknown>[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="content"
      title="Content & Editorial CMS"
      lede="CMS pages under the locking workflow. Approval is two-person for trust-bearing pages and publish requires an approved head revision."
    >
      <AdminCmsWorkspace initialPages={rows} />
    </AdminFrame>
  );
}

async function AdminCertificates() {
  const response = await adminOriginFetch('/api/v1/admin/certificates');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeCertificateRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="certificates"
      title="Certificates & OCR Verification (INV-07)"
      lede="Review laboratory certificates and resolve OCR anomalies. Unverified certificate fields are redacted from public storefront responses."
    >
      <AdminCertificatesWorkspace initialCertificates={rows} />
    </AdminFrame>
  );
}

async function AdminMigration() {
  const response = await adminOriginFetch('/api/v1/admin/migration');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeMigrationOverview };
  const overview = body.data ?? { batches: [], conflicts: [], derived_refs: [] };

  return (
    <AdminFrame
      active="migration"
      title="Migration Batches, Conflicts & INV-08 Derived References"
      lede="Inspect deterministic migration batches, unresolved staging conflicts, and approve or reject inferred derived SKUs (INV-08)."
    >
      <AdminMigrationWorkspace initialOverview={overview} />
    </AdminFrame>
  );
}

async function AdminOperations() {
  const response = await adminOriginFetch('/api/v1/admin/operations');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeOperationsOverview };
  const overview = body.data ?? {
    outbox: { pending: 0, published: 0, dead_letter: 0 },
    recent_events: [],
    queues: [],
  };

  return (
    <AdminFrame
      active="operations"
      title="Operations, Outbox & Job Queues"
      lede="Monitor transactional outbox delivery, event consumers, and background worker queues."
    >
      <AdminOperationsWorkspace overview={overview} />
    </AdminFrame>
  );
}

async function AdminOrders() {
  const response = await adminOriginFetch('/api/v1/admin/orders');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: Record<string, unknown>[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="orders"
      title="Orders"
      lede="Customer orders with their authoritative payment and fulfilment states."
    >
      {rows.length === 0 ? (
        <div className="admin-empty">No orders yet.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Email</th>
              <th>State</th>
              <th>Total</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row['id'])}>
                <td>
                  <Link href={`/admin/orders/${String(row['id'])}`}>
                    {String(row['order_number'])}
                  </Link>
                </td>
                <td>{String(row['email'])}</td>
                <td>
                  <span
                    className={`admin-badge ${
                      row['state'] === 'PAID' || row['state'] === 'FULFILLED'
                        ? 'admin-badge--ok'
                        : row['state'] === 'CANCELLED'
                          ? 'admin-badge--danger'
                          : ''
                    }`}
                  >
                    {String(row['state'])}
                  </span>
                </td>
                <td>
                  {String(row['currency'])} {String(row['grand_total'])}
                </td>
                <td>
                  {row['placed_at'] === null
                    ? '—'
                    : new Date(String(row['placed_at'])).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminFrame>
  );
}

async function AdminOrderDetail({ orderId }: { orderId: string }) {
  const uuidOk = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    orderId,
  );
  if (!uuidOk) notFound();
  const response = await apiFetch(`/api/v1/orders/${encodeURIComponent(orderId)}`);
  if (response.status === 404) notFound();
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as {
    data?: {
      id: string;
      order_number: string;
      email: string;
      state: string;
      currency: string;
      subtotal: string;
      discount_total: string;
      shipping_total: string;
      tax_total: string;
      grand_total: string;
      placed_at: string | null;
      version: number;
      shipping_address: Record<string, string | null> | null;
    };
  };
  const order = body.data;
  if (!order) notFound();

  const timelineResponse = await apiFetch(`/api/v1/orders/${encodeURIComponent(orderId)}/timeline`);
  const timelineBody = (await timelineResponse.json().catch(() => null)) as {
    data?: {
      id: string;
      from_state: string | null;
      to_state: string;
      actor_type: string;
      reason: string | null;
      created_at: string;
    }[];
  } | null;
  const events = timelineBody?.data ?? [];

  const money = (amount: string): string =>
    Number(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    });

  return (
    <AdminFrame
      active="orders"
      title={order.order_number}
      lede={`${order.state.replace(/_/g, ' ')} · placed ${
        order.placed_at ? new Date(order.placed_at).toLocaleString('en-GB') : 'pending'
      } · v${order.version}`}
    >
      <section className="admin-panel">
        <h2>Totals ({order.currency})</h2>
        <dl className="admin-rows">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(order.subtotal)}</dd>
          </div>
          <div>
            <dt>Discounts</dt>
            <dd>{money(order.discount_total)}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{money(order.shipping_total)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{money(order.tax_total)}</dd>
          </div>
          <div>
            <dt>Grand total</dt>
            <dd>{money(order.grand_total)}</dd>
          </div>
        </dl>
      </section>
      <section className="admin-panel">
        <h2>Timeline</h2>
        {events.length === 0 ? (
          <p className="admin-lede">No recorded transitions yet.</p>
        ) : (
          <ol className="admin-timeline">
            {events.map((event) => (
              <li key={event.id}>
                <span className="admin-timeline__state">
                  {event.to_state.replace(/_/g, ' ')}
                </span>
                <span className="admin-timeline__when">
                  {new Date(event.created_at).toLocaleString('en-GB', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
                <span className="admin-timeline__reason">
                  {event.reason ?? ''} · {event.actor_type}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </AdminFrame>
  );
}

function AdminUnavailable({ status }: { status: number }) {
  return (
    <div className="admin-empty" role="status">
      The back-office service returned {status}. Nothing is invented in its place — check the API
      plane and retry.
    </div>
  );
}

function AdminFrame({
  active,
  title,
  lede,
  children,
}: {
  active: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <AdminSidebar active={active} />
      <main className="admin-main" id="main-content">
        <span className="admin-eyebrow">Maihan Gems — Back Office</span>
        <h1>{title}</h1>
        <p className="admin-lede">{lede}</p>
        {children}
      </main>
    </div>
  );
}
