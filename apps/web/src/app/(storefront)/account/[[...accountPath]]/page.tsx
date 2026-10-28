/**
 * apps/web/src/app/(storefront)/account/[[...accountPath]]/page.tsx
 *
 * `/account/**` — complete customer authentication and account portal:
 *   /account                    overview (profile summary, verification status, recent orders)
 *   /account/sign-in            sign-in (/account/login, /account/access)
 *   /account/register           customer & trade vendor registration (/account/sign-up)
 *   /account/verify-email       single-use token email verification
 *   /account/forgot-password    password recovery request
 *   /account/reset-password     single-use token password reset
 *   /account/profile            personal information (view + edit)
 *   /account/addresses          address book (add / edit / remove / default)
 *   /account/orders             order history (applet DOSSIER LEDGER visual)
 *   /account/orders/<orderId>   order detail with timeline, cancellation & refund requests
 *   /account/notifications      account & order notifications
 *
 * M5: every per-route workflow stays the repo's REAL session/API stack
 * (server actions writing the httpOnly `maihan_session` / `maihan_client_ref`
 * cookies after API verification; /api/v1/auth/*; /api/v1/account/*; RLS'd
 * /api/v1/orders). The REFERENCE APPLET's dossier/ledger chrome renders on
 * top as className-level swaps only. What the applet had that this
 * marketplace must never do is NOT mounted: the AuthPopupModal
 * (email-inferred roles admin@ → ADMIN), any client-side session pres,
 * the client-side verification-code comparison, the Google SS technics
 * buttons, and fixture notifications/addresses/orders.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { accountApi, getAuthenticatedSessionActor, getClientRef } from '../../../../lib/account-server.js';
import type { CustomerProfileDto } from '@maihan/contracts';
import { AuthFlowView, type AuthMode } from '../../../../components/account/AuthFlowView.js';
import { ProfileForm } from '../../../../components/account/ProfileForm.js';
import { AddressBook } from '../../../../components/account/AddressBook.js';
import { AccountNav } from '../../../../components/account/AccountNav.js';
import { OrderDetailActions } from '../../../../components/account/OrderDetailActions.js';

interface PageProps {
  params: Promise<{ accountPath?: string[] }>;
  searchParams?: Promise<{ token?: string }>;
}

const AUTH_SEGMENT_MAP: Record<string, AuthMode> = {
  'sign-in': 'sign-in',
  login: 'sign-in',
  access: 'sign-in',
  register: 'register',
  'sign-up': 'register',
  'verify-email': 'verify-email',
  'forgot-password': 'forgot-password',
  'reset-password': 'reset-password',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { accountPath } = await params;
  const segment = accountPath?.[0] ?? 'overview';
  const titles: Record<string, string> = {
    overview: 'Account | Maihan Gems',
    'sign-in': 'Sign In | Maihan Gems',
    login: 'Sign In | Maihan Gems',
    access: 'Sign In | Maihan Gems',
    register: 'Create Account | Maihan Gems',
    'sign-up': 'Create Account | Maihan Gems',
    'verify-email': 'Verify Email | Maihan Gems',
    'forgot-password': 'Password Recovery | Maihan Gems',
    'reset-password': 'Reset Password | Maihan Gems',
    profile: 'Personal Information | Maihan Gems',
    addresses: 'Address Book | Maihan Gems',
    orders: 'Order History | Maihan Gems',
    notifications: 'Notifications | Maihan Gems',
  };
  return { title: titles[segment] ?? 'Account | Maihan Gems', robots: { index: false, follow: false } };
}

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { accountPath } = await params;
  const query = searchParams ? await searchParams : {};
  const segments = accountPath ?? [];

  if (segments.length > 2) notFound();
  const [section, sub] = segments;

  if (section && section in AUTH_SEGMENT_MAP) {
    return (
      <main className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]" id="main-content">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
          <div className="border-b border-[#E5D4B3] pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#8C6D2F] font-semibold">
                ZERO-TRUST SESSION GATE · GENEVA REGISTRY
              </p>
              <h1 className="mt-1.5 text-3xl sm:text-5xl font-normal text-[#1A1612]">
                Maihan Gems Account
              </h1>
            </div>
            <p className="text-sm text-[#5C4E3C] max-w-md">
              Authenticate with your email credentials. Roles are issued by the server after API
              verification — never inferred in the browser.
            </p>
          </div>
          <div className="max-w-2xl rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 sm:p-9 shadow-[0_12px_32px_rgba(36,26,14,0.06)]">
            <AuthFlowView initialMode={AUTH_SEGMENT_MAP[section]} initialToken={query.token ?? ''} />
          </div>
        </div>
      </main>
    );
  }

  const clientRef = await getClientRef();
  if (clientRef === null) {
    return (
      <main className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]" id="main-content">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
          <div className="border-b border-[#E5D4B3] pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#8C6D2F] font-semibold">
                PRIVATE CLIENT &amp; PARTNER PORTFOLIO · GENEVA REGISTRY
              </p>
              <h1 className="mt-1.5 text-3xl sm:text-5xl font-normal text-[#1A1612]">
                Sign in to your portfolio
              </h1>
            </div>
            <p className="text-sm text-[#5C4E3C] max-w-md">
              Verified email sessions only. Roles are issued by the server after API verification.
            </p>
          </div>
          <div className="max-w-2xl rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 sm:p-9 shadow-[0_12px_32px_rgba(36,26,14,0.06)]">
            <AuthFlowView initialMode="sign-in" initialToken={query.token ?? ''} />
          </div>
        </div>
      </main>
    );
  }

  switch (section) {
    case undefined:
      return <AccountOverview />;
    case 'profile':
      return (
        <AccountShell section="profile">
          <ProfilePanel />
        </AccountShell>
      );
    case 'addresses':
      return (
        <AccountShell section="addresses">
          <AddressPanel />
        </AccountShell>
      );
    case 'orders':
      if (sub !== undefined) return <OrderDetailPanel orderId={sub} />;
      return (
        <AccountShell section="orders">
          <OrdersPanel />
        </AccountShell>
      );
    case 'notifications':
      return (
        <AccountShell section="notifications">
          <NotificationsPanel />
        </AccountShell>
      );
    default:
      notFound();
  }
}

function AccountShell({
  section,
  children,
}: {
  section: 'profile' | 'addresses' | 'orders' | 'notifications';
  children: React.ReactNode;
}) {
  const headingMap: Record<typeof section, string> = {
    profile: 'Personal information',
    addresses: 'Address book',
    orders: 'Order history',
    notifications: 'Notifications & alerts',
  };
  return (
    <main className="salon-account" id="main-content">
      <aside className="salon-account__rail">
        <span className="lx-kicker">Client portfolio</span>
        <h1 className="lx-h2">{headingMap[section]}</h1>
        <AccountNav active={section} />
      </aside>
      <div className="salon-account__stage">{children}</div>
    </main>
  );
}

async function AccountOverview() {
  const [profileRes, sessionActor, ordersRes, notificationsRes] = await Promise.all([
    accountApi<CustomerProfileDto>('/account/profile'),
    getAuthenticatedSessionActor(),
    accountApi<{ orders: unknown[]; total_count: number }>('/account/orders'),
    accountApi<{ notifications: Array<{ id: string; subject: string; created_at: string }> }>('/account/notifications'),
  ]);
  if (!profileRes.ok) {
    return <PortfolioUnavailable result={profileRes} />;
  }
  const profile = profileRes.data;
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.email ||
    'Client';

  return (
    <main className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]" id="main-content">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="border-b border-[#E5D4B3] pb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8C6D2F] font-semibold">
              PRIVATE CLIENT PORTFOLIO · GENEVA REGISTRY
            </p>
            <h1 className="mt-1.5 text-3xl sm:text-5xl font-normal text-[#1A1612]">{displayName}</h1>
          </div>
          <div className="text-sm text-[#5C4E3C] max-w-md space-y-1">
            <p>Your private account with the atelier.</p>
            <nav aria-label="Role entries" className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em] font-semibold">
              {sessionActor?.role === 'VENDOR' ? (
                <Link href="/vendor" className="text-[#8C6D2F] underline">
                  Open Trade Vendor Portal →
                </Link>
              ) : null}
              {sessionActor && sessionActor.role !== 'CUSTOMER' && sessionActor.role !== 'VENDOR' ? (
                <Link href="/admin" className="text-[#8C6D2F] underline">
                  Open Back-Office Console →
                </Link>
              ) : null}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-3 rounded-[24px] border border-[#E5D4B3] bg-[#1C1610] p-5 shadow-[0_14px_34px_rgba(26,20,14,0.12)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#E6C97A] px-2 mb-3 font-semibold">
              IDENTITY &amp; VAULT MENU
            </p>
            <div className="rounded-[16px] bg-transparent">
              <AccountNav active="" tone="gold" />
            </div>
          </aside>

          <div className="lg:col-span-9 rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 sm:p-9 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5">
                <p className="text-[#8C6D2F] uppercase tracking-[0.16em] text-xs font-semibold">
                  Orders
                </p>
                <p className="text-3xl font-semibold text-[#1A1612] mt-1">
                  {ordersRes.ok ? (ordersRes.data?.total_count ?? 0) : '—'}
                </p>
                <Link href="/account/orders" className="text-[#8C6D2F] underline block mt-2 text-sm">
                  Inspect →
                </Link>
              </div>
              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5">
                <p className="text-[#8C6D2F] uppercase tracking-[0.16em] text-xs font-semibold">
                  Email verification
                </p>
                <p className="mt-1 text-sm font-medium text-[#1A1612]">
                  {sessionActor?.email_verified ? (
                    'Verified'
                  ) : (
                    <Link href="/account/verify-email" className="text-[#8C6D2F] underline">
                      Verify email →
                    </Link>
                  )}
                </p>
              </div>
              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5">
                <p className="text-[#8C6D2F] uppercase tracking-[0.16em] text-xs font-semibold">
                  Notifications
                </p>
                <p className="text-3xl font-semibold text-[#1A1612] mt-1">
                  {notificationsRes.ok ? (notificationsRes.data?.notifications.length ?? 0) : '—'}
                </p>
                <Link href="/account/notifications" className="text-[#8C6D2F] underline block mt-2 text-sm">
                  Read →
                </Link>
              </div>
            </div>

            <section className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6 space-y-3">
              <h2 className="lx-account-card__title">Profile &amp; security</h2>
              <dl className="lx-account-rows">
                <div>
                  <dt>Email</dt>
                  <dd>{profile?.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{profile?.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt>Preferred currency</dt>
                  <dd>{profile?.preferred_currency ?? 'USD'}</dd>
                </div>
                {profile?.ring_size ? (
                  <div>
                    <dt>Ring size</dt>
                    <dd>US {profile.ring_size}</dd>
                  </div>
                ) : null}
              </dl>
              <Link href="/account/profile" className="lx-text-btn">
                Edit profile
              </Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

async function ProfilePanel() {
  const res = await accountApi<CustomerProfileDto>('/account/profile');
  if (!res.ok) return <PortfolioUnavailable result={res} />;
  return <ProfileForm profile={res.data as CustomerProfileDto} />;
}

async function AddressPanel() {
  const res = await accountApi<unknown[]>('/account/addresses');
  if (!res.ok) return <PortfolioUnavailable result={res} />;
  return <AddressBook initialAddresses={(res.data ?? []) as never[]} />;
}

async function NotificationsPanel() {
  const res = await accountApi<{
    notifications: Array<{
      id: string;
      kind: string;
      subject: string;
      body: string;
      created_at: string;
    }>;
  }>('/account/notifications');
  if (!res.ok) return <PortfolioUnavailable result={res} />;
  const items = res.data?.notifications ?? [];
  if (items.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FFFDF9] p-6">
        <p className="text-sm text-[#5C4E3C]">No notifications recorded yet.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-[#EFE5D1] border border-[#E5D4B3] rounded-[18px] overflow-hidden">
      {items.map((n) => (
        <li key={n.id} className="p-5 space-y-1.5 bg-[#FFFDF9]">
          <div className="flex justify-between gap-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[#8C6D2F]">
              {n.kind.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-xs text-[#5C4E3C] tabular-nums">
              {new Date(n.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          <h2 className="text-base font-semibold text-[#1A1612]">{n.subject}</h2>
          <p className="text-sm text-[#5C4E3C]">{n.body}</p>
        </li>
      ))}
    </ul>
  );
}

async function OrdersPanel() {
  const res = await accountApi<{ orders: never[]; total_count: number }>('/account/orders');
  if (!res.ok) return <PortfolioUnavailable result={res} />;
  const orders = res.data?.orders ?? [];
  if (orders.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FFFDF9] p-6 space-y-3">
        <p className="text-sm text-[#5C4E3C]">No orders yet. Pieces you checkout will appear here.</p>
        <Link href="/browse" className="lx-btn lx-btn--solid">
          Browse the vault
        </Link>
      </div>
    );
  }
  // The applet's DOSSIER LEDGER row chrome, fed by the REAL order rows.
  return (
    <div className="divide-y divide-[#EFE5D1] border border-[#E5D4B3] rounded-[18px] overflow-hidden">
      {orders.map((order: never) => {
        const row = order as {
          id: string;
          order_number: string;
          state: string;
          grand_total: string;
          currency: string | null;
          placed_at: string | null;
          items: { title_snapshot: string; quantity: number }[];
        };
        return (
          <div
            key={row.id}
            className="p-5 flex flex-wrap items-center justify-between gap-4 text-sm bg-[#FFFDF9]"
          >
            <div className="min-w-0">
              <p className="font-mono font-semibold text-[#1A1612] break-all">{row.order_number}</p>
              <p className="text-[#5C4E3C] mt-0.5 truncate">
                {row.items.map((item, i) => `${item.title_snapshot}${i < row.items.length - 1 ? ', ' : ''}`)}
                {row.items.length === 0 ? 'Pieces you ordered' : ''}
              </p>
              <p className="font-mono text-xs text-[#8C6D2F] mt-0.5">
                {row.placed_at
                  ? new Date(row.placed_at).toLocaleDateString('en-GB')
                  : 'Placement pending'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[#8C6D2F] bg-[#FAF3E3] px-3 py-1 rounded-full border border-[#E5D4B3]">
                {row.state.replace(/_/g, ' ')}
              </span>
              <span className="font-mono tabular-nums font-semibold text-[#1A1612]">
                {row.currency && row.currency !== 'USD' ? `${row.currency} ` : 'USD '}
                {row.grand_total}
              </span>
              <Link
                href={`/account/orders/${row.id}`}
                className="px-4 py-1.5 uppercase tracking-wider text-xs bg-[#1C1610] text-[#E6C97A] rounded-full hover:bg-[#2B2219]"
              >
                Inspect
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function OrderDetailPanel({ orderId }: { orderId: string }) {
  const res = await accountApi<{
    id: string;
    order_number: string;
    email: string;
    state: string;
    currency: string;
    subtotal: string;
    discount_total: string;
    shipping_total: string;
    tax_total: string;
    grand_total: string;
    placed_at: string | null;
    shipping_address: Record<string, string | null> | null;
    items: {
      sku_snapshot: string;
      title_snapshot: string;
      quantity: number;
      unit_price: string;
      line_total: string;
      state?: string;
    }[];
  }>(`/account/orders/${encodeURIComponent(orderId)}`);
  if (res.status === 404 || res.status === 403) notFound();
  if (!res.ok || !res.data) return <PortfolioUnavailable result={res} />;
  const order = res.data;
  const [timelineRes, refundsRes] = await Promise.all([
    accountApi<
      {
        id: string;
        from_state: string | null;
        to_state: string;
        actor_type: string;
        reason: string | null;
        created_at: string;
      }[]
    >(`/orders/${encodeURIComponent(orderId)}/timeline`),
    accountApi<
      {
        id: string;
        amount: string;
        currency: string;
        reason: string;
        state: string;
        requested_at: string;
      }[]
    >(`/orders/${encodeURIComponent(orderId)}/refunds`),
  ]);
  const events = timelineRes.ok ? (timelineRes.data ?? []) : [];
  const refunds = refundsRes.ok ? (refundsRes.data ?? []) : [];

  return (
    <main className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]" id="main-content">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="border-b border-[#E5D4B3] pb-6 space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8C6D2F]">{order.order_number}</p>
          <h1 className="text-3xl sm:text-5xl font-normal text-[#1A1612]">
            Status: {order.state.replace(/_/g, ' ')}
          </h1>
          <p className="text-sm text-[#5C4E3C]">
            {order.placed_at
              ? new Date(order.placed_at).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Placement pending'}{' '}
            · {order.currency}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-3 rounded-[24px] border border-[#E5D4B3] bg-[#1C1610] p-5 shadow-[0_14px_34px_rgba(26,20,14,0.12)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#E6C97A] px-2 mb-3 font-semibold">
              IDENTITY &amp; VAULT MENU
            </p>
            <div className="rounded-[16px] bg-transparent">
              <AccountNav active="orders" tone="gold" />
            </div>
          </aside>

          <div className="lg:col-span-9 rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 sm:p-9 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-6">
            <section className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6 space-y-3">
              <h2 className="text-xl font-normal text-[#1A1612]">Pieces</h2>
              <ul className="divide-y divide-[#EFE5D1] border-t border-[#EFE5D1]">
                {order.items.map((item, index) => (
                  <li key={index} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[#1A1612]">{item.title_snapshot}</span>
                    <span className="font-mono text-xs text-[#8C6D2F]">
                      {item.sku_snapshot}
                    </span>
                    <span className="font-mono text-xs text-[#5C4E3C]">×{item.quantity}</span>
                    <span className="font-mono tabular-nums font-semibold text-[#1A1612]">
                      {order.currency} {item.line_total}
                    </span>
                  </li>
                ))}
                {order.items.length === 0 ? (
                  <li className="py-3 text-sm text-[#5C4E3C]">No piece lines recorded.</li>
                ) : null}
              </ul>
            </section>

            <section className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6 space-y-3">
              <h2 className="text-xl font-normal text-[#1A1612]">Totals ({order.currency})</h2>
              <dl className="divide-y divide-[#EFE5D1] border-t border-[#EFE5D1] text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-[#5C4E3C]">Subtotal</dt>
                  <dd className="font-mono tabular-nums text-[#1A1612]">{order.subtotal}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-[#5C4E3C]">Discounts</dt>
                  <dd className="font-mono tabular-nums text-[#1A1612]">{order.discount_total}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-[#5C4E3C]">Shipping</dt>
                  <dd className="font-mono tabular-nums text-[#1A1612]">{order.shipping_total}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-[#5C4E3C]">Tax</dt>
                  <dd className="font-mono tabular-nums text-[#1A1612]">{order.tax_total}</dd>
                </div>
                <div className="flex justify-between py-3 font-semibold">
                  <dt className="text-[#1A1612]">Total</dt>
                  <dd className="font-mono text-lg text-[#8C6D2F] tabular-nums">{order.grand_total}</dd>
                </div>
              </dl>
            </section>

            {order.shipping_address ? (
              <section className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6 space-y-2">
                <h2 className="text-xl font-normal text-[#1A1612]">Delivery</h2>
                <p className="text-sm text-[#5C4E3C]">
                  {[
                    order.shipping_address['full_name'],
                    order.shipping_address['line1'],
                    order.shipping_address['city'],
                    order.shipping_address['country_code'],
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </section>
            ) : null}

            <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6">
              <OrderDetailActions
                orderId={order.id}
                orderState={order.state}
                grandTotal={order.grand_total}
              />
            </div>

            {refunds.length > 0 ? (
              <section className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6 space-y-3">
                <h2 className="text-xl font-normal text-[#1A1612]">Return &amp; refund requests</h2>
                <ul className="divide-y divide-[#EFE5D1] border-t border-[#EFE5D1]">
                  {refunds.map((rf) => (
                    <li key={rf.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-[#1A1612]">{rf.reason}</span>
                      <span className="font-mono text-xs text-[#8C6D2F]">{rf.state}</span>
                      <span className="font-mono text-xs text-[#5C4E3C]">
                        {new Date(rf.requested_at).toLocaleDateString('en-GB')}
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-[#1A1612]">
                        {rf.currency} {rf.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6 space-y-3">
              <h2 className="text-xl font-normal text-[#1A1612]">Timeline</h2>
              {events.length === 0 ? (
                <p className="text-sm text-[#5C4E3C]">No recorded transitions yet.</p>
              ) : (
                <ol className="divide-y divide-[#EFE5D1] border-t border-[#EFE5D1]">
                  {events.map((event) => (
                    <li key={event.id} className="py-3 space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#8C6D2F]">
                          {event.to_state.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-xs text-[#5C4E3C] tabular-nums">
                          {new Date(event.created_at).toLocaleString('en-GB', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      {event.reason ? (
                        <p className="text-sm text-[#5C4E3C]">{event.reason}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <Link href="/account/orders" className="lx-text-btn">
              ← All orders
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function PortfolioUnavailable({
  result,
}: {
  result: { status: number; code: string | null; message: string | null };
}) {
  const honest =
    result.status === 401
      ? 'Your session has ended or requires sign-in.'
      : result.message ?? 'The account service could not be reached.';
  return (
    <main className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]" id="main-content">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-2xl rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 sm:p-9 shadow-[0_12px_32px_rgba(36,26,14,0.06)]">
          <div className="max-w-xl rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/40 p-6 space-y-3">
            <h2 className="lx-account-card__title">Account session required</h2>
            <p className="lx-account-note">{honest}</p>
            <Link href="/account/sign-in" className="lx-btn lx-btn--solid">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
