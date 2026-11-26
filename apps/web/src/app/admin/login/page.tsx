/**
 * apps/web/src/app/admin/login/page.tsx
 *
 * ADR-027 — the administrative sign-in route.
 *
 * A static segment beats the `[[...adminPath]]` optional catch-all, so this
 * page renders without the console guard and therefore without a redirect
 * loop. The frame is deliberately not the storefront: it is a sealed door,
 * not a shop window.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminLoginForm } from '../../../components/admin/AdminLoginForm.js';
import { getAdminSession } from '../../../lib/admin-session.js';

export const metadata: Metadata = {
  title: 'Console sign in | Maihan Gems',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage(): Promise<React.JSX.Element> {
  const session = await getAdminSession();
  if (session !== null) redirect('/admin');

  return (
    <main className="console-auth">
      <div className="console-auth__card">
        <p className="console-auth__brand">Maihan Gems</p>
        <h1 className="console-auth__title">Atelier console</h1>
        <p className="console-auth__note">
          Administrative access is restricted to authorised staff. Every privileged action is
          recorded with its before and after state.
        </p>
        <AdminLoginForm />
        <a className="console-auth__link" href="/">
          ← Return to the storefront
        </a>
      </div>
    </main>
  );
}
