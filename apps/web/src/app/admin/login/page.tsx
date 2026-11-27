/**
 * apps/web/src/app/admin/login/page.tsx
 *
 * ADR-027 — the administrative sign-in route.
 *
 * A static segment beats the `[[...adminPath]]` optional catch-all, so this
 * page renders without the console guard and therefore without a redirect
 * loop. It shares one split frame with the vendor door: a lit still and the
 * house line on the left, the form on paper to the right.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminLoginForm } from '../../../components/admin/AdminLoginForm.js';
import { AuthAside } from '../../../components/auth/AuthAside.js';
import { DemoLoginButton } from '../../../components/auth/DemoLoginButton.js';
import { getAdminSession } from '../../../lib/admin-session.js';
import { isDemoLoginEnabled } from '../../../lib/demo-login.js';

export const metadata: Metadata = {
  title: 'Console sign in | Maihan Gems',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage(): Promise<React.JSX.Element> {
  const session = await getAdminSession();
  if (session !== null) redirect('/admin');

  const demoEnabled = isDemoLoginEnabled();

  return (
    <main className="mh-auth" id="main-content">
      <AuthAside surface="Atelier console" />

      <section className="mh-auth__panel" aria-labelledby="admin-login-title">
        <div className="mh-auth__card">
          <p className="mh-auth__eyebrow">Administration</p>
          <h1 id="admin-login-title" className="mh-auth__title">
            Atelier console
          </h1>
          <p className="mh-auth__note">
            Administrative access is restricted to authorised staff. Every privileged action is
            recorded with its before and after state.
          </p>

          <AdminLoginForm />

          {demoEnabled ? (
            <>
              <p className="mh-auth__divider" aria-hidden="true">
                or
              </p>
              <DemoLoginButton surface="admin" redirectTo="/admin" />
            </>
          ) : null}

          <a className="mh-auth__back" href="/">
            ← Return to the storefront
          </a>
        </div>
      </section>
    </main>
  );
}
