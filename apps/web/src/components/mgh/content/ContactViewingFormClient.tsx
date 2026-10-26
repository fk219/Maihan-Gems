'use client';

import React, { useState } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';

export function ContactViewingFormClient({
  initialSalon,
  initialSku,
}: {
  initialSalon?: string;
  initialSku?: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [salon, setSalon] = useState(initialSalon || 'Geneva');
  const [requestedSkus, setRequestedSkus] = useState(initialSku || 'MG-TZ-0131');
  const [preferredDate, setPreferredDate] = useState('2026-11-04');
  const [lightingPreference, setLightingPreference] = useState('5500K North-Daylight + 2700K Evening');
  const [salonNotes, setSalonNotes] = useState('');
  const [submittedRecord, setSubmittedRecord] = useState<{
    referenceId: string;
    name: string;
    salon: string;
    requestedSkus: string;
    preferredDate: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !email.includes('@')) {
      setError('Please enter your full name and a valid client email address.');
      return;
    }
    setError(null);
    setSubmittedRecord({
      referenceId: `VW-${salon.slice(0, 3).toUpperCase()}-2026-409`,
      name: name.trim(),
      salon,
      requestedSkus: requestedSkus.trim() || 'MG-TZ-0131',
      preferredDate,
    });
  };

  if (submittedRecord) {
    return (
      <div
        data-testid="viewing-request-confirmed"
        className="rounded-[24px] obsidian-gold-surface border border-[#D4AF37]/40 p-8 space-y-5 font-[family-name:var(--font-eb-garamond)]"
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#E6C97A]">
          <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
          <span>VIEWING LOGGED · {submittedRecord.referenceId}</span>
        </div>
        <h2 className="text-3xl font-normal text-[#F7F5F0]">
          Dossier Reserved for {submittedRecord.name}
        </h2>
        <p className="text-sm text-[#C8C3B8] leading-relaxed">
          {submittedRecord.salon} Salon · Specimen{' '}
          <strong className="text-[#E6C97A]">
            {submittedRecord.requestedSkus}
          </strong>{' '}
          · {submittedRecord.preferredDate}.
        </p>
        <button
          type="button"
          onClick={() => setSubmittedRecord(null)}
          className="px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] border border-[#D4AF37]/40 text-[#E6C97A] hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
        >
          New Request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-7 sm:p-9 shadow-[0_14px_38px_rgba(185,150,75,0.1)] space-y-6 font-[family-name:var(--font-eb-garamond)]"
    >
      <div className="border-b border-[#EFE6D4] pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#9A7B2C] font-semibold">
            APPOINTMENT REQUEST
          </p>
          <h2 className="text-2xl sm:text-3xl font-normal text-[#181613]">
            Reserve a Loose Stone Viewing
          </h2>
        </div>
        <Calendar className="h-5 w-5 text-[#9A7B2C]" />
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-[#991B1B] bg-[#991B1B]/5 p-3.5 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <label htmlFor="vw-name" className="block text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold mb-1.5">
            Full Name
          </label>
          <input
            id="vw-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Elena Vance"
            className="w-full rounded-full border border-[#E5D4B3] bg-[#FAF8F4] px-4 py-2.5 text-[#181613]"
          />
        </div>
        <div>
          <label htmlFor="vw-email" className="block text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold mb-1.5">
            Client Email
          </label>
          <input
            id="vw-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="elena.vance@domain.com"
            className="w-full rounded-full border border-[#E5D4B3] bg-[#FAF8F4] px-4 py-2.5 text-[#181613]"
          />
        </div>
        <div>
          <label htmlFor="vw-salon" className="block text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold mb-1.5">
            Salon
          </label>
          <select
            id="vw-salon"
            value={salon}
            onChange={(e) => setSalon(e.target.value)}
            className="w-full rounded-full border border-[#E5D4B3] bg-[#FAF8F4] px-4 py-2.5 text-[#181613]"
          >
            <option value="Geneva">Geneva — Rue du Rhône 42</option>
            <option value="New York">New York — 608 Fifth Avenue</option>
            <option value="London">London — 94 Mount Street</option>
          </select>
        </div>
        <div>
          <label htmlFor="vw-date" className="block text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold mb-1.5">
            Date
          </label>
          <input
            id="vw-date"
            type="date"
            required
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full rounded-full border border-[#E5D4B3] bg-[#FAF8F4] px-4 py-2.5 text-[#181613]"
          />
        </div>
        <div>
          <label htmlFor="vw-skus" className="block text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold mb-1.5">
            Specimen SKUs
          </label>
          <input
            id="vw-skus"
            type="text"
            value={requestedSkus}
            onChange={(e) => setRequestedSkus(e.target.value)}
            className="w-full rounded-full border border-[#E5D4B3] bg-[#FAF8F4] px-4 py-2.5 text-[#181613]"
          />
        </div>
        <div>
          <label htmlFor="vw-light" className="block text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold mb-1.5">
            Optical Setup
          </label>
          <select
            id="vw-light"
            value={lightingPreference}
            onChange={(e) => setLightingPreference(e.target.value)}
            className="w-full rounded-full border border-[#E5D4B3] bg-[#FAF8F4] px-4 py-2.5 text-[#181613]"
          >
            <option value="5500K North-Daylight + 2700K Evening">
              5500K North-Daylight + 2700K Evening
            </option>
            <option value="Darkfield Microscope + Dichroscope">
              Darkfield Microscope + Dichroscope
            </option>
            <option value="Bespoke Setting Bench Consultation">
              Bespoke Setting Consultation
            </option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="vw-notes" className="block text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold mb-1.5">
            Salon Notes
          </label>
          <textarea
            id="vw-notes"
            rows={3}
            value={salonNotes}
            onChange={(e) => setSalonNotes(e.target.value)}
            placeholder="Optional comparison or mounting notes..."
            className="w-full rounded-[20px] border border-[#E5D4B3] bg-[#FAF8F4] p-4 text-[#181613]"
          />
        </div>
      </div>

      <button
        type="submit"
        className="px-8 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold gold-gradient-cta transition-all cursor-pointer"
      >
        Request Appointment
      </button>
    </form>
  );
}
