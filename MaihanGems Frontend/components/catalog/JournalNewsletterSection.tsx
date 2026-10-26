'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, Mail } from 'lucide-react';

export function JournalNewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'subscribed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setStatus('subscribed');
    setErrorMessage('');
  };

  return (
    <section
      data-reveal
      data-testid="journal-newsletter-section"
      aria-labelledby="journal-newsletter-heading"
      className="relative border-t border-[#E2CEAA] bg-gradient-to-br from-[#FBF6EA] via-[#F3E3BF] to-[#E8D09C] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Subtle luminous radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.65),transparent_70%)]"
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center space-y-5">
        <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.32em] text-[#8B6B23] font-semibold">
          THE MAIHAN JOURNAL
        </p>

        <h2
          id="journal-newsletter-heading"
          className="font-[family-name:var(--font-eb-garamond)] text-3xl sm:text-4xl font-normal text-[#181613] leading-tight"
        >
          Join our Journal for provenance updates &amp; newly arrived stones.
        </h2>

        <p className="text-sm sm:text-base text-[#4A4134] leading-relaxed font-[family-name:var(--font-eb-garamond)] max-w-xl mx-auto">
          Receive occasional dispatches on mine-to-market provenance, newly certified gemstones, and private showroom viewings.
        </p>

        {status === 'subscribed' ? (
          <div
            role="status"
            data-testid="journal-newsletter-confirmation"
            className="mx-auto max-w-md rounded-full border border-[#C5A059] bg-white/90 px-6 py-3.5 text-sm font-[family-name:var(--font-eb-garamond)] text-[#181613] inline-flex items-center justify-center gap-2.5 shadow-sm"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A0A0B] text-[#D4AF37]">
              <Check className="h-3 w-3" />
            </span>
            <span>
              Welcome to the Journal. Updates will be sent to <strong>{email.trim()}</strong>.
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mx-auto max-w-md pt-2 space-y-2"
          >
            <div className="relative flex items-center rounded-full border border-[#C5A059]/70 bg-white/95 p-1.5 pl-4 shadow-[0_10px_30px_rgba(154,123,44,0.14)] focus-within:border-[#0A0A0B] transition-colors">
              <Mail className="h-4 w-4 text-[#9A7B2C] shrink-0 mr-2.5" aria-hidden="true" />
              <label htmlFor="journal-newsletter-email" className="sr-only">
                Email address for the Journal mailing list
              </label>
              <input
                id="journal-newsletter-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') {
                    setStatus('idle');
                    setErrorMessage('');
                  }
                }}
                placeholder="Enter your email address..."
                required
                data-testid="journal-newsletter-input"
                className="w-full bg-transparent text-sm sm:text-base font-[family-name:var(--font-eb-garamond)] text-[#181613] placeholder:text-[#7A7267] focus:outline-hidden"
              />
              <button
                type="submit"
                data-testid="journal-newsletter-submit"
                className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0B] hover:bg-[#1E1C18] px-5 py-2.5 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-semibold text-[#E6C97A] transition-all shrink-0 cursor-pointer"
              >
                <span>Join</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {status === 'error' && errorMessage && (
              <p
                role="alert"
                className="text-xs font-[family-name:var(--font-eb-garamond)] text-[#991B1B]"
              >
                {errorMessage}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

export default JournalNewsletterSection;
