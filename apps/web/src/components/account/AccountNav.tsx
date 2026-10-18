'use client';

/**
 * apps/web/src/components/account/AccountNav.tsx
 *
 * Account section navigation with clear active state and full session sign-out.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { closePortfolio } from '../../app/(storefront)/account/actions.js';

const LINKS: { href: string; label: string; key: string }[] = [
  { href: '/account', label: 'Overview', key: '' },
  { href: '/account/profile', label: 'Profile', key: 'profile' },
  { href: '/account/addresses', label: 'Addresses', key: 'addresses' },
  { href: '/account/orders', label: 'Orders', key: 'orders' },
  { href: '/account/notifications', label: 'Notifications', key: 'notifications' },
  { href: '/favorites', label: 'Wishlist', key: 'favorites' },
];

export function AccountNav({ active }: { active?: string | undefined }) {
  const router = useRouter();
  return (
    <nav className="lx-account-nav" aria-label="Account sections">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={active === link.key ? 'is-on' : undefined}
          aria-current={active === link.key ? 'page' : undefined}
        >
          {link.label}
        </Link>
      ))}
      <button
        type="button"
        className="lx-text-btn"
        onClick={() => {
          void (async () => {
            await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
            await closePortfolio().catch(() => undefined);
            router.push('/account/sign-in');
            router.refresh();
          })();
        }}
      >
        Sign out
      </button>
    </nav>
  );
}
