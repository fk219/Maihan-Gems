'use client';

/**
 * M5 — the applet's 4-step onboarding wizard, wired to the repo's REAL
 * `vendor_onboarding` fields (PATCH /api/v1/vendor/profile).
 *
 * The applet's banking/tax/UBO fields exist in the REFERENCE applet only —
 * the marketplace keeps no such columns (the vendor_onboarding migration
 * defines: display_name, legal_name, country_code, city, bourse_member,
 * contact_phone, description, status, rejection_reason). Persisting an
 * IBAN or tax id without a storage seam would be fabrication, so every
 * field the wizard shows below IS a real column, and the "Submit Dossier"
 * action is the real PATCH with a client-side confirmation gate — the
 * authoritative moderation result is the server's `status`
 * (PENDING / APPROVED / REJECTED / SUSPENDED) plus its rejection reason.
 *
 * The invitation-token banner is resolved honestly too: real vendor
 * accounts start at the public registration route (/account/register as a
 * Trade Partner), which is stated verbatim instead of the applet's admin
 * invite token matcher.
 */
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Building2,
  Scale,
  Landmark,
  FileCheck2,
} from 'lucide-react';
import type { VendorProfileDto } from '@maihan/db';
import { saveVendorProfile, type VendorOnboardingIdentity } from '@/lib/mgh/adapters/vendor';

export interface VendorOnboardingWizardProps {
  vendor: VendorProfileDto;
  initialProducts: { moderation: string }[];
  onChanged: () => void;
}

const WIZARD_STEPS = [
  {
    step: 1 as const,
    title: 'Business Identity',
    subtitle: 'Legal & Trading Names, Trade Desk Contact',
    icon: Building2,
  },
  {
    step: 2 as const,
    title: 'Bourse Location',
    subtitle: 'City, Country & Bourse Affiliation',
    icon: Scale,
  },
  {
    step: 3 as const,
    title: 'House Specialisation',
    subtitle: 'Trade Desk Phone & Provenance Notes',
    icon: Landmark,
  },
  {
    step: 4 as const,
    title: 'Review & Submission',
    subtitle: 'Executive Attestation & Admin Verification',
    icon: FileCheck2,
  },
];

export function VendorOnboardingWizard({
  vendor,
  initialProducts,
  onChanged,
}: VendorOnboardingWizardProps) {
  // Real vendor_onboarding row values (the report reads/writes exactly these).
  const [legalBusinessName, setLegalBusinessName] = useState(vendor.legal_name);
  const [dbaTradeName, setDbaTradeName] = useState(vendor.display_name);
  const [jurisdictionCountry, setJurisdictionCountry] = useState(vendor.country_code);
  const [city, setCity] = useState(vendor.city);
  const [bourseMember, setBourseMember] = useState(vendor.bourse_member);
  const [contactPhone, setContactPhone] = useState(vendor.contact_phone ?? '');
  const [houseDescription, setHouseDescription] = useState(vendor.description ?? '');

  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [submittedRecord, setSubmittedRecord] = useState<VendorProfileDto | null>(null);
  const [executiveSignOff, setExecutiveSignOff] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty =
    legalBusinessName !== vendor.legal_name ||
    dbaTradeName !== vendor.display_name ||
    jurisdictionCountry !== vendor.country_code ||
    city !== vendor.city ||
    bourseMember !== vendor.bourse_member ||
    contactPhone !== (vendor.contact_phone ?? '') ||
    houseDescription !== (vendor.description ?? '');

  const handleNextStep = () => {
    setStepErrors([]);
    if (activeStep === 1) {
      if (!legalBusinessName.trim() || legalBusinessName.trim().length < 2) {
        setStepErrors(['The legal business name (registered entity) is required.']);
        return;
      }
      if (!dbaTradeName.trim() || dbaTradeName.trim().length < 2) {
        setStepErrors(['The trading / display name shown to the marketplace is required.']);
        return;
      }
    }
    if (activeStep === 2) {
      if (jurisdictionCountry.trim().length !== 2) {
        setStepErrors(['The jurisdiction country must be an ISO-2 code (e.g. CH, AE).']);
        return;
      }
      if (!city.trim() || city.trim().length < 2) {
        setStepErrors(['The bourse city is required.']);
        return;
      }
    }
    setActiveStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
  };

  const handlePrevStep = () => {
    setStepErrors([]);
    setActiveStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepErrors([]);
    if (!executiveSignOff) {
      setStepErrors([
        'Please confirm the Executive Officer attestation before submitting for administrator verification.',
      ]);
      return;
    }
    setSaving(true);
    try {
      const payload: VendorOnboardingIdentity = {
        display_name: dbaTradeName.trim(),
        legal_name: legalBusinessName.trim(),
        country_code: jurisdictionCountry.trim().toUpperCase().slice(0, 2) || vendor.country_code,
        city: city.trim() || vendor.city,
        bourse_member: bourseMember,
        contact_phone: contactPhone.trim(),
        description: houseDescription.trim(),
      };
      const updated = await saveVendorProfile(payload);
      setSubmittedRecord(updated);
      onChanged();
    } catch (cause) {
      setStepErrors([
        cause instanceof Error ? cause.message : 'The registry could not record this dossier.',
      ]);
    } finally {
      setSaving(false);
    }
  };

  const submittedProducts = initialProducts.filter(
    (p) => p.moderation === 'SUBMITTED' || p.moderation === 'APPROVED' || p.moderation === 'PUBLISHED',
  ).length;

  return (
    <div className="space-y-8" data-testid="vendor-onboarding-wizard">
      {/* Registration & Verification Governance Banner */}
      <section className="rounded-[20px] bg-[#1C1610] text-[#FAF3E3] border border-[#C5A059]/40 p-5 space-y-3 shadow-[0_14px_34px_rgba(26,20,14,0.12)]">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#E6C97A]">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Trade-Partner Registry · Verified Session Required</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-normal text-white">
              Partner Onboarding, Bourse Details &amp; Administrator Verification
            </h1>
            <p className="text-xs text-[#D8CEBE]">
              New trade partners register at{' '}
              <Link href="/account/register" className="font-mono text-[#E6C97A] underline">
                /account/register
              </Link>{' '}
              (role: Trade Partner). Administrator approval flips your onboarding status to APPROVED,
              which unlocks product submission to the moderation queue.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
            <div className="rounded-[14px] border border-[#C5A059]/30 bg-white/5 px-4 py-2.5 text-xs font-mono">
              <p className="text-[#E6C97A]">
                Registry record: <strong>{vendor.display_name}</strong>
              </p>
              <p className="text-[#D8CEBE]">
                Status: {vendor.status}
                {vendor.rejection_reason ? ` · ${vendor.rejection_reason}` : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wizard Step Progress Bar */}
      <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-6">
        <nav aria-label="Vendor Onboarding Steps" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {WIZARD_STEPS.map((s) => {
            const isCurrent = activeStep === s.step;
            const isCompleted = activeStep > s.step || Boolean(submittedRecord);
            return (
              <button
                key={s.step}
                type="button"
                data-testid={`wizard-step-tab-${s.step}`}
                onClick={() => {
                  if (s.step < activeStep) {
                    setStepErrors([]);
                    setActiveStep(s.step);
                  }
                }}
                className={`flex items-start gap-3 rounded-[16px] border p-3.5 text-left transition-all ${
                  isCurrent
                    ? 'border-[#1C1610] bg-[#1C1610] text-[#FAF3E3] shadow-sm'
                    : isCompleted
                    ? 'border-[#15803D]/40 bg-[#F0FDF4] text-[#166534] cursor-pointer'
                    : 'border-[#E5D4B3] bg-[#FAF3E3]/50 text-[#5C4E3C]'
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center font-mono text-xs font-semibold shrink-0 ${
                    isCurrent
                      ? 'bg-[#C5A059] text-[#1C1610]'
                      : isCompleted
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#E5D4B3] text-[#1A1612]'
                  }`}
                >
                  {isCompleted ? '✓' : s.step}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-wider font-semibold truncate">
                    Step {s.step}: {s.title}
                  </p>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      isCurrent ? 'text-[#D8CEBE]' : 'text-[#6B5A45]'
                    }`}
                  >
                    {s.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {stepErrors.length > 0 && (
          <div
            role="alert"
            data-testid="wizard-validation-alert"
            className="rounded-[14px] border border-[#991B1B] bg-[#FEF2F2] p-4 text-xs font-mono text-[#991B1B] space-y-1"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Please resolve the following onboarding requirements:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {stepErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {submittedRecord && (
          <div
            role="status"
            data-testid="wizard-submission-success"
            className="rounded-[16px] border border-[#166534] bg-[#F0FDF4] p-5 text-sm text-[#166534] space-y-2"
          >
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Onboarding Dossier {submittedRecord.slug} Recorded — Status {submittedRecord.status}
              </span>
            </div>
            <p className="text-xs text-[#166534]/90">
              {submittedRecord.legal_name} ({submittedRecord.display_name}) is now stored on the real
              vendor registry with status <strong className="font-mono">{submittedRecord.status}</strong>.
              Administrator verification (APPROVED) unlocks product submission; you can review the
              authoritative state in the{' '}
              <Link href="/vendor" className="underline font-semibold">
                Vendor Portal
              </Link>
              .
            </p>
          </div>
        )}

        {/* STEP 1: BUSINESS IDENTITY (REAL columns: legal_name / display_name) */}
        {activeStep === 1 && (
          <div className="space-y-5" data-testid="wizard-step-1-panel">
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                Step 1 of 4 · Business Identity
              </p>
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Registered Entity &amp; Trading Names on the Supplier Registry
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="wiz-legal-name"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Legal Business Name *
                </label>
                <input
                  id="wiz-legal-name"
                  type="text"
                  value={legalBusinessName}
                  onChange={(e) => setLegalBusinessName(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-dba-name"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Trading / Display Name *
                </label>
                <input
                  id="wiz-dba-name"
                  type="text"
                  value={dbaTradeName}
                  onChange={(e) => setDbaTradeName(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <p className="block font-mono text-xs uppercase text-[#6B5A45] mb-1">
                  Corporate Contact Email
                </p>
                <p className="rounded-[12px] border border-[#E5D4B3] bg-[#FFFDF9] px-3.5 py-2.5 text-sm font-mono">
                  {vendor.email}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                data-testid="wizard-next-btn"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.16em] font-semibold cursor-pointer"
              >
                Continue to Step 2: Bourse Location
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BOURSE LOCATION + MEMBERSHIP (REAL: country_code / city / bourse_member) */}
        {activeStep === 2 && (
          <div className="space-y-5" data-testid="wizard-step-2-panel">
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                Step 2 of 4 · Bourse Location &amp; Affiliation
              </p>
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Jurisdiction, Bourse City &amp; Membership Statement
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="wiz-country"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Jurisdiction Country (ISO-2) *
                </label>
                <input
                  id="wiz-country"
                  type="text"
                  maxLength={2}
                  value={jurisdictionCountry}
                  onChange={(e) => setJurisdictionCountry(e.target.value.toUpperCase())}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-city"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Bourse City *
                </label>
                <input
                  id="wiz-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5 space-y-2 text-sm">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F] font-semibold">
                  Affiliation Statement
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bourseMember}
                    onChange={(e) => setBourseMember(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <strong>Bourse Affiliation:</strong> this supplier entity is a registered member
                    of a recognised bourse (WFDB / ICA / DMCC / BGL).
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E5D4B3] bg-[#FAF3E3] text-xs font-mono uppercase tracking-wider text-[#1A1612] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Step 1
              </button>
              <button
                type="button"
                data-testid="wizard-next-btn"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.16em] font-semibold cursor-pointer"
              >
                Continue to Step 3: House Specialisation
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: HOUSE SPECIALISATION (REAL: contact_phone / description) */}
        {activeStep === 3 && (
          <div className="space-y-5" data-testid="wizard-step-3-panel">
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                Step 3 of 4 · House Specialisation &amp; Trade Desk
              </p>
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Trade Desk Phone &amp; Provenance Statement
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="wiz-phone"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Trade Desk Phone
                </label>
                <input
                  id="wiz-phone"
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-description"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  House Specialisation &amp; Provenance Notes
                </label>
                <input
                  id="wiz-description"
                  type="text"
                  value={houseDescription}
                  onChange={(e) => setHouseDescription(e.target.value)}
                  placeholder="e.g. Ceylon sapphire lot house · Colombo origin documents"
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E5D4B3] bg-[#FAF3E3] text-xs font-mono uppercase tracking-wider text-[#1A1612] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Step 2
              </button>
              <button
                type="button"
                data-testid="wizard-next-btn"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.16em] font-semibold cursor-pointer"
              >
                Continue to Step 4: Final Review
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FINAL REVIEW — real PATCH gate */}
        {activeStep === 4 && (
          <form
            onSubmit={(e) => void handleFinalSubmit(e)}
            className="space-y-6"
            data-testid="wizard-step-4-panel"
          >
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                Step 4 of 4 · Final Dossier Review &amp; Submission for Administrator Verification
              </p>
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Verify Business Identity, Bourse Details &amp; the Registry Record
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/50 p-4 space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F] font-semibold">
                  1. Business Identity
                </p>
                <p>
                  <span className="text-[#6B5A45]">Legal Name:</span>{' '}
                  <strong className="text-[#1A1612]">{legalBusinessName}</strong>
                </p>
                <p>
                  <span className="text-[#6B5A45]">Trading Name:</span> {dbaTradeName}
                </p>
                <p>
                  <span className="text-[#6B5A45]">Registry Contact:</span> {vendor.email}
                </p>
                <p className="font-mono text-[#6B5A45]">
                  Submitted pieces in moderation: {submittedProducts}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/50 p-4 space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F] font-semibold">
                  2. Bourse Location &amp; Affiliation
                </p>
                <p>
                  <span className="text-[#6B5A45]">Jurisdiction:</span>{' '}
                  <strong className="text-[#1A1612] font-mono">
                    {jurisdictionCountry.toUpperCase()}
                  </strong>
                </p>
                <p>
                  <span className="text-[#6B5A45]">Bourse City:</span> {city}
                </p>
                <p>
                  <span className="text-[#6B5A45]">Bourse member:</span>{' '}
                  {bourseMember ? 'Confirmed on the record' : 'Not recorded'}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/50 p-4 space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F] font-semibold">
                  3. Trade Desk &amp; Provenance
                </p>
                <p className="font-mono">
                  <span className="text-[#6B5A45]">Phone:</span>{' '}
                  {contactPhone.trim() || 'Not evidenced'}
                </p>
                <p>
                  <span className="text-[#6B5A45]">House notes:</span>{' '}
                  {houseDescription.trim() || 'Not evidenced'}
                </p>
                <p className="font-mono text-[#6B5A45]">
                  Registry status: {submittedRecord?.status ?? vendor.status}
                </p>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#E5D4B3] bg-[#FAF3E3]/70 p-4 text-sm">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={executiveSignOff}
                  onChange={(e) => setExecutiveSignOff(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <strong>Executive Sign-Off for Administrator Verification:</strong> I certify the
                  business identity, bourse location, and affiliation statement above are accurate
                  and authorised for review by the Maihan Gems compliance &amp; administration team.
                  Tax treaty and settlement-banking figures have no storage on this registry and
                  were therefore never collected here.
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E5D4B3] bg-[#FAF3E3] text-xs font-mono uppercase tracking-wider text-[#1A1612] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Step 3
              </button>
              <button
                type="submit"
                data-testid="submit-kyb-dossier-btn"
                disabled={saving || (!dirty && Boolean(submittedRecord))}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.18em] font-semibold cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {saving ? 'Recording…' : 'Submit Dossier for Administrator Verification →'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Submitted Supplier Onboarding & Verification Ledger (this vendor's real row) */}
      <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 space-y-4">
        <h2 className="text-2xl font-normal text-[#1A1612]">
          Supplier Onboarding &amp; Administrator Verification Ledger
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                <th className="py-3 pr-4">Registry Record</th>
                <th className="py-3 pr-4">Legal Entity</th>
                <th className="py-3 pr-4">Bourse</th>
                <th className="py-3 pr-4">Trade Desk</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">Administrator Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE5D1]">
              <tr className="hover:bg-[#FAF3E3]/40">
                <td className="py-3 pr-4">
                  <span className="font-semibold text-[#1A1612] block">
                    {submittedRecord?.slug ?? vendor.slug}
                  </span>
                  <span className="text-[11px] text-[#8C6D2F] block">
                    Registered {new Date(vendor.created_at).toLocaleDateString('en-GB')}
                  </span>
                </td>
                <td className="py-3 pr-4 font-sans">
                  <span className="font-semibold text-[#1A1612] block">
                    {submittedRecord?.legal_name ?? vendor.legal_name}
                  </span>
                  <span className="text-xs text-[#5C4E3C]">
                    {submittedRecord?.display_name ?? vendor.display_name}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="block">
                    {city}, {jurisdictionCountry.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-[#8C6D2F]">
                    Bourse member: {bourseMember ? 'Confirmed' : 'Not recorded'}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="block">{contactPhone.trim() || 'Not evidenced'}</span>
                  <span className="text-[11px] text-[#6B5A45]">
                    {houseDescription.trim() || 'No house notes'}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[10px] uppercase ${
                      (submittedRecord?.status ?? vendor.status) === 'APPROVED'
                        ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                        : (submittedRecord?.status ?? vendor.status) === 'REJECTED'
                        ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                        : 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]'
                    }`}
                  >
                    {submittedRecord?.status ?? vendor.status}
                  </span>
                </td>
                <td className="py-3 font-sans text-xs text-[#4A3E2E] max-w-xs">
                  {submittedRecord?.rejection_reason ?? vendor.rejection_reason ?? 'Pending administrator review.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
