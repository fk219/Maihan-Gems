/**
 * apps/web/src/app/(storefront)/account/[[...accountPath]]/page.tsx
 *
 * `/account/**` — the signed-in customer's home.
 *
 * SoT 12.2 commits one catch-all for `account/...`; Phase 6 owns the real
 * sub-route structure. This page therefore does exactly three things and
 * invents nothing:
 *
 *   `/account`                    profile + order-history shell, or a redirect
 *                                 to `/account/login` when there is no session;
 *   `/account/sign-in`            redirect to the real sign-in page (the 301
 *                                 target of the legacy `/auth` route);
 *   `/account/verify-email`       the token landing surface (the 301 target of
 *                                 the legacy `/verify-email` route);
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
    <main
      style={{
        maxWidth: '880px',
        margin: '0 auto',
        padding: 'clamp(40px, 7vw, 88px) 24px',
        display: 'grid',
        gap: '28px',
      }}
    >
      <header style={{ display: 'grid', gap: '8px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#6B6455',
          }}
        >
          Your account
        </p>
        <h1
          style={{
            margin: 0,
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(30px, 4vw, 40px)',
            lineHeight: 1.15,
            color: '#08121E',
          }}
        >
          {session.displayName}
        </h1>
      </header>

      <section
        aria-labelledby="account-profile-heading"
        style={{
          border: '1px solid rgba(201,168,76,0.28)',
          borderRadius: '14px',
          padding: 'clamp(20px, 4vw, 28px)',
          background: '#FAFAF8',
          display: 'grid',
          gap: '16px',
        }}
      >
        <h2
          id="account-profile-heading"
          style={{
            margin: 0,
            fontSize: '12px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#6B6455',
          }}
        >
          Profile
        </h2>
        <dl
          style={{
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 160px) 1fr',
            gap: '10px 18px',
            fontSize: '14px',
            color: '#08121E',
          }}
        >
          <dt style={{ color: '#5A5448' }}>Name</dt>
          <dd style={{ margin: 0 }}>{session.displayName}</dd>
          <dt style={{ color: '#5A5448' }}>Email</dt>
          <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{session.email}</dd>
          <dt style={{ color: '#5A5448' }}>Status</dt>
          <dd style={{ margin: 0 }}>
            {session.emailVerified ? 'Email verified' : 'Email not yet verified'}
          </dd>
        </dl>
        {session.adminRole === null ? null : (
          <p style={{ margin: 0, fontSize: '13px', color: '#5A5448' }}>
            This account also holds the administrative role{' '}
            <strong style={{ color: '#08121E' }}>{session.adminRole}</strong>.{' '}
            <Link href="/admin" style={{ color: '#8B6914', textDecoration: 'underline' }}>
              Open the console
            </Link>
          </p>
        )}
        <AccountSignOutButton />
      </section>

      <section
        aria-labelledby="account-orders-heading"
        style={{
          border: '1px solid rgba(201,168,76,0.28)',
          borderRadius: '14px',
          padding: 'clamp(20px, 4vw, 28px)',
          display: 'grid',
          gap: '12px',
        }}
      >
        <h2
          id="account-orders-heading"
          style={{
            margin: 0,
            fontSize: '12px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#6B6455',
          }}
        >
          Order history
        </h2>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: '#5A5448' }}>
          Orders will appear here once checkout is live for your account. Nothing is listed yet,
          and we would rather show you nothing than a list we cannot yet verify.
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#6B6455' }}>
          A stone you are considering can still be discussed with our gemmologists at any time.
        </p>
      </section>
    </main>
  );
}
