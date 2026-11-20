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
import { createCmsRepository, type AuditWriter } from '@maihan/db';
import { hasCapability } from '@maihan/domain';
import { getServerDb } from '../../../api/next-adapter.js';
import { getAdminSession, type AdminSession } from '../../../lib/admin-session.js';
import { AdminPageActions } from '../../../components/admin/AdminPageActions.js';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Reads only; the repository's writes are audited by their own call sites. */
const readOnlyAudit: AuditWriter = async () => undefined;

interface PageProps {
  readonly params: Promise<{ adminPath?: string[] }>;
}

export default async function AdminPage({ params }: PageProps): Promise<React.JSX.Element> {
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  const { adminPath } = await params;
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
        {path !== '' && path !== 'cms/pages' && (
          <p style={{ fontSize: '14px' }}>No console module is mounted at <code>/admin/{path}</code>.</p>
        )}
      </div>
    </div>
  );
}

function Dashboard({ session }: { session: AdminSession }): React.JSX.Element {
  const modules: Array<{ href: string; label: string; module: Parameters<typeof hasCapability>[1] }> = [
    { href: '/admin/cms/pages', label: 'Content pages', module: 'content' },
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
