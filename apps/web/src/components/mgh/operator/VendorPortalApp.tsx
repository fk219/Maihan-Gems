'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * F4 vendor portal — proper email + password login (fresh-api vendor auth).
 * Session token stored in an httpOnly cookie via the same-origin proxy.
 * The API key remains available in Settings (API-to-API access).
 */

const input =
  'w-full rounded-sm border border-white/15 bg-[#121316] px-3 py-2.5 text-sm text-[#F7F5F0] placeholder-[#6E6250] focus:border-[#D4AF37] outline-none';
const label = 'block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8A857B] mb-1.5';
const card = 'rounded-sm border border-white/10 bg-[#121316] p-5';

interface SubmissionRow {
  id: number;
  submission_kind: string;
  status: string;
  resulting_ref: string | null;
  payload: Record<string, unknown>;
}

type Kind = 'gemstone' | 'setting' | 'product';

export default function VendorPortalApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'submissions' | 'new' | 'settings'>('dashboard');
  const [kind, setKind] = useState<Kind>('gemstone');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    vendor_ref: '', variety: '', weight_ct: '', colour: '', origin: '', shape: '',
    jewellery_type: 'RING', metal: 'W14', style: '', price_amount: '', currency: 'USD',
    description: '',
  });

  const authFetch = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(`/api/fresh${path}`, { ...init, cache: 'no-store' });
    if (res.status === 401) { setAuthed(false); throw new Error('unauthorized'); }
    return res;
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const meRes = await authFetch('/vendor/auth/me');
      if (!meRes.ok) { setAuthed(false); return; }
      const me = (await meRes.json()) as { code: string; name: string };
      setVendorName(me.name);
      setVendorCode(me.code);
      const subsRes = await authFetch(`/vendors/${me.code}/submissions`);
      if (subsRes.ok) setSubmissions(((await subsRes.json()) as SubmissionRow[]) ?? []);
      setAuthed(true);
    } catch { setAuthed(false); }
  }, [authFetch]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    // Login directly against fresh-api (sets httpOnly cookie via the web app proxy)
    const res = await fetch('/api/fresh-vendor-password/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) { setPassword(''); await loadDashboard(); }
    else { const d = (await res.json().catch(() => ({}))) as { error?: string }; setError(d.error ?? 'login failed'); }
    setBusy(false);
  };

  const logout = async () => {
    await fetch('/api/fresh/vendor/auth/logout', { method: 'POST' });
    setAuthed(false); setSubmissions([]);
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
        shape: form['shape'] || undefined, origin_type: 'NATURAL',
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
      await loadDashboard();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? 'submission failed');
    }
  };

  if (authed === null) return <div className="min-h-screen bg-[#0A0A0B]" />;

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0A0A0B] text-[#F7F5F0]">
        <main className="flex-1 mx-auto max-w-md w-full px-4 py-28 space-y-6">
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.26em] text-[#D4AF37] text-center">
            MAIHAN GEMS PARTNERS
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-normal text-center">Vendor Sign-In</h1>
          <form onSubmit={login} className={`${card} space-y-4`}>
            <div>
              <label htmlFor="v-email" className={label}>Email</label>
              <input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className={input} />
            </div>
            <div>
              <label htmlFor="v-password" className={label}>Password</label>
              <input id="v-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} />
            </div>
            {error ? <p className="text-xs text-[#991B1B]">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full px-6 py-3 gold-gradient-cta text-sm disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-[10px] text-[#6E6250] text-center font-[family-name:var(--font-mono)]">
            Don&apos;t have access? Your account is activated after onboarding approval.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F7F5F0]">
      <header className="border-b border-white/10 bg-[#121316]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.26em] text-[#D4AF37]">MAIHAN GEMS PARTNERS</p>
            <p className="font-[family-name:var(--font-display)] text-lg">{vendorName} · {vendorCode}</p>
          </div>
          <button onClick={logout} className="px-4 py-2 border border-[#D4AF37]/40 text-[#E6C97A] text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] hover:bg-[#D4AF37]/10">Sign out</button>
        </div>
        <nav className="mx-auto max-w-4xl px-4 sm:px-6 flex gap-1">
          {(['dashboard', 'submissions', 'new', 'settings'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] border-b-2 transition-colors ${tab === t ? 'border-[#D4AF37] text-[#E6C97A]' : 'border-transparent text-[#8A857B] hover:text-[#F7F5F0]'}`}>
              {t === 'dashboard' ? 'Dashboard' : t === 'submissions' ? 'My Submissions' : t === 'new' ? 'New Submission' : 'Settings'}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        {tab === 'dashboard' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className={card}><p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8A857B]">Total Submissions</p>
              <p className="font-[family-name:var(--font-display)] text-4xl mt-2 text-[#E6C97A]">{submissions.length}</p></div>
            <div className={card}><p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8A857B]">Approved (Live)</p>
              <p className="font-[family-name:var(--font-display)] text-4xl mt-2 text-[#166534]">{submissions.filter((s) => s.status === 'APPROVED').length}</p></div>
            <div className={card}><p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8A857B]">Pending Review</p>
              <p className="font-[family-name:var(--font-display)] text-4xl mt-2 text-[#9A3412]">{submissions.filter((s) => s.status === 'SUBMITTED').length}</p></div>
            <div className={card}><p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8A857B]">Rejected</p>
              <p className="font-[family-name:var(--font-display)] text-4xl mt-2 text-[#991B1B]">{submissions.filter((s) => s.status === 'REJECTED').length}</p></div>
            <div className="col-span-2 mt-4">
              <button onClick={() => setTab('new')} className="px-8 py-3 gold-gradient-cta text-sm">+ Submit New Item</button>
            </div>
          </div>
        ) : null}

        {tab === 'submissions' ? (
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <p className="text-sm text-[#8A857B]">No submissions yet.</p>
            ) : submissions.map((s) => (
              <div key={s.id} className={card}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#D4AF37]">{s.submission_kind}</p>
                    <p className="font-[family-name:var(--font-display)] text-lg mt-1">
                      {String(s.payload?.['name'] ?? s.payload?.['variety'] ?? 'Item')} · {String(s.payload?.['vendor_ref'] ?? '')}
                    </p>
                    {s.resulting_ref ? (
                      <p className="text-xs font-[family-name:var(--font-mono)] text-[#7A7267] mt-1">
                        Listed as <span className="text-[#E6C97A]">{s.resulting_ref}</span>
                      </p>
                    ) : null}
                  </div>
                  <span className={`text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider px-2 py-1 border ${
                    s.status === 'SUBMITTED' ? 'border-[#9A3412] text-[#9A3412]' : s.status === 'APPROVED' ? 'border-[#166534] text-[#166534]' : s.status === 'REJECTED' ? 'border-[#991B1B] text-[#991B1B]' : 'border-[#8A857B] text-[#8A857B]'
                  }`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'new' ? (
          <form onSubmit={submit} className={`${card} space-y-4`}>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="v-kind" className={label}>Type</label>
                <select id="v-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={input}>
                  <option value="gemstone">Loose gemstone</option><option value="setting">Setting</option><option value="product">Ready-made jewellery</option>
                </select></div>
              <div><label htmlFor="v-vendor-ref" className={label}>Your reference (tracks this item for you)</label>
                <input id="v-vendor-ref" value={form['vendor_ref']} onChange={set('vendor_ref')} required placeholder="RB-777" className={input} /></div>
            </div>
            {kind === 'gemstone' ? (
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="v-variety" className={label}>Variety (e.g. ruby, sapphire)</label>
                  <input id="v-variety" value={form['variety']} onChange={set('variety')} required className={input} /></div>
                <div><label htmlFor="v-weight" className={label}>Weight (ct)</label>
                  <input id="v-weight" type="number" step="0.001" value={form['weight_ct']} onChange={set('weight_ct')} required className={input} /></div>
                <div><label htmlFor="v-colour" className={label}>Colour (optional)</label>
                  <input id="v-colour" value={form['colour']} onChange={set('colour')} placeholder="red" className={input} /></div>
                <div><label htmlFor="v-origin" className={label}>Origin (optional)</label>
                  <input id="v-origin" value={form['origin']} onChange={set('origin')} placeholder="Mozambique" className={input} /></div>
                <div><label htmlFor="v-shape" className={label}>Shape (optional)</label>
                  <input id="v-shape" value={form['shape']} onChange={set('shape')} placeholder="oval" className={input} /></div>
                <div><label htmlFor="v-price" className={label}>Price USD (blank = price on request)</label>
                  <input id="v-price" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className={input} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="v-jt" className={label}>Jewellery type</label>
                  <select id="v-jt" value={form['jewellery_type']} onChange={set('jewellery_type')} className={input}>
                    <option>RING</option><option>EARRING</option><option>PENDANT</option><option>NECKLACE</option><option>BRACELET</option><option>NOSE_RING</option>
                  </select></div>
                <div><label htmlFor="v-metal" className={label}>Metal code (e.g. W18, PT, Y14)</label>
                  <input id="v-metal" value={form['metal']} onChange={set('metal')} required className={input} /></div>
                <div><label htmlFor="v-style" className={label}>Style (optional)</label>
                  <input id="v-style" value={form['style']} onChange={set('style')} placeholder="solitaire" className={input} /></div>
                <div><label htmlFor="v-price2" className={label}>Price USD (blank = price on request)</label>
                  <input id="v-price2" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className={input} /></div>
              </div>
            )}
            <div><label htmlFor="v-desc" className={label}>Description (optional)</label>
              <textarea id="v-desc" value={form['description']} onChange={set('description')} rows={3} className={input} /></div>
            {error ? <p className="text-xs text-[#991B1B]">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full px-6 py-3 gold-gradient-cta text-sm disabled:opacity-50">
              {busy ? 'Submitting…' : 'Submit for approval'}
            </button>
            <p className="text-[10px] text-[#6E6250] font-[family-name:var(--font-mono)]">
              Your reference is yours alone — the house mints its own code when the submission is approved.
            </p>
          </form>
        ) : null}

        {tab === 'settings' ? (
          <div className={card + ' space-y-4'}>
            <h3 className="font-[family-name:var(--font-display)] text-xl">Settings</h3>
            <div>
              <p className={label}>API Key</p>
              <p className="text-xs font-[family-name:var(--font-mono)] text-[#A39E93] break-all bg-[#0A0A0B] p-3 rounded-sm border border-white/10">
                Stored at onboarding — contact the house to rotate.
              </p>
              <p className="text-[10px] text-[#6E6250] mt-1 font-[family-name:var(--font-mono)]">
                The API key is for programmatic access only. Your dashboard uses this session.
              </p>
            </div>
            <div>
              <p className={label}>Account</p>
              <p className="text-sm text-[#A39E93]">{email} · {vendorCode}</p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
