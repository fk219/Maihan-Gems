/**
 * apps/web/src/app/vendor/[[...vendorPath]]/page.tsx
 *
 * `/vendor/**` — the Vendor Trade Partner Portal (M5: the REFERENCE APPLET's
 * golden-cloud markup, one real supplier registry record, real endpoints).
 *
 *   /vendor             applet Partner Overview (real KPIs + intake form)
 *   /vendor/listings    applet Inventory Manager (real products table)
 *   /vendor/payments    applet Order Settlement Ledger (real order lines)
 *   /vendor/onboarding  applet Partner Onboarding wizard (real vendor_onboarding fields)
 *   /vendor/orders      applet Order Fulfilment ledger (real fulfilment updates)
 *   /vendor/overview|orders|payments|payouts → legacy aliases above
 *
 * SEAM RULES (honesty first):
 *   - Applet route placement stays at the repo's /vendor catch-all (task M5
 *     fixed this — the applet had it under (storefront)); the repo's
 *     separate-group layout keeps working.
 *   - Rendering the applet portal for a request WITHOUT a real vendor session
 *     or with a non-vendor account is an auth boundary, not a UI decision, so
 *     the server gate stays FIRST here and its messaging mirrors the applet's
 *     gate card look (no Google SSO fakery, invites, client role inference).
 *   - Every product/order/profile figure the portal renders is fetched via
 *     the real vendor endpoints; there is no localStorage system of record —
 *     see lib/mgh/adapters/vendor.ts.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  accountApi,
  getAuthenticatedSessionActor,
  type AccountApiResult,
} from '../../../lib/account-server.js';
import type {
  VendorOrderLineDto,
  VendorProductDto,
  VendorProfileDto,
} from '@maihan/db';
import { toVendorInventoryList } from '../../../lib/mgh/adapters/vendor.js';
import VendorPortalClient, { type VendorTabId } from '../../../components/mgh/operator/VendorPortalClient.js';

interface PageProps {
  params: Promise<{ vendorPath?: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vendorPath } = await params;
  const titles: Record<string, string> = {
    dashboard: 'Vendor Dashboard | Maihan Gems Partner Console',
    overview: 'Vendor Dashboard | Maihan Gems Partner Console',
    listings: 'Products & Inventory | Maihan Gems Partner Console',
    inventory: 'Products & Inventory | Maihan Gems Partner Console',
    payments: 'Order Settlement Ledger | Maihan Gems Partner Console',
    payouts: 'Order Settlement Ledger | Maihan Gems Partner Console',
    orders: 'Orders & Fulfilment | Maihan Gems Partner Console',
    onboarding: 'Partner Onboarding | Maihan Gems Partner Console',
    kyb: 'Partner Onboarding | Maihan Gems Partner Console',
    profile: 'Partner Profile | Maihan Gems Partner Console',
  };
  return {
    title: titles[vendorPath?.[0] ?? 'dashboard'] ?? 'Maihan Gems Partner Console',
    robots: { index: false, follow: false },
  };
}

function resolveSection(segment: string | undefined): VendorTabId {
  switch (segment) {
    case 'listings':
    case 'inventory':
      return 'listings';
    case 'orders':
      return 'orders';
    case 'payments':
    case 'payouts':
      return 'payments';
    case 'onboarding':
    case 'profile':
    case 'kyb':
      return 'onboarding';
    case 'overview':
    case 'dashboard':
    case undefined:
      return 'overview';
    default:
      // Unknown creator route — the applet rendered 'overview' for anything;
      // the repo's catch-all resolves unknown segments to the overview tab
      // rather than inventing content for them.
      return 'overview';
  }
}

export default async function VendorPortalPage({ params }: PageProps) {
  const { vendorPath } = await params;
  const segments = vendorPath ?? [];
  if (segments.length > 1) {
    return <VendorNotYetAdmitted heading="Route Not Mentioned" body="Deeper vendor paths are not part of this console — use the sidebar modules." />;
  }
  const section = resolveSection(segments[0]);

  const actor = await getAuthenticatedSessionActor();
  if (!actor) {
    return (
      <VendorSessionGate
        heading="Vendor & Mine Partner Portal"
        lede="Manage multi-category inventory (Gemstones, Pairs, Fine Jewellery), track real order lines and carrier dispatches, and complete the supplier onboarding registry."
        actions={[
          { href: '/account/sign-in', label: 'Sign In to Partner Portal', primary: true },
          { href: '/account/register', label: 'Apply as Trade Partner', primary: false },
        ]}
      />
    );
  }

  if (actor.role !== 'VENDOR' || !actor.vendor_id) {
    return (
      <VendorSessionGate
        heading="Not Permitted (403)"
        lede={`Your account (${actor.email}, role ${actor.role}) is not registered as a Trade Partner vendor. Customer and administrative accounts are isolated from vendor workspaces.`}
        actions={[
          { href: '/account', label: 'Return to Account', primary: true },
          { href: '/', label: 'Storefront', primary: false },
        ]}
      />
    );
  }

  const dashRes = await accountApi<{
    vendor: VendorProfileDto;
    summary: Record<string, number | string>;
  }>('/vendor/dashboard');

  if (!dashRes.ok || !dashRes.data) {
    return (
      <VendorSessionGate
        heading="Vendor Service Unavailable"
        lede={dashRes.message ?? 'Could not load vendor workspace.'}
        actions={[{ href: '/', label: 'Return to Storefront', primary: true }]}
      />
    );
  }

  const vendor = dashRes.data.vendor;
  const summary = dashRes.data.summary as unknown as {
    total_products: number;
    draft_products: number;
    submitted_products: number;
    approved_products: number;
    published_products: number;
    rejected_products: number;
    out_of_stock_products: number;
    total_order_lines: number;
    pending_fulfillment_lines: number;
    total_revenue_usd: string;
  };

  let prodRes: AccountApiResult<{ products: VendorProductDto[] }> | null = null;
  let ordRes: AccountApiResult<{ orders: VendorOrderLineDto[] }> | null = null;
  if (section === 'overview' || section === 'listings') {
    prodRes = await accountApi<{ products: VendorProductDto[] }>('/vendor/products');
  }
  if (section === 'overview' || section === 'payments' || section === 'orders') {
    ordRes = await accountApi<{ orders: VendorOrderLineDto[] }>('/vendor/orders');
  }

  const products = prodRes && prodRes.ok && prodRes.data ? toVendorInventoryList(prodRes.data.products ?? []) : [];
  const orders = ordRes && ordRes.ok && ordRes.data ? ordRes.data.orders ?? [] : [];
  const consignment = products.filter((row) => row.category === 'Gemstones' || row.category === 'Pairs');

  return (
    <VendorPortalClient
      initialSection={section}
      vendor={vendor}
      initialSummary={summary}
      initialProducts={products}
      initialConsignment={consignment}
      initialOrders={orders}
    />
  );
}

function VendorSessionGate({
  heading,
  lede,
  actions,
}: {
  heading: string;
  lede: string;
  actions: { href: string; label: string; primary: boolean }[];
}) {
  return (
    <div
      className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612] flex flex-col justify-between p-6 sm:p-12"
      role="alert"
    >
      <header className="max-w-lg mx-auto w-full flex items-center justify-between border-b border-[#E5D4B3] pb-4">
        <Link href="/" className="text-2xl tracking-tight text-[#1A1612]">
          MAIHAN GEMS
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8C6D2F]">
          Vendor Portal Gate
        </span>
      </header>

      <main
        id="main-content"
        className="max-w-lg mx-auto w-full rounded-[28px] bg-[#FFFDF9] border border-[#E5D4B3] p-8 sm:p-10 shadow-[0_24px_60px_rgba(36,26,14,0.12)] space-y-6"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/40 bg-[#FAF3E3] px-3.5 py-1 text-xs font-mono uppercase tracking-[0.16em] text-[#8C6D2F]">
          <span>Partner Lapidary &amp; Atelier Access</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1612]">{heading}</h1>
        <p className="text-base text-[#5C4E3C] leading-relaxed">{lede}</p>

        <div className="space-y-3 pt-2 border-t border-[#EFE5D1]">
          {actions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={
                action.primary
                  ? 'flex items-center justify-center rounded-full py-3 gold-gradient-cta text-xs font-mono uppercase tracking-[0.18em] font-semibold'
                  : 'flex items-center justify-center rounded-full py-3 border border-[#E5D4B3] bg-white text-xs font-mono uppercase tracking-[0.18em] font-semibold text-[#1A1612] hover:bg-[#EFECE6]'
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      </main>

      <footer className="max-w-lg mx-auto w-full text-xs font-mono text-[#6B5A45] border-t border-[#E5D4B3] pt-4 flex justify-between">
        <span>Maihan Supply Chain Registry</span>
        <Link href="/" className="underline hover:text-[#1A1612]">
          Return to Storefront
        </Link>
      </footer>
    </div>
  );
}

function VendorNotYetAdmitted({ heading, body }: { heading: string; body: string }) {
  return (
    <div
      className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612] flex flex-col justify-between p-6 sm:p-12"
      role="alert"
    >
      <header className="max-w-lg mx-auto w-full flex items-center justify-between border-b border-[#E5D4B3] pb-4">
        <Link href="/" className="text-2xl tracking-tight text-[#1A1612]">
          MAIHAN GEMS
        </Link>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8C6D2F]">
          Vendor Portal Gate
        </span>
      </header>
      <main
        id="main-content"
        className="max-w-lg mx-auto w-full rounded-[28px] bg-[#FFFDF9] border border-[#E5D4B3] p-8 sm:p-10 shadow-[0_24px_60px_rgba(36,26,14,0.12)] space-y-4"
      >
        <h1 className="text-3xl font-normal text-[#1A1612]">{heading}</h1>
        <p className="text-sm text-[#5C4E3C]">{body}</p>
        <Link
          href="/vendor"
          className="flex items-center justify-center rounded-full py-3 gold-gradient-cta text-xs font-mono uppercase tracking-[0.18em] font-semibold"
        >
          Return to Vendor Overview
        </Link>
      </main>
      <footer className="max-w-lg mx-auto w-full text-xs font-mono text-[#6B5A45] border-t border-[#E5D4B3] pt-4 flex justify-between">
        <span>Maihan Supply Chain Registry</span>
        <Link href="/" className="underline hover:text-[#1A1612]">
          Return to Storefront
        </Link>
      </footer>
    </div>
  );
}
