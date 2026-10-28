'use client';

/**
 * apps/web/src/components/account/AccountNav.tsx
 *
 * Account section navigation with clear active state and full session sign-out.
 * M5: the applet's dark-gold rail styling is available via `tone="gold"` for
 * the migrated dossier shells; the default render keeps the plain rail.
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

export function AccountNav({
  active,
  tone = 'classic',
}: {
  active?: string | undefined;
  tone?: 'classic' | 'gold';
}) {
  const router = useRouter();
  if (tone === 'gold') {
    return (
      <nav aria-label="Account sections" className="space-y-1">
        {LINKS.map((link) => {
          const activeNow = active === link.key;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={activeNow ? 'page' : undefined}
              className={`block px-3.5 py-2.5 rounded-[12px] text-xs uppercase tracking-[0.14em] transition-colors ${
                activeNow
                  ? 'bg-[#C5A059] text-[#14100C] font-semibold shadow-sm'
                  : 'text-[#D8CEBE] hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          className="block px-3.5 py-2.5 rounded-[12px] text-xs uppercase tracking-[0.14em] text-[#D8CEBE] hover:bg-white/10 hover:text-white transition-colors"
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
