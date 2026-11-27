'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * The Journal form, reduced to an underline, a field and a verb. The endpoint
 * and the validation are unchanged from the previous footer; only the
 * composition is new.
 */
export function FooterJournalForm() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      const response = await fetch('/api/fresh/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'newsletter' }),
      });
      if (!response.ok) throw new Error('subscribe failed');
      setError(null);
      setSubmittedEmail(trimmed);
      setEmail('');
    } catch {
      setError('We could not reach the atelier just now. Please try again.');
    }
  };

  return (
    <div className="mh6-journal" data-testid="journal-newsletter-section">
      <p className="mh6-journal__label">The Maihan Journal</p>
      <p className="mh6-journal__copy">
        Provenance notes and newly arrived stones, sent when there is something to report.
      </p>

      {submittedEmail ? (
        <p className="mh6-journal__confirm" data-testid="journal-newsletter-confirmation">
          Welcome to the Maihan Journal. Updates will be sent to{' '}
          <span>{submittedEmail}</span>.
        </p>
      ) : (
        <form onSubmit={handleSubscribe} noValidate className="mh6-journal__form">
          <label htmlFor="footer-journal-email" className="sr-only">
            Email address for the Maihan Journal
          </label>
          <input
            id="footer-journal-email"
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Email address"
            data-testid="journal-newsletter-input"
            className="mh6-journal__input"
          />
          <button
            type="submit"
            data-testid="journal-newsletter-submit"
            className="mh6-journal__submit"
          >
            Join
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      )}

      {error ? (
        <p role="alert" className="mh6-journal__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
