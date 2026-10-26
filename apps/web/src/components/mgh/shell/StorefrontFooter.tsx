'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';

export function StorefrontFooter() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setSubmittedEmail(trimmed);
    setEmail('');
  };

  return (
    <footer className="border-t border-[#D4AF37]/25 bg-[#0A0A0B] text-[#F7F5F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Brand Identity + Journal Newsletter Input in Footer */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 font-[family-name:var(--font-eb-garamond)] text-2xl font-normal tracking-[0.14em] text-white"
              >
                <span>MAIHAN GEMS</span>
              </Link>
              <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#D4AF37]">
                Geneva · New York · London
              </p>
              <p className="text-sm font-[family-name:var(--font-eb-garamond)] text-[#B8B2A6] leading-relaxed max-w-sm">
                Natural loose gemstones and handcrafted fine jewelry with honest lab certificates and clear pricing.
              </p>
            </div>

            {/* Minimalist Journal Mailing List Box inside Footer */}
            <div
              data-testid="journal-newsletter-section"
              className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#FBF6EA] via-[#F3E3BF] to-[#E8D09C] p-5 text-[#181613] shadow-[0_12px_32px_rgba(0,0,0,0.35)] max-w-md space-y-3"
            >
              <div className="space-y-1">
                <p className="text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#7A5C1B] font-semibold">
                  THE MAIHAN JOURNAL
                </p>
                <p className="text-sm font-[family-name:var(--font-eb-garamond)] text-[#2C251B] leading-snug">
                  Join our Journal mailing list for provenance updates &amp; newly arrived stones.
                </p>
              </div>

              {submittedEmail ? (
                <div
                  data-testid="journal-newsletter-confirmation"
                  className="flex items-center gap-2.5 rounded-xl border border-[#C5A059] bg-white/90 px-3.5 py-2.5 text-left"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#8B6B23] shrink-0" />
                  <p className="text-xs font-[family-name:var(--font-eb-garamond)] text-[#181613]">
                    Welcome to the Maihan Journal. Updates will be sent to{' '}
                    <span className="font-semibold text-[#7A5C1B]">{submittedEmail}</span>.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  noValidate
                  className="flex items-center gap-2 rounded-full border border-[#C5A059]/80 bg-white/95 p-1 pl-3.5 shadow-sm focus-within:border-[#8B6B23] transition-all"
                >
                  <Mail className="h-3.5 w-3.5 text-[#8B6B23] shrink-0" />
                  <label htmlFor="footer-journal-email" className="sr-only">
                    Email address for the Maihan Journal
                  </label>
                  <input
                    id="footer-journal-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your email..."
                    data-testid="journal-newsletter-input"
                    className="w-full min-w-0 bg-transparent py-1.5 text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] text-[#181613] placeholder:text-[#7A7060] focus:outline-none"
                  />
                  <button
                    type="submit"
                    data-testid="journal-newsletter-submit"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0A0A0B] hover:bg-[#231F1A] text-[#F7F5F0] px-4 py-2 text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-semibold transition-colors shrink-0 cursor-pointer"
                  >
                    <span>Join</span>
                    <ArrowRight className="h-3 w-3 text-[#D4AF37]" />
                  </button>
                </form>
              )}

              {error && (
                <p role="alert" className="text-xs font-[family-name:var(--font-eb-garamond)] text-[#991B1B]">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Shop */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] text-[#D4AF37] font-semibold mb-4">
              Shop
            </h3>
            <ul className="space-y-2.5 text-sm font-[family-name:var(--font-eb-garamond)] text-[#C8C3B8]">
              <li><Link href="/varieties" className="hover:text-white transition-colors">Gemstones</Link></li>
              <li><Link href="/jewellery" className="hover:text-white transition-colors">Fine Jewelry</Link></li>
              <li><Link href="/settings" className="hover:text-white transition-colors">Settings</Link></li>
              <li><Link href="/design-your-own" className="hover:text-white transition-colors">DYOJ Studio</Link></li>
              <li><Link href="/pairs" className="hover:text-white transition-colors">Matched Earring Pairs</Link></li>
            </ul>
          </div>

          {/* Customer Help & Portals */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] text-[#D4AF37] font-semibold mb-4">
              Portals &amp; Care
            </h3>
            <ul className="space-y-2.5 text-sm font-[family-name:var(--font-eb-garamond)] text-[#C8C3B8]">
              <li><Link href="/concierge" className="hover:text-white text-[#E6C97A] transition-colors">AI Gemologist</Link></li>
              <li><Link href="/account" className="hover:text-white transition-colors">Client Vault Login</Link></li>
              <li><Link href="/vendor" className="hover:text-white transition-colors">Vendor Portal</Link></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Admin Console</Link></li>
              <li><Link href="/showrooms" className="hover:text-white transition-colors">Our Showrooms</Link></li>
            </ul>
          </div>

          {/* Legal & Compliance Hub */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] text-[#D4AF37] font-semibold mb-4">
              Legal &amp; Provenance Hub
            </h3>
            <ul className="space-y-2.5 text-sm font-[family-name:var(--font-eb-garamond)] text-[#C8C3B8]">
              <li><Link href="/policy" className="hover:text-white text-[#E6C97A] transition-colors">All Legal &amp; Policy Dossiers</Link></li>
              <li><Link href="/policy/privacy-policy" className="hover:text-white transition-colors">Privacy Policy (FADP &amp; GDPR)</Link></li>
              <li><Link href="/policy/terms-of-service" className="hover:text-white transition-colors">Terms of Service &amp; Sale</Link></li>
              <li><Link href="/policy/shipping-and-returns" className="hover:text-white transition-colors">Insured Shipping &amp; Returns</Link></li>
              <li><Link href="/policy/ethical-sourcing" className="hover:text-white transition-colors">Ethical Sourcing &amp; Provenance</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-[family-name:var(--font-eb-garamond)] text-[#8A857B]">
          <p>© {new Date().getFullYear()} Maihan Gems. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/policy/privacy-policy" className="hover:text-[#C8C3B8] transition-colors">Privacy Policy</Link>
            <Link href="/policy/terms-of-service" className="hover:text-[#C8C3B8] transition-colors">Terms of Service</Link>
            <Link href="/policy/treatment-disclosure" className="hover:text-[#C8C3B8] transition-colors">Treatment Disclosure</Link>
            <Link href="/vendor" className="text-[#9A7B2C] hover:text-[#D4AF37] transition-colors">Vendor Portal</Link>
            <Link href="/admin" className="text-[#9A7B2C] hover:text-[#D4AF37] transition-colors">Admin Console</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
