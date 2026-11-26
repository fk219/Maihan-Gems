/**
 * apps/web/src/app/(storefront)/account/[[...accountPath]]/page.tsx
 *
 * `/account/**` — the signed-in customer's home.
 *
 * SoT 12.2 commits one catch-all for `account/...`. This page does exactly
 * three things and invents nothing:
 *
 *   `/account`                    profile + order-history shell, or a redirect
 *                                 to `/account/login` when there is no session;
 *   `/account/sign-in`            redirect to the real sign-in page;
 *   `/account/verify-email`       the token landing surface;
 *   anything else                 `notFound()` — an unknown account URL is a
 *                                 404, never a fake page that looks signed in.
 *
 * There is deliberately NO order data here. `users` (identity, 0019) and
 * `customers` (commerce, 0009) are separate tables with no established
 * mapping, so joining them would be an invented business rule. The shell says
 * what it does not know instead of showing an empty list that implies "no
 * orders".
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AuthShell } from '../../../../components/account/AuthShell.js';
import { AccountSignOutButton } from '../../../../components/account/AccountSignOutButton.js';
import { AccountVerifyEmailPanel } from '../../../../components/account/AccountVerifyEmailPanel.js';
import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';
import { getCustomerSession } from '../../../../lib/customer-session.js';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

/** Reads the session cookie and the current URL: never prerendered. */
export const dynamic = 'force-dynamic';

interface AccountPageProps {
  readonly params: Promise<{ accountPath?: string[] }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AccountPage({
  params,
  searchParams,
}: AccountPageProps): Promise<React.JSX.Element> {
  const { accountPath } = await params;
  const segments = accountPath ?? [];
  const first = segments[0];

  if (segments.length === 1 && first === 'sign-in') redirect('/account/login');

  if (segments.length === 1 && first === 'verify-email') {
    const query = await searchParams;
    const raw = query['token'];
    const token = typeof raw === 'string' && raw.length > 0 ? raw : undefined;
    return (
      <AuthShell
        title="Verify your email"
        subtitle="Confirming your address lets us send order and certificate updates to the right place."
      >
        <AccountVerifyEmailPanel {...(token === undefined ? {} : { token })} />
      </AuthShell>
    );
  }

  if (segments.length > 0) notFound();

  const session = await getCustomerSession();
  if (session === null) redirect('/account/login');

  return (
    <main className="page account-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Your account' }]} />

      <EditorialMasthead
        eyebrow="Your account"
        title={session.displayName}
        lead="Your profile, the status of your email address, and the order history this environment can actually support."
        meta={<span className="tabular">{session.email}</span>}
      />

      <section className="sf-split" aria-label="Account details">
        <div className="sf-checkout__panel">
          <h2>Profile</h2>
          <dl className="mh-provenance">
            <dt>Name</dt>
            <dd>{session.displayName}</dd>
            <dt>Email</dt>
            <dd style={{ overflowWrap: 'anywhere' }}>{session.email}</dd>
            <dt>Status</dt>
            <dd>{session.emailVerified ? 'Email verified' : 'Email not yet verified'}</dd>
            {session.adminRole !== null && (
              <>
                <dt>Console role</dt>
                <dd>
                  <span className="tabular">{session.adminRole}</span>{' '}
                  <Link href="/admin" style={{ color: '#6e4f0e', textUnderlineOffset: 3 }}>
                    Open the console
                  </Link>
                </dd>
              </>
            )}
          </dl>
          <AccountSignOutButton />
        </div>

        <div className="sf-checkout__panel">
          <h2>Order history</h2>
          <p>
            Orders will appear here once checkout is live for your account. Nothing is listed
            yet, and we would rather show you nothing than a list we cannot verify.
          </p>
          <p>
            A stone you are considering can still be discussed with the salon at any time, using
            its product reference.
          </p>
          <div className="sf-checkout__actions">
            <Link className="mh-cta" href="/varieties">
              Browse the varieties
            </Link>
            <Link className="mh-cta mh-cta--quiet" href="/contact">
              Contact the salon
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
