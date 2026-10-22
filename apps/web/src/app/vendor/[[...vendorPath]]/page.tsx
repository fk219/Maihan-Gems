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
import { OperatorChart, OperatorEmpty } from '../../../components/admin/OperatorDesk.js';
import { Button } from '../../../components/ui/button.js';
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
          <Button asChild>
            <Link href="/account/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account/register">Apply as trade partner</Link>
          </Button>
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
          <Button asChild>
            <Link href="/account">Return to account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Storefront</Link>
          </Button>
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

  const {
    vendor,
    summary,
    recent_products: recentProducts = [],
    recent_orders: recentOrders = [],
  } = dashRes.data;
  const productCount = Number(summary['total_products'] ?? 0);

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

          {productCount === 0 ? (
            <OperatorEmpty
              title="The bench is empty."
              copy="Nothing is on file for this desk yet."
              href="/vendor/products"
              action="Add your first piece"
            />
          ) : (
            <OperatorChart
              rows={[
                { label: 'Pieces', value: productCount },
                { label: 'Drafts', value: Number(summary['draft_products'] ?? 0) },
                { label: 'In review', value: Number(summary['submitted_products'] ?? 0) },
                { label: 'Published', value: Number(summary['published_products'] ?? 0) },
                { label: 'Orders', value: Number(summary['total_order_lines'] ?? 0) },
              ]}
            />
          )}

          <section>
            <h2>Recent pieces</h2>
            <table className="operator-table">
              <thead>
                <tr>
                  <th>Piece</th>
                  <th>SKU</th>
                  <th>State</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No pieces yet.</td>
                  </tr>
                ) : (
                  recentProducts.slice(0, 6).map((piece) => (
                    <tr key={piece.id}>
                      <td>{piece.title}</td>
                      <td>{piece.sku}</td>
                      <td>{piece.moderation_status}</td>
                      <td>
                        {piece.price_amount} {piece.currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Recent orders</h2>
            <table className="operator-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Piece</th>
                  <th>Qty</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No orders yet.</td>
                  </tr>
                ) : (
                  recentOrders.slice(0, 6).map((line) => (
                    <tr key={line.order_item_id}>
                      <td>{line.order_number}</td>
                      <td>{line.title_snapshot}</td>
                      <td>{line.quantity}</td>
                      <td>{line.fulfillment_state}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <Button asChild>
              <Link href="/vendor/products">Open products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/vendor/orders">Open orders</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/vendor/profile">Partner profile</Link>
            </Button>
          </div>
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
        <header className="operator-pagehead">
          <span className="admin-eyebrow">Trade partner · {vendor.status}</span>
          <h1>{title}</h1>
          <p className="admin-lede">{lede}</p>
        </header>
        {children}
      </main>
    </div>
  );
}
