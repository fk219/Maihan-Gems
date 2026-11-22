/**
 * apps/web/src/app/(storefront)/account/register/page.tsx
 *
 * `/account/register` — customer self-registration.
 *
 * Same static-segment-beside-catch-all rule as `/account/login`. No data
 * access, no cookie read: a shell around a client form.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { AccountRegisterForm } from '../../../../components/account/AccountRegisterForm.js';
import { AuthShell } from '../../../../components/account/AuthShell.js';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a Maihan Gems account.',
  robots: { index: false, follow: false },
};

export default function AccountRegisterPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Create your account"
      subtitle="An account keeps your enquiries, orders and saved stones in one place."
      footer={
        <span>
          Already have an account?{' '}
          <Link href="/account/login" style={{ color: '#8B6914', textDecoration: 'underline' }}>
            Sign in
          </Link>
        </span>
      }
    >
      <AccountRegisterForm />
    </AuthShell>
  );
}
