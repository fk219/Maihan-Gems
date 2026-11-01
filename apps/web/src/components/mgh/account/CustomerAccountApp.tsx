'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight, Gem, Heart, LogOut, MapPin, Package, Settings,
  ShieldCheck, UserRound,
} from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';

interface Customer {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_verified_at: string | null;
}
interface AddressRow {
  id: number; label: string; recipient: string; line1: string; line2: string | null;
  city: string; region: string | null; postal_code: string; country: string;
  phone: string | null; is_default: boolean;
}
interface OrderRow {
  order_number: string;
  status: string;
  currency: string;
  grand_total: string;
  placed_at: string;
  item_count: number;
}
interface SavedPieces {
  gemstones: Array<{ ref: string; slug: string; name: string; variety: string }>;
  settings: Array<{ ref: string; name: string; jewellery_type: string }>;
}

const SECTIONS = [
  { key: '', label: 'Overview', icon: UserRound },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'saved', label: 'Saved', icon: Heart },
  { key: 'addresses', label: 'Addresses', icon: MapPin },
  { key: 'settings', label: 'Settings', icon: Settings },
] as const;

const money = (value: string | number, currency: string): string =>
  Number(value).toLocaleString('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 });

const statusBadge = (status: string): string => {
  if (['PAID', 'FULFILLED', 'DELIVERED', 'APPROVED'].includes(status)) return 'portal-badge portal-badge--active';
  if (['PENDING_PAYMENT', 'SUBMITTED', 'HOLD'].includes(status)) return 'portal-badge portal-badge--pending';
  if (status === 'REFUNDED') return 'portal-badge portal-badge--sold';
  if (['CANCELLED', 'REJECTED'].includes(status)) return 'portal-badge portal-badge--rejected';
  return 'portal-badge portal-badge--draft';
};

const statusLabel = (status: string): string => status.replaceAll('_', ' ').toLowerCase();

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export function CustomerAccountApp({ subPath }: { subPath: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = subPath[0] || '';
  const { favorites, replaceFavorites } = useStorefront();

  const [me, setMe] = useState<Customer | null | undefined>(undefined);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [saved, setSaved] = useState<SavedPieces | null>(null);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [addressForm, setAddressForm] = useState({
    label: 'Home', recipient: '', line1: '', line2: '', city: '', region: '', postal_code: '', country: 'AE', phone: '', is_default: false,
  });
  const [devVerifyToken, setDevVerifyToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [profile, setProfile] = useState({ first_name: '', last_name: '', phone: '' });

  const loadMe = useCallback(async () => {
    try {
      const response = await fetch('/api/fresh/auth/me', { cache: 'no-store' });
      if (response.status === 401) { setMe(null); return; }
      const data = (await response.json()) as { customer?: Customer };
      const customer = data.customer ?? null;
      setMe(customer);
      if (customer) setProfile({ first_name: customer.first_name ?? '', last_name: customer.last_name ?? '', phone: customer.phone ?? '' });
    } catch {
      setMe(null);
    }
  }, []);

  const loadData = useCallback(async () => {
    const [ordersRes, savedRes, addressesRes] = await Promise.all([
      fetch('/api/fresh/auth/orders', { cache: 'no-store' }),
      fetch('/api/fresh/auth/favourites', { cache: 'no-store' }),
      fetch('/api/fresh/auth/addresses', { cache: 'no-store' }),
    ]);
    if (ordersRes.ok) setOrders((await ordersRes.json()) as OrderRow[]);
    if (savedRes.ok) setSaved((await savedRes.json()) as SavedPieces);
    if (addressesRes.ok) setAddresses((await addressesRes.json()) as AddressRow[]);
  }, []);

  useEffect(() => { void loadMe(); }, [loadMe]);

  useEffect(() => {
    const token = searchParams.get('verify');
    if (!token) return;
    void (async () => {
      const response = await fetch('/api/fresh/auth/verify-email', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.ok) { setNotice('Email verified — thank you.'); await loadMe(); }
      else {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Verification failed');
      }
    })();
  }, [searchParams, loadMe]);
  useEffect(() => { if (me) void loadData(); }, [me, loadData]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    const response = await fetch('/api/fresh-auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (response.ok) { setPassword(''); await loadMe(); router.push('/account'); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Invalid email or password');
    }
    setBusy(false);
  };

  const register = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    const response = await fetch('/api/fresh-auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, first_name: firstName.trim() || undefined, last_name: lastName.trim() || undefined }),
    });
    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as { dev_verification_token?: string };
      if (data.dev_verification_token) setDevVerifyToken(data.dev_verification_token);
      setPassword(''); await loadMe(); router.push('/account');
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not create the account');
    }
    setBusy(false);
  };

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const response = await fetch('/api/fresh-auth/request-reset', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; dev_token?: string };
    if (!response.ok) setError(data.error ?? 'Could not request a reset');
    else {
      setNotice('If that address is registered, a reset token has been issued.');
      if (data.dev_token) setResetToken(data.dev_token);
    }
    setBusy(false);
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    const response = await fetch('/api/fresh/auth/reset', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: resetToken.trim(), password: newPassword }),
    });
    if (response.ok) {
      setNotice('Password updated — sign in with the new password.');
      setNewPassword('');
      router.push('/account/login');
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Reset failed');
    }
    setBusy(false);
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const response = await fetch('/api/fresh/auth/change-password', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (response.ok) { setCurrentPassword(''); setNewPassword(''); setNotice('Password updated.'); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not change the password');
    }
    setBusy(false);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const response = await fetch('/api/fresh/auth/me', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (response.ok) { setNotice('Profile saved.'); await loadMe(); }
    else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not save the profile');
    }
    setBusy(false);
  };

  const syncTray = async () => {
    setBusy(true); setError(''); setNotice('');
    const response = await fetch('/api/fresh/auth/favourites', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refs: favorites }),
    });
    if (response.ok) { setSaved((await response.json()) as SavedPieces); setNotice('Saved tray synced to your account.'); }
    else setError('Could not sync the tray');
    setBusy(false);
  };

  const loadTray = () => {
    if (!saved) return;
    replaceFavorites([...saved.gemstones.map((piece) => piece.ref), ...saved.settings.map((piece) => piece.ref)]);
    setNotice('Saved pieces loaded onto this device.');
  };

  const resendVerification = async () => {
    setBusy(true); setError(''); setNotice('');
    const response = await fetch('/api/fresh/auth/resend-verification', { method: 'POST' });
    const data = (await response.json().catch(() => ({}))) as { error?: string; dev_token?: string };
    if (response.ok) {
      setNotice('Verification email queued.');
      if (data.dev_token) setDevVerifyToken(data.dev_token);
    } else setError(data.error ?? 'Could not resend the verification email');
    setBusy(false);
  };

  const addAddress = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const response = await fetch('/api/fresh/auth/addresses', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(addressForm),
    });
    if (response.ok) {
      setAddressForm({ label: 'Home', recipient: '', line1: '', line2: '', city: '', region: '', postal_code: '', country: 'AE', phone: '', is_default: false });
      await loadData();
      setNotice('Address saved.');
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not save the address');
    }
    setBusy(false);
  };

  const removeAddress = async (id: number) => {
    await fetch(`/api/fresh/auth/addresses/${id}`, { method: 'DELETE' });
    await loadData();
  };

  const makeDefaultAddress = async (id: number) => {
    await fetch(`/api/fresh/auth/addresses/${id}/default`, { method: 'POST' });
    await loadData();
  };

  const logout = async () => {
    await fetch('/api/fresh-auth/logout', { method: 'POST' });
    setMe(null);
    router.push('/account/login');
  };

  const savedCount = (saved?.gemstones.length ?? 0) + (saved?.settings.length ?? 0);
  const lifetimeValue = orders.reduce((total, order) => total + Number(order.grand_total), 0);
  const currency = orders[0]?.currency ?? 'USD';
  const currentSection = SECTIONS.find((item) => item.key === section) ?? SECTIONS[0];
  const displayName = me
    ? me.first_name ? `${me.first_name}${me.last_name ? ` ${me.last_name}` : ''}` : me.email
    : '';

  const sectionLinks = useMemo(() => SECTIONS.map((item) => ({
    ...item,
    href: `/account${item.key ? `/${item.key}` : ''}`,
    value: item.key === 'orders' ? String(orders.length)
      : item.key === 'saved' ? String(savedCount)
        : item.key === 'addresses' ? String(addresses.length)
          : item.key === 'settings' ? 'Profile'
            : 'Atelier',
    meta: item.key === 'orders' ? 'lifetime orders'
      : item.key === 'saved' ? 'pieces saved'
        : item.key === 'addresses' ? 'delivery addresses'
          : item.key === 'settings' ? 'details & security'
            : 'your portfolio',
  })), [orders.length, savedCount, addresses.length]);

  if (me === null) {
    const mode = section === 'register' ? 'register' : section === 'reset' ? 'reset' : 'login';
    return (
      <div className="client-auth">
        <div className="client-auth__brand">
          <span className="client-auth__mark"><Gem /></span>
          <p className="client-auth__eyebrow">Maihan Gems · Client Services</p>
          <h1 className="client-auth__title">
            {mode === 'register' ? 'Open a client account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}
          </h1>
          <p className="client-auth__sub">
            {mode === 'register' ? 'Keep your orders, saved pieces and addresses in one place.' : mode === 'reset' ? 'Choose a new password for your account.' : 'Enter the atelier to review your portfolio.'}
          </p>
        </div>

        <form onSubmit={mode === 'register' ? register : mode === 'reset' ? resetPassword : login} className="portal-card portal-card--pad space-y-4">
          {mode === 'register' ? (
            <div className="grid grid-cols-2 gap-3">
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" className="portal-input" />
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" className="portal-input" />
            </div>
          ) : null}
          {mode !== 'reset' ? (
            <>
              <div>
                <label className="portal-label" htmlFor="client-email">Email</label>
                <input id="client-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className="portal-input" />
              </div>
              {mode === 'login' ? (
                <div>
                  <label className="portal-label" htmlFor="client-password">Password</label>
                  <input id="client-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" autoComplete="current-password" className="portal-input" />
                </div>
              ) : null}
            </>
          ) : null}
          {mode === 'register' ? (
            <div>
              <label className="portal-label" htmlFor="client-new-password">Password</label>
              <input id="client-new-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className="portal-input" />
            </div>
          ) : null}
          {mode === 'reset' ? (
            <>
              <div>
                <label className="portal-label" htmlFor="client-reset-token">Reset token</label>
                <input id="client-reset-token" value={resetToken} onChange={(event) => setResetToken(event.target.value)} placeholder="Token from the email" className="portal-input" />
              </div>
              <div>
                <label className="portal-label" htmlFor="client-reset-password">New password</label>
                <input id="client-reset-password" type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className="portal-input" />
              </div>
            </>
          ) : null}
          {error ? <p className="portal-notice">{error}</p> : null}
          {notice ? <p className="portal-notice portal-notice--good">{notice}</p> : null}
          <button type="submit" disabled={busy} className="portal-btn portal-btn--gold w-full">
            {busy ? 'Working…' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Set new password' : 'Sign in'}
          </button>
        </form>

        {mode === 'login' ? (
          <form onSubmit={requestReset} className="portal-card portal-card--pad space-y-3" style={{ marginTop: 12 }}>
            <p className="portal-label" style={{ marginBottom: 0 }}>Need a reset token?</p>
            <div className="flex gap-2">
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your account email" className="portal-input" style={{ flex: 1 }} />
              <button type="submit" disabled={busy || !email.trim()} className="portal-btn portal-btn--ghost portal-btn--sm">Send</button>
            </div>
            {notice ? <p className="portal-card__sub">{notice}{resetToken ? <> · Dev token: <code className="portal-mono break-all">{resetToken}</code></> : null}</p> : null}
          </form>
        ) : null}

        <div className="client-auth__links">
          <Link href="/account/login">Sign in</Link>
          <Link href="/account/register">Create account</Link>
          <Link href="/account/reset">Forgot password</Link>
        </div>
      </div>
    );
  }

  if (me === undefined) {
    return (
      <div className="portal-card portal-card--pad" style={{ minHeight: 260 }}>
        <div className="portal-empty">
          <div className="portal-empty__mark"><UserRound /></div>
          <p className="portal-empty__title">Opening your portfolio</p>
          <p className="portal-empty__sub">A moment while the atelier fetches your record.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-section">
      <div className="portal-top__where">
        <span>Client atelier</span>
        <ArrowUpRight style={{ width: 12, height: 12, opacity: 0.5 }} />
        <b>{currentSection.label}</b>
      </div>

      <div className="portal-greeting">
        <div>
          <h1 className="portal-greeting__title">{greeting()}, {displayName}</h1>
          <p className="portal-greeting__sub">
            {me.email} · {me.email_verified_at ? 'Email verified' : 'Verification pending'} · {orders.length} orders · <b>{savedCount} saved pieces</b>
          </p>
        </div>
        <div className="portal-greeting__actions">
          <button type="button" onClick={() => void logout()} className="portal-btn portal-btn--ghost">
            <LogOut /> Sign out
          </button>
          <Link href="/browse" className="portal-btn portal-btn--gold">
            <Gem /> Browse the vault
          </Link>
        </div>
      </div>

      {!me.email_verified_at ? (
        <div className="client-verify">
          <p className="client-verify__title">Email not verified</p>
          <p className="client-verify__body">Confirm {me.email} to secure your account and order correspondence.</p>
          <div className="portal-inline" style={{ marginTop: 10 }}>
            <button type="button" onClick={() => void resendVerification()} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm">Resend verification</button>
            {devVerifyToken ? <code className="portal-mono break-all">{devVerifyToken}</code> : null}
          </div>
        </div>
      ) : null}

      <div className="client-tiles">
        {sectionLinks.filter((item) => item.key !== '').map((item, index) => (
          <Link
            key={item.key}
            href={item.href}
            className={`portal-tile client-tile portal-tile--${['gold', 'butter', 'sky', 'mint'][index % 4]}`}
          >
            <span className="portal-tile__head">
              <span className="portal-tile__icon"><item.icon /></span>
              <span className="portal-tile__arrow">↗</span>
            </span>
            <span>
              <span className="portal-tile__title">{item.label}</span>
              <span className="portal-tile__value">{item.value}</span>
              <span className="portal-tile__sub">{item.meta}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="portal-seg" style={{ flexWrap: 'wrap' }}>
        {sectionLinks.map((item) => (
          <Link key={item.key || 'overview'} href={item.href} className={`portal-seg__item ${section === item.key ? 'is-active' : ''}`}>
            <item.icon /> {item.label}
          </Link>
        ))}
      </div>

      {notice ? <p className="portal-notice portal-notice--good">{notice}</p> : null}
      {error ? <p className="portal-notice">{error}</p> : null}

      {section === '' ? (
        <>
          <div className="portal-grid--stats">
            <div className="portal-card portal-stat"><p className="portal-stat__label">Orders</p><p className="portal-stat__value">{orders.length}</p><p className="portal-stat__meta">lifetime orders</p></div>
            <div className="portal-card portal-stat"><p className="portal-stat__label">Lifetime value</p><p className="portal-stat__value">{money(lifetimeValue, currency)}</p><p className="portal-stat__meta">recorded at checkout</p></div>
            <div className="portal-card portal-stat"><p className="portal-stat__label">Saved pieces</p><p className="portal-stat__value">{savedCount}</p><p className="portal-stat__meta">{favorites.length} on this device</p></div>
            <div className="portal-card portal-stat"><p className="portal-stat__label">Addresses</p><p className="portal-stat__value">{addresses.length}</p><p className="portal-stat__meta">delivery destinations</p></div>
          </div>

          <div className="client-split">
            <section className="portal-card portal-card--pad">
              <header className="portal-card__head">
                <div>
                  <h2 className="portal-card__title">Recent orders</h2>
                  <p className="portal-card__sub">The last movements in your ledger</p>
                </div>
                <Link href="/account/orders" className="portal-btn portal-btn--ghost portal-btn--sm">All orders <ArrowUpRight /></Link>
              </header>
              {orders.length === 0 ? (
                <div className="portal-empty">
                  <div className="portal-empty__mark"><Package /></div>
                  <p className="portal-empty__title">No orders yet</p>
                  <p className="portal-empty__sub">Your first acquisition will appear here.</p>
                </div>
              ) : (
                <div className="client-list">
                  {orders.slice(0, 4).map((order) => (
                    <Link key={order.order_number} href={`/checkout/confirmation/${order.order_number}`} className="client-list__item" style={{ textDecoration: 'none' }}>
                      <span className="client-list__main">
                        <span className="client-list__title">{order.order_number}</span>
                        <span className="client-list__sub">{new Date(order.placed_at).toLocaleDateString('en-GB')} · {order.item_count} item(s)</span>
                      </span>
                      <span className="client-list__side">
                        <span className={statusBadge(order.status)}>{statusLabel(order.status)}</span>
                        <span className="client-list__sub" style={{ color: 'var(--p-text)', fontWeight: 700, marginTop: 4 }}>{money(order.grand_total, order.currency)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="portal-card portal-card--pad">
              <header className="portal-card__head">
                <div>
                  <h2 className="portal-card__title">Profile</h2>
                  <p className="portal-card__sub">The name on your record</p>
                </div>
              </header>
              <form onSubmit={saveProfile} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input value={profile.first_name} onChange={(event) => setProfile((value) => ({ ...value, first_name: event.target.value }))} placeholder="First name" className="portal-input" />
                  <input value={profile.last_name} onChange={(event) => setProfile((value) => ({ ...value, last_name: event.target.value }))} placeholder="Last name" className="portal-input" />
                </div>
                <input value={profile.phone} onChange={(event) => setProfile((value) => ({ ...value, phone: event.target.value }))} placeholder="Phone (optional)" className="portal-input" />
                <button type="submit" disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Save profile</button>
              </form>
              <div className="client-divider" />
              <div className="portal-inline" style={{ justifyContent: 'space-between' }}>
                <span className="portal-card__sub">Password & security</span>
                <Link href="/account/settings" className="portal-btn portal-btn--ghost portal-btn--sm"><ShieldCheck /> Manage</Link>
              </div>
            </section>
          </div>
        </>
      ) : null}

      {section === 'orders' ? (
        <section className="portal-card portal-table-wrap">
          {orders.length === 0 ? (
            <div className="portal-empty">
              <div className="portal-empty__mark"><Package /></div>
              <p className="portal-empty__title">No orders on this account yet</p>
              <p className="portal-empty__sub">Explore the vault to begin your collection.</p>
              <Link href="/browse" className="portal-btn portal-btn--gold portal-btn--sm" style={{ marginTop: 14 }}>Explore the vault</Link>
            </div>
          ) : (
            <table className="portal-table">
              <thead><tr><th>Order</th><th>Placed</th><th className="num">Items</th><th>Status</th><th className="num">Total</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_number}>
                    <td><Link href={`/checkout/confirmation/${order.order_number}`} className="mono">{order.order_number}</Link></td>
                    <td>{new Date(order.placed_at).toLocaleDateString('en-GB')}</td>
                    <td className="num">{order.item_count}</td>
                    <td><span className={statusBadge(order.status)}>{statusLabel(order.status)}</span></td>
                    <td className="num strong">{money(order.grand_total, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {section === 'saved' ? (
        <div className="client-split">
          <section className="portal-card portal-card--pad">
            <header className="portal-card__head">
              <div>
                <h2 className="portal-card__title">Saved with your account</h2>
                <p className="portal-card__sub">{savedCount} pieces across the vault</p>
              </div>
              <Heart style={{ width: 17, height: 17, color: 'var(--p-accent-deep)' }} />
            </header>
            {saved === null ? (
              <p className="portal-card__sub">Loading…</p>
            ) : savedCount === 0 ? (
              <div className="portal-empty">
                <div className="portal-empty__mark"><Heart /></div>
                <p className="portal-empty__title">Nothing saved yet</p>
                <p className="portal-empty__sub">Save pieces from the vault, then sync your tray.</p>
              </div>
            ) : (
              <div className="client-list">
                {[...saved.gemstones.map((piece) => ({ ...piece, kind: 'Gemstone' })), ...saved.settings.map((piece) => ({ ...piece, kind: 'Setting', slug: piece.ref, variety: piece.jewellery_type }))].map((piece) => (
                  <Link key={`${piece.kind}-${piece.ref}`} href={piece.kind === 'Gemstone' ? `/product/${piece.slug}` : `/settings/${piece.ref}`} className="client-list__item" style={{ textDecoration: 'none' }}>
                    <span className="client-list__main">
                      <span className="client-list__title">{piece.name}</span>
                      <span className="client-list__sub">{piece.ref} · {piece.variety}</span>
                    </span>
                    <span className="client-list__side"><span className="portal-badge portal-badge--draft">{piece.kind}</span></span>
                  </Link>
                ))}
              </div>
            )}
            <div className="portal-inline" style={{ marginTop: 14 }}>
              <button type="button" onClick={() => void syncTray()} disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Sync this device&apos;s tray</button>
              <button type="button" onClick={loadTray} className="portal-btn portal-btn--ghost portal-btn--sm">Load onto this device</button>
            </div>
          </section>

          <section className="portal-card portal-card--pad">
            <header className="portal-card__head">
              <div>
                <h2 className="portal-card__title">This device&apos;s tray</h2>
                <p className="portal-card__sub">Browser-level favourites</p>
              </div>
            </header>
            <p className="portal-stat__value" style={{ fontSize: 36 }}>{favorites.length}</p>
            <p className="portal-card__sub">{favorites.length === 0 ? 'Empty.' : `${favorites.length} piece(s) held on this device.`}</p>
            <Link href="/favorites" className="portal-btn portal-btn--ghost portal-btn--sm" style={{ marginTop: 14 }}><Gem /> Open favourites</Link>
          </section>
        </div>
      ) : null}

      {section === 'addresses' ? (
        <div className="client-split">
          <section className="portal-card portal-card--pad">
            <header className="portal-card__head">
              <div>
                <h2 className="portal-card__title">Saved addresses</h2>
                <p className="portal-card__sub">{addresses.length} delivery destinations</p>
              </div>
            </header>
            {addresses.length === 0 ? (
              <div className="portal-empty">
                <div className="portal-empty__mark"><MapPin /></div>
                <p className="portal-empty__title">No addresses yet</p>
                <p className="portal-empty__sub">Add one for a faster checkout.</p>
              </div>
            ) : (
              <div className="client-list">
                {addresses.map((address) => (
                  <div key={address.id} className="client-list__item" style={{ alignItems: 'flex-start' }}>
                    <span className="client-list__main">
                      <span className="client-list__title">{address.label}{address.is_default ? <span className="portal-badge portal-badge--pending" style={{ marginLeft: 8 }}>Default</span> : null}</span>
                      <span className="client-list__sub">{address.recipient} · {address.line1}{address.line2 ? `, ${address.line2}` : ''}</span>
                      <span className="client-list__sub">{address.postal_code} {address.city} · {address.country}</span>
                    </span>
                    <span className="client-list__side">
                      {!address.is_default ? <button type="button" onClick={() => void makeDefaultAddress(address.id)} className="portal-btn portal-btn--ghost portal-btn--sm">Make default</button> : null}
                      <button type="button" onClick={() => void removeAddress(address.id)} className="portal-btn portal-btn--danger portal-btn--sm" style={{ marginTop: 6 }}>Remove</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <form onSubmit={addAddress} className="portal-card portal-card--pad space-y-3">
            <header className="portal-card__head" style={{ marginBottom: 2 }}>
              <div>
                <h2 className="portal-card__title">Add an address</h2>
                <p className="portal-card__sub">Stored for future checkouts</p>
              </div>
            </header>
            <div className="grid grid-cols-2 gap-3">
              <input value={addressForm.label} onChange={(event) => setAddressForm((value) => ({ ...value, label: event.target.value }))} placeholder="Label (Home)" className="portal-input" />
              <input value={addressForm.recipient} required onChange={(event) => setAddressForm((value) => ({ ...value, recipient: event.target.value }))} placeholder="Recipient" className="portal-input" />
              <input value={addressForm.line1} required onChange={(event) => setAddressForm((value) => ({ ...value, line1: event.target.value }))} placeholder="Address line 1" className="portal-input col-span-2" />
              <input value={addressForm.line2} onChange={(event) => setAddressForm((value) => ({ ...value, line2: event.target.value }))} placeholder="Address line 2 (optional)" className="portal-input col-span-2" />
              <input value={addressForm.city} required onChange={(event) => setAddressForm((value) => ({ ...value, city: event.target.value }))} placeholder="City" className="portal-input" />
              <input value={addressForm.region} onChange={(event) => setAddressForm((value) => ({ ...value, region: event.target.value }))} placeholder="Region (optional)" className="portal-input" />
              <input value={addressForm.postal_code} required onChange={(event) => setAddressForm((value) => ({ ...value, postal_code: event.target.value }))} placeholder="Postal code" className="portal-input" />
              <input value={addressForm.country} required maxLength={2} onChange={(event) => setAddressForm((value) => ({ ...value, country: event.target.value.toUpperCase() }))} placeholder="Country (AE)" className="portal-input" />
              <input value={addressForm.phone} onChange={(event) => setAddressForm((value) => ({ ...value, phone: event.target.value }))} placeholder="Phone (optional)" className="portal-input col-span-2" />
            </div>
            <label className="flex items-center gap-2" style={{ color: 'var(--p-muted)', fontSize: 'var(--p-fs-xs)' }}>
              <input type="checkbox" checked={addressForm.is_default} onChange={(event) => setAddressForm((value) => ({ ...value, is_default: event.target.checked }))} /> Make this my default address
            </label>
            <button type="submit" disabled={busy} className="portal-btn portal-btn--gold">Save address</button>
          </form>
        </div>
      ) : null}

      {section === 'settings' ? (
        <div className="client-split">
          <form onSubmit={saveProfile} className="portal-card portal-card--pad space-y-3">
            <header className="portal-card__head" style={{ marginBottom: 2 }}>
              <div>
                <h2 className="portal-card__title">Profile</h2>
                <p className="portal-card__sub">Your details on the ledger</p>
              </div>
            </header>
            <div className="grid grid-cols-2 gap-3">
              <input value={profile.first_name} onChange={(event) => setProfile((value) => ({ ...value, first_name: event.target.value }))} placeholder="First name" className="portal-input" />
              <input value={profile.last_name} onChange={(event) => setProfile((value) => ({ ...value, last_name: event.target.value }))} placeholder="Last name" className="portal-input" />
            </div>
            <input value={profile.phone} onChange={(event) => setProfile((value) => ({ ...value, phone: event.target.value }))} placeholder="Phone (optional)" className="portal-input" />
            <button type="submit" disabled={busy} className="portal-btn portal-btn--gold">Save profile</button>
          </form>

          <div className="portal-section">
            <form onSubmit={changePassword} className="portal-card portal-card--pad space-y-3">
              <header className="portal-card__head" style={{ marginBottom: 2 }}>
                <div>
                  <h2 className="portal-card__title">Change password</h2>
                  <p className="portal-card__sub">Keep the atelier secure</p>
                </div>
              </header>
              <input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" autoComplete="current-password" className="portal-input" />
              <input type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password (8+ characters)" autoComplete="new-password" className="portal-input" />
              <button type="submit" disabled={busy} className="portal-btn portal-btn--gold portal-btn--sm">Update password</button>
            </form>

            <div className="portal-card portal-card--pad space-y-2">
              <p className="portal-label">Account</p>
              <p style={{ margin: 0, color: 'var(--p-text)', fontSize: 'var(--p-fs-md)' }}>{me.email}</p>
              <p className="portal-card__sub">{me.email_verified_at ? 'Email verified' : 'Email verification pending'}</p>
              <button type="button" onClick={() => void logout()} className="portal-btn portal-btn--ghost portal-btn--sm" style={{ marginTop: 8 }}><LogOut /> Sign out</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
