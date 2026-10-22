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
 *   /account/orders             order history
 *   /account/orders/<orderId>   order detail with timeline, cancellation & refund requests
 *   /account/notifications      account & order notifications
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
      <main className="lx-section" id="main-content">
        <div className="lx-wrap lx-wrap--narrow">
          <span className="lx-kicker">Client &amp; Partner Access</span>
          <h1 className="lx-h2">Maihan Gems Account</h1>
          <AuthFlowView initialMode={AUTH_SEGMENT_MAP[section]} initialToken={query.token ?? ''} />
        </div>
      </main>
    );
  }

  const clientRef = await getClientRef();
  if (clientRef === null) {
    return (
      <main className="lx-section" id="main-content">
        <div className="lx-wrap lx-wrap--narrow">
          <span className="lx-kicker">Client &amp; Partner Access</span>
          <h1 className="lx-h2">Sign in to your portfolio</h1>
          <AuthFlowView initialMode="sign-in" initialToken={query.token ?? ''} />
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
    <main className="salon-account" id="main-content">
      <aside className="salon-account__rail">
        <span className="lx-kicker">Client portfolio</span>
        <h1 className="lx-h2">{displayName}</h1>
        <p className="lx-lede">
          Your private account with the atelier.
          {sessionActor?.role === 'VENDOR' ? (
            <>
              {' '}
              · <Link href="/vendor">Open Trade Vendor Portal →</Link>
            </>
          ) : null}
          {sessionActor && sessionActor.role !== 'CUSTOMER' && sessionActor.role !== 'VENDOR' ? (
            <>
              {' '}
              · <Link href="/admin">Open Back-Office Console →</Link>
            </>
          ) : null}
        </p>
        <AccountNav active="" />
      </aside>
      <div className="salon-account__stage">
        <div className="lx-account-grid">
          <section className="lx-account-card">
            <h2 className="lx-account-card__title">Profile &amp; security</h2>
            <dl className="lx-account-rows">
              <div>
                <dt>Email</dt>
                <dd>{profile?.email}</dd>
              </div>
              <div>
                <dt>Email verification</dt>
                <dd>
                  {sessionActor?.email_verified ? (
                    'Verified'
                  ) : (
                    <Link href="/account/verify-email">Verify email →</Link>
                  )}
                </dd>
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

          <section className="lx-account-card">
            <h2 className="lx-account-card__title">Orders &amp; notifications</h2>
            <p className="lx-account-figure">
              {ordersRes.ok ? (ordersRes.data?.total_count ?? 0) : '—'}
            </p>
            <p className="lx-account-note">
              {ordersRes.ok ? 'orders placed with the atelier' : 'orders unavailable'} ·{' '}
              {notificationsRes.ok ? `${notificationsRes.data?.notifications.length ?? 0} notifications` : ''}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/account/orders" className="lx-text-btn">
                View order history
              </Link>
              <Link href="/account/notifications" className="lx-text-btn">
                View notifications
              </Link>
            </div>
          </section>
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
      <div className="lx-account-card">
        <p className="lx-account-note">No notifications recorded yet.</p>
      </div>
    );
  }
  return (
    <ul className="lx-orders">
      {items.map((n) => (
        <li key={n.id} className="lx-account-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}>
            <span className="lx-order-row__state">{n.kind.replace(/_/g, ' ')}</span>
            <span className="lx-timeline__when">
              {new Date(n.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          <h2 className="lx-account-card__title" style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>
            {n.subject}
          </h2>
          <p className="lx-account-note" style={{ margin: 0 }}>
            {n.body}
          </p>
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
      <div className="lx-account-card">
        <p className="lx-account-note">No orders yet. Pieces you checkout will appear here.</p>
        <Link href="/browse" className="lx-btn lx-btn--solid">
          Browse the vault
        </Link>
      </div>
    );
  }
  return (
    <ul className="lx-orders">
      {orders.map((order: never) => {
        const row = order as {
          id: string;
          order_number: string;
          state: string;
          grand_total: string;
          placed_at: string | null;
          items: { title_snapshot: string; quantity: number }[];
        };
        return (
          <li key={row.id} className="lx-order-row">
            <Link href={`/account/orders/${row.id}`} className="lx-order-row__link">
              <span className="lx-order-row__number">{row.order_number}</span>
              <span className="lx-order-row__items">
                {row.items.map((item, i) => (
                  <span key={i}>
                    {item.title_snapshot}
                    {i < row.items.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </span>
              <span className="lx-order-row__state">{row.state.replace(/_/g, ' ')}</span>
              <span className="lx-order-row__total">USD {row.grand_total}</span>
            </Link>
          </li>
        );
      })}
    </ul>
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
    <main className="lx-section" id="main-content">
      <div className="lx-wrap lx-wrap--narrow">
        <span className="lx-kicker">Order</span>
        <h1 className="lx-h2">{order.order_number}</h1>
        <p className="lx-lede">
          {order.state.replace(/_/g, ' ')} ·{' '}
          {order.placed_at
            ? new Date(order.placed_at).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : 'placement pending'}
        </p>
        <AccountNav active="orders" />

        <section className="lx-account-card">
          <h2 className="lx-account-card__title">Pieces</h2>
          <ul className="lx-order-items">
            {order.items.map((item, index) => (
              <li key={index}>
                <span className="lx-order-items__title">{item.title_snapshot}</span>
                <span className="lx-order-items__sku">{item.sku_snapshot}</span>
                <span className="lx-order-items__qty">×{item.quantity}</span>
                <span className="lx-order-items__total">USD {item.line_total}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lx-account-card">
          <h2 className="lx-account-card__title">Totals ({order.currency})</h2>
          <dl className="lx-account-rows">
            <div>
              <dt>Subtotal</dt>
              <dd>{order.subtotal}</dd>
            </div>
            <div>
              <dt>Discounts</dt>
              <dd>{order.discount_total}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{order.shipping_total}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{order.tax_total}</dd>
            </div>
            <div className="is-total">
              <dt>Total</dt>
              <dd>{order.grand_total}</dd>
            </div>
          </dl>
        </section>

        {order.shipping_address ? (
          <section className="lx-account-card">
            <h2 className="lx-account-card__title">Delivery</h2>
            <p className="lx-account-note">
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

        <OrderDetailActions
          orderId={order.id}
          orderState={order.state}
          grandTotal={order.grand_total}
        />

        {refunds.length > 0 ? (
          <section className="lx-account-card">
            <h2 className="lx-account-card__title">Return &amp; refund requests</h2>
            <ul className="lx-order-items">
              {refunds.map((rf) => (
                <li key={rf.id}>
                  <span className="lx-order-items__title">{rf.reason}</span>
                  <span className="lx-order-items__sku">{rf.state}</span>
                  <span className="lx-order-items__qty">
                    {new Date(rf.requested_at).toLocaleDateString('en-GB')}
                  </span>
                  <span className="lx-order-items__total">
                    {rf.currency} {rf.amount}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="lx-account-card">
          <h2 className="lx-account-card__title">Timeline</h2>
          {events.length === 0 ? (
            <p className="lx-account-note">No recorded transitions yet.</p>
          ) : (
            <ol className="lx-timeline">
              {events.map((event) => (
                <li key={event.id}>
                  <span className="lx-timeline__state">
                    {event.to_state.replace(/_/g, ' ')}
                  </span>
                  <span className="lx-timeline__when">
                    {new Date(event.created_at).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                  {event.reason ? (
                    <span className="lx-timeline__reason">{event.reason}</span>
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
    <main className="lx-section" id="main-content">
      <div className="lx-wrap lx-wrap--narrow">
        <div className="lx-account-card" role="status">
          <h2 className="lx-account-card__title">Account session required</h2>
          <p className="lx-account-note">{honest}</p>
          <Link href="/account/sign-in" className="lx-btn lx-btn--solid">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
