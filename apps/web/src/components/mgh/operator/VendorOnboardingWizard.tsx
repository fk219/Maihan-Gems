'use client';

import React, { useState, useEffect } from 'react';
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
  KeyRound,
} from 'lucide-react';
import {
  completeVendorOnboardingWizard,
  findVendorInviteByToken,
  validateVendorWizardStep,
} from '@/lib/mgh/platform-governance';
import type { InventoryCategory, LegalEntityStructure, VendorOnboardingSubmission, VendorOnboardingWizardData } from '@/lib/mgh/platform-governance';

export interface VendorOnboardingWizardProps {
  submissions: VendorOnboardingSubmission[];
  initialInviteToken?: string;
  onSubmissionsChange: (updated: VendorOnboardingSubmission[]) => void;
}

const WIZARD_STEPS = [
  {
    step: 1 as const,
    title: 'Business Identity',
    subtitle: 'Corporate Name, Contact & Supply Scope',
    icon: Building2,
  },
  {
    step: 2 as const,
    title: 'Legal Entity Status',
    subtitle: 'Incorporation, Licenses & Statutory KYB',
    icon: Scale,
  },
  {
    step: 3 as const,
    title: 'Tax & Treasury Banking',
    subtitle: 'Tax Classification, W-8BEN-E & SWIFT/IBAN',
    icon: Landmark,
  },
  {
    step: 4 as const,
    title: 'Review & Admin Verification',
    subtitle: 'Executive Attestation & Final Submission',
    icon: FileCheck2,
  },
];

export function VendorOnboardingWizard({
  submissions,
  initialInviteToken = '',
  onSubmissionsChange,
}: VendorOnboardingWizardProps) {
  const [inviteTokenInput, setInviteTokenInput] = useState<string>(
    initialInviteToken || 'INV-MHG-2026-8841'
  );
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [submittedRecord, setSubmittedRecord] = useState<VendorOnboardingSubmission | null>(null);
  const [executiveSignOff, setExecutiveSignOff] = useState<boolean>(true);

  const matchedInvite = findVendorInviteByToken(submissions, inviteTokenInput);

  // Step 1: Business Identity
  const [legalBusinessName, setLegalBusinessName] = useState(
    matchedInvite?.legalBusinessName || 'Vaucher & Fils Haute Joaillerie SA'
  );
  const [dbaTradeName, setDbaTradeName] = useState(
    matchedInvite?.dbaTradeName || 'Atelier Vaucher Genève'
  );
  const [primaryContactName, setPrimaryContactName] = useState(
    matchedInvite?.primaryContactName || 'Henri-Luc Vaucher'
  );
  const [primaryContactEmail, setPrimaryContactEmail] = useState(
    matchedInvite?.primaryContactEmail || 'compliance@vaucher-geneve.ch'
  );
  const [jurisdictionCountry, setJurisdictionCountry] = useState(
    matchedInvite?.jurisdictionCountry || 'Switzerland'
  );
  const [registeredAddress, setRegisteredAddress] = useState(
    matchedInvite?.registeredAddress || 'Rue du Rhône 42, 1204 Genève, Switzerland'
  );
  const [primarySupplyCategory, setPrimarySupplyCategory] = useState<InventoryCategory>(
    matchedInvite?.primarySupplyCategory || 'Settings'
  );

  // Step 2: Legal Entity Status
  const [entityStructure, setEntityStructure] = useState<LegalEntityStructure>(
    matchedInvite?.entityStructure || 'Société Anonyme (SA)'
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    matchedInvite?.registrationNumber || 'CHE-391.402.881'
  );
  const [incorporationDate, setIncorporationDate] = useState(
    matchedInvite?.incorporationDate || '2011-05-04'
  );
  const [miningOrLapidaryLicenseRef, setMiningOrLapidaryLicenseRef] = useState(
    matchedInvite?.miningOrLapidaryLicenseRef || 'ASFCMP-CH-2026-719'
  );
  const [beneficialOwnerFullName, setBeneficialOwnerFullName] = useState(
    matchedInvite?.beneficialOwnerFullName || 'Henri-Luc Vaucher (Managing Partner, 100% Equity)'
  );
  const [kimberleyProcessAttested, setKimberleyProcessAttested] = useState<boolean>(true);
  const [amlKycPolicyAttested, setAmlKycPolicyAttested] = useState<boolean>(true);
  const [treatmentDisclosureAttested, setTreatmentDisclosureAttested] = useState<boolean>(true);

  // Step 3: Tax Documentation & Treasury Banking
  const [taxIdType, setTaxIdType] = useState<'EIN' | 'VAT' | 'TIN' | 'SWISS_UID'>(
    matchedInvite?.taxIdType || 'SWISS_UID'
  );
  const [taxIdNumber, setTaxIdNumber] = useState(
    matchedInvite?.taxIdNumber || 'CHE-391.402.881 MWST'
  );
  const [taxFormClassification, setTaxFormClassification] = useState<
    'W-8BEN-E' | 'W-9' | 'OECD_CRS_SELF_CERT'
  >(matchedInvite?.taxFormClassification || 'OECD_CRS_SELF_CERT');
  const [taxDocumentRef, setTaxDocumentRef] = useState(
    matchedInvite?.taxDocumentRef || 'AFC-SWISS-UID-CERT-2026.pdf'
  );
  const [bankName, setBankName] = useState(
    matchedInvite?.bankName || 'UBS Switzerland AG (Geneva Corporate)'
  );
  const [beneficiaryName, setBeneficiaryName] = useState(
    matchedInvite?.beneficiaryName || 'Vaucher & Fils Haute Joaillerie SA'
  );
  const [ibanOrAccountNumber, setIbanOrAccountNumber] = useState(
    matchedInvite?.ibanOrAccountNumber || 'CH9300762011623852957'
  );
  const [swiftBicCode, setSwiftBicCode] = useState(
    matchedInvite?.swiftBicCode || 'UBSWCHZH80A'
  );
  const [settlementCurrency, setSettlementCurrency] = useState<'USD' | 'AED' | 'CHF'>(
    matchedInvite?.settlementCurrency || 'CHF'
  );

  // Sync form fields when inviteTokenInput matches an Admin invitation
  useEffect(() => {
    if (initialInviteToken && initialInviteToken !== inviteTokenInput) {
      setInviteTokenInput(initialInviteToken);
    }
  }, [initialInviteToken]);

  const handleLoadInviteRecord = (rec: VendorOnboardingSubmission) => {
    setInviteTokenInput(rec.inviteToken || rec.applicationId);
    setLegalBusinessName(rec.legalBusinessName);
    setDbaTradeName(rec.dbaTradeName || rec.legalBusinessName);
    setPrimaryContactName(rec.primaryContactName);
    setPrimaryContactEmail(rec.primaryContactEmail);
    setJurisdictionCountry(rec.jurisdictionCountry);
    setRegisteredAddress(
      rec.registeredAddress || `14 Vault Exchange District, ${rec.jurisdictionCountry}`
    );
    setPrimarySupplyCategory(rec.primarySupplyCategory || 'Gemstones');
    setEntityStructure(rec.entityStructure || 'Private Limited (Pvt Ltd)');
    setRegistrationNumber(rec.registrationNumber || 'REG-2026-88410');
    setIncorporationDate(rec.incorporationDate || '2019-06-15');
    setMiningOrLapidaryLicenseRef(rec.miningOrLapidaryLicenseRef || 'LIC-EXP-2026-901');
    setBeneficialOwnerFullName(rec.beneficialOwnerFullName || rec.primaryContactName);
    setTaxIdType(rec.taxIdType || 'TIN');
    setTaxIdNumber(rec.taxIdNumber || 'TIN-2026-994012');
    setTaxFormClassification(rec.taxFormClassification || 'W-8BEN-E');
    setTaxDocumentRef(rec.taxDocumentRef || 'W8BENE-SIGNED-2026.pdf');
    setBankName(rec.bankName || 'UBS Switzerland AG');
    setBeneficiaryName(rec.beneficiaryName || rec.legalBusinessName);
    setIbanOrAccountNumber(rec.ibanOrAccountNumber || 'CH9300762011623852957');
    setSwiftBicCode(rec.swiftBicCode || 'UBSWCHZH80A');
    setSettlementCurrency(rec.settlementCurrency || 'USD');
    setStepErrors([]);
    setSubmittedRecord(null);
  };

  const currentWizardData: VendorOnboardingWizardData = {
    legalBusinessName,
    dbaTradeName,
    primaryContactName,
    primaryContactEmail,
    jurisdictionCountry,
    registeredAddress,
    primarySupplyCategory,
    entityStructure,
    registrationNumber,
    incorporationDate,
    miningOrLapidaryLicenseRef,
    beneficialOwnerFullName,
    kimberleyProcessAttested,
    amlKycPolicyAttested,
    treatmentDisclosureAttested,
    taxIdType,
    taxIdNumber,
    taxFormClassification,
    taxDocumentRef,
    bankName,
    beneficiaryName,
    ibanOrAccountNumber,
    swiftBicCode,
    settlementCurrency,
  };

  const handleNextStep = () => {
    setStepErrors([]);
    if (!matchedInvite) {
      setStepErrors([
        'A valid Admin Invitation Token is required to proceed. Vendors can only be onboarded via an Admin-issued onboarding link.',
      ]);
      return;
    }

    if (activeStep === 1 || activeStep === 2 || activeStep === 3) {
      const check = validateVendorWizardStep(activeStep, currentWizardData);
      if (!check.ok) {
        setStepErrors(check.errors);
        return;
      }
      setActiveStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
    }
  };

  const handlePrevStep = () => {
    setStepErrors([]);
    setActiveStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStepErrors([]);

    if (!executiveSignOff) {
      setStepErrors([
        'Please confirm the Executive Officer Sign-Off attestation before submitting for Admin verification.',
      ]);
      return;
    }

    const result = completeVendorOnboardingWizard(submissions, {
      ...currentWizardData,
      inviteToken: inviteTokenInput,
    });

    if (!result.ok || !result.submission) {
      setStepErrors(result.errors);
      return;
    }

    onSubmissionsChange(result.updatedList);
    setSubmittedRecord(result.submission);
  };

  return (
    <div className="space-y-8" data-testid="vendor-onboarding-wizard">
      {/* Invitation-Only Governance Banner */}
      <section className="rounded-[20px] bg-[#1C1610] text-[#FAF3E3] border border-[#C5A059]/40 p-5 space-y-3 shadow-[0_14px_34px_rgba(26,20,14,0.12)]">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#E6C97A]">
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>Invitation-Only Supplier Provisioning · Admin Onboarding Link Required</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-normal text-white">
              Multi-Step Supplier KYB, Legal Entity &amp; Tax Onboarding Wizard
            </h1>
            <p className="text-xs text-[#D8CEBE]">
              Vendors cannot self-register publicly. An Administrator must create your supplier invitation in the{' '}
              <Link href="/admin/vendors?autostart=1" className="text-[#E6C97A] underline">
                Admin Console
              </Link>{' '}
              and share your onboarding link (<code className="font-mono text-xs text-[#E6C97A]">/vendor?invite=TOKEN</code>).
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
            <div>
              <label
                htmlFor="wizard-invite-token"
                className="block font-mono text-[10px] uppercase tracking-wider text-[#E6C97A] mb-1"
              >
                Admin Invitation Token
              </label>
              <input
                id="wizard-invite-token"
                data-testid="wizard-invite-token-input"
                type="text"
                value={inviteTokenInput}
                onChange={(e) => setInviteTokenInput(e.target.value)}
                placeholder="INV-MHG-2026-8841"
                className="w-44 rounded-[10px] border border-[#C5A059]/50 bg-white/10 px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <select
              aria-label="Load Admin-Invited Supplier Record"
              value={matchedInvite?.inviteToken || ''}
              onChange={(e) => {
                const found = findVendorInviteByToken(submissions, e.target.value);
                if (found) handleLoadInviteRecord(found);
              }}
              className="max-w-xs rounded-[10px] border border-[#C5A059]/40 bg-[#2A2118] px-3 py-1.5 text-xs font-mono text-[#E6C97A]"
            >
              <option value="" disabled>
                Switch Invited Supplier...
              </option>
              {submissions.map((sub) => (
                <option
                  key={sub.applicationId}
                  value={sub.inviteToken || sub.applicationId}
                >
                  {sub.inviteToken || sub.applicationId} · {sub.legalBusinessName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {matchedInvite ? (
          <div className="rounded-[14px] border border-[#C5A059]/30 bg-white/5 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-[#E6C97A]">
              Active Invitation: <strong>{matchedInvite.inviteToken || matchedInvite.applicationId}</strong> · Entity:{' '}
              <strong>{matchedInvite.legalBusinessName}</strong> ({matchedInvite.jurisdictionCountry})
            </span>
            <span className="text-[#D8CEBE]">
              Issued by Admin: {matchedInvite.invitedByAdmin || 'archivist@maihangems.com'} · Status: {matchedInvite.status}
            </span>
          </div>
        ) : (
          <div
            role="alert"
            className="rounded-[14px] border border-[#FECACA]/40 bg-[#991B1B]/30 px-4 py-2.5 text-xs font-mono text-[#FECACA]"
          >
            Token &ldquo;{inviteTokenInput}&rdquo; was not found. Select an invited supplier above or generate a new onboarding link in the Admin Console.
          </div>
        )}
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
                Onboarding Dossier {submittedRecord.applicationId} Submitted for Admin Verification
              </span>
            </div>
            <p className="text-xs text-[#166534]/90">
              {submittedRecord.legalBusinessName} ({submittedRecord.jurisdictionCountry}) has transitioned to{' '}
              <strong className="font-mono">{submittedRecord.status}</strong>. The Geneva Vault Archivist can now verify and approve your supplier status in the{' '}
              <Link href="/admin/vendors?autostart=1" className="underline font-semibold">
                Admin Console
              </Link>
              .
            </p>
          </div>
        )}

        {/* STEP 1: BUSINESS IDENTITY */}
        {activeStep === 1 && (
          <div className="space-y-5" data-testid="wizard-step-1-panel">
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                Step 1 of 4 · Business Identity
              </p>
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Supplier Corporate Identity &amp; Primary Supply Scope
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
                  DBA / Trading Atelier Name
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
                <label
                  htmlFor="wiz-supply-cat"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Primary Supply Category *
                </label>
                <select
                  id="wiz-supply-cat"
                  value={primarySupplyCategory}
                  onChange={(e) => setPrimarySupplyCategory(e.target.value as InventoryCategory)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                >
                  <option value="Gemstones">Loose Gemstones (Mine / Lapidary)</option>
                  <option value="Settings">Architectural Settings (Master Bench)</option>
                  <option value="Fine Jewellery">Finished Fine Jewellery (Haute Joaillerie)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="wiz-contact-name"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Primary Compliance Contact *
                </label>
                <input
                  id="wiz-contact-name"
                  type="text"
                  value={primaryContactName}
                  onChange={(e) => setPrimaryContactName(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-contact-email"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Corporate Contact Email *
                </label>
                <input
                  id="wiz-contact-email"
                  type="email"
                  value={primaryContactEmail}
                  onChange={(e) => setPrimaryContactEmail(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-country"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Jurisdiction Country *
                </label>
                <input
                  id="wiz-country"
                  type="text"
                  value={jurisdictionCountry}
                  onChange={(e) => setJurisdictionCountry(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="wiz-address"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Registered Corporate Street Address *
                </label>
                <input
                  id="wiz-address"
                  type="text"
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                data-testid="wizard-next-btn"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.16em] font-semibold cursor-pointer"
              >
                Continue to Step 2: Legal Entity Status
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LEGAL ENTITY STATUS */}
        {activeStep === 2 && (
          <div className="space-y-5" data-testid="wizard-step-2-panel">
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                Step 2 of 4 · Legal Entity Status &amp; Regulatory Compliance
              </p>
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Corporate Structure, Mining/Assay Licenses &amp; Beneficial Ownership
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="wiz-entity-struct"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Legal Entity Structure *
                </label>
                <select
                  id="wiz-entity-struct"
                  value={entityStructure}
                  onChange={(e) =>
                    setEntityStructure(e.target.value as LegalEntityStructure)
                  }
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                >
                  <option value="Société Anonyme (SA)">Société Anonyme (SA)</option>
                  <option value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</option>
                  <option value="Limited Liability Company (LLC)">
                    Limited Liability Company (LLC)
                  </option>
                  <option value="Mining & Lapidary Cooperative">
                    Mining &amp; Lapidary Cooperative
                  </option>
                  <option value="DMCC Free Zone Entity">DMCC Free Zone Entity</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="wiz-reg-number"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Corporate Registration Number *
                </label>
                <input
                  id="wiz-reg-number"
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-inc-date"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Date of Incorporation *
                </label>
                <input
                  id="wiz-inc-date"
                  type="date"
                  value={incorporationDate}
                  onChange={(e) => setIncorporationDate(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-license-ref"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Mining / Lapidary / Assay License Ref *
                </label>
                <input
                  id="wiz-license-ref"
                  type="text"
                  value={miningOrLapidaryLicenseRef}
                  onChange={(e) => setMiningOrLapidaryLicenseRef(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="wiz-ubo-name"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Ultimate Beneficial Owner (UBO &ge; 25% Equity) *
                </label>
                <input
                  id="wiz-ubo-name"
                  type="text"
                  value={beneficialOwnerFullName}
                  onChange={(e) => setBeneficialOwnerFullName(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/60 p-5 space-y-3 text-sm">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F] font-semibold">
                Mandatory Statutory &amp; Gemological Attestations
              </p>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kimberleyProcessAttested}
                  onChange={(e) => setKimberleyProcessAttested(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <strong>Kimberley Process &amp; OECD Provenance Warranty:</strong> All parcels originate from conflict-free, documented concessions with valid export permits.
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={amlKycPolicyAttested}
                  onChange={(e) => setAmlKycPolicyAttested(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <strong>Swiss AMLA / FATF Beneficial Ownership Disclosure:</strong> Corporate entity and beneficial owners comply with international anti-money-laundering statutes.
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={treatmentDisclosureAttested}
                  onChange={(e) => setTreatmentDisclosureAttested(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <strong>CIBJO Blue Book Treatment Disclosure Covenant:</strong> Full disclosure of any thermal, oil, or clarity enhancement prior to vault intake.
                </span>
              </label>
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
                Continue to Step 3: Tax &amp; Banking
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TAX DOCUMENTATION & SETTLEMENT BANKING */}
        {activeStep === 3 && (
          <div className="space-y-5" data-testid="wizard-step-3-panel">
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                Step 3 of 4 · Tax Documentation &amp; Settlement Banking
              </p>
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Tax Treaty Classification, Certificate Reference &amp; SWIFT/IBAN Coordinates
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="wiz-tax-type"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Tax Regime Type *
                </label>
                <select
                  id="wiz-tax-type"
                  value={taxIdType}
                  onChange={(e) =>
                    setTaxIdType(e.target.value as 'EIN' | 'VAT' | 'TIN' | 'SWISS_UID')
                  }
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                >
                  <option value="SWISS_UID">SWISS_UID (CHE MWST)</option>
                  <option value="VAT">VAT (EU / International VAT)</option>
                  <option value="EIN">EIN (US IRS Employer ID)</option>
                  <option value="TIN">TIN (Foreign Tax Identification)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="wiz-tax-id"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Tax Identification Number *
                </label>
                <input
                  id="wiz-tax-id"
                  type="text"
                  value={taxIdNumber}
                  onChange={(e) => setTaxIdNumber(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-tax-form"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Tax Treaty Form Classification *
                </label>
                <select
                  id="wiz-tax-form"
                  value={taxFormClassification}
                  onChange={(e) =>
                    setTaxFormClassification(
                      e.target.value as 'W-8BEN-E' | 'W-9' | 'OECD_CRS_SELF_CERT'
                    )
                  }
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                >
                  <option value="W-8BEN-E">W-8BEN-E (Foreign Entity Treaty Claim)</option>
                  <option value="W-9">W-9 (US Domestic Entity)</option>
                  <option value="OECD_CRS_SELF_CERT">
                    OECD_CRS_SELF_CERT (Swiss / EU CRS)
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="wiz-tax-doc"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Tax Certificate Dossier Filename / Ref *
                </label>
                <input
                  id="wiz-tax-doc"
                  type="text"
                  value={taxDocumentRef}
                  onChange={(e) => setTaxDocumentRef(e.target.value)}
                  placeholder="e.g. W8BENE-SIGNED-2026.pdf"
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-bank-name"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Settlement Bank Name *
                </label>
                <input
                  id="wiz-bank-name"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-beneficiary"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Account Beneficiary Name *
                </label>
                <input
                  id="wiz-beneficiary"
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-iban"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Settlement IBAN / Account Number *
                </label>
                <input
                  id="wiz-iban"
                  type="text"
                  value={ibanOrAccountNumber}
                  onChange={(e) => setIbanOrAccountNumber(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-swift"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Bank SWIFT / BIC Code *
                </label>
                <input
                  id="wiz-swift"
                  type="text"
                  value={swiftBicCode}
                  onChange={(e) => setSwiftBicCode(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-currency"
                  className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                >
                  Settlement Currency *
                </label>
                <select
                  id="wiz-currency"
                  value={settlementCurrency}
                  onChange={(e) =>
                    setSettlementCurrency(e.target.value as 'USD' | 'AED' | 'CHF')
                  }
                  className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3.5 py-2.5 text-sm font-mono"
                >
                  <option value="USD">USD — US Dollar Treasury Wire</option>
                  <option value="CHF">CHF — Swiss Franc SEPA/SIC</option>
                  <option value="AED">AED — Dubai DMCC Dirham Wire</option>
                </select>
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

        {/* STEP 4: FINAL REVIEW & SUBMISSION FOR ADMIN VERIFICATION */}
        {activeStep === 4 && (
          <form
            onSubmit={handleFinalSubmit}
            className="space-y-6"
            data-testid="wizard-step-4-panel"
          >
            <div className="border-b border-[#EFE5D1] pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8C6D2F]">
                Step 4 of 4 · Final Dossier Review &amp; Submission for Admin Verification
              </p>
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Verify Business Identity, Legal Entity Status &amp; Tax Credentials
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
                  <span className="text-[#6B5A45]">Category:</span> {primarySupplyCategory}
                </p>
                <p>
                  <span className="text-[#6B5A45]">Contact:</span> {primaryContactName} ({primaryContactEmail})
                </p>
                <p>
                  <span className="text-[#6B5A45]">Jurisdiction:</span> {jurisdictionCountry} · {registeredAddress}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/50 p-4 space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F] font-semibold">
                  2. Legal Entity Status
                </p>
                <p>
                  <span className="text-[#6B5A45]">Structure:</span>{' '}
                  <strong className="text-[#1A1612]">{entityStructure}</strong>
                </p>
                <p className="font-mono">
                  <span className="text-[#6B5A45]">Reg No:</span> {registrationNumber}
                </p>
                <p className="font-mono">
                  <span className="text-[#6B5A45]">Incorporated:</span> {incorporationDate}
                </p>
                <p className="font-mono">
                  <span className="text-[#6B5A45]">License Ref:</span> {miningOrLapidaryLicenseRef}
                </p>
                <p>
                  <span className="text-[#6B5A45]">UBO:</span> {beneficialOwnerFullName}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#E5D4B3] bg-[#FAF3E3]/50 p-4 space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F] font-semibold">
                  3. Tax &amp; Settlement Banking
                </p>
                <p className="font-mono">
                  <span className="text-[#6B5A45]">{taxIdType}:</span>{' '}
                  <strong className="text-[#1A1612]">{taxIdNumber}</strong>
                </p>
                <p className="font-mono">
                  <span className="text-[#6B5A45]">Tax Form:</span> {taxFormClassification} ({taxDocumentRef})
                </p>
                <p>
                  <span className="text-[#6B5A45]">Bank:</span> {bankName}
                </p>
                <p className="font-mono">
                  <span className="text-[#6B5A45]">IBAN:</span> {ibanOrAccountNumber}
                </p>
                <p className="font-mono">
                  <span className="text-[#6B5A45]">SWIFT:</span> {swiftBicCode} ({settlementCurrency})
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
                  <strong>Executive Sign-Off for Admin Verification:</strong> I certify under penalty of perjury that the business identity, legal entity registration, and tax treaty documentation submitted under invitation token{' '}
                  <code className="font-mono text-xs">{inviteTokenInput}</code> are accurate and authorized for review by the Maihan Gems Geneva Compliance &amp; Admin Team.
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
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.18em] font-semibold cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                Submit Dossier for Admin Verification →
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Submitted Supplier KYB & Tax Verification Ledger */}
      <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 space-y-4">
        <h2 className="text-2xl font-normal text-[#1A1612]">
          Supplier Onboarding &amp; Admin Verification Ledger
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                <th className="py-3 pr-4">Application &amp; Invite Token</th>
                <th className="py-3 pr-4">Legal Entity &amp; Structure</th>
                <th className="py-3 pr-4">Reg No. &amp; Tax ID</th>
                <th className="py-3 pr-4">License &amp; Tax Form</th>
                <th className="py-3 pr-4">IBAN / SWIFT</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">Compliance Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE5D1]">
              {submissions.map((sub) => (
                <tr key={sub.applicationId} className="hover:bg-[#FAF3E3]/40">
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-[#1A1612] block">
                      {sub.applicationId}
                    </span>
                    <span className="text-[11px] text-[#8C6D2F] block">
                      Token: {sub.inviteToken || 'ADMIN-DIRECT'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-sans">
                    <span className="font-semibold text-[#1A1612] block">
                      {sub.legalBusinessName}
                    </span>
                    <span className="text-xs text-[#5C4E3C]">
                      {sub.entityStructure || 'Corporate Entity'} · {sub.jurisdictionCountry}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="block">{sub.registrationNumber || 'Pending'}</span>
                    <span className="text-[11px] text-[#8C6D2F]">
                      {sub.taxIdType}: {sub.taxIdNumber || 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="block">{sub.miningOrLapidaryLicenseRef || 'Pending'}</span>
                    <span className="text-[11px] text-[#6B5A45]">
                      {sub.taxFormClassification} {sub.taxDocumentRef ? `· ${sub.taxDocumentRef}` : ''}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="block">{sub.ibanOrAccountNumber || 'Pending'}</span>
                    <span className="text-[11px] text-[#6B5A45]">{sub.swiftBicCode}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] uppercase ${
                        sub.status === 'VERIFIED_PARTNER'
                          ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                          : sub.status === 'ACTION_REQUIRED'
                          ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                          : 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3 font-sans text-xs text-[#4A3E2E] max-w-xs">
                    {sub.reviewerAuditNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
