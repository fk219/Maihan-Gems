'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, PackageSearch, PlusCircle, Settings, LogOut,
  Eye, EyeOff, Trash2, DollarSign, Package, Clock, 
  ArrowUpRight, CheckCircle2, AlertCircle,
} from 'lucide-react';

/**
 * F4 — vendor portal, production-ready light theme with sidebar.
 * Full inventory management: overview stats, submission tracking with
 * admin feedback, live inventory cards (sold out / hide / delete),
 * new submission with registry dropdowns.
 */

const input =
  'w-full rounded-lg border border-[#E5D4B3] bg-white px-3 py-2.5 text-sm text-[#1A1612] placeholder-[#9A9385] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors';
const label = 'block text-[11px] font-medium text-[#5C4E3C] mb-1.5 tracking-wide';
const card = 'bg-white rounded-xl border border-[#E8DFCE] shadow-[0_2px_8px_rgba(185,150,75,0.06)]';
const btnPrimary = 'w-full rounded-lg bg-gradient-to-r from-[#F3DFA2] via-[#D4AF37] to-[#9A7B2C] text-white font-medium py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer';

type Tab = 'overview' | 'submissions' | 'inventory' | 'new' | 'settings';
type SubTab = 'all' | 'APPROVED' | 'SUBMITTED' | 'REJECTED';
type Kind = 'gemstone' | 'setting' | 'product';

interface SubmissionRow {
  id: number;
  submission_kind: string;
  status: string;
  resulting_ref: string | null;
  payload: Record<string, unknown>;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface InventoryItem {
  ref: string;
  slug: string;
  name: string;
  kind: string;
  weight_ct: number | null;
  price_amount: number | null;
  currency: string;
  status: string;
  origin_type: string;
  variety: string;
  colour: string | null;
  shape: string | null;
  origin: string | null;
  primary_image: string | null;
  owner_kind: string;
}

interface InventoryStats {
  total_items: number;
  live_items: number;
  sold_items: number;
  hidden_items: number;
  total_value: number;
  currency: string;
}

interface VarietyRow { code: string; slug: string; name: string }

export default function VendorPortalApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [varieties, setVarieties] = useState<VarietyRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind>('gemstone');
  const [form, setForm] = useState<Record<string, string>>({
    vendor_ref: '', variety: 'ruby', weight_ct: '', colour: '', origin: '', shape: '',
    clarity: '', jewellery_type: 'RING', metal: 'W14', style: '',
    price_amount: '', currency: 'USD', description: '',
  });

  const authFetch = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(`/api/fresh${path}`, { ...init, cache: 'no-store' });
    if (res.status === 401) { setAuthed(false); throw new Error('unauthorized'); }
    return res;
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const meRes = await authFetch('/vendor/auth/me');
      if (!meRes.ok) { setAuthed(false); return; }
      const me = (await meRes.json()) as { code: string; name: string };
      setVendorName(me.name);
      setVendorCode(me.code);
      const [subsRes, invRes, varRes] = await Promise.all([
        authFetch(`/vendors/${me.code}/submissions`),
        authFetch(`/vendors/${me.code}/inventory`),
        fetch('/api/fresh/catalogue/varieties', { cache: 'no-store' }),
      ]);
      if (subsRes.ok) setSubmissions(((await subsRes.json()) as SubmissionRow[]) ?? []);
      if (invRes.ok) {
        const inv = (await invRes.json()) as { items: InventoryItem[]; stats: InventoryStats };
        setInventory(inv.items);
        setStats(inv.stats);
      }
      if (varRes.ok) setVarieties(((await varRes.json()) as { items: VarietyRow[] }).items ?? []);
      setAuthed(true);
    } catch { setAuthed(false); }
  }, [authFetch]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    const res = await fetch('/api/fresh-vendor-password/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) { setPassword(''); await loadAll(); }
    else { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? 'login failed'); }
    setBusy(false);
  };

  const logout = async () => {
    await fetch('/api/fresh/vendor/auth/logout', { method: 'POST' });
    setAuthed(false); setSubmissions([]); setInventory([]);
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    const payload: Record<string, unknown> = { submission_kind: kind, vendor_ref: form['vendor_ref'] };
    if (kind === 'gemstone') {
      Object.assign(payload, {
        kind: 'SINGLE', variety: form['variety'], weight_ct: Number(form['weight_ct']),
        colour: form['colour'] || undefined, origin: form['origin'] || undefined,
        shape: form['shape'] || undefined, clarity: form['clarity'] || undefined,
        origin_type: 'NATURAL',
        price_amount: form['price_amount'] ? Number(form['price_amount']) : undefined,
        currency: form['currency'], description: form['description'] || undefined,
      });
    } else {
      Object.assign(payload, {
        jewellery_type: form['jewellery_type'], metal: form['metal'], style: form['style'] || undefined,
        price_amount: form['price_amount'] ? Number(form['price_amount']) : undefined,
        currency: form['currency'], description: form['description'] || undefined,
      });
    }
    const res = await authFetch(`/vendors/${vendorCode}/submissions`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      setForm((f) => ({ ...f, vendor_ref: '', weight_ct: '', price_amount: '', description: '' }));
      setTab('submissions');
      await loadAll();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? 'submission failed');
    }
  };

  const updateStatus = async (ref: string, status: string) => {
    setBusy(true);
    await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAll();
    setBusy(false);
  };

  const fmt = (v: number | null, cur: string) =>
    v == null || v === 0 ? 'Price on request' : `$${v.toLocaleString('en-US', { minimumFractionDigits: 0 })} ${cur}`;

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
    if (s === 'SUBMITTED' || s === 'RESERVED') return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    if (s === 'SOLD') return 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]';
    if (s === 'REJECTED') return 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]';
    if (s === 'DRAFT') return 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]';
    return 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]';
  };

  if (authed === null) return <div className="min-h-screen bg-[#FAF8F4]" />;

  /* ---------------- login (light theme) ---------------- */
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#9A7B2C]">Maihan Gems</p>
            <h1 className="font-serif text-2xl text-[#1A1612]">Vendor Portal</h1>
          </div>
          <div className={card + ' p-6 space-y-4'}>
            <div>
              <label htmlFor="v-email" className={label}>Email</label>
              <input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className={input} />
            </div>
            <div>
              <label htmlFor="v-password" className={label}>Password</label>
              <input id="v-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} />
            </div>
            {error ? <p className="text-xs text-[#991B1B]">{error}</p> : null}
            <button type="button" onClick={(e) => { e.preventDefault(); login(e); }} disabled={busy} className={btnPrimary}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
          <p className="text-[10px] text-[#9A9385] text-center">Access is activated after onboarding approval.</p>
        </div>
      </div>
    );
  }

  /* ---------------- dashboard shell (light theme + sidebar) ---------------- */
  const navItems = [
    { id: 'overview' as Tab, icon: LayoutDashboard, label: 'Overview' },
    { id: 'submissions' as Tab, icon: PackageSearch, label: 'My Submissions' },
    { id: 'inventory' as Tab, icon: Package, label: 'Live Inventory' },
    { id: 'new' as Tab, icon: PlusCircle, label: 'Add Product' },
    { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex">
      {/* sidebar */}
      <aside className="w-60 shrink-0 border-r border-[#E8DFCE] bg-white flex flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-[#E8DFCE]">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#9A7B2C]">Maihan Gems</p>
          <p className="font-serif text-lg text-[#1A1612] mt-0.5">{vendorName}</p>
          <p className="text-[10px] text-[#9A9385] font-mono mt-0.5">{vendorCode}</p>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors cursor-pointer ${
                tab === item.id ? 'bg-[#FAF8F4] text-[#9A7B2C] font-medium border-r-2 border-[#D4AF37]' : 'text-[#5C4E3C] hover:bg-[#FAF8F4] hover:text-[#1A1612]'
              }`}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#E8DFCE]">
          <button onClick={logout} className="flex items-center gap-3 px-2 py-2 text-sm text-[#9A9385] hover:text-[#1A1612] transition-colors cursor-pointer w-full">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* main content */}
      <main className="flex-1 px-8 py-8 max-w-5xl overflow-y-auto">
        {/* ============ OVERVIEW ============ */}
        {tab === 'overview' ? (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-2xl text-[#1A1612]">Overview</h1>
              <p className="text-sm text-[#9A9385] mt-1">Your inventory at a glance.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={card + ' p-5'}>
                <div className="flex items-center gap-2 text-[#9A7B2C]"><Package className="h-4 w-4" /><span className="text-[10px] uppercase tracking-wider font-medium">Live Items</span></div>
                <p className="font-serif text-3xl text-[#1A1612] mt-2">{stats?.live_items ?? 0}</p>
              </div>
              <div className={card + ' p-5'}>
                <div className="flex items-center gap-2 text-[#9A7B2C]"><DollarSign className="h-4 w-4" /><span className="text-[10px] uppercase tracking-wider font-medium">Inventory Value</span></div>
                <p className="font-serif text-3xl text-[#1A1612] mt-2">${(stats?.total_value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                <p className="text-[10px] text-[#9A9385] mt-1">{stats?.currency ?? 'USD'}</p>
              </div>
              <div className={card + ' p-5'}>
                <div className="flex items-center gap-2 text-[#9A7B2C]"><Clock className="h-4 w-4" /><span className="text-[10px] uppercase tracking-wider font-medium">Pending Review</span></div>
                <p className="font-serif text-3xl text-[#1A1612] mt-2">{submissions.filter((s) => s.status === 'SUBMITTED').length}</p>
              </div>
              <div className={card + ' p-5'}>
                <div className="flex items-center gap-2 text-[#9A7B2C]"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] uppercase tracking-wider font-medium">Sold</span></div>
                <p className="font-serif text-3xl text-[#1A1612] mt-2">{stats?.sold_items ?? 0}</p>
              </div>
            </div>
            <div>
              <button onClick={() => setTab('new')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#F3DFA2] via-[#D4AF37] to-[#9A7B2C] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
                <PlusCircle className="h-4 w-4" /> Add New Product
              </button>
            </div>
          </div>
        ) : null}

        {/* ============ SUBMISSIONS ============ */}
        {tab === 'submissions' ? (
          <div className="space-y-5">
            <div>
              <h1 className="font-serif text-2xl text-[#1A1612]">My Submissions</h1>
              <p className="text-sm text-[#9A9385] mt-1">Track every item you submit, with admin feedback.</p>
            </div>
            <div className="flex gap-1 bg-[#F0EDE6] rounded-lg p-1 w-fit">
              {(['all', 'APPROVED', 'SUBMITTED', 'REJECTED'] as SubTab[]).map((t) => (
                <button key={t} onClick={() => setSubTab(t)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    subTab === t ? 'bg-white text-[#1A1612] shadow-sm' : 'text-[#9A9385] hover:text-[#1A1612]'
                  }`}>
                  {t === 'all' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()} ({t === 'all' ? submissions.length : submissions.filter((s) => s.status === t).length})
                </button>
              ))}
            </div>
            {submissions.filter((s) => subTab === 'all' || s.status === subTab).length === 0 ? (
              <p className="text-sm text-[#9A9385]">Nothing here yet.</p>
            ) : submissions.filter((s) => subTab === 'all' || s.status === subTab).map((s) => (
              <div key={s.id} className={card + ' p-5 space-y-3'}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#9A7B2C]">{s.submission_kind}</p>
                    <p className="font-serif text-lg text-[#1A1612]">{String(s.payload?.['variety'] ?? s.payload?.['jewellery_type'] ?? 'Item')}</p>
                    <p className="text-xs text-[#9A9385]">Your ref: {String(s.payload?.['vendor_ref'] ?? '—')}</p>
                    {s.resulting_ref ? (
                      <p className="text-xs font-mono text-[#9A7B2C] mt-1">→ Listed as <span className="font-semibold">{s.resulting_ref}</span></p>
                    ) : null}
                  </div>
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${statusColor(s.status)}`}>{s.status}</span>
                </div>
                {s.reviewer_note ? (
                  <div className="bg-[#FEFCE8] border border-[#FDE68A] rounded-lg p-3 space-y-1">
                    <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#92400E]">
                      <AlertCircle className="h-3 w-3" /> Admin Feedback
                    </p>
                    <p className="text-xs text-[#5C4E3C]">{s.reviewer_note}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* ============ LIVE INVENTORY ============ */}
        {tab === 'inventory' ? (
          <div className="space-y-5">
            <div>
              <h1 className="font-serif text-2xl text-[#1A1612]">Live Inventory</h1>
              <p className="text-sm text-[#9A9385] mt-1">Control what customers see. Mark sold out, hide, or remove.</p>
            </div>
            {inventory.length === 0 ? (
              <p className="text-sm text-[#9A9385]">No inventory yet — approved items appear here.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inventory.map((item) => (
                  <div key={item.ref} className={card + ' overflow-hidden'}>
                    <div className="flex items-center justify-between p-4 pb-0">
                      <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${statusColor(item.status)}`}>{item.status}</span>
                      <span className="text-[10px] text-[#9A9385] font-mono">{item.ref}</span>
                    </div>
                    <div className="flex gap-4 p-4">
                      <div className="w-20 h-20 rounded-lg shrink-0 overflow-hidden bg-[#F0EDE6] flex items-center justify-center">
                        {item.primary_image ? (
                          <img src={item.primary_image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-serif text-2xl text-[#D4AF37]/40">{item.variety.charAt(0)}</span>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-serif text-base text-[#1A1612] truncate">{item.name}</h3>
                        <p className="text-xs text-[#9A9385]">{item.variety}{item.shape ? ` · ${item.shape}` : ''}{item.weight_ct ? ` · ${item.weight_ct}ct` : ''}</p>
                        <p className="text-sm font-medium text-[#9A7B2C]">{fmt(item.price_amount, item.currency)}</p>
                        <p className="text-[10px] text-[#9A9385]">{item.origin_type} · {item.origin || 'Origin not specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-4 pb-4">
                      {item.status === 'ACTIVE' ? (
                        <>
                          <button onClick={() => updateStatus(item.ref, 'SOLD')} disabled={busy}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-md border border-[#BFDBFE] text-[#1E40AF] hover:bg-[#EFF6FF] transition-colors cursor-pointer">
                            <DollarSign className="h-3 w-3" /> Mark Sold
                          </button>
                          <button onClick={() => updateStatus(item.ref, 'DRAFT')} disabled={busy}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-md border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition-colors cursor-pointer">
                            <EyeOff className="h-3 w-3" /> Hide
                          </button>
                          <button onClick={() => updateStatus(item.ref, 'ARCHIVED')} disabled={busy}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-md border border-[#FECACA] text-[#991B1B] hover:bg-[#FEF2F2] transition-colors cursor-pointer ml-auto">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </>
                      ) : item.status === 'DRAFT' ? (
                        <>
                          <button onClick={() => updateStatus(item.ref, 'ACTIVE')} disabled={busy}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-md border border-[#BBF7D0] text-[#166534] hover:bg-[#F0FDF4] transition-colors cursor-pointer">
                            <Eye className="h-3 w-3" /> Publish
                          </button>
                          <button onClick={() => updateStatus(item.ref, 'ARCHIVED')} disabled={busy}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-md border border-[#FECACA] text-[#991B1B] hover:bg-[#FEF2F2] transition-colors cursor-pointer ml-auto">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </>
                      ) : item.status === 'SOLD' ? (
                        <button onClick={() => updateStatus(item.ref, 'ACTIVE')} disabled={busy}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-md border border-[#BBF7D0] text-[#166534] hover:bg-[#F0FDF4] transition-colors cursor-pointer">
                          <ArrowUpRight className="h-3 w-3" /> Restock
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ============ ADD PRODUCT ============ */}
        {tab === 'new' ? (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h1 className="font-serif text-2xl text-[#1A1612]">Add Product</h1>
              <p className="text-sm text-[#9A9385] mt-1">Submit for approval. You control visibility after approval.</p>
            </div>
            <form onSubmit={submit} className={card + ' p-6 space-y-4'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="v-kind" className={label}>Type</label>
                  <select id="v-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={input + ' cursor-pointer'}>
                    <option value="gemstone">Loose Gemstone</option>
                    <option value="setting">Setting</option>
                    <option value="product">Ready-made Jewellery</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="v-vendor-ref" className={label}>Your Reference</label>
                  <input id="v-vendor-ref" value={form['vendor_ref']} onChange={set('vendor_ref')} required placeholder="RB-777" className={input} />
                </div>
              </div>
              {kind === 'gemstone' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="v-variety" className={label}>Gemstone Variety</label>
                    <select id="v-variety" value={form['variety']} onChange={set('variety')} className={input + ' cursor-pointer'}>
                      {varieties.map((v) => <option key={v.slug} value={v.slug}>{v.name} ({v.code})</option>)}
                    </select>
                  </div>
                  <div><label htmlFor="v-weight" className={label}>Weight (ct)</label>
                    <input id="v-weight" type="number" step="0.001" value={form['weight_ct']} onChange={set('weight_ct')} required className={input} /></div>
                  <div><label htmlFor="v-colour" className={label}>Colour (optional)</label>
                    <input id="v-colour" value={form['colour']} onChange={set('colour')} placeholder="blue" className={input} /></div>
                  <div><label htmlFor="v-origin" className={label}>Origin (optional)</label>
                    <input id="v-origin" value={form['origin']} onChange={set('origin')} placeholder="Mozambique" className={input} /></div>
                  <div><label htmlFor="v-shape" className={label}>Shape (optional)</label>
                    <input id="v-shape" value={form['shape']} onChange={set('shape')} placeholder="oval" className={input} /></div>
                  <div><label htmlFor="v-clarity" className={label}>Clarity (optional)</label>
                    <input id="v-clarity" value={form['clarity']} onChange={set('clarity')} placeholder="VVS" className={input} /></div>
                  <div><label htmlFor="v-price" className={label}>Price USD (blank = price on request)</label>
                    <input id="v-price" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className={input} /></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div><label htmlFor="v-jt" className={label}>Jewellery Type</label>
                    <select id="v-jt" value={form['jewellery_type']} onChange={set('jewellery_type')} className={input + ' cursor-pointer'}>
                      <option>RING</option><option>EARRING</option><option>PENDANT</option><option>NECKLACE</option><option>BRACELET</option><option>NOSE_RING</option>
                    </select></div>
                  <div><label htmlFor="v-metal" className={label}>Metal Code (e.g. W18, PT, Y14)</label>
                    <input id="v-metal" value={form['metal']} onChange={set('metal')} required className={input} /></div>
                  <div><label htmlFor="v-style" className={label}>Style (optional)</label>
                    <input id="v-style" value={form['style']} onChange={set('style')} placeholder="solitaire" className={input} /></div>
                  <div><label htmlFor="v-price2" className={label}>Price USD (blank = price on request)</label>
                    <input id="v-price2" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className={input} /></div>
                </div>
              )}
              <div>
                <label htmlFor="v-desc" className={label}>Description (optional)</label>
                <textarea id="v-desc" value={form['description']} onChange={set('description')} rows={3} className={input} placeholder="Describe the stone or piece…" />
              </div>
              {error ? <p className="text-xs text-[#991B1B]">{error}</p> : null}
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? 'Submitting…' : 'Submit for Approval'}
              </button>
              <p className="text-[10px] text-[#9A9385]">
                Your reference is yours alone — the house mints its own code when approved. Once approved, you control visibility from Live Inventory.
              </p>
            </form>
          </div>
        ) : null}

        {/* ============ SETTINGS ============ */}
        {tab === 'settings' ? (
          <div className="space-y-5 max-w-lg">
            <h1 className="font-serif text-2xl text-[#1A1612]">Settings</h1>
            <div className={card + ' p-5 space-y-3'}>
              <h3 className="text-sm font-medium text-[#1A1612]">API Key</h3>
              <p className="text-xs text-[#9A9385]">For programmatic access. Your dashboard uses this session instead.</p>
              <p className="text-xs font-mono text-[#A39E93] break-all bg-[#F0EDE6] p-3 rounded-lg">Stored at onboarding — contact the house to rotate.</p>
            </div>
            <div className={card + ' p-5 space-y-3'}>
              <h3 className="text-sm font-medium text-[#1A1612]">Account</h3>
              <p className="text-sm text-[#5C4E3C]">{email} · {vendorCode}</p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
