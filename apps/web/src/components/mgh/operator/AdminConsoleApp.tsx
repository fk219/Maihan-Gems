'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, PackageSearch, ShoppingCart, Users, Mail, Building2,
  LogOut, Eye, EyeOff, Trash2, DollarSign, Package, Search,
} from 'lucide-react';

/**
 * F4 — admin console, production-ready light theme with sidebar.
 * Full platform management: stats, inventory, orders, vendors, leads.
 */

const input = 'w-full rounded-lg border border-[#E5D4B3] bg-white px-3 py-2.5 text-sm text-[#1A1612] placeholder-[#9A9385] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors';
const label = 'block text-[11px] font-medium text-[#5C4E3C] mb-1.5 tracking-wide';
const card = 'bg-white rounded-xl border border-[#E8DFCE] shadow-[0_2px_8px_rgba(185,150,75,0.06)]';
const btnPrimary = 'rounded-lg bg-gradient-to-r from-[#F3DFA2] via-[#D4AF37] to-[#9A7B2C] text-white font-medium py-2.5 px-5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer';

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
    else setLoginError('invalid password');
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

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'PAID') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'SUBMITTED' || s === 'RESERVED' || s === 'PENDING_PAYMENT') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'SOLD' || s === 'DELIVERED') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'REJECTED' || s === 'CANCELLED') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (authed === null) return <div className="min-h-screen bg-[#FAF8F4]" />;

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#9A7B2C]">Maihan Gems</p>
            <h1 className="font-serif text-2xl text-[#1A1612]">Admin Console</h1>
          </div>
          <div className={card + ' p-6 space-y-4'}>
            <div><label className={label}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} /></div>
            {loginError ? <p className="text-xs text-[#991B1B]">{loginError}</p> : null}
            <button onClick={login} disabled={busy} className={btnPrimary + ' w-full'}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </div>
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
    <div className="min-h-screen bg-[#FAF8F4] flex">
      <aside className="w-60 shrink-0 border-r border-[#E8DFCE] bg-white flex flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-[#E8DFCE]">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#9A7B2C]">Maihan Gems</p>
          <p className="font-serif text-lg text-[#1A1612] mt-0.5">Admin Console</p>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setTab(item.id); setOrderDetail(null); }}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors cursor-pointer ${
                tab === item.id ? 'bg-[#FAF8F4] text-[#9A7B2C] font-medium border-r-2 border-[#D4AF37]' : 'text-[#5C4E3C] hover:bg-[#FAF8F4] hover:text-[#1A1612]'
              }`}>
              <item.icon className="h-4 w-4 shrink-0" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#E8DFCE]">
          <button onClick={logout} className="flex items-center gap-3 px-2 py-2 text-sm text-[#9A9385] hover:text-[#1A1612] transition-colors cursor-pointer w-full">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8 max-w-6xl overflow-y-auto">
        {/* ======== OVERVIEW ======== */}
        {tab === 'overview' && stats ? (
          <div className="space-y-6">
            <h1 className="font-serif text-2xl text-[#1A1612]">Platform Overview</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: DollarSign, label: 'Revenue (PAID)', value: `$${stats.revenue_total.toLocaleString()}`, sub: stats.revenue_currency },
                { icon: ShoppingCart, label: 'Orders', value: stats.orders_total, sub: `${stats.orders_pending} pending` },
                { icon: Package, label: 'Live Inventory', value: `$${stats.inventory_value.toLocaleString()}`, sub: `${stats.gemstones_active} active stones` },
                { icon: Users, label: 'Customers', value: stats.customers_total, sub: `${stats.leads_total} leads` },
              ].map((s) => (
                <div key={s.label} className={card + ' p-5'}>
                  <div className="flex items-center gap-2 text-[#9A7B2C]"><s.icon className="h-4 w-4" /><span className="text-[10px] uppercase tracking-wider font-medium">{s.label}</span></div>
                  <p className="font-serif text-3xl text-[#1A1612] mt-2">{s.value}</p>
                  <p className="text-[10px] text-[#9A9385] mt-1">{s.sub}</p>
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
                <div key={s.label} className={card + ' p-4'}>
                  <p className="text-sm font-medium text-[#1A1612]">{s.label}</p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-[#5C4E3C]">Total: <strong>{s.total}</strong></span>
                    <span className="text-[#166534]">Active: <strong>{s.active}</strong></span>
                    {s.sold > 0 ? <span className="text-[#1E40AF]">Sold: <strong>{s.sold}</strong></span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ======== INVENTORY ======== */}
        {tab === 'inventory' ? (
          <div className="space-y-5">
            <h1 className="font-serif text-2xl text-[#1A1612]">Platform Inventory</h1>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9A9385]" />
                <input value={invSearch} onChange={(e) => setInvSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchInventory()}
                  placeholder="Search by name or reference…" className={input + ' pl-9'} />
              </div>
              <select value={invStatus} onChange={(e) => setInvStatus(e.target.value)} className={input + ' w-40 cursor-pointer'}>
                <option value="">All Statuses</option><option>ACTIVE</option><option>DRAFT</option><option>SOLD</option><option>RESERVED</option><option>ARCHIVED</option>
              </select>
              <button onClick={searchInventory} className={btnPrimary}>Search</button>
            </div>
            <div className={card + ' overflow-x-auto'}>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] font-medium uppercase tracking-wider text-[#9A9385] border-b border-[#E8DFCE]">
                  <th className="py-3 pr-3">Item</th><th className="py-3 pr-3">Ref</th><th className="py-3 pr-3">Vendor</th>
                  <th className="py-3 pr-3">Status</th><th className="py-3 pr-3 text-right">Price</th><th className="py-3 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.ref + item.table_name} className="border-b border-[#F0EDE6] hover:bg-[#FAF8F4]">
                      <td className="py-2.5 pr-3 font-medium text-[#1A1612]">{item.name}<span className="block text-[10px] text-[#9A9385]">{item.variety} · {item.kind}</span></td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-[#9A7B2C]">{item.ref}</td>
                      <td className="py-2.5 pr-3 text-xs text-[#9A9385]">{item.vendor_name ?? 'House'}</td>
                      <td className="py-2.5 pr-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(item.status)}`}>{item.status}</span></td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{item.price_amount ? `$${item.price_amount.toLocaleString()}` : '—'}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex gap-1 justify-end">
                          {item.status === 'ACTIVE' ? <>
                            <button onClick={() => updateStatus(item.ref, 'DRAFT')} title="Hide" className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"><EyeOff className="h-3.5 w-3.5" /></button>
                            <button onClick={() => updateStatus(item.ref, 'ARCHIVED')} title="Delete" className="p-1.5 rounded-md border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                          </> : item.status === 'DRAFT' ? <>
                            <button onClick={() => updateStatus(item.ref, 'ACTIVE')} title="Publish" className="p-1.5 rounded-md border border-emerald-200 text-emerald-600 hover:bg-emerald-50 cursor-pointer"><Eye className="h-3.5 w-3.5" /></button>
                          </> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ======== ORDERS ======== */}
        {tab === 'orders' ? (
          <div className="space-y-5">
            <h1 className="font-serif text-2xl text-[#1A1612]">Orders</h1>
            {orderDetail ? (
              <div className="space-y-4">
                <button onClick={() => setOrderDetail(null)} className="text-sm text-[#9A7B2C] hover:text-[#1A1612] cursor-pointer">← Back to orders</button>
                <div className={card + ' p-6 space-y-4'}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-[#9A7B2C]">{orderDetail.order_number}</p>
                      <h2 className="font-serif text-xl text-[#1A1612]">{orderDetail.customer_email}</h2>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(orderDetail.status)}`}>{orderDetail.status}</span>
                    </div>
                    <p className="font-serif text-2xl text-[#1A1612]">{orderDetail.currency} {orderDetail.grand_total}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="font-medium text-[#1A1612]">Items</p>
                      {orderDetail.items.map((i, j) => (
                        <p key={j} className="text-xs text-[#5C4E3C]">{i.quantity}× {i.description} <span className="font-mono">{i.code_snapshot}</span> — {i.line_total}</p>
                      ))}
                    </div>
                    <div><p className="font-medium text-[#1A1612]">Shipping</p>
                      <p className="text-xs text-[#5C4E3C]">{JSON.stringify(orderDetail.shipping_address).slice(0, 200)}</p></div>
                  </div>
                  <div><p className="font-medium text-[#1A1612]">Timeline</p>
                    {orderDetail.events.map((ev, j) => (
                      <p key={j} className="text-xs text-[#9A9385]">{ev.event} · {ev.created_at}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={card + ' overflow-x-auto'}>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[10px] font-medium uppercase tracking-wider text-[#9A9385] border-b border-[#E8DFCE]">
                    <th className="py-3 pr-3">Order</th><th className="py-3 pr-3">Email</th><th className="py-3 pr-3">Status</th>
                    <th className="py-3 text-right">Total</th>
                  </tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.order_number} onClick={() => openOrder(o.order_number)}
                        className="border-b border-[#F0EDE6] hover:bg-[#FAF8F4] cursor-pointer transition-colors">
                        <td className="py-2.5 pr-3 font-mono text-xs text-[#9A7B2C]">{o.order_number}</td>
                        <td className="py-2.5 pr-3 text-[#5C4E3C]">{o.email}</td>
                        <td className="py-2.5 pr-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(o.status)}`}>{o.status}</span></td>
                        <td className="py-2.5 text-right tabular-nums">{o.currency} {o.grand_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* ======== VENDORS ======== */}
        {tab === 'vendors' ? (
          <div className="space-y-5">
            <h1 className="font-serif text-2xl text-[#1A1612]">Vendors</h1>
            {selectedVendor ? (
              <div className="space-y-4">
                <button onClick={() => setSelectedVendor(null)} className="text-sm text-[#9A7B2C] hover:text-[#1A1612] cursor-pointer">← Back to vendors</button>
                <div className={card + ' p-6 space-y-4'}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-[#9A7B2C]">{selectedVendor.code}</p>
                      <h2 className="font-serif text-xl text-[#1A1612]">{selectedVendor.name}</h2>
                      <p className="text-sm text-[#5C4E3C]">{selectedVendor.contact_name} · {selectedVendor.email}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(selectedVendor.status)}`}>{selectedVendor.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-2xl text-[#1A1612]">${selectedVendor.inventory_value.toLocaleString()}</p>
                      <p className="text-[10px] text-[#9A9385]">{selectedVendor.live_gems} live items</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className={card + ' p-4 text-center'}><p className="text-[10px] uppercase text-[#9A9385]">Live Gems</p><p className="font-serif text-2xl">{selectedVendor.live_gems}</p></div>
                  <div className={card + ' p-4 text-center'}><p className="text-[10px] uppercase text-[#9A9385]">Submissions</p><p className="font-serif text-2xl">{selectedVendor.total_submissions}</p></div>
                  <div className={card + ' p-4 text-center'}><p className="text-[10px] uppercase text-[#9A9385]">Inventory Value</p><p className="font-serif text-2xl">${selectedVendor.inventory_value.toLocaleString()}</p></div>
                </div>
              </div>
            ) : (
              <div className={card + ' overflow-x-auto'}>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[10px] font-medium uppercase tracking-wider text-[#9A9385] border-b border-[#E8DFCE]">
                    <th className="py-3 pr-3">Code</th><th className="py-3 pr-3">Name</th><th className="py-3 pr-3">Country</th>
                    <th className="py-3 pr-3">Status</th><th className="py-3 pr-3 text-right">Live</th><th className="py-3 text-right">Value</th>
                  </tr></thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.code} onClick={() => setSelectedVendor(v)} className="border-b border-[#F0EDE6] hover:bg-[#FAF8F4] cursor-pointer transition-colors">
                        <td className="py-2.5 pr-3 font-mono text-xs text-[#9A7B2C]">{v.code}</td>
                        <td className="py-2.5 pr-3 font-medium text-[#1A1612]">{v.name}<span className="block text-[10px] text-[#9A9385]">{v.contact_name} · {v.email}</span></td>
                        <td className="py-2.5 pr-3 text-xs">{v.country}</td>
                        <td className="py-2.5 pr-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(v.status)}`}>{v.status}</span></td>
                        <td className="py-2.5 pr-3 text-right">{v.live_gems}</td>
                        <td className="py-2.5 text-right tabular-nums">${v.inventory_value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* ======== LEADS ======== */}
        {tab === 'leads' ? (
          <div className="space-y-5">
            <h1 className="font-serif text-2xl text-[#1A1612]">Leads</h1>
            {leads.length === 0 ? (
              <p className="text-sm text-[#9A9385]">No leads yet. Newsletter signups from the storefront appear here.</p>
            ) : (
              <div className="space-y-3">
                {leads.map((l) => (
                  <div key={l.id} className={card + ' p-4 flex items-start justify-between gap-4'}>
                    <div>
                      <p className="font-medium text-[#1A1612]">{l.email}</p>
                      <p className="text-xs text-[#9A9385]">{l.name ?? '—'} · {l.source} · {new Date(l.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${l.status === 'NEW' ? 'border-amber-200 text-amber-700 bg-amber-50' : l.status === 'CONTACTED' ? 'border-blue-200 text-blue-700 bg-blue-50' : l.status === 'CONVERTED' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-gray-200 text-gray-600 bg-gray-50'}`}>{l.status}</span>
                      {l.status === 'NEW' ? <button onClick={() => { fetch(`/api/fresh/admin/leads/${l.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'CONTACTED' }) }).then(() => loadAll()); }} className="text-xs text-[#9A7B2C] hover:text-[#1A1612] cursor-pointer">Mark contacted →</button> : null}
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
