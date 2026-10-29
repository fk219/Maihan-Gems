'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * F3-commerce admin console — fresh-api backed (submissions moderation,
 * catalogue, orders). Operator styling follows the applet operator pattern:
 * obsidian surface, EB Garamond display, gold mono eyebrows, gold-gradient-cta.
 * The session cookie is httpOnly — the browser never sees the admin token.
 */

type Tab = 'submissions' | 'catalogue' | 'orders';

interface SubmissionRow {
  id: number;
  submission_kind: string;
  status: string;
  vendor_code: string;
  resulting_ref: string | null;
  payload: Record<string, unknown>;
}

interface OrderRow {
  order_number: string;
  email: string;
  status: string;
  grand_total: string;
  currency: string;
  placed_at: string;
}

const input =
  'w-full rounded-sm border border-white/15 bg-[#121316] px-3 py-2.5 text-sm text-[#F7F5F0] placeholder-[#6E6250] focus:border-[#D4AF37] outline-none';
const tabBtn = (active: boolean) =>
  `px-4 py-2 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] transition-colors border-b-2 ${
    active ? 'border-[#D4AF37] text-[#E6C97A]' : 'border-transparent text-[#8A857B] hover:text-[#F7F5F0]'
  }`;
const card =
  'rounded-sm border border-white/10 bg-[#121316] p-5';

export default function AdminConsole() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('submissions');
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [subsRes, ordersRes] = await Promise.all([
        fetch('/api/fresh/admin/submissions', { cache: 'no-store' }),
        fetch('/api/fresh/admin/orders', { cache: 'no-store' }),
      ]);
      if (subsRes.status === 401) { setAuthed(false); return; }
      if (subsRes.ok) setSubmissions(((await subsRes.json()) as { items?: SubmissionRow[] }).items ?? []);
      if (ordersRes.ok) setOrders(((await ordersRes.json()) as { items?: OrderRow[] }).items ?? []);
      setAuthed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // session probe: the admin submissions route 401s when unauthenticated
    fetch('/api/fresh/admin/submissions', { cache: 'no-store' })
      .then((r) => setAuthed(r.status !== 401))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/fresh-admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setAuthed(true);
    else setError('invalid admin password');
  };

  const act = async (id: number, action: 'approve' | 'reject') => {
    setBusy(true);
    await fetch(`/api/fresh/admin/submissions/${id}/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: action === 'reject' ? 'Rejected from console' : null }),
    });
    await load();
    setBusy(false);
  };

  const logout = async () => {
    await fetch('/api/fresh-admin/login', { method: 'DELETE' });
    setAuthed(false);
  };

  if (authed === null) {
    return <div className="min-h-screen bg-[#0A0A0B]" />;
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0A0A0B] text-[#F7F5F0]">
        <main className="flex-1 mx-auto max-w-md w-full px-4 py-28 space-y-6">
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.26em] text-[#D4AF37] text-center">
            MAIHAN GEMS OPERATIONS
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-normal text-center">Admin Sign-In</h1>
          <form onSubmit={login} className={`${card} space-y-4`}>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password" className={input} aria-label="Admin password"
            />
            {error ? <p className="text-xs text-[#991B1B]">{error}</p> : null}
            <button type="submit" className="w-full px-6 py-3 gold-gradient-cta text-sm">
              Sign in
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F7F5F0]">
      <header className="border-b border-white/10 bg-[#121316]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.26em] text-[#D4AF37]">
              MAIHAN GEMS OPERATIONS
            </p>
            <p className="font-[family-name:var(--font-display)] text-lg">Admin Console</p>
          </div>
          <button onClick={logout} className="px-4 py-2 border border-[#D4AF37]/40 text-[#E6C97A] text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] hover:bg-[#D4AF37]/10">
            Lock Session
          </button>
        </div>
        <nav className="mx-auto max-w-6xl px-4 sm:px-6 flex gap-1">
          <button className={tabBtn(tab === 'submissions')} onClick={() => setTab('submissions')}>Submissions</button>
          <button className={tabBtn(tab === 'catalogue')} onClick={() => setTab('catalogue')}>Catalogue</button>
          <button className={tabBtn(tab === 'orders')} onClick={() => setTab('orders')}>Orders</button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {tab === 'submissions' ? (
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl">Vendor Submissions</h2>
            {submissions.length === 0 ? (
              <p className="text-sm text-[#8A857B]">No submissions yet.</p>
            ) : (
              submissions.map((s) => (
                <div key={s.id} className={card}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#D4AF37]">
                        {s.submission_kind} · {s.vendor_code}
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-lg mt-1">
                        {String(s.payload?.['name'] ?? s.payload?.['variety'] ?? 'Submission')} · {String(s.payload?.['vendor_ref'] ?? '')}
                      </p>
                      {s.resulting_ref ? (
                        <p className="text-xs font-[family-name:var(--font-mono)] text-[#7A7267] mt-1">→ {s.resulting_ref}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider px-2 py-1 border ${
                        s.status === 'SUBMITTED' ? 'border-[#9A3412] text-[#9A3412]' : s.status === 'APPROVED' ? 'border-[#166534] text-[#166534]' : 'border-[#8A857B] text-[#8A857B]'
                      }`}>
                        {s.status}
                      </span>
                      {s.status === 'SUBMITTED' ? (
                        <>
                          <button disabled={busy} onClick={() => act(s.id, 'approve')}
                            className="px-4 py-2 gold-gradient-cta text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider">
                            Approve
                          </button>
                          <button disabled={busy} onClick={() => act(s.id, 'reject')}
                            className="px-4 py-2 border border-[#991B1B]/50 text-[#991B1B] text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider hover:bg-[#991B1B]/10">
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {tab === 'catalogue' ? (
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl">Catalogue</h2>
            <p className="text-sm text-[#8A857B]">
              Browse the live catalogue in the storefront — approved submissions mint
              semantic codes automatically (G/P/S/J grammar).
            </p>
            <a href="/gemstones" className="inline-block px-6 py-3 gold-gradient-cta text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider">
              Open catalogue
            </a>
          </div>
        ) : null}

        {tab === 'orders' ? (
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl">Orders</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-[#8A857B]">No orders yet.</p>
            ) : (
              <div className={card + ' overflow-x-auto'}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8A857B] border-b border-white/10">
                      <th className="py-2 pr-4">Order</th><th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Status</th><th className="py-2 pr-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.order_number} className="border-b border-white/5">
                        <td className="py-2.5 pr-4 font-[family-name:var(--font-mono)] text-xs text-[#E6C97A]">{o.order_number}</td>
                        <td className="py-2.5 pr-4 text-[#A39E93]">{o.email}</td>
                        <td className="py-2.5 pr-4">{o.status}</td>
                        <td className="py-2.5 text-right tabular-nums">{o.currency} {o.grand_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
