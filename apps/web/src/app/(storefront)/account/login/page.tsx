/**
 * apps/web/src/app/(storefront)/account/login/page.tsx
 *
 * `/account/login` — the customer sign-in surface.
 *
 * A static segment beside `account/[[...accountPath]]`, so it wins the match
 * exactly as `admin/login` wins over `admin/[[...adminPath]]`.
 *
 * The page itself performs no data access and reads no cookie: it is a shell
 * around a client form, which keeps it buildable with no database present. The
 * group layout already marks the subtree dynamic because the storefront header
 * queries the mega menu.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { AccountLoginForm } from '../../../../components/account/AccountLoginForm.js';
import { AuthShell } from '../../../../components/account/AuthShell.js';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Maihan Gems account.',
  robots: { index: false, follow: false },
};

export default function AccountLoginPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your orders, saved pieces and the stones you have been considering."
      footer={
        <span>
          New to Maihan Gems?{' '}
          <Link href="/account/register" style={{ color: '#8B6914', textDecoration: 'underline' }}>
            Create an account
          </Link>
        </span>
      }
    >
      <AccountLoginForm />
    </AuthShell>
  );
}
