/**
 * apps/web/src/app/admin/[[...adminPath]]/page.tsx
 *
 * Phase 12 / P4 — the administrative console.
 *
 * Authorisation is not a UI concern: this page refuses to render anything
 * without a live session whose user carries an administrative role (ADR-027).
 * The API enforces the same rule independently, so hiding a button is never the
 * control.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  createCmsRepository,
  getCertificateForReview,
  listAnomaliesForCertificate,
  listPendingCertificates,
  listProductsForAdmin,
  listConflicts,
  listDerivedIdentities,
  listImportBatches,
  listRecentBulkOperations,
  type AuditWriter,
  type CertificateAnomalyRow,
  type CertificateReviewDetail,
  type ConflictRow,
  type DerivedIdentityRow,
  type ImportBatchRow,
  type PendingCertificateRow,
  type RecentBulkOperationRow,
} from '@maihan/db';
import { evaluateConfidenceBand, hasCapability } from '@maihan/domain';
import { getServerDb } from '../../../api/next-adapter.js';
import { getAdminSession, type AdminSession } from '../../../lib/admin-session.js';
import { AdminPageActions } from '../../../components/admin/AdminPageActions.js';
import { AdminProductActions } from '../../../components/admin/AdminProductActions.js';
import { AdminConflictResolution } from '../../../components/admin/AdminConflictResolution.js';
import { AdminDerivedIdentityActions } from '../../../components/admin/AdminDerivedIdentityActions.js';
import { AdminBulkCatalogue } from '../../../components/admin/AdminBulkCatalogue.js';
import { AdminCertificateDecision } from '../../../components/admin/AdminCertificateDecision.js';
import { AdminAnomalyResolution } from '../../../components/admin/AdminAnomalyResolution.js';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Reads only; the repository's writes are audited by their own call sites. */
const readOnlyAudit: AuditWriter = async () => undefined;

interface PageProps {
  readonly params: Promise<{ adminPath?: string[] }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPage({ params, searchParams }: PageProps): Promise<React.JSX.Element> {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  const { adminPath } = await params;
  const query = await searchParams;
  const path = (adminPath ?? []).join('/');

  return (
    <div style={{ minHeight: '100vh', background: '#F6F4EF', color: '#08121E' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          padding: '18px 28px',
          background: '#08121E',
          color: '#FAFAF8',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#C9A84C' }}>
            Maihan Gems
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: '20px', fontFamily: 'Cormorant Garamond, serif' }}>
            Atelier Console
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center', fontSize: '13px' }}>
          <span>{session.displayName}</span>
          <span
            style={{
              border: '1px solid rgba(201,168,76,0.5)',
              borderRadius: '999px',
              padding: '4px 12px',
              fontSize: '11px',
              letterSpacing: '0.12em',
            }}
          >
            {session.role}
          </span>
          <form action="/api/v1/auth/logout" method="post">
            <button
              type="submit"
              style={{
                background: 'transparent',
                border: '1px solid rgba(250,250,248,0.35)',
                color: '#FAFAF8',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div style={{ padding: '28px' }}>
        {path === '' && <Dashboard session={session} />}
        {path === 'cms/pages' && <CmsPages session={session} />}
        {path === 'catalog/products' && <Catalogue session={session} />}
        {path === 'catalogue/bulk' && <CatalogueBulk session={session} />}
        {path === 'certificates' && <Certificates session={session} query={query} />}
        {path === 'migration' && <Migration session={session} />}
        {path === 'derived-identities' && <DerivedIdentities session={session} />}
        {path !== '' &&
          path !== 'cms/pages' &&
          path !== 'catalog/products' &&
          path !== 'catalogue/bulk' &&
          path !== 'certificates' &&
          path !== 'migration' &&
          path !== 'derived-identities' && (
            <p style={{ fontSize: '14px' }}>No console module is mounted at <code>/admin/{path}</code>.</p>
          )}
      </div>
    </div>
  );
}

function Dashboard({ session }: { session: AdminSession }): React.JSX.Element {
  const modules: Array<{ href: string; label: string; module: Parameters<typeof hasCapability>[1] }> = [
    { href: '/admin/catalog/products', label: 'Catalogue', module: 'products' },
    { href: '/admin/catalogue/bulk', label: 'Catalogue bulk edit', module: 'products' },
    { href: '/admin/cms/pages', label: 'Content pages', module: 'content' },
    { href: '/admin/certificates', label: 'Certificates', module: 'certificates' },
    { href: '/admin/migration', label: 'Migration console', module: 'import_batches' },
    { href: '/admin/derived-identities', label: 'Derived identities', module: 'derived_approvals' },
  ];
  return (
    <>
      <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>Signed in</h2>
      <p style={{ margin: '0 0 22px', fontSize: '13px', color: '#5A5448' }}>
        Acting as {session.email}. Every privileged mutation is audited.
      </p>
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {modules.map((entry) => {
          const allowed = hasCapability(session.role, entry.module, 'read');
          return (
            <a
              key={entry.href}
              href={entry.href}
              style={{
                display: 'block',
                padding: '18px',
                background: allowed ? '#FFFFFF' : '#EFEDE7',
                border: '1px solid rgba(201,168,76,0.35)',
                borderRadius: '10px',
                textDecoration: 'none',
                color: allowed ? '#08121E' : '#8A867E',
              }}
            >
              <span style={{ fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {entry.label}
              </span>
              <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: '#5A5448' }}>
                {allowed ? 'Open module' : 'Not permitted for this role'}
              </span>
            </a>
          );
        })}
      </div>
    </>
  );
}

async function CmsPages({ session }: { session: AdminSession }): Promise<React.JSX.Element> {
  if (!hasCapability(session.role, 'content', 'read')) {
    return <p style={{ fontSize: '14px' }}>Your role cannot read content.</p>;
  }

  let rows: Array<{ id: string; slug: string; title: string; status: string; version: number }> = [];
  let failure: string | null = null;
  try {
    const db = await getServerDb();
    const repo = createCmsRepository(db, readOnlyAudit);
    rows = await repo.listPages({ limit: 50, offset: 0 });
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  return (
    <>
      <h2 style={{ margin: '0 0 18px', fontSize: '22px' }}>Content pages</h2>
      {failure !== null && (
        <p role="alert" style={{ color: '#B3261E', fontSize: '13px' }}>
          {failure}
        </p>
      )}
      {failure === null && rows.length === 0 && (
        <p style={{ fontSize: '13px', color: '#5A5448' }}>No pages exist yet.</p>
      )}
      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
              <th style={cell}>Title</th>
              <th style={cell}>Slug</th>
              <th style={cell}>State</th>
              <th style={cell}>v</th>
              <th style={cell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                <td style={cell}>{row.title}</td>
                <td style={cell}>
                  <code>{row.slug}</code>
                </td>
                <td style={cell}>{row.status}</td>
                <td style={cell}>{row.version}</td>
                <td style={cell}>
                  <AdminPageActions pageId={row.id} status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

const cell: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' };

async function Migration({ session }: { session: AdminSession }): Promise<React.JSX.Element> {
  const canReadBatches = hasCapability(session.role, 'import_batches', 'list');
  const canReadConflicts = hasCapability(session.role, 'conflicts', 'list');
  if (!canReadBatches && !canReadConflicts) {
    return <p style={{ fontSize: '14px' }}>Your role cannot read migration data.</p>;
  }

  let batches: ImportBatchRow[] = [];
  let batchTotal = 0;
  let conflicts: ConflictRow[] = [];
  let conflictTotal = 0;
  let failure: string | null = null;
  try {
    const db = await getServerDb();
    if (canReadBatches) {
      const page = await listImportBatches(db, { limit: 50, offset: 0 });
      batches = page.items;
      batchTotal = page.total;
    }
    if (canReadConflicts) {
      const page = await listConflicts(db, { resolved: false, limit: 50, offset: 0 });
      conflicts = page.items;
      conflictTotal = page.total;
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  return (
    <>
      <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>Migration console</h2>
      <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#5A5448' }}>
        Import batches, staging row counts and the open conflict queue. A conflict is
        never resolved automatically: both sides are shown and a human records the
        decision once.
      </p>
      {failure !== null && (
        <p role="alert" style={{ color: '#B3261E', fontSize: '13px' }}>
          {failure}
        </p>
      )}

      {canReadBatches && (
        <>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>
            Import batches {failure === null && <span style={{ color: '#5A5448', fontWeight: 400 }}>({batchTotal})</span>}
          </h3>
          {failure === null && batches.length === 0 && (
            <p style={{ fontSize: '13px', color: '#5A5448' }}>No import batches exist yet.</p>
          )}
          {batches.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                  <th style={cell}>Batch</th>
                  <th style={cell}>Artifact</th>
                  <th style={cell}>Status</th>
                  <th style={cell}>Seen</th>
                  <th style={cell}>Accepted</th>
                  <th style={cell}>Rejected</th>
                  <th style={cell}>Quarantined</th>
                  <th style={cell}>Staged</th>
                  <th style={cell}>Conflicts (open / all)</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                    <td style={cell}>
                      <code>{batch.batch_key}</code>
                    </td>
                    <td style={cell}>{batch.source_artifact}</td>
                    <td style={cell}>{batch.status}</td>
                    <td style={cell}>{batch.records_seen}</td>
                    <td style={cell}>{batch.records_accepted}</td>
                    <td style={cell}>{batch.records_rejected}</td>
                    <td style={cell}>{batch.records_quarantined}</td>
                    <td style={cell}>{batch.staged_rows}</td>
                    <td style={cell}>
                      {batch.open_conflict_rows} / {batch.conflict_rows}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {canReadConflicts && (
        <>
          <h3 id="conflicts" style={{ margin: '28px 0 10px', fontSize: '16px' }}>
            Open conflicts{' '}
            {failure === null && <span style={{ color: '#5A5448', fontWeight: 400 }}>({conflictTotal})</span>}
          </h3>
          {failure === null && conflicts.length === 0 && (
            <p style={{ fontSize: '13px', color: '#5A5448' }}>No unresolved conflicts. Nothing is auto-resolved.</p>
          )}
          {conflicts.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                  <th style={cell}>Entity</th>
                  <th style={cell}>Field</th>
                  <th style={cell}>Side A</th>
                  <th style={cell}>Side B</th>
                  <th style={cell}>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((conflict) => (
                  <tr key={conflict.id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)', verticalAlign: 'top' }}>
                    <td style={cell}>
                      {conflict.entity_kind} <code>{conflict.entity_ref}</code>
                    </td>
                    <td style={cell}>{conflict.field_name}</td>
                    <td style={cell}>
                      <ConflictSide value={conflict.value_a} sourceUrl={conflict.source_url_a} />
                    </td>
                    <td style={cell}>
                      <ConflictSide value={conflict.value_b} sourceUrl={conflict.source_url_b} />
                    </td>
                    <td style={cell}>
                      <AdminConflictResolution
                        conflictId={conflict.id}
                        valueA={conflict.value_a}
                        valueB={conflict.value_b}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}

function ConflictSide({
  value,
  sourceUrl,
}: {
  readonly value: string | null;
  readonly sourceUrl: string | null;
}): React.JSX.Element {
  return (
    <div>
      <code>{value ?? '—'}</code>
      {sourceUrl !== null && (
        <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#5A5448', wordBreak: 'break-all' }}>
          {sourceUrl}
        </span>
      )}
    </div>
  );
}

async function DerivedIdentities({ session }: { session: AdminSession }): Promise<React.JSX.Element> {
  if (!hasCapability(session.role, 'derived_approvals', 'list')) {
    return <p style={{ fontSize: '14px' }}>Your role cannot read the derived-identity queue.</p>;
  }

  let rows: DerivedIdentityRow[] = [];
  let total = 0;
  let failure: string | null = null;
  try {
    const db = await getServerDb();
    const page = await listDerivedIdentities(db, { limit: 50, offset: 0 });
    rows = page.items;
    total = page.total;
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  return (
    <>
      <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>Derived identities</h2>
      <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#5A5448' }}>
        The derived-identity queue (INV-08). Approval records a review decision only:
        it never writes <code>source_sku</code>, never promotes{' '}
        <code>sku_evidence_status</code> from INFERRED, and never publishes the row.
        Rejection records a reason and keeps the row.
      </p>
      {failure !== null && (
        <p role="alert" style={{ color: '#B3261E', fontSize: '13px' }}>
          {failure}
        </p>
      )}
      {failure === null && rows.length === 0 && (
        <p style={{ fontSize: '13px', color: '#5A5448' }}>No derived identities exist yet.</p>
      )}
      {rows.length > 0 && (
        <>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#5A5448' }}>
            Showing {rows.length} of {total}.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                <th style={cell}>Derived SKU</th>
                <th style={cell}>Slug</th>
                <th style={cell}>State</th>
                <th style={cell}>Evidence</th>
                <th style={cell}>Review</th>
                <th style={cell}>Note</th>
                <th style={cell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                  <td style={cell}>
                    <code>{row.source_sku_derived}</code>
                  </td>
                  <td style={cell}>
                    <code>{row.slug}</code>
                  </td>
                  <td style={cell}>{row.state}</td>
                  <td style={cell}>{row.sku_evidence_status}</td>
                  <td style={cell}>{row.review_state}</td>
                  <td style={cell}>{row.review_note ?? '—'}</td>
                  <td style={cell}>
                    <AdminDerivedIdentityActions productId={row.id} reviewState={row.review_state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

async function Catalogue({ session }: { session: AdminSession }): Promise<React.JSX.Element> {
  if (!hasCapability(session.role, 'products', 'list')) {
    return <p style={{ fontSize: '14px' }}>Your role cannot read the catalogue.</p>;
  }

  let rows: Awaited<ReturnType<typeof listProductsForAdmin>> = [];
  let failure: string | null = null;
  try {
    const db = await getServerDb();
    rows = await listProductsForAdmin(db, { limit: 50, offset: 0 });
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  const active = rows.filter((row) => row.state === 'ACTIVE').length;

  return (
    <>
      <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>Catalogue</h2>
      <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#5A5448' }}>
        Showing {rows.length} product{rows.length === 1 ? '' : 's'} · {active} published.
        Publishing requires verified price evidence (gate V15).
      </p>
      {failure !== null && (
        <p role="alert" style={{ color: '#B3261E', fontSize: '13px' }}>
          {failure}
        </p>
      )}
      {failure === null && rows.length === 0 && (
        <p style={{ fontSize: '13px', color: '#5A5448' }}>No products exist yet.</p>
      )}
      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
              <th style={cell}>Title</th>
              <th style={cell}>Slug</th>
              <th style={cell}>Kind</th>
              <th style={cell}>Price</th>
              <th style={cell}>Evidence</th>
              <th style={cell}>State</th>
              <th style={cell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                <td style={cell}>{row.title}</td>
                <td style={cell}>
                  <code>{row.slug}</code>
                </td>
                <td style={cell}>{row.kind}</td>
                <td style={cell}>
                  {row.currency} {row.price_amount}
                </td>
                <td style={cell}>{row.price_evidence}</td>
                <td style={cell}>{row.state}</td>
                <td style={cell}>
                  <AdminProductActions productId={row.id} state={row.state} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

async function CatalogueBulk({ session }: { session: AdminSession }): Promise<React.JSX.Element> {
  if (!hasCapability(session.role, 'products', 'bulk')) {
    return <p style={{ fontSize: '14px' }}>Your role cannot run bulk catalogue edits.</p>;
  }

  let rows: Awaited<ReturnType<typeof listProductsForAdmin>> = [];
  let recent: RecentBulkOperationRow[] = [];
  let failure: string | null = null;
  try {
    const db = await getServerDb();
    rows = await listProductsForAdmin(db, { limit: 50, offset: 0 });
    recent = await listRecentBulkOperations(db, { limit: 10 });
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  return (
    <>
      <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>Catalogue bulk edit</h2>
      <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#5A5448' }}>
        Preview first: the dry run returns the per-row outcome and writes nothing. The
        apply writes one audit row per changed product plus one operation row, and can be
        undone exactly once within 30 minutes — only if no affected row changed since.
        Showing the first {rows.length} products.
      </p>
      {failure !== null && (
        <p role="alert" style={{ color: '#B3261E', fontSize: '13px' }}>
          {failure}
        </p>
      )}
      {failure === null && rows.length === 0 && (
        <p style={{ fontSize: '13px', color: '#5A5448' }}>No products exist yet.</p>
      )}
      {rows.length > 0 && (
        <AdminBulkCatalogue
          products={rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            state: row.state,
            priceAmount: `${row.currency} ${row.price_amount}`,
            priceEvidence: row.price_evidence,
          }))}
          recentOperations={recent}
          canUndo={hasCapability(session.role, 'products', 'approve')}
        />
      )}
    </>
  );
}

async function Certificates({
  session,
  query,
}: {
  readonly session: AdminSession;
  readonly query: Record<string, string | string[] | undefined>;
}): Promise<React.JSX.Element> {
  if (!hasCapability(session.role, 'certificates', 'list')) {
    return <p style={{ fontSize: '14px' }}>Your role cannot read the certificate queue.</p>;
  }

  const rawSelected = query['certificate'];
  const selectedId = typeof rawSelected === 'string' ? rawSelected : undefined;

  let rows: PendingCertificateRow[] = [];
  let total = 0;
  let detail: CertificateReviewDetail | null = null;
  let anomalies: readonly CertificateAnomalyRow[] = [];
  let anomalyCounts = { open: 0, resolved: 0 };
  let failure: string | null = null;
  try {
    const db = await getServerDb();
    const page = await listPendingCertificates(db, { limit: 50, offset: 0 });
    rows = page.items;
    total = page.total;
    if (selectedId !== undefined) {
      detail = await getCertificateForReview(db, selectedId);
      const list = await listAnomaliesForCertificate(db, selectedId);
      if (list !== null) {
        anomalies = list.items;
        anomalyCounts = { open: list.open, resolved: list.resolved };
      }
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The database is unavailable.';
  }

  const canDecide = hasCapability(session.role, 'certificates', 'approve');
  const canResolve = hasCapability(session.role, 'anomalies', 'resolve');

  return (
    <>
      <h2 style={{ margin: '0 0 6px', fontSize: '22px' }}>Certificates</h2>
      <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#5A5448' }}>
        Documents with an open anomaly or the least confident extraction are listed first.
        Verification is a whole-document decision: every material field at or above 0.90,
        no open ERROR anomaly, two different trust reviewers, and a named human approver.
        An anomaly is resolved once, with a recorded reason, and is never deleted; a resolved
        anomaly no longer blocks. Nothing here is ever auto-promoted.
      </p>
      {failure !== null && (
        <p role="alert" style={{ color: '#B3261E', fontSize: '13px' }}>
          {failure}
        </p>
      )}
      {failure === null && rows.length === 0 && (
        <p style={{ fontSize: '13px', color: '#5A5448' }}>No certificate is awaiting review.</p>
      )}
      {rows.length > 0 && (
        <>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#5A5448' }}>
            Showing {rows.length} of {total}.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                <th style={cell}>Subject</th>
                <th style={cell}>Kind</th>
                <th style={cell}>Status</th>
                <th style={cell}>Fields</th>
                <th style={cell}>Min confidence</th>
                <th style={cell}>Open anomalies</th>
                <th style={cell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                  <td style={cell}>
                    <code>{row.subject_ref ?? row.id}</code>
                  </td>
                  <td style={cell}>{row.kind}</td>
                  <td style={cell}>{row.verification_status}</td>
                  <td style={cell}>{row.field_count}</td>
                  <td style={cell}>
                    {row.min_confidence === null ? '—' : row.min_confidence.toFixed(3)}
                  </td>
                  <td style={cell}>
                    {row.open_error_anomalies} error / {row.open_warn_anomalies} warn
                  </td>
                  <td style={cell}>
                    <a href={`/admin/certificates?certificate=${encodeURIComponent(row.id)}`}>
                      Review
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {detail !== null && (
        <section
          style={{
            marginTop: '26px',
            background: '#FFFFFF',
            border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>
            Review · <code>{detail.certificate.subject_ref ?? detail.certificate.id}</code>
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#5A5448' }}>
            {detail.certificate.kind} · {detail.certificate.verification_status} ·{' '}
            {detail.fields.length} extracted field{detail.fields.length === 1 ? '' : 's'} ·{' '}
            {detail.openErrorAnomalies} open error · {detail.openWarnAnomalies} open warn ·{' '}
            {detail.verifiable ? 'threshold met' : 'threshold NOT met'}
          </p>

          <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Material fields</h4>
          {detail.materialFields.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#5A5448' }}>
              No material field was extracted, so the document cannot be verified.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                  <th style={cell}>Field</th>
                  <th style={cell}>Confidence</th>
                  <th style={cell}>Band</th>
                  <th style={cell}>At or above 0.90</th>
                </tr>
              </thead>
              <tbody>
                {detail.materialFields.map((field) => (
                  <tr key={field.fieldName} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                    <td style={cell}>{field.fieldName}</td>
                    <td style={cell}>{field.confidence.toFixed(3)}</td>
                    <td style={cell}>{evaluateConfidenceBand(field.confidence)}</td>
                    <td style={cell}>{field.isHighConfidence ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h4 style={{ margin: '18px 0 8px', fontSize: '13px' }}>Extracted fields</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                <th style={cell}>Field</th>
                <th style={cell}>Value</th>
                <th style={cell}>Confidence</th>
                <th style={cell}>Band</th>
                <th style={cell}>Publicly displayable</th>
                <th style={cell}>Bounding box</th>
              </tr>
            </thead>
            <tbody>
              {detail.fields.map((field) => (
                <tr key={field.fieldName} style={{ borderTop: '1px solid rgba(8,18,30,0.08)' }}>
                  <td style={cell}>
                    {field.fieldName}
                    {field.isMaterial ? ' · material' : ''}
                  </td>
                  <td style={cell}>{field.normalizedValue ?? '—'}</td>
                  <td style={cell}>{field.confidence.toFixed(3)}</td>
                  <td style={cell}>{field.band}</td>
                  <td style={cell}>{field.publiclyDisplayable ? 'yes' : 'withheld (below 0.50)'}</td>
                  <td style={cell}>
                    <code>
                      {field.bbox === null || field.bbox === undefined
                        ? '—'
                        : JSON.stringify(field.bbox)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ margin: '18px 0 8px', fontSize: '13px' }}>
            Anomalies {anomalyCounts.open + anomalyCounts.resolved > 0 && (
              <span style={{ fontWeight: 400, color: '#5A5448' }}>
                ({anomalyCounts.open} open, {anomalyCounts.resolved} resolved)
              </span>
            )}
          </h4>
          {anomalies.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#5A5448' }}>No anomaly was recorded for this document.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#EDEAE3' }}>
                  <th style={cell}>Type</th>
                  <th style={cell}>Severity</th>
                  <th style={cell}>Detail</th>
                  <th style={cell}>State</th>
                  <th style={cell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((anomaly) => (
                  <tr key={anomaly.id} style={{ borderTop: '1px solid rgba(8,18,30,0.08)', verticalAlign: 'top' }}>
                    <td style={cell}>{anomaly.anomaly_type}</td>
                    <td style={cell}>{anomaly.severity}</td>
                    <td style={cell}>
                      <code>{JSON.stringify(anomaly.detail)}</code>
                    </td>
                    <td style={cell}>
                      {anomaly.is_open
                        ? 'open'
                        : `resolved ${anomaly.resolved_at === null ? '' : new Date(anomaly.resolved_at).toLocaleString()}`}
                      {anomaly.resolution === null ? null : (
                        <span style={{ display: 'block', color: '#5A5448' }}>{anomaly.resolution}</span>
                      )}
                    </td>
                    <td style={cell}>
                      {anomaly.is_open ? (
                        canResolve ? (
                          <AdminAnomalyResolution anomalyId={anomaly.id} />
                        ) : (
                          <span style={{ color: '#5A5448' }}>Your role cannot resolve anomalies.</span>
                        )
                      ) : (
                        <span style={{ color: '#5A5448' }}>Recorded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {detail.latestReview !== null && (
            <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#5A5448' }}>
              Last review: {detail.latestReview.decision} on{' '}
              {new Date(detail.latestReview.created_at).toLocaleString()}
              {detail.latestReview.notes === null ? '' : ` — ${detail.latestReview.notes}`}
            </p>
          )}

          <div style={{ marginTop: '18px' }}>
            {canDecide ? (
              <AdminCertificateDecision certificateId={detail.certificate.id} />
            ) : (
              <p style={{ fontSize: '12px', color: '#5A5448' }}>
                Your role can read this document but cannot approve or reject it.
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
