'use client';

import { useState } from 'react';

export function UnsubscribeForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy'); setMessage('');
    const res = await fetch('/api/fresh/leads/unsubscribe', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (res.ok) {
      setState('done');
      setMessage('You are unsubscribed from the journal. Transactional order email is unaffected.');
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setState('error');
      setMessage(d.error ?? 'Could not process the request.');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-8 text-center space-y-2">
        <p className="text-sm text-[#166534]">{message}</p>
        <p className="text-xs text-[#76726A]">Changed your mind? Subscribe again from any page footer.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-sm border border-[#E4DFD5] bg-white p-6 space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        className="w-full rounded-sm border border-[#E4DFD5] px-3 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
      />
      {message ? <p className="text-xs text-[#9B3A2A]">{message}</p> : null}
      <button type="submit" disabled={state === 'busy'} className="rounded-sm px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta disabled:opacity-60">
        {state === 'busy' ? 'Working…' : 'Unsubscribe'}
      </button>
      <p className="text-[11px] text-[#76726A]">This removes you from the Maihan Journal mailing list. Orders and service email continue.</p>
    </form>
  );
}
