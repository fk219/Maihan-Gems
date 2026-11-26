// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_PAYMENT_AUDIT_LOGS,
  INITIAL_PLATFORM_INVENTORY,
  INITIAL_VENDOR_ONBOARDING_SUBMISSIONS,
  ROLE_PRESET_ACCOUNTS,
  calculatePaymentLedgerMetrics,
  completeVendorOnboardingWizard,
  createAdminVendorInvite,
  filterPaymentAuditLogs,
  findVendorInviteByToken,
  validateInventorySubmission,
  validateVendorOnboardingInput,
  validateVendorWizardStep,
} from '../platform-governance';

test('ROLE_PRESET_ACCOUNTS defines Customer, Vendor, and Admin sessions', () => {
  assert.equal(ROLE_PRESET_ACCOUNTS.CUSTOMER.role, 'CUSTOMER');
  assert.equal(ROLE_PRESET_ACCOUNTS.VENDOR.role, 'VENDOR');
  assert.equal(ROLE_PRESET_ACCOUNTS.ADMIN.role, 'ADMIN');
});

test('filterPaymentAuditLogs filters by status, vendorId, paymentMethod, and search query', () => {
  const settledOnly = filterPaymentAuditLogs(INITIAL_PAYMENT_AUDIT_LOGS, {
    status: 'SETTLED',
  });
  assert.equal(settledOnly.length, 2);
  assert.ok(settledOnly.every((entry) => entry.status === 'SETTLED'));

  const arushaOnly = filterPaymentAuditLogs(INITIAL_PAYMENT_AUDIT_LOGS, {
    vendorId: 'VND-ARUSHA-01',
  });
  assert.equal(arushaOnly.length, 3);

  const wireOnly = filterPaymentAuditLogs(INITIAL_PAYMENT_AUDIT_LOGS, {
    paymentMethod: 'SWIFT_TREASURY_WIRE',
  });
  assert.equal(wireOnly.length, 2);

  const byOrderQuery = filterPaymentAuditLogs(INITIAL_PAYMENT_AUDIT_LOGS, {
    query: 'ORD-2026-9012',
  });
  assert.equal(byOrderQuery.length, 1);
  assert.equal(byOrderQuery[0].transactionId, 'TXN-2026-88422');
});

test('calculatePaymentLedgerMetrics computes accurate settled, escrow, and pending wire totals', () => {
  const metrics = calculatePaymentLedgerMetrics(INITIAL_PAYMENT_AUDIT_LOGS);
  assert.equal(metrics.transactionCount, 5);
  assert.equal(metrics.totalSettledVolumeUsd, 4480 + 2480);
  assert.equal(metrics.activeEscrowHoldUsd, 8950);
  assert.equal(metrics.pendingWirePayoutUsd, 6688);
  assert.equal(metrics.totalPlatformCommissionUsd, 672 + 298);
});

test('createAdminVendorInvite creates an invited vendor record with unique inviteToken and onboarding link', () => {
  const bad = createAdminVendorInvite(INITIAL_VENDOR_ONBOARDING_SUBMISSIONS, {
    legalBusinessName: 'A',
    primaryContactName: '',
    primaryContactEmail: 'bad-email',
    jurisdictionCountry: '',
    primarySupplyCategory: 'Gemstones',
    invitedByAdmin: 'archivist@maihangems.com',
  });
  assert.equal(bad.ok, false);

  const res = createAdminVendorInvite(INITIAL_VENDOR_ONBOARDING_SUBMISSIONS, {
    legalBusinessName: 'Kashmir Sapphire Consortium Ltd.',
    primaryContactName: 'Zafar Dar',
    primaryContactEmail: 'zafar@kashmir-sapphire.org',
    jurisdictionCountry: 'Switzerland',
    primarySupplyCategory: 'Gemstones',
    invitedByAdmin: 'archivist@maihangems.com',
  });
  assert.equal(res.ok, true);
  assert.ok(res.invite?.inviteToken?.startsWith('INV-MHG-2026-'));
  assert.equal(res.invite?.status, 'INVITED_PENDING_ONBOARDING');
  assert.ok(res.inviteUrlPath?.startsWith('/vendor?invite=INV-MHG-2026-'));

  const found = findVendorInviteByToken(res.updatedList, res.invite?.inviteToken);
  assert.equal(found?.legalBusinessName, 'Kashmir Sapphire Consortium Ltd.');
});

test('validateVendorWizardStep and completeVendorOnboardingWizard enforce Admin invite token and 3-step validation', () => {
  const step1Bad = validateVendorWizardStep(1, {
    legalBusinessName: 'AB',
    primaryContactName: '',
    primaryContactEmail: 'invalid',
    jurisdictionCountry: '',
    registeredAddress: '',
  });
  assert.equal(step1Bad.ok, false);
  assert.equal(step1Bad.errors.length, 5);

  const withoutToken = completeVendorOnboardingWizard(INITIAL_VENDOR_ONBOARDING_SUBMISSIONS, {
    inviteToken: 'NON-EXISTENT-TOKEN',
    legalBusinessName: 'Vaucher & Fils Haute Joaillerie SA',
    dbaTradeName: 'Atelier Vaucher Genève',
    primaryContactName: 'Henri-Luc Vaucher',
    primaryContactEmail: 'compliance@vaucher-geneve.ch',
    jurisdictionCountry: 'Switzerland',
    registeredAddress: 'Rue du Rhône 42, 1204 Genève, Switzerland',
    primarySupplyCategory: 'Settings',
    entityStructure: 'Société Anonyme (SA)',
    registrationNumber: 'CHE-391.402.881',
    incorporationDate: '2011-05-04',
    miningOrLapidaryLicenseRef: 'ASFCMP-CH-2026-719',
    beneficialOwnerFullName: 'Henri-Luc Vaucher',
    kimberleyProcessAttested: true,
    amlKycPolicyAttested: true,
    treatmentDisclosureAttested: true,
    taxIdType: 'SWISS_UID',
    taxIdNumber: 'CHE-391.402.881 MWST',
    taxFormClassification: 'OECD_CRS_SELF_CERT',
    taxDocumentRef: 'AFC-SWISS-UID-CERT-2026.pdf',
    bankName: 'UBS Switzerland AG',
    beneficiaryName: 'Vaucher & Fils Haute Joaillerie SA',
    ibanOrAccountNumber: 'CH9300762011623852957',
    swiftBicCode: 'UBSWCHZH80A',
    settlementCurrency: 'CHF',
  });
  assert.equal(withoutToken.ok, false);

  const validSubmission = completeVendorOnboardingWizard(INITIAL_VENDOR_ONBOARDING_SUBMISSIONS, {
    inviteToken: 'INV-MHG-2026-8841',
    legalBusinessName: 'Vaucher & Fils Haute Joaillerie SA',
    dbaTradeName: 'Atelier Vaucher Genève',
    primaryContactName: 'Henri-Luc Vaucher',
    primaryContactEmail: 'compliance@vaucher-geneve.ch',
    jurisdictionCountry: 'Switzerland',
    registeredAddress: 'Rue du Rhône 42, 1204 Genève, Switzerland',
    primarySupplyCategory: 'Settings',
    entityStructure: 'Société Anonyme (SA)',
    registrationNumber: 'CHE-391.402.881',
    incorporationDate: '2011-05-04',
    miningOrLapidaryLicenseRef: 'ASFCMP-CH-2026-719',
    beneficialOwnerFullName: 'Henri-Luc Vaucher (100% Equity)',
    kimberleyProcessAttested: true,
    amlKycPolicyAttested: true,
    treatmentDisclosureAttested: true,
    taxIdType: 'SWISS_UID',
    taxIdNumber: 'CHE-391.402.881 MWST',
    taxFormClassification: 'OECD_CRS_SELF_CERT',
    taxDocumentRef: 'AFC-SWISS-UID-CERT-2026.pdf',
    bankName: 'UBS Switzerland AG',
    beneficiaryName: 'Vaucher & Fils Haute Joaillerie SA',
    ibanOrAccountNumber: 'CH9300762011623852957',
    swiftBicCode: 'UBSWCHZH80A',
    settlementCurrency: 'CHF',
  });
  assert.equal(validSubmission.ok, true);
  assert.equal(validSubmission.submission?.status, 'PENDING_KYB_REVIEW');
});

test('validateVendorOnboardingInput enforces required business, tax, bank, and compliance fields', () => {
  const invalid = validateVendorOnboardingInput({
    legalBusinessName: 'AB',
    registrationNumber: '',
    jurisdictionCountry: '',
    primaryContactName: '',
    primaryContactEmail: 'invalid-email',
    miningOrLapidaryLicenseRef: '',
    taxIdNumber: '12',
    bankName: '',
    ibanOrAccountNumber: '123',
    swiftBicCode: '12',
    kimberleyProcessAttested: false,
    amlKycPolicyAttested: true,
    treatmentDisclosureAttested: true,
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.length >= 6);
});

test('validateInventorySubmission validates Gemstones, Settings, and Fine Jewellery entries', () => {
  assert.equal(INITIAL_PLATFORM_INVENTORY.length >= 6, true);

  const badPrice = validateInventorySubmission({
    sku: 'MG-RUB-0301',
    title: '3.01 ct Burmese Ruby',
    category: 'Gemstones',
    caratOrWeight: '3.01 ct',
    originOrAtelier: 'Mogok, Myanmar',
    treatmentOrHallmark: 'No Heat (GRS Certified)',
    priceUsd: 0,
  });
  assert.equal(badPrice.ok, false);

  const goodItem = validateInventorySubmission({
    sku: 'MG-RUB-0301',
    title: '3.01 ct Burmese Ruby',
    category: 'Gemstones',
    caratOrWeight: '3.01 ct',
    originOrAtelier: 'Mogok, Myanmar',
    treatmentOrHallmark: 'No Heat (GRS Certified)',
    priceUsd: 16400,
  });
  assert.equal(goodItem.ok, true);
});
