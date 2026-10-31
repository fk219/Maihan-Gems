'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, PackageSearch, ShoppingCart, Mail, Building2,
  LogOut, Eye, EyeOff, Trash2, Search, ArrowLeft, ArrowUpRight,
} from 'lucide-react';

/**
 * F4 — admin console, Maison-grade light theme.
 * Full platform management: stats, inventory, orders, vendors, leads.
 */

type Tab = 'overview' | 'inventory' | 'orders' | 'vendors' | 'leads';

interface Stats {
  gemstones_total: number; gemstones_active: number; gemstones_sold: number;
  settings_total: number; settings_active: number;
  products_total: number; products_active: number; products_sold: number;
  orders_total: number; orders_pending: number; orders_paid: number;
  revenue_total: number; revenue_currency: string;
  customers_total: number; vendors_total: number; vendors_active: number; vendors_pending: number;
  submissions_pending: number; submissions_total: number;
  leads_total: number; leads_new: number;
  inventory_value: number; configurations_total: number;
}
interface InvItem {
  ref: string; name: string; kind: string; status: string; price_amount: number | null;
  currency: string; weight_ct: number | null; variety: string; origin: string | null;
  origin_type: string; vendor_code: string | null; vendor_name: string | null;
  table_name: string; primary_image: string | null; created_at: string;
}
interface OrderRow {
  order_number: string; email: string; status: string; grand_total: string; currency: string; placed_at: string;
}
interface OrderDetail extends OrderRow {
  subtotal: string; tax: string; shipping: string; discount: string;
  shipping_address: Record<string, unknown>; customer_note: string | null; customer_email: string | null;
  first_name: string | null; last_name: string | null;
  items: Array<{ description: string; code_snapshot: string; quantity: number; unit_price: string; line_total: string }>;
  payments: Array<{ provider: string; state: string; amount: string; currency: string }>;
  events: Array<{ event: string; created_at: string }>;
}
interface VendorRow {
  code: string; name: string; country: string | null; status: string;
  email: string | null; contact_name: string | null; onboarding_status: string;
  live_gems: number; inventory_value: number; total_submissions: number;
}
interface LeadRow {
  id: number; email: string; name: string | null; source: string; status: string; created_at: string;
}

const badgeClass = (s: string) => {
  if (s === 'ACTIVE' || s === 'PAID' || s === 'APPROVED' || s === 'CONVERTED') return 'portal-badge portal-badge--active';
  if (s === 'SUBMITTED' || s === 'RESERVED' || s === 'PENDING_PAYMENT' || s === 'NEW' || s === 'QUOTE') return 'portal-badge portal-badge--pending';
  if (s === 'SOLD' || s === 'DELIVERED' || s === 'CONTACTED') return 'portal-badge portal-badge--sold';
  if (s === 'REJECTED' || s === 'CANCELLED' || s === 'LOST') return 'portal-badge portal-badge--rejected';
  return 'portal-badge portal-badge--draft';
};

export default function AdminConsoleApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [vendorAction, setVendorAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [issuedKey, setIssuedKey] = useState<{ code: string; key: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', legal_name: '', contact_name: '', email: '', country: '', phone: '', website: '',
  });

  const loadAll = useCallback(async () => {
    setBusy(true);
    try {
      const [statsRes, invRes, ordersRes, vendorsRes, leadsRes] = await Promise.all([
        fetch('/api/fresh/admin/stats', { cache: 'no-store' }),
        fetch('/api/fresh/admin/inventory?limit=100', { cache: 'no-store' }),
        fetch('/api/fresh/admin/orders', { cache: 'no-store' }),
        fetch('/api/fresh/admin/vendors', { cache: 'no-store' }),
        fetch('/api/fresh/admin/leads', { cache: 'no-store' }),
      ]);
      if (statsRes.status === 401) { setAuthed(false); return; }
      if (statsRes.ok) setStats((await statsRes.json()) as Stats);
      if (invRes.ok) setInventory(((await invRes.json()) as { items?: InvItem[] }).items ?? []);
      if (ordersRes.ok) setOrders((await ordersRes.json()) as OrderRow[]);
      if (vendorsRes.ok) setVendors((await vendorsRes.json()) as VendorRow[]);
      if (leadsRes.ok) setLeads((await leadsRes.json()) as LeadRow[]);
      setAuthed(true);
    } catch { setAuthed(false); }
    setBusy(false);
  }, []);

  useEffect(() => {
    fetch('/api/fresh/admin/stats', { cache: 'no-store' })
      .then((r) => setAuthed(r.status !== 401))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => { if (authed) void loadAll(); }, [authed, loadAll]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(''); setBusy(true);
    const res = await fetch('/api/fresh-admin/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setPassword(''); setAuthed(true); await loadAll(); }
    else setLoginError('Invalid password');
    setBusy(false);
  };

  const logout = async () => {
    await fetch('/api/fresh-admin/login', { method: 'DELETE' });
    setAuthed(false);
  };

  const searchInventory = async () => {
    setBusy(true);
    const params = new URLSearchParams({ limit: '100' });
    if (invSearch) params.set('q', invSearch);
    if (invStatus) params.set('status', invStatus);
    const res = await fetch(`/api/fresh/admin/inventory?${params}`, { cache: 'no-store' });
    if (res.ok) setInventory(((await res.json()) as { items?: InvItem[] }).items ?? []);
    setBusy(false);
  };

  const updateStatus = async (ref: string, status: string) => {
    setBusy(true);
    await fetch(`/api/fresh/admin/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAll(); setBusy(false);
  };

  const openOrder = async (num: string) => {
    setBusy(true);
    const res = await fetch(`/api/fresh/admin/orders/${num}`, { cache: 'no-store' });
    if (res.ok) setOrderDetail((await res.json()) as OrderDetail);
    setBusy(false);
  };

  const vendorOnboarding = async (v: VendorRow, action: 'approve' | 'reject' | 'suspend') => {
    setVendorAction(action); setActionError('');
    try {
      const res = await fetch(`/api/fresh/admin/onboarding/${encodeURIComponent(v.code)}/${action}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'approve' ? {} : { note: action === 'suspend' ? 'Suspended by admin' : 'Rejected by admin' }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; apiKey?: string };
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      const refreshed = await fetch('/api/fresh/admin/vendors', { cache: 'no-store' });
      if (refreshed.ok) {
        const list = (await refreshed.json()) as VendorRow[];
        setVendors(list);
        setSelectedVendor(list.find((x) => x.code === v.code) ?? null);
      }
      if (action === 'approve' && data.apiKey) setIssuedKey({ code: v.code, key: data.apiKey });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setVendorAction(null);
    }
  };

  const createVendor = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateBusy(true); setActionError('');
    try {
      const res = await fetch('/api/fresh/vendors', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name, legal_name: createForm.legal_name,
          contact_name: createForm.contact_name, email: createForm.email,
          country: createForm.country,
          phone: createForm.phone || undefined,
          website: createForm.website || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; vendorCode?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not create partner');
      setShowCreate(false);
      setCreateForm({ name: '', legal_name: '', contact_name: '', email: '', country: '', phone: '', website: '' });
      await loadAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not create partner');
    } finally {
      setCreateBusy(false);
    }
  };

  const markLead = async (id: number, status: string) => {
    await fetch(`/api/fresh/admin/leads/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAll();
  };

  if (authed === null) return <div className="portal-shell" />;

  if (!authed) {
    return (
      <div className="portal-shell items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-7">
          <div className="text-center space-y-3">
            <p className="portal-kicker">Maihan Gems</p>
            <h1 className="portal-page-title">Maison Operations</h1>
            <div className="w-10 h-px bg-gradient-to-r from-[#F3DFA2] via-[#D4AF37] to-[#9A7B2C] mx-auto" />
          </div>
          <form onSubmit={login} className="portal-card portal-card--pad space-y-5">
            <div>
              <label className="portal-label" htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="portal-input" autoComplete="current-password" />
            </div>
            {loginError ? <p className="text-xs text-[#9B3A2A]">{loginError}</p> : null}
            <button type="submit" disabled={busy} className="portal-btn portal-btn--gold w-full">
              {busy ? 'Opening the vault…' : 'Enter the console'}
            </button>
          </form>
          <p className="text-center text-[11px] text-[#A39E93]">Authorized personnel only.</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview' as Tab, icon: LayoutDashboard, label: 'Overview' },
    { id: 'inventory' as Tab, icon: PackageSearch, label: 'Inventory' },
    { id: 'orders' as Tab, icon: ShoppingCart, label: 'Orders' },
    { id: 'vendors' as Tab, icon: Building2, label: 'Vendors' },
    { id: 'leads' as Tab, icon: Mail, label: 'Leads' },
  ];

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <p className="portal-brand__eyebrow">Maihan Gems</p>
          <p className="portal-brand__name">Operations</p>
          <div className="portal-brand__rule" />
          <p className="portal-brand__meta">Administrator</p>
        </div>
        <nav className="portal-nav">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setTab(item.id); setOrderDetail(null); setSelectedVendor(null); }}
              className={`portal-nav__item ${tab === item.id ? 'is-active' : ''}`}>
              <item.icon /> {item.label}
            </button>
          ))}
        </nav>
        <div className="portal-sidebar__footer">
          <button onClick={logout} className="portal-signout"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>

      <main className="portal-main">
        {/* ======== OVERVIEW ======== */}
        {tab === 'overview' && stats ? (
          <div className="space-y-8">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Maison Ledger</p>
                <h1 className="portal-page-title">Platform Overview</h1>
                <p className="portal-page-sub">Revenue, inventory and partners at a glance.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Revenue (paid)', value: `$${stats.revenue_total.toLocaleString()}`, meta: `${stats.orders_paid} settled orders` },
                { label: 'Orders', value: stats.orders_total, meta: `${stats.orders_pending} pending payment` },
                { label: 'Inventory value', value: `$${stats.inventory_value.toLocaleString()}`, meta: `${stats.gemstones_active} active stones` },
                { label: 'Clients', value: stats.customers_total, meta: `${stats.leads_total} leads · ${stats.leads_new} new` },
              ].map((s) => (
                <div key={s.label} className="portal-card portal-stat">
                  <p className="portal-stat__label">{s.label}</p>
                  <p className="portal-stat__value">{s.value}</p>
                  <p className="portal-stat__meta">{s.meta}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Gemstones', total: stats.gemstones_total, active: stats.gemstones_active, sold: stats.gemstones_sold },
                { label: 'Settings', total: stats.settings_total, active: stats.settings_active, sold: 0 },
                { label: 'Products', total: stats.products_total, active: stats.products_active, sold: stats.products_sold },
                { label: 'Vendors', total: stats.vendors_total, active: stats.vendors_active, sold: stats.vendors_pending },
                { label: 'Submissions', total: stats.submissions_total, active: stats.submissions_pending, sold: 0 },
                { label: 'DYO Configs', total: stats.configurations_total, active: 0, sold: 0 },
              ].map((s) => (
                <div key={s.label} className="portal-card portal-card--pad">
                  <p className="text-[13px] font-medium text-[#1A1612]">{s.label}</p>
                  <div className="flex gap-4 mt-2 font-mono text-[10px] tracking-wide text-[#8A857B]">
                    <span>Total <strong className="text-[#3D352A]">{s.total}</strong></span>
                    <span>Active <strong className="text-[#2E6B3E]">{s.active}</strong></span>
                    {s.sold > 0 ? <span>Sold <strong className="text-[#33587F]">{s.sold}</strong></span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ======== INVENTORY ======== */}
        {tab === 'inventory' ? (
          <div className="space-y-6">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Catalogue</p>
                <h1 className="portal-page-title">Platform Inventory</h1>
                <p className="portal-page-sub">Every stone and piece across the house and its partners.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#B3AC9F]" />
                <input value={invSearch} onChange={(e) => setInvSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchInventory()}
                  placeholder="Search by name or reference…" className="portal-input pl-10" />
              </div>
              <select value={invStatus} onChange={(e) => setInvStatus(e.target.value)} className="portal-select sm:w-44">
                <option value="">All statuses</option><option>ACTIVE</option><option>DRAFT</option><option>SOLD</option><option>RESERVED</option><option>ARCHIVED</option>
              </select>
              <button onClick={searchInventory} className="portal-btn portal-btn--gold">Search</button>
            </div>
            <div className="portal-card overflow-x-auto">
              <table className="portal-table">
                <thead><tr>
                  <th>Item</th><th>Reference</th><th>Vendor</th><th>Status</th><th className="text-right">Price</th><th className="text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.ref + item.table_name}>
                      <td>
                        <span className="font-medium text-[#1A1612]">{item.name}</span>
                        <span className="block text-[10px] text-[#A39E93]">{item.variety} · {item.kind}</span>
                      </td>
                      <td className="mono">{item.ref}</td>
                      <td className="text-[12px] text-[#8A857B]">{item.vendor_name ?? 'House'}</td>
                      <td><span className={badgeClass(item.status)}>{item.status}</span></td>
                      <td className="num">{item.price_amount ? `$${item.price_amount.toLocaleString()}` : '—'}</td>
                      <td className="text-right">
                        <div className="flex gap-1.5 justify-end">
                          {item.status === 'ACTIVE' ? <>
                            <button onClick={() => updateStatus(item.ref, 'DRAFT')} title="Hide from storefront" className="portal-btn portal-btn--ghost portal-btn--sm"><EyeOff className="h-3.5 w-3.5" /></button>
                            <button onClick={() => updateStatus(item.ref, 'ARCHIVED')} title="Archive" className="portal-btn portal-btn--danger portal-btn--sm"><Trash2 className="h-3.5 w-3.5" /></button>
                          </> : item.status === 'DRAFT' ? <>
                            <button onClick={() => updateStatus(item.ref, 'ACTIVE')} title="Publish" className="portal-btn portal-btn--ghost portal-btn--sm"><Eye className="h-3.5 w-3.5" /></button>
                          </> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventory.length === 0 ? (
                <div className="portal-empty">
                  <div className="portal-empty__mark"><PackageSearch className="h-5 w-5" /></div>
                  <p className="portal-empty__title">No items match</p>
                  <p className="portal-empty__sub">Try a different search or status filter.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ======== ORDERS ======== */}
        {tab === 'orders' ? (
          <div className="space-y-6">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Ledger</p>
                <h1 className="portal-page-title">{orderDetail ? orderDetail.order_number : 'Orders'}</h1>
                <p className="portal-page-sub">{orderDetail ? 'Order dossier and customer record.' : 'Every order placed on the platform.'}</p>
              </div>
            </div>
            {orderDetail ? (
              <div className="space-y-5">
                <button onClick={() => setOrderDetail(null)} className="portal-btn portal-btn--ghost portal-btn--sm"><ArrowLeft className="h-3.5 w-3.5" /> All orders</button>
                <div className="portal-card portal-card--pad space-y-5">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="font-mono text-[11px] text-[#9A7B2C] tracking-wide">{orderDetail.order_number}</p>
                      <h2 className="text-xl mt-1">{orderDetail.customer_email}</h2>
                      <div className="mt-2"><span className={badgeClass(orderDetail.status)}>{orderDetail.status}</span></div>
                    </div>
                    <p className="text-[26px] tabular-nums text-[#16120D]">{orderDetail.currency} {orderDetail.grand_total}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                    <div>
                      <p className="portal-label">Items</p>
                      <div className="space-y-2">
                        {orderDetail.items.map((i, j) => (
                          <div key={j} className="flex justify-between gap-3 text-[13px]">
                            <span className="text-[#5C4E3C]">{i.quantity}× {i.description}</span>
                            <span className="mono">{i.line_total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="portal-label">Shipping</p>
                      <p className="text-[12.5px] text-[#5C4E3C] leading-relaxed">{JSON.stringify(orderDetail.shipping_address)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="portal-label">Timeline</p>
                    <div className="space-y-1.5">
                      {orderDetail.events.map((ev, j) => (
                        <p key={j} className="font-mono text-[10.5px] text-[#8A857B]">{ev.event} · {ev.created_at}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="portal-card overflow-x-auto">
                <table className="portal-table">
                  <thead><tr><th>Order</th><th>Email</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Placed</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.order_number} onClick={() => openOrder(o.order_number)} className="cursor-pointer">
                        <td className="mono">{o.order_number}</td>
                        <td className="text-[#5C4E3C]">{o.email}</td>
                        <td><span className={badgeClass(o.status)}>{o.status}</span></td>
                        <td className="num">{o.currency} {o.grand_total}</td>
                        <td className="num text-[#A39E93]">{new Date(o.placed_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><ShoppingCart className="h-5 w-5" /></div>
                    <p className="portal-empty__title">No orders yet</p>
                    <p className="portal-empty__sub">Orders placed on the storefront appear here.</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* ======== VENDORS ======== */}
        {tab === 'vendors' ? (
          <div className="space-y-6">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Partners</p>
                <h1 className="portal-page-title">{selectedVendor ? selectedVendor.name : 'Vendors'}</h1>
                <p className="portal-page-sub">{selectedVendor ? 'Partner dossier and inventory position.' : 'Every partner supplying the maison.'}</p>
              </div>
              {!selectedVendor ? (
                <button onClick={() => { setShowCreate((v) => !v); setActionError(''); }} className="portal-btn portal-btn--gold portal-btn--sm">
                  {showCreate ? 'Close' : 'New partner'}
                </button>
              ) : null}
            </div>
            {showCreate && !selectedVendor ? (
              <form onSubmit={createVendor} className="portal-card portal-card--pad space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cv-name" className="portal-label">Trading name</label>
                    <input id="cv-name" required minLength={2} value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} className="portal-input" placeholder="Atelier Lumière" />
                  </div>
                  <div>
                    <label htmlFor="cv-legal" className="portal-label">Legal name</label>
                    <input id="cv-legal" required minLength={2} value={createForm.legal_name} onChange={(e) => setCreateForm((f) => ({ ...f, legal_name: e.target.value }))} className="portal-input" placeholder="Atelier Lumière SARL" />
                  </div>
                  <div>
                    <label htmlFor="cv-contact" className="portal-label">Contact name</label>
                    <input id="cv-contact" required minLength={2} value={createForm.contact_name} onChange={(e) => setCreateForm((f) => ({ ...f, contact_name: e.target.value }))} className="portal-input" placeholder="Full name" />
                  </div>
                  <div>
                    <label htmlFor="cv-email" className="portal-label">Email</label>
                    <input id="cv-email" type="email" required value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} className="portal-input" placeholder="partner@company.com" />
                  </div>
                  <div>
                    <label htmlFor="cv-country" className="portal-label">Country (ISO-2)</label>
                    <input id="cv-country" required maxLength={2} minLength={2} value={createForm.country} onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} className="portal-input" placeholder="AE" />
                  </div>
                  <div>
                    <label htmlFor="cv-phone" className="portal-label">Phone <span className="text-[10px] text-[#A39E93]">optional</span></label>
                    <input id="cv-phone" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} className="portal-input" placeholder="+971 …" />
                  </div>
                </div>
                {actionError ? <p className="text-xs text-[#9B3A2A]">{actionError}</p> : null}
                <div className="flex justify-end">
                  <button type="submit" disabled={createBusy} className="portal-btn portal-btn--gold portal-btn--sm">
                    {createBusy ? 'Creating…' : 'Create partner'}
                  </button>
                </div>
              </form>
            ) : null}
            {selectedVendor ? (
              <div className="space-y-5">
                <button onClick={() => setSelectedVendor(null)} className="portal-btn portal-btn--ghost portal-btn--sm"><ArrowLeft className="h-3.5 w-3.5" /> All vendors</button>
                {issuedKey && issuedKey.code === selectedVendor.code ? (
                  <div className="portal-card portal-card--pad" style={{ borderColor: '#D4AF37', background: '#FCF8EC' }}>
                    <p className="portal-kicker">One-time credential</p>
                    <p className="mt-2 text-sm text-[#3D362C]">API key for <span className="font-mono text-[12px] text-[#9A7B2C]">{issuedKey.code}</span> — shown once. Send it to the partner for first-time password setup.</p>
                    <code className="mt-3 block break-all rounded-md border border-[#EAE1D1] bg-white px-3 py-2 font-mono text-[11px] text-[#16120D]">{issuedKey.key}</code>
                    <button onClick={() => void navigator.clipboard?.writeText(issuedKey.key)} className="portal-btn portal-btn--ghost portal-btn--sm mt-3">Copy key</button>
                  </div>
                ) : null}
                <div className="portal-card portal-card--pad">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="font-mono text-[11px] text-[#9A7B2C]">{selectedVendor.code}</p>
                      <h2 className="text-xl mt-1">{selectedVendor.name}</h2>
                      <p className="text-[13px] text-[#5C4E3C] mt-1">{selectedVendor.contact_name} · {selectedVendor.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={badgeClass(selectedVendor.status)}>{selectedVendor.status}</span>
                        <span className="portal-badge portal-badge--draft">{selectedVendor.onboarding_status}</span>
                        <span className="portal-badge portal-badge--draft">{selectedVendor.country}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedVendor.onboarding_status !== 'APPROVED' || selectedVendor.status !== 'ACTIVE' ? (
                          <>
                            <button onClick={() => void vendorOnboarding(selectedVendor, 'approve')} disabled={vendorAction !== null} className="portal-btn portal-btn--gold portal-btn--sm">
                              {vendorAction === 'approve' ? 'Approving…' : 'Approve partner'}
                            </button>
                            <button onClick={() => void vendorOnboarding(selectedVendor, 'reject')} disabled={vendorAction !== null} className="portal-btn portal-btn--ghost portal-btn--sm">
                              {vendorAction === 'reject' ? 'Rejecting…' : 'Reject'}
                            </button>
                          </>
                        ) : (
                          <button onClick={() => void vendorOnboarding(selectedVendor, 'suspend')} disabled={vendorAction !== null} className="portal-btn portal-btn--danger portal-btn--sm">
                            {vendorAction === 'suspend' ? 'Suspending…' : 'Suspend partner'}
                          </button>
                        )}
                      </div>
                      {actionError ? <p className="mt-3 text-xs text-[#9B3A2A]">{actionError}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-[26px] tabular-nums text-[#16120D]">${selectedVendor.inventory_value.toLocaleString()}</p>
                      <p className="portal-stat__meta">{selectedVendor.live_gems} live items</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="portal-card portal-stat"><p className="portal-stat__label">Live gems</p><p className="portal-stat__value">{selectedVendor.live_gems}</p></div>
                  <div className="portal-card portal-stat"><p className="portal-stat__label">Submissions</p><p className="portal-stat__value">{selectedVendor.total_submissions}</p></div>
                  <div className="portal-card portal-stat"><p className="portal-stat__label">Inventory value</p><p className="portal-stat__value">${selectedVendor.inventory_value.toLocaleString()}</p></div>
                </div>
              </div>
            ) : (
              <div className="portal-card overflow-x-auto">
                <table className="portal-table">
                  <thead><tr><th>Code</th><th>Partner</th><th>Country</th><th>Status</th><th className="text-right">Live</th><th className="text-right">Value</th></tr></thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.code} onClick={() => setSelectedVendor(v)} className="cursor-pointer">
                        <td className="mono">{v.code}</td>
                        <td>
                          <span className="font-medium text-[#1A1612]">{v.name}</span>
                          <span className="block text-[10px] text-[#A39E93]">{v.contact_name} · {v.email}</span>
                        </td>
                        <td className="text-[12px]">{v.country}</td>
                        <td><span className={badgeClass(v.status)}>{v.status}</span></td>
                        <td className="num">{v.live_gems}</td>
                        <td className="num">${v.inventory_value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vendors.length === 0 ? (
                  <div className="portal-empty">
                    <div className="portal-empty__mark"><Building2 className="h-5 w-5" /></div>
                    <p className="portal-empty__title">No vendors yet</p>
                    <p className="portal-empty__sub">Partner onboarding appears here.</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* ======== LEADS ======== */}
        {tab === 'leads' ? (
          <div className="space-y-6">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Relationships</p>
                <h1 className="portal-page-title">Leads</h1>
                <p className="portal-page-sub">Newsletter signups and viewing requests from the storefront.</p>
              </div>
            </div>
            {leads.length === 0 ? (
              <div className="portal-card portal-empty">
                <div className="portal-empty__mark"><Mail className="h-5 w-5" /></div>
                <p className="portal-empty__title">No leads yet</p>
                <p className="portal-empty__sub">Newsletter and viewing requests will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((l) => (
                  <div key={l.id} className="portal-card portal-card--pad flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#1A1612]">{l.email}</p>
                      <p className="font-mono text-[10.5px] text-[#A39E93] mt-0.5">{l.name ?? '—'} · {l.source} · {new Date(l.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={badgeClass(l.status)}>{l.status}</span>
                      {l.status === 'NEW' ? (
                        <button onClick={() => markLead(l.id, 'CONTACTED')} className="portal-btn portal-btn--ghost portal-btn--sm">Mark contacted <ArrowUpRight className="h-3 w-3" /></button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
