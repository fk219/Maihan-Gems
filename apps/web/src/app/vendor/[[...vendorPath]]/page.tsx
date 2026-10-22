/**
 * apps/web/src/app/vendor/[[...vendorPath]]/page.tsx
 *
 * `/vendor/**` — the Vendor Trade Partner Portal:
 *   /vendor             dashboard (real product counts, moderation state, revenue, order lines)
 *   /vendor/products    product management, image validation, SKU/stock/price & review submission
 *   /vendor/orders      vendor-scoped order lines & fulfilment tracking updates
 *   /vendor/profile     vendor business profile & bourse onboarding status
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { VendorOrderLineDto, VendorProductDto, VendorProfileDto } from '@maihan/db';
import { accountApi, getAuthenticatedSessionActor } from '../../../lib/account-server.js';
import {
  VendorOrdersWorkspace,
  VendorProductWorkspace,
  VendorProfileWorkspace,
} from '../../../components/vendor/VendorWorkspaces.js';

interface PageProps {
  params: Promise<{ vendorPath?: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vendorPath } = await params;
  const titles: Record<string, string> = {
    dashboard: 'Vendor Dashboard | Maihan Gems Partner Console',
    products: 'Products & Inventory | Maihan Gems Partner Console',
    orders: 'Orders & Fulfilment | Maihan Gems Partner Console',
    profile: 'Partner Profile | Maihan Gems Partner Console',
  };
  return {
    title: titles[vendorPath?.[0] ?? 'dashboard'] ?? 'Maihan Gems Partner Console',
    robots: { index: false, follow: false },
  };
}

export default async function VendorPortalPage({ params }: PageProps) {
  const { vendorPath } = await params;
  const segments = vendorPath ?? [];
  if (segments.length > 1) notFound();
  const section = segments[0];

  const actor = await getAuthenticatedSessionActor();
  if (!actor) {
    return (
      <div className="admin-gate" role="alert">
        <span className="admin-eyebrow">Maihan Gems · Trade Partner Console</span>
        <h1>Vendor Authentication Required</h1>
        <p>
          Sign in with an authorized Trade Partner account or register as a Bourse Dealer to access
          vendor inventory, product moderation, and fulfilment workflows.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <Link href="/account/sign-in" className="lx-btn lx-btn--solid">
            Sign in
          </Link>
          <Link href="/account/register" className="lx-btn lx-btn--ghost">
            Apply as Trade Partner
          </Link>
        </div>
      </div>
    );
  }

  if (actor.role !== 'VENDOR' || !actor.vendor_id) {
    return (
      <div className="admin-gate" role="alert">
        <span className="admin-eyebrow">Maihan Gems · Trade Partner Console</span>
        <h1>Not Permitted (403)</h1>
        <p>
          Your account ({actor.email}, role <code>{actor.role}</code>) is not registered as a Trade
          Partner vendor. Customer and administrative accounts are isolated from vendor workspaces.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <Link href="/account" className="lx-btn lx-btn--solid">
            Return to Account
          </Link>
          <Link href="/" className="lx-btn lx-btn--ghost">
            Storefront
          </Link>
        </div>
      </div>
    );
  }

  const dashRes = await accountApi<{
    vendor: VendorProfileDto;
    summary: Record<string, number | string>;
    recent_products: VendorProductDto[];
    recent_orders: VendorOrderLineDto[];
  }>('/vendor/dashboard');

  if (!dashRes.ok || !dashRes.data) {
    return (
      <div className="admin-gate" role="alert">
        <span className="admin-eyebrow">Maihan Gems · Trade Partner Console</span>
        <h1>Vendor Service Unavailable</h1>
        <p>{dashRes.message ?? 'Could not load vendor workspace.'}</p>
      </div>
    );
  }

  const { vendor, summary } = dashRes.data;

  switch (section) {
    case undefined:
      return (
        <VendorFrame
          active="dashboard"
          vendor={vendor}
          title={`${vendor.display_name} · Partner Overview`}
          lede={`Bourse location: ${vendor.city}, ${vendor.country_code} · Onboarding status: ${vendor.status}`}
        >
          {vendor.status !== 'APPROVED' ? (
            <div className="lx-account-error" style={{ marginBottom: '1.5rem' }} role="status">
              Onboarding status: <strong>{vendor.status}</strong>.
              {vendor.rejection_reason ? ` Note: ${vendor.rejection_reason}` : ' Pending administrator review.'}
            </div>
          ) : null}

          <div className="admin-tilegrid">
            <div className="admin-tile">
              <span className="admin-tile__label">Total Products</span>
              <p className="admin-tile__value">{summary['total_products'] ?? 0}</p>
            </div>
            <div className="admin-tile">
              <span className="admin-tile__label">Drafts</span>
              <p className="admin-tile__value">{summary['draft_products'] ?? 0}</p>
            </div>
            <div className="admin-tile">
              <span className="admin-tile__label">Pending Review</span>
              <p className="admin-tile__value">{summary['submitted_products'] ?? 0}</p>
            </div>
            <div className="admin-tile">
              <span className="admin-tile__label">Published Live</span>
              <p className="admin-tile__value">{summary['published_products'] ?? 0}</p>
            </div>
            <div className="admin-tile">
              <span className="admin-tile__label">Rejected</span>
              <p className="admin-tile__value">{summary['rejected_products'] ?? 0}</p>
            </div>
            <div className="admin-tile">
              <span className="admin-tile__label">Out of Stock</span>
              <p className="admin-tile__value">{summary['out_of_stock_products'] ?? 0}</p>
            </div>
            <div className="admin-tile">
              <span className="admin-tile__label">Order Lines</span>
              <p className="admin-tile__value">{summary['total_order_lines'] ?? 0}</p>
            </div>
            <div className="admin-tile">
              <span className="admin-tile__label">Revenue (USD)</span>
              <p className="admin-tile__value">${summary['total_revenue_usd'] ?? '0.00'}</p>
            </div>
          </div>

          <section className="admin-panel">
            <h2>Quick Actions</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/vendor/products" className="lx-btn lx-btn--solid">
                Manage Products &amp; Submissions
              </Link>
              <Link href="/vendor/orders" className="lx-btn lx-btn--ghost">
                Manage Order Fulfilment
              </Link>
              <Link href="/vendor/profile" className="lx-btn lx-btn--ghost">
                Partner Profile
              </Link>
            </div>
          </section>
        </VendorFrame>
      );

    case 'products': {
      const prodRes = await accountApi<{ products: VendorProductDto[] }>('/vendor/products');
      return (
        <VendorFrame
          active="products"
          vendor={vendor}
          title="Products & Catalogue Submissions"
          lede="Create draft pieces, manage SKU pricing and inventory, and submit items for Maihan Gems gemmological approval."
        >
          <VendorProductWorkspace
            vendorStatus={vendor.status}
            initialProducts={prodRes.data?.products ?? []}
          />
        </VendorFrame>
      );
    }

    case 'orders': {
      const ordRes = await accountApi<{ orders: VendorOrderLineDto[] }>('/vendor/orders');
      return (
        <VendorFrame
          active="orders"
          vendor={vendor}
          title="Orders & Armoured Fulfilment"
          lede="View order lines containing your pieces and record armoured carrier dispatch & tracking numbers."
        >
          <VendorOrdersWorkspace initialOrders={ordRes.data?.orders ?? []} />
        </VendorFrame>
      );
    }

    case 'profile':
      return (
        <VendorFrame
          active="profile"
          vendor={vendor}
          title="Partner Profile & Onboarding"
          lede="Manage your bourse credentials, legal entity details, and trade desk contact information."
        >
          <VendorProfileWorkspace profile={vendor} />
        </VendorFrame>
      );

    default:
      notFound();
  }
}

function VendorFrame({
  active,
  vendor,
  title,
  lede,
  children,
}: {
  active: 'dashboard' | 'products' | 'orders' | 'profile';
  vendor: VendorProfileDto;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  const navLinks = [
    { href: '/vendor', label: 'Dashboard', key: 'dashboard' },
    { href: '/vendor/products', label: 'Products & Inventory', key: 'products' },
    { href: '/vendor/orders', label: 'Orders & Fulfilment', key: 'orders' },
    { href: '/vendor/profile', label: 'Partner Profile', key: 'profile' },
  ];
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <p className="admin-sidebar__group">Partner Console</p>
        <nav aria-label="Vendor navigation">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={active === l.key ? 'is-on' : undefined}
              aria-current={active === l.key ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="admin-sidebar__group">Account &amp; Storefront</p>
        <nav aria-label="Account links">
          <Link href="/account">Client Portfolio ({vendor.email})</Link>
          <Link href="/">Public Storefront ↗</Link>
        </nav>
      </aside>
      <main className="admin-main" id="main-content">
        <span className="admin-eyebrow">
          Maihan Gems · Trade Partner ({vendor.status})
        </span>
        <h1>{title}</h1>
        <p className="admin-lede">{lede}</p>
        {children}
      </main>
    </div>
  );
}
