/**
 * apps/web/src/app/admin/login/page.tsx
 *
 * ADR-027 — the sign-in route.
 *
 * A static segment beats the `[[...adminPath]]` optional catch-all, so this
 * page renders without the console guard and therefore without a redirect loop.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminLoginForm } from '../../../components/admin/AdminLoginForm.js';
import { getAdminSession } from '../../../lib/admin-session.js';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage(): Promise<React.JSX.Element> {
  const session = await getAdminSession();
  if (session !== null) redirect('/admin');

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#08121E',
        padding: '48px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FAFAF8',
          border: '1px solid rgba(201,168,76,0.35)',
          borderRadius: '14px',
          padding: '40px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#6B6455',
          }}
        >
          Maihan Gems
        </p>
        <h1
          style={{
            margin: '8px 0 6px',
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '32px',
            color: '#08121E',
          }}
        >
          Atelier Console
        </h1>
        <p style={{ margin: '0 0 26px', fontSize: '13px', color: '#5A5448' }}>
          Administrative access is restricted to authorised staff.
        </p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
