'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * F3-V vendor portal — fresh-api backed (key login, submission form, my
 * submissions). Applet partner styling: obsidian surface, gold mono eyebrows,
 * gold-gradient-cta. The API key lives in an httpOnly cookie.
 */

interface SubmissionRow {
  id: number;
  submission_kind: string;
  status: string;
  resulting_ref: string | null;
  payload: Record<string, unknown>;
}

const input =
  'w-full rounded-sm border border-white/15 bg-[#121316] px-3 py-2.5 text-sm text-[#F7F5F0] placeholder-[#6E6250] focus:border-[#D4AF37] outline-none';
const label = 'block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8A857B] mb-1.5';
const card = 'rounded-sm border border-white/10 bg-[#121316] p-5';

type Kind = 'gemstone' | 'setting' | 'product';

export default function VendorConsole() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [tab, setTab] = useState<'mine' | 'new'>('mine');
  const [kind, setKind] = useState<Kind>('gemstone');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    vendor_ref: '', variety: '', weight_ct: '', colour: '', origin: '', shape: '',
    jewellery_type: 'RING', metal: 'W14', style: '', price_amount: '', currency: 'USD',
    description: '',
  });

  const loadMineFor = useCallback(async (vendorCode: string) => {
    const res = await fetch(`/api/fresh/vendors/${encodeURIComponent(vendorCode)}/submissions`, { cache: 'no-store' });
    if (res.status === 401) { setAuthed(false); return; }
    if (res.ok) setSubmissions(((await res.json()) as SubmissionRow[]) ?? []);
    setAuthed(true);
  }, []);

  useEffect(() => {
    const saved = document.cookie.match(/maihan_vendor_code=([^;]+)/)?.[1];
    if (saved) void loadMineFor(decodeURIComponent(saved));
    else setAuthed(false);
  }, [loadMineFor]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/fresh-vendor/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, key }),
    });
    if (res.ok) {
      await loadMineFor(code.toUpperCase());
    } else {
      setError('invalid vendor code/key');
    }
  };

  const logout = async () => {
    await fetch('/api/fresh-vendor/login', { method: 'DELETE' });
    setAuthed(false);
    setSubmissions([]);
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const saved = document.cookie.match(/maihan_vendor_code=([^;]+)/)?.[1];
    const vendorCode = decodeURIComponent(saved ?? '');
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
    const res = await fetch(`/api/fresh/vendors/${encodeURIComponent(vendorCode)}/submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      setForm((f) => ({ ...f, vendor_ref: '', weight_ct: '', price_amount: '' }));
      setTab('mine');
      await loadMineFor(vendorCode);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'submission failed');
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
              <label htmlFor="vendor-code" className={label}>Vendor code</label>
              <input id="vendor-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="V-AE-001" className={input} />
            </div>
            <div>
              <label htmlFor="vendor-key" className={label}>API key (issued at onboarding)</label>
              <input id="vendor-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} className={input} />
            </div>
            {error ? <p className="text-xs text-[#991B1B]">{error}</p> : null}
            <button type="submit" className="w-full px-6 py-3 gold-gradient-cta text-sm">Sign in</button>
          </form>
        </main>
      </div>
    );
  }

  const saved = document.cookie.match(/maihan_vendor_code=([^;]+)/)?.[1];
  const vendorCode = decodeURIComponent(saved ?? '');

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F7F5F0]">
      <header className="border-b border-white/10 bg-[#121316]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.26em] text-[#D4AF37]">
              MAIHAN GEMS PARTNERS
            </p>
            <p className="font-[family-name:var(--font-display)] text-lg">Vendor Portal · {vendorCode}</p>
          </div>
          <button onClick={logout} className="px-4 py-2 border border-[#D4AF37]/40 text-[#E6C97A] text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] hover:bg-[#D4AF37]/10">
            Sign out
          </button>
        </div>
        <nav className="mx-auto max-w-4xl px-4 sm:px-6 flex gap-1">
          <button onClick={() => setTab('mine')} className={`px-4 py-2 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] border-b-2 transition-colors ${tab === 'mine' ? 'border-[#D4AF37] text-[#E6C97A]' : 'border-transparent text-[#8A857B] hover:text-[#F7F5F0]'}`}>
            My Submissions
          </button>
          <button onClick={() => setTab('new')} className={`px-4 py-2 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] border-b-2 transition-colors ${tab === 'new' ? 'border-[#D4AF37] text-[#E6C97A]' : 'border-transparent text-[#8A857B] hover:text-[#F7F5F0]'}`}>
            New Submission
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        {tab === 'mine' ? (
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <p className="text-sm text-[#8A857B]">No submissions yet — send your first stone from “New Submission”.</p>
            ) : (
              submissions.map((s) => (
                <div key={s.id} className={card}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#D4AF37]">
                        {s.submission_kind}
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-lg mt-1">
                        {String(s.payload?.['name'] ?? s.payload?.['variety'] ?? 'Submission')} · {String(s.payload?.['vendor_ref'] ?? '')}
                      </p>
                      {s.resulting_ref ? (
                        <p className="text-xs font-[family-name:var(--font-mono)] text-[#7A7267] mt-1">
                          Listed as <span className="text-[#E6C97A]">{s.resulting_ref}</span>
                        </p>
                      ) : null}
                    </div>
                    <span className={`text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider px-2 py-1 border ${
                      s.status === 'SUBMITTED' ? 'border-[#9A3412] text-[#9A3412]' : s.status === 'APPROVED' ? 'border-[#166534] text-[#166534]' : s.status === 'REJECTED' ? 'border-[#991B1B] text-[#991B1B]' : 'border-[#8A857B] text-[#8A857B]'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={submit} className={`${card} space-y-4`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="v-kind" className={label}>Type</label>
                <select id="v-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={input}>
                  <option value="gemstone">Loose gemstone</option>
                  <option value="setting">Setting</option>
                  <option value="product">Ready-made jewellery</option>
                </select>
              </div>
              <div>
                <label htmlFor="v-vendor-ref" className={label}>Your reference (tracks this item for you)</label>
                <input id="v-vendor-ref" value={form['vendor_ref']} onChange={set('vendor_ref')} required placeholder="RB-777" className={input} />
              </div>
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
                    <option>RING</option><option>EARRING</option><option>PENDANT</option>
                    <option>NECKLACE</option><option>BRACELET</option><option>NOSE_RING</option>
                  </select></div>
                <div><label htmlFor="v-metal" className={label}>Metal code (e.g. W18, PT, Y14)</label>
                  <input id="v-metal" value={form['metal']} onChange={set('metal')} required className={input} /></div>
                <div><label htmlFor="v-style" className={label}>Style (optional)</label>
                  <input id="v-style" value={form['style']} onChange={set('style')} placeholder="solitaire" className={input} /></div>
                <div><label htmlFor="v-price2" className={label}>Price USD (blank = price on request)</label>
                  <input id="v-price2" type="number" step="0.01" value={form['price_amount']} onChange={set('price_amount')} className={input} /></div>
              </div>
            )}
            <div>
              <label htmlFor="v-desc" className={label}>Description (optional)</label>
              <textarea id="v-desc" value={form['description']} onChange={set('description')} rows={3} className={input} />
            </div>
            {error ? <p className="text-xs text-[#991B1B]">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full px-6 py-3 gold-gradient-cta text-sm disabled:opacity-50">
              {busy ? 'Submitting…' : 'Submit for approval'}
            </button>
            <p className="text-[10px] text-[#6E6250] font-[family-name:var(--font-mono)]">
              Your reference ({form['vendor_ref'] ? form['vendor_ref'] : 'e.g. RB-777'}) is yours alone — the house mints its own code when the submission is approved.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
