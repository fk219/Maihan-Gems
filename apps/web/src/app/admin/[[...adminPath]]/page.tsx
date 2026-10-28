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
  AiLogRow,
  BackOfficeAuditLogRow,
  BackOfficeCertificateRow,
  BackOfficeDiscountRow,
  BackOfficeMigrationOverview,
  BackOfficeOperationsOverview,
  BackOfficeRefundRow,
  CatalogueProductRow,
  JobOpsRow,
  NavigationRow,
  RedirectRow,
  SeoMetadataRow,
  VendorProfileDto,
} from '@maihan/db';

import { requireAdminAccess, AdminGateScreen } from '../../../lib/admin-server.js';
import { AdminShell } from '../../../components/mgh/operator/AdminShell.js';
import type { AdminActor } from '@maihan/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.js';
import {
  AdminAiOpsWorkspace,
  AdminCertificatesWorkspace,
  AdminCmsWorkspace,
  AdminDiscountsWorkspace,
  AdminMigrationWorkspace,
  AdminNavigationWorkspace,
  AdminOperationsWorkspace,
  AdminProductModerationTable,
  AdminRefundsTable,
  AdminSeoWorkspace,
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
      return <AdminDashboard actor={access.actor} />;
    }
    case 'catalogue': {
      const access = await requireAdminAccess('products', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminCatalogue actor={access.actor} />;
    }
    case 'vendors': {
      const access = await requireAdminAccess('products', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminVendors actor={access.actor} />;
    }
    case 'content': {
      const access = await requireAdminAccess('content', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminContent actor={access.actor} />;
    }
    case 'orders': {
      const access = await requireAdminAccess('orders', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      if (sub !== undefined) return <AdminOrderDetail actor={access.actor} orderId={sub} />;
      return <AdminOrders actor={access.actor} />;
    }
    case 'refunds': {
      const access = await requireAdminAccess('refunds', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminRefunds actor={access.actor} />;
    }
    case 'discounts': {
      const access = await requireAdminAccess('orders', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminDiscounts actor={access.actor} />;
    }
    case 'customers': {
      const access = await requireAdminAccess('orders', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminCustomers actor={access.actor} />;
    }
    case 'users': {
      const access = await requireAdminAccess('dashboards', 'write');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminUsers actor={access.actor} />;
    }
    case 'audit': {
      const access = await requireAdminAccess('dashboards', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminAuditLogs actor={access.actor} />;
    }
    case 'certificates': {
      const access = await requireAdminAccess('certificates', 'list');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminCertificates actor={access.actor} />;
    }
    case 'migration': {
      const access = await requireAdminAccess('import_batches', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminMigration actor={access.actor} />;
    }
    case 'operations': {
      const access = await requireAdminAccess('dashboards', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminOperations actor={access.actor} />;
    }
    case 'seo': {
      const access = await requireAdminAccess('seo', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminSeo actor={access.actor} />;
    }
    case 'navigation': {
      const access = await requireAdminAccess('navigation', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminNavigation actor={access.actor} />;
    }
    case 'ai-ops': {
      const access = await requireAdminAccess('ai_logs', 'read');
      if (!access.ok) return <AdminGateScreen status={access.status} />;
      return <AdminAiOps actor={access.actor} />;
    }
    default:
      notFound();
  }
}

async function AdminSeo({ actor }: { actor: AdminActor }) {
  const [seoRes, redirectRes] = await Promise.all([
    adminOriginFetch('/api/v1/admin/seo?limit=100'),
    adminOriginFetch('/api/v1/admin/redirects?limit=200'),
  ]);
  if (!seoRes.ok || !redirectRes.ok) {
    return <AdminUnavailable status={seoRes.ok ? redirectRes.status : seoRes.status} />;
  }
  const seoBody = (await seoRes.json()) as { data?: SeoMetadataRow[] };
  const redirectBody = (await redirectRes.json()) as { data?: RedirectRow[] };
  return (
    <AdminFrame
      active="seo"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="SEO Metadata & Redirects"
      lede="Canonical titles, descriptions, robots and the 44,218-row redirect manager — audit rows land on every edit."
    >
      <AdminSeoWorkspace seo={seoBody.data ?? []} redirects={redirectBody.data ?? []} />
    </AdminFrame>
  );
}

async function AdminNavigation({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/navigation');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: NavigationRow[] };
  return (
    <AdminFrame
      active="navigation"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Navigation"
      lede="Header, footer, mega-menu and mobile navigation are data-driven from the `navigations` table — the storefront renders whatever is stored."
    >
      <AdminNavigationWorkspace navigations={body.data ?? []} />
    </AdminFrame>
  );
}

async function AdminAiOps({ actor }: { actor: AdminActor }) {
  const [jobsRes, logsRes] = await Promise.all([
    adminOriginFetch('/api/v1/admin/jobs?limit=100'),
    adminOriginFetch('/api/v1/admin/ai-logs?limit=50'),
  ]);
  if (!jobsRes.ok || !logsRes.ok) {
    return <AdminUnavailable status={jobsRes.ok ? logsRes.status : jobsRes.status} />;
  }
  const jobsBody = (await jobsRes.json()) as { data?: JobOpsRow[] };
  const logsBody = (await logsRes.json()) as { data?: AiLogRow[] };
  return (
    <AdminFrame
      active="ai-ops"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="AI-Ops"
      lede="Job queues with honest states, dead-letter requeue (guarded, audited), and the AI interaction log tail."
    >
      <AdminAiOpsWorkspace jobs={jobsBody.data ?? []} aiLogs={logsBody.data ?? []} />
    </AdminFrame>
  );
}

function fmt(value: number): string {
  return value < 0 ? '—' : value.toLocaleString('en-US');
}

async function AdminDashboard({ actor }: { actor: AdminActor }) {
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
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Executive Dashboard"
      lede="Operational counts read live from the database — no invented metrics."
    >
      <div className="operator-ledger">
        <div className="operator-ledger__lead">
          {tiles.slice(0, 3).map((tile) => (
            <Card key={tile.label}>
              <CardHeader>
                <CardTitle>{tile.label}</CardTitle>
                {tile.note ? <CardDescription>{tile.note}</CardDescription> : null}
              </CardHeader>
              <CardContent>
                <p className="operator-figure">{fmt(tile.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="operator-ledger__rest">
          {tiles.slice(3).map((tile) => (
            <Card key={tile.label}>
              <CardHeader>
                <CardTitle>{tile.label}</CardTitle>
                {tile.note ? <CardDescription>{tile.note}</CardDescription> : null}
              </CardHeader>
              <CardContent>
                <p className="operator-figure">{fmt(tile.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminFrame>
  );
}

async function AdminCatalogue({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/products');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: CatalogueProductRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="catalogue"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Product Moderation & Catalogue"
      lede="Review vendor submissions, approve or reject with gemmological feedback, and publish verified pieces to the storefront."
    >
      <AdminProductModerationTable initialProducts={rows} />
    </AdminFrame>
  );
}

async function AdminVendors({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/vendors');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: VendorProfileDto[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="vendors"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Trade Partner Vendors"
      lede="Review vendor onboarding applications, approve bourse dealers, or suspend/reactivate partner access."
    >
      <AdminVendorModerationTable initialVendors={rows} />
    </AdminFrame>
  );
}

async function AdminRefunds({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/refunds');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeRefundRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="refunds"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Returns & Refund Requests"
      lede="Multi-stage refund approval workflow (REQUESTED -> APPROVED -> SUCCEEDED / REJECTED) bounded by captured payment amounts."
    >
      <AdminRefundsTable initialRefunds={rows} />
    </AdminFrame>
  );
}

async function AdminDiscounts({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/discounts');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeDiscountRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="discounts"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Promotions & Discount Codes"
      lede="Configure scoped percentage, fixed-amount, or complimentary-shipping promotional codes."
    >
      <AdminDiscountsWorkspace initialDiscounts={rows} />
    </AdminFrame>
  );
}

async function AdminCustomers({ actor }: { actor: AdminActor }) {
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
      actorName={actor.displayName}
      actorRole={actor.role}
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

async function AdminUsers({ actor }: { actor: AdminActor }) {
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
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Roles & Permissions Management"
      lede="Assign least-privilege RBAC roles across administrative and trade accounts. Every role change is recorded in the append-only audit log."
    >
      <AdminUsersTable initialUsers={rows} />
    </AdminFrame>
  );
}

async function AdminAuditLogs({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/audit-logs');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeAuditLogRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="audit"
      actorName={actor.displayName}
      actorRole={actor.role}
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

async function AdminContent({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/content/pages');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: Record<string, unknown>[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="content"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Content & Editorial CMS"
      lede="CMS pages under the locking workflow. Approval is two-person for trust-bearing pages and publish requires an approved head revision."
    >
      <AdminCmsWorkspace initialPages={rows} />
    </AdminFrame>
  );
}

async function AdminCertificates({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/certificates');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeCertificateRow[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="certificates"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Certificates & OCR Verification (INV-07)"
      lede="Review laboratory certificates and resolve OCR anomalies. Unverified certificate fields are redacted from public storefront responses."
    >
      <AdminCertificatesWorkspace initialCertificates={rows} />
    </AdminFrame>
  );
}

async function AdminMigration({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/migration');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: BackOfficeMigrationOverview };
  const overview = body.data ?? { batches: [], conflicts: [], derived_refs: [] };

  return (
    <AdminFrame
      active="migration"
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Migration Batches, Conflicts & INV-08 Derived References"
      lede="Inspect deterministic migration batches, unresolved staging conflicts, and approve or reject inferred derived SKUs (INV-08)."
    >
      <AdminMigrationWorkspace initialOverview={overview} />
    </AdminFrame>
  );
}

async function AdminOperations({ actor }: { actor: AdminActor }) {
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
      actorName={actor.displayName}
      actorRole={actor.role}
      title="Operations, Outbox & Job Queues"
      lede="Monitor transactional outbox delivery, event consumers, and background worker queues."
    >
      <AdminOperationsWorkspace overview={overview} />
    </AdminFrame>
  );
}

async function AdminOrders({ actor }: { actor: AdminActor }) {
  const response = await adminOriginFetch('/api/v1/admin/orders');
  if (!response.ok) {
    return <AdminUnavailable status={response.status} />;
  }
  const body = (await response.json()) as { data?: Record<string, unknown>[] };
  const rows = body.data ?? [];

  return (
    <AdminFrame
      active="orders"
      actorName={actor.displayName}
      actorRole={actor.role}
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

async function AdminOrderDetail({ actor, orderId }: { actor: AdminActor; orderId: string }) {
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
      actorName={actor.displayName}
      actorRole={actor.role}
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
  actorName,
  actorRole,
  title,
  lede,
  children,
}: {
  active: string;
  actorName: string;
  actorRole: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <AdminShell active={active} actorName={actorName} actorRole={actorRole}>
      <div className="border-b border-[#E5D4B3] pb-4">
        <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1612]">{title}</h1>
        <p className="text-base text-[#5C4E3C] mt-1">{lede}</p>
      </div>
      {children}
    </AdminShell>
  );
}
