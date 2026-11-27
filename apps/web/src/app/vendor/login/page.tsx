/**
 * apps/web/src/app/vendor/login/page.tsx
 *
 * D1 — the vendor sign-in surface.
 *
 * A static segment sits beside the portal pages, so this page renders without
 * the portal guard and therefore without a redirect loop. It carries the same
 * split frame as the admin door — one lit still, one house line, the form on
 * paper — so the two consoles feel like one system.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthAside } from '../../../components/auth/AuthAside.js';
import { DemoLoginButton } from '../../../components/auth/DemoLoginButton.js';
import { VendorLoginForm } from '../../../components/vendor/VendorLoginForm.js';
import { isDemoLoginEnabled } from '../../../lib/demo-login.js';
import { getVendorSession } from '../../../lib/vendor-session.js';

export const metadata: Metadata = {
  title: 'Vendor sign in — Maihan Gems',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function VendorLoginPage(): Promise<React.JSX.Element> {
  const session = await getVendorSession();
  if (session !== null) redirect('/vendor');

  const demoEnabled = isDemoLoginEnabled();

  return (
    <main className="mh-auth" id="main-content">
      <AuthAside surface="Vendor portal" />

      <section className="mh-auth__panel" aria-labelledby="vendor-login-title">
        <div className="mh-auth__card">
          <p className="mh-auth__eyebrow">Partners</p>
          <h1 id="vendor-login-title" className="mh-auth__title">
            The vendor portal
          </h1>
          <p className="mh-auth__note">
            Stock, orders and statements for the vendors who supply the atelier. Use the account
            the platform linked to your vendor; the vendor must be approved before those surfaces
            open.
          </p>

          <VendorLoginForm />

          {demoEnabled ? (
            <>
              <p className="mh-auth__divider" aria-hidden="true">
                or
              </p>
              <DemoLoginButton surface="vendor" redirectTo="/vendor" />
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
