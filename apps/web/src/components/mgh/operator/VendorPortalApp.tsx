'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, PackageSearch, PlusCircle, Settings, LogOut,
  Eye, EyeOff, Trash2, DollarSign, Package, Clock, ArrowUpRight,
  CheckCircle2, AlertCircle, ImagePlus,
} from 'lucide-react';

/**
 * F4 — vendor portal, Maison-grade light theme.
 * Overview stats, submission tracking with admin feedback, live inventory
 * cards (sold / hide / delete), add product with registry dropdowns.
 */

const badgeClass = (s: string) => {
  if (s === 'ACTIVE' || s === 'APPROVED') return 'portal-badge portal-badge--active';
  if (s === 'SUBMITTED' || s === 'RESERVED') return 'portal-badge portal-badge--pending';
  if (s === 'SOLD') return 'portal-badge portal-badge--sold';
  if (s === 'REJECTED') return 'portal-badge portal-badge--rejected';
  return 'portal-badge portal-badge--draft';
};

type Tab = 'overview' | 'submissions' | 'inventory' | 'new' | 'settings';
type SubTab = 'all' | 'APPROVED' | 'SUBMITTED' | 'REJECTED';
type Kind = 'gemstone' | 'setting' | 'product';

interface SubmissionRow {
  id: number; submission_kind: string; status: string; resulting_ref: string | null;
  payload: Record<string, unknown>; reviewer_note: string | null; reviewed_at: string | null; created_at: string;
}
interface InventoryItem {
  ref: string; slug: string; name: string; kind: string; weight_ct: number | null;
  price_amount: number | null; currency: string; status: string; origin_type: string;
  variety: string; colour: string | null; shape: string | null; origin: string | null;
  primary_image: string | null; owner_kind: string;
}
interface InventoryStats {
  total_items: number; live_items: number; sold_items: number; hidden_items: number;
  total_value: number; currency: string;
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
  const [uploadingRef, setUploadingRef] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    vendor_ref: '', variety: 'ruby', weight_ct: '', colour: '', origin: '', shape: '',
    clarity: '', jewellery_type: 'RING', metal: 'W14', style: '',
    price_amount: '', currency: 'USD', description: '', image: '',
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
        setInventory(inv.items); setStats(inv.stats);
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
    else { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? 'Invalid email or password'); }
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
    if (res.ok) {
      setForm((f) => ({ ...f, vendor_ref: '', weight_ct: '', price_amount: '', description: '', image: '' }));
      setTab('submissions');
      await loadAll();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? 'Submission failed');
    }
    setBusy(false);
  };

  const updateStatus = async (ref: string, status: string) => {
    setBusy(true);
    await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAll(); setBusy(false);
  };

  const uploadImage = async (ref: string, file: File) => {
    setUploadingRef(ref); setError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the image'));
        reader.readAsDataURL(file);
      });
      const res = await authFetch(`/vendors/${vendorCode}/inventory/${encodeURIComponent(ref)}/images`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, alt: ref }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? 'Upload failed');
      }
      await loadAll();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed');
    }
    setUploadingRef(null);
  };

  const fmt = (v: number | null, cur: string) =>
    v == null || v === 0 ? 'Price on request' : `$${v.toLocaleString('en-US')} ${cur}`;

  if (authed === null) return <div className="portal-shell" />;

  if (!authed) {
    return (
      <div className="portal-shell items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-7">
          <div className="text-center space-y-3">
            <p className="portal-kicker">Maihan Gems</p>
            <h1 className="portal-page-title">Partner Atelier</h1>
            <div className="w-10 h-px bg-gradient-to-r from-[#F3DFA2] via-[#D4AF37] to-[#9A7B2C] mx-auto" />
          </div>
          <form onSubmit={login} className="portal-card portal-card--pad space-y-5">
            <div>
              <label htmlFor="v-email" className="portal-label">Email</label>
              <input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className="portal-input" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="v-password" className="portal-label">Password</label>
              <input id="v-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="portal-input" autoComplete="current-password" />
            </div>
            {error ? <p className="text-xs text-[#9B3A2A]">{error}</p> : null}
            <button type="submit" disabled={busy} className="portal-btn portal-btn--gold w-full">
              {busy ? 'Signing in…' : 'Enter the atelier'}
            </button>
          </form>
          <p className="text-center text-[11px] text-[#A39E93]">Access is activated after onboarding approval.</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview' as Tab, icon: LayoutDashboard, label: 'Overview' },
    { id: 'submissions' as Tab, icon: PackageSearch, label: 'My Submissions' },
    { id: 'inventory' as Tab, icon: Package, label: 'Live Inventory' },
    { id: 'new' as Tab, icon: PlusCircle, label: 'Add Product' },
    { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <p className="portal-brand__eyebrow">Maihan Gems</p>
          <p className="portal-brand__name">{vendorName || 'Partner'}</p>
          <div className="portal-brand__rule" />
          <p className="portal-brand__meta">{vendorCode}</p>
        </div>
        <nav className="portal-nav">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)}
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
        {tab === 'overview' ? (
          <div className="space-y-8">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Atelier Ledger</p>
                <h1 className="portal-page-title">Overview</h1>
                <p className="portal-page-sub">Your inventory and submissions at a glance.</p>
              </div>
              <button onClick={() => setTab('new')} className="portal-btn portal-btn--gold"><PlusCircle className="h-4 w-4" /> Add product</button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Live items', value: stats?.live_items ?? 0, meta: `${stats?.hidden_items ?? 0} hidden` },
                { label: 'Inventory value', value: `$${(stats?.total_value ?? 0).toLocaleString()}`, meta: stats?.currency ?? 'USD' },
                { label: 'Pending review', value: submissions.filter((s) => s.status === 'SUBMITTED').length, meta: 'awaiting the house' },
                { label: 'Sold', value: stats?.sold_items ?? 0, meta: 'lifetime' },
              ].map((s) => (
                <div key={s.label} className="portal-card portal-stat">
                  <p className="portal-stat__label">{s.label}</p>
                  <p className="portal-stat__value">{s.value}</p>
                  <p className="portal-stat__meta">{s.meta}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="portal-card portal-card--pad">
                <p className="portal-label flex items-center gap-2"><Clock className="h-3 w-3" /> Recent submissions</p>
                <div className="space-y-2.5 mt-1">
                  {submissions.slice(0, 4).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3">
                      <span className="text-[13px] text-[#3D352A] truncate">{String(s.payload?.['variety'] ?? s.payload?.['jewellery_type'] ?? 'Item')}</span>
                      <span className={badgeClass(s.status)}>{s.status}</span>
                    </div>
                  ))}
                  {submissions.length === 0 ? <p className="text-[12px] text-[#A39E93]">Nothing submitted yet.</p> : null}
                </div>
              </div>
              <div className="portal-card portal-card--pad">
                <p className="portal-label flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Approved & live</p>
                <div className="space-y-2.5 mt-1">
                  {submissions.filter((s) => s.status === 'APPROVED').slice(0, 4).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3">
                      <span className="mono font-mono text-[11px] text-[#9A7B2C]">{s.resulting_ref}</span>
                      <span className="text-[11px] text-[#A39E93]">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {submissions.filter((s) => s.status === 'APPROVED').length === 0 ? <p className="text-[12px] text-[#A39E93]">Approved items appear here.</p> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ======== SUBMISSIONS ======== */}
        {tab === 'submissions' ? (
          <div className="space-y-6">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Dossier</p>
                <h1 className="portal-page-title">My Submissions</h1>
                <p className="portal-page-sub">Every item you submit, with the house's feedback.</p>
              </div>
            </div>
            <div className="inline-flex gap-1 bg-[#F0EADC] rounded-lg p-1">
              {(['all', 'APPROVED', 'SUBMITTED', 'REJECTED'] as SubTab[]).map((t) => (
                <button key={t} onClick={() => setSubTab(t)}
                  className={`px-4 py-1.5 text-[11.5px] font-medium rounded-md transition-colors cursor-pointer ${
                    subTab === t ? 'bg-[#FFFDF9] text-[#1A1612] shadow-sm' : 'text-[#8A857B] hover:text-[#1A1612]'
                  }`}>
                  {t === 'all' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()} ({t === 'all' ? submissions.length : submissions.filter((s) => s.status === t).length})
                </button>
              ))}
            </div>
            {submissions.filter((s) => subTab === 'all' || s.status === subTab).length === 0 ? (
              <div className="portal-card portal-empty">
                <div className="portal-empty__mark"><PackageSearch className="h-5 w-5" /></div>
                <p className="portal-empty__title">Nothing here yet</p>
                <p className="portal-empty__sub">Submit your first piece from Add Product.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.filter((s) => subTab === 'all' || s.status === subTab).map((s) => (
                  <div key={s.id} className="portal-card portal-card--pad space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="portal-kicker !mb-0">{s.submission_kind}</p>
                        <p className="text-[16px] text-[#1A1612]">{String(s.payload?.['variety'] ?? s.payload?.['jewellery_type'] ?? 'Item')}</p>
                        <p className="font-mono text-[10.5px] text-[#A39E93]">Your ref · {String(s.payload?.['vendor_ref'] ?? '—')}</p>
                        {s.resulting_ref ? (
                          <p className="font-mono text-[11px] text-[#9A7B2C] mt-1">Listed as <span className="font-semibold">{s.resulting_ref}</span></p>
                        ) : null}
                      </div>
                      <span className={badgeClass(s.status)}>{s.status}</span>
                    </div>
                    {s.reviewer_note ? (
                      <div className="portal-feedback">
                        <p className="portal-feedback__label"><AlertCircle className="h-3 w-3" /> House feedback</p>
                        <p className="portal-feedback__body">{s.reviewer_note}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ======== LIVE INVENTORY ======== */}
        {tab === 'inventory' ? (
          <div className="space-y-6">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Vault</p>
                <h1 className="portal-page-title">Live Inventory</h1>
                <p className="portal-page-sub">Control what clients see — mark sold, hide or remove.</p>
              </div>
            </div>
            {error ? <p className="text-xs text-[#9B3A2A]">{error}</p> : null}
            {inventory.length === 0 ? (
              <div className="portal-card portal-empty">
                <div className="portal-empty__mark"><Package className="h-5 w-5" /></div>
                <p className="portal-empty__title">No inventory yet</p>
                <p className="portal-empty__sub">Approved items appear here with their controls.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventory.map((item) => (
                  <div key={item.ref} className="portal-card overflow-hidden">
                    <div className="flex gap-4 p-4">
                      <div className="w-[76px] h-[76px] rounded-xl shrink-0 overflow-hidden bg-[#F4EEE2] flex items-center justify-center">
                        {item.primary_image ? (
                          <img src={item.primary_image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl text-[#D4AF37]/50 font-serif">{item.variety.charAt(0)}</span>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] text-[#1A1612] truncate">{item.name}</h3>
                          <span className={badgeClass(item.status)}>{item.status}</span>
                        </div>
                        <p className="text-[11px] text-[#A39E93]">{item.variety}{item.shape ? ` · ${item.shape}` : ''}{item.weight_ct ? ` · ${item.weight_ct}ct` : ''}</p>
                        <p className="text-[14px] font-medium text-[#9A7B2C]">{fmt(item.price_amount, item.currency)}</p>
                        <p className="font-mono text-[9.5px] text-[#B3AC9F]">{item.ref} · {item.origin_type}{item.origin ? ` · ${item.origin}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-4 pb-4 flex-wrap">
                      {item.status === 'ACTIVE' ? <>
                        <button onClick={() => updateStatus(item.ref, 'SOLD')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm"><DollarSign className="h-3 w-3" /> Mark sold</button>
                        <button onClick={() => updateStatus(item.ref, 'DRAFT')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm"><EyeOff className="h-3 w-3" /> Hide</button>
                        <button onClick={() => updateStatus(item.ref, 'ARCHIVED')} disabled={busy} className="portal-btn portal-btn--danger portal-btn--sm ml-auto"><Trash2 className="h-3 w-3" /> Delete</button>
                      </> : item.status === 'DRAFT' ? <>
                        <button onClick={() => updateStatus(item.ref, 'ACTIVE')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm"><Eye className="h-3 w-3" /> Publish</button>
                        <button onClick={() => updateStatus(item.ref, 'ARCHIVED')} disabled={busy} className="portal-btn portal-btn--danger portal-btn--sm ml-auto"><Trash2 className="h-3 w-3" /> Delete</button>
                      </> : item.status === 'SOLD' ? (
                        <button onClick={() => updateStatus(item.ref, 'ACTIVE')} disabled={busy} className="portal-btn portal-btn--ghost portal-btn--sm"><ArrowUpRight className="h-3 w-3" /> Restock</button>
                      ) : null}
                      <label className="portal-btn portal-btn--ghost portal-btn--sm cursor-pointer">
                        <ImagePlus className="h-3 w-3" /> {uploadingRef === item.ref ? 'Uploading…' : 'Add photo'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(item.ref, f); e.currentTarget.value = ''; }} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ======== ADD PRODUCT ======== */}
        {tab === 'new' ? (
          <div className="space-y-6 max-w-2xl">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Submission</p>
                <h1 className="portal-page-title">Add Product</h1>
                <p className="portal-page-sub">Submit for the house's approval. You control visibility after approval.</p>
              </div>
            </div>
            <form onSubmit={submit} className="portal-card portal-card--pad space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="v-kind" className="portal-label">Type</label>
                  <select id="v-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="portal-select">
                    <option value="gemstone">Loose Gemstone</option>
                    <option value="setting">Setting</option>
                    <option value="product">Ready-made Jewellery</option>
                  </select></div>
                <div><label htmlFor="v-vendor-ref" className="portal-label">Your reference</label>
                  <input id="v-vendor-ref" value={form['vendor_ref']} onChange={set('vendor_ref')} required placeholder="RB-777" className="portal-input" /></div>
              </div>
              {kind === 'gemstone' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label htmlFor="v-variety" className="portal-label">Gemstone variety</label>
                    <select id="v-variety" value={form['variety']} onChange={set('variety')} className="portal-select">
                      {varieties.map((v) => <option key={v.slug} value={v.slug}>{v.name} ({v.code})</option>)}
                    </select></div>
                  <div><label htmlFor="v-weight" className="portal-label">Weight (ct)</label>
                    <input id="v-weight" type="number" step="0.001" value={form['weight_ct']} onChange={set('weight_ct')} required className="portal-input" /></div>
                  <div><label htmlFor="v-colour" className="portal-label">Colour (optional)</label>
                    <input id="v-colour" value={form['colour']} onChange={set('colour')} placeholder="blue" className="portal-input" /></div>
                  <div><label htmlFor="v-origin" className="portal-label">Origin (optional)</label>
                    <input id="v-origin" value={form['origin']} onChange={set('origin')} placeholder="Mozambique" className="portal-input" /></div>
                  <div><label htmlFor="v-shape" className="portal-label">Shape (optional)</label>
                    <input id="v-shape" value={form['shape']} onChange={set('shape')} placeholder="oval" className="portal-input" /></div>
                  <div><label htmlFor="v-clarity" className="portal-label">Clarity (optional)</label>
                    <input id="v-clarity" value={form['clarity']} onChange={set('clarity')} placeholder="VVS" className="portal-input" /></div>
                  <div><label htmlFor="v-price" className="portal-label">Price USD (blank = on request)</label>
                    <input id="v-price" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className="portal-input" /></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div><label htmlFor="v-jt" className="portal-label">Jewellery type</label>
                    <select id="v-jt" value={form['jewellery_type']} onChange={set('jewellery_type')} className="portal-select">
                      <option>RING</option><option>EARRING</option><option>PENDANT</option><option>NECKLACE</option><option>BRACELET</option><option>NOSE_RING</option>
                    </select></div>
                  <div><label htmlFor="v-metal" className="portal-label">Metal code (e.g. W18, PT, Y14)</label>
                    <input id="v-metal" value={form['metal']} onChange={set('metal')} required className="portal-input" /></div>
                  <div><label htmlFor="v-style" className="portal-label">Style (optional)</label>
                    <input id="v-style" value={form['style']} onChange={set('style')} placeholder="solitaire" className="portal-input" /></div>
                  <div><label htmlFor="v-price2" className="portal-label">Price USD (blank = on request)</label>
                    <input id="v-price2" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className="portal-input" /></div>
                </div>
              )}
              <div><label htmlFor="v-desc" className="portal-label">Description (optional)</label>
                <textarea id="v-desc" value={form['description']} onChange={set('description')} rows={3} className="portal-textarea" placeholder="Describe the stone or piece…" /></div>
              {error ? <p className="text-xs text-[#9B3A2A]">{error}</p> : null}
              <button type="submit" disabled={busy} className="portal-btn portal-btn--gold w-full">
                {busy ? 'Submitting…' : 'Submit for approval'}
              </button>
              <p className="text-[10.5px] text-[#A39E93] leading-relaxed">
                Your reference is yours alone — the house mints its own code when approved. Photos can be added from Live Inventory after approval.
              </p>
            </form>
          </div>
        ) : null}

        {/* ======== SETTINGS ======== */}
        {tab === 'settings' ? (
          <div className="space-y-6 max-w-lg">
            <div className="portal-page-head">
              <div>
                <p className="portal-kicker">Account</p>
                <h1 className="portal-page-title">Settings</h1>
              </div>
            </div>
            <div className="portal-card portal-card--pad space-y-3">
              <p className="portal-label">API key</p>
              <p className="text-[12px] text-[#8A857B] leading-relaxed">For programmatic access. Your dashboard uses this session instead. Contact the house to rotate.</p>
            </div>
            <div className="portal-card portal-card--pad space-y-2">
              <p className="portal-label">Account</p>
              <p className="text-[13px] text-[#3D352A]">{email}</p>
              <p className="font-mono text-[10.5px] text-[#A39E93]">{vendorCode}</p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
