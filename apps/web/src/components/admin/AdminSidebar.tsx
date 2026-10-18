'use client';

/**
 * apps/web/src/components/admin/AdminSidebar.tsx
 *
 * Back-office navigation across all administrative domains.
 */
import Link from 'next/link';

const GROUPS: { group: string; links: { href: string; label: string; key: string }[] }[] = [
  {
    group: 'Executive & Commerce',
    links: [
      { href: '/admin', label: 'Dashboard', key: 'dashboard' },
      { href: '/admin/orders', label: 'Orders & Fulfilment', key: 'orders' },
      { href: '/admin/refunds', label: 'Returns & Refunds', key: 'refunds' },
      { href: '/admin/discounts', label: 'Promotions & Codes', key: 'discounts' },
    ],
  },
  {
    group: 'Catalogue & Partners',
    links: [
      { href: '/admin/catalogue', label: 'Product Moderation', key: 'catalogue' },
      { href: '/admin/vendors', label: 'Trade Vendors', key: 'vendors' },
      { href: '/admin/content', label: 'CMS Pages', key: 'content' },
    ],
  },
  {
    group: 'Security & Governance',
    links: [
      { href: '/admin/customers', label: 'Customers', key: 'customers' },
      { href: '/admin/users', label: 'Roles & Permissions', key: 'users' },
      { href: '/admin/audit', label: 'Audit Logs', key: 'audit' },
    ],
  },
];

export function AdminSidebar({ active }: { active: string }) {
  return (
    <aside className="admin-sidebar">
      {GROUPS.map((group) => (
        <div key={group.group}>
          <p className="admin-sidebar__group">{group.group}</p>
          <nav aria-label={`${group.group} sections`}>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={active === link.key ? 'is-on' : undefined}
                aria-current={active === link.key ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ))}
      <p className="admin-sidebar__group">Storefront</p>
      <nav aria-label="Storefront">
        <Link href="/">Open Storefront ↗</Link>
      </nav>
    </aside>
  );
}
