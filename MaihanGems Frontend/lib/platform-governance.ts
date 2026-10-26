export type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export interface PlatformUserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  authProvider: 'EMAIL_PASSWORD' | 'GOOGLE_OAUTH' | 'SSO_PASSKEY';
  verified: boolean;
  organization?: string;
  preferredSalon?: string;
  signedInAt: string;
}

export type InventoryCategory = 'Gemstones' | 'Settings' | 'Fine Jewellery';

export type InventoryApprovalStatus =
  | 'APPROVED_IN_VAULT'
  | 'PENDING_LAB_INTAKE'
  | 'REVISION_REQUESTED'
  | 'REJECTED_UNDISCLOSED_TREATMENT';

export interface PlatformInventoryItem {
  id: string;
  sku: string;
  title: string;
  category: InventoryCategory;
  subCategory: string;
  caratOrWeight: string;
  originOrAtelier: string;
  treatmentOrHallmark: string;
  priceUsd: number;
  vendorId: string;
  vendorName: string;
  status: InventoryApprovalStatus;
  image: string;
  updatedAt: string;
  reviewerNote?: string;
}

export type PaymentAuditStatus =
  | 'SETTLED'
  | 'ESCROW_HOLD'
  | 'PENDING_WIRE'
  | 'REFUNDED'
  | 'FLAGGED_COMPLIANCE';

export type PaymentTransactionDirection =
  | 'INBOUND_CUSTOMER_CAPTURE'
  | 'ESCROW_VAULT_HOLD'
  | 'OUTBOUND_VENDOR_PAYOUT'
  | 'REFUND_REVERSAL';

export interface PaymentAuditLogEntry {
  transactionId: string;
  timestamp: string;
  orderId: string;
  poNumber: string;
  customerId: string;
  vendorId: string;
  vendorName: string;
  vendorJurisdiction?: string;
  vendorSettlementRef?: string;
  stoneSku: string;
  direction: PaymentTransactionDirection;
  grossAmountUsd: number;
  platformCommissionUsd: number;
  netPayoutUsd: number;
  currency: 'USD' | 'AED' | 'CHF';
  paymentMethod: 'STRIPE_3DS_CARD' | 'SWIFT_TREASURY_WIRE' | 'ESCROW_VAULT_LEDGER';
  status: PaymentAuditStatus;
  referenceHash: string;
  actorEmail: string;
  auditNote: string;
}

export type VendorOnboardingStatus =
  | 'INVITED_PENDING_ONBOARDING'
  | 'VERIFIED_PARTNER'
  | 'PENDING_KYB_REVIEW'
  | 'UNDER_COMPLIANCE_AUDIT'
  | 'ACTION_REQUIRED';

export type LegalEntityStructure =
  | 'Société Anonyme (SA)'
  | 'Private Limited (Pvt Ltd)'
  | 'Limited Liability Company (LLC)'
  | 'Mining & Lapidary Cooperative'
  | 'DMCC Free Zone Entity';

export interface VendorOnboardingSubmission {
  applicationId: string;
  vendorId?: string;
  inviteToken?: string;
  invitedByAdmin?: string;
  invitedAt?: string;
  submittedAt: string;
  updatedAt: string;
  legalBusinessName: string;
  dbaTradeName: string;
  entityStructure?: LegalEntityStructure;
  incorporationDate?: string;
  registeredAddress?: string;
  primarySupplyCategory?: InventoryCategory;
  beneficialOwnerFullName?: string;
  registrationNumber: string;
  jurisdictionCountry: string;
  primaryContactName: string;
  primaryContactEmail: string;
  miningOrLapidaryLicenseRef: string;
  taxIdType: 'EIN' | 'VAT' | 'TIN' | 'SWISS_UID';
  taxIdNumber: string;
  taxFormClassification: 'W-8BEN-E' | 'W-9' | 'OECD_CRS_SELF_CERT';
  taxDocumentRef?: string;
  bankName: string;
  beneficiaryName: string;
  ibanOrAccountNumber: string;
  swiftBicCode: string;
  settlementCurrency: 'USD' | 'AED' | 'CHF';
  kimberleyProcessAttested: boolean;
  amlKycPolicyAttested: boolean;
  treatmentDisclosureAttested: boolean;
  status: VendorOnboardingStatus;
  reviewerAuditNote: string;
}

export interface VendorOnboardingWizardData {
  // Step 1: Business Identity
  legalBusinessName: string;
  dbaTradeName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  jurisdictionCountry: string;
  registeredAddress: string;
  primarySupplyCategory: InventoryCategory;
  // Step 2: Legal Entity Status
  entityStructure: LegalEntityStructure;
  registrationNumber: string;
  incorporationDate: string;
  miningOrLapidaryLicenseRef: string;
  beneficialOwnerFullName: string;
  kimberleyProcessAttested: boolean;
  amlKycPolicyAttested: boolean;
  treatmentDisclosureAttested: boolean;
  // Step 3: Tax Documentation & Settlement Banking
  taxIdType: 'EIN' | 'VAT' | 'TIN' | 'SWISS_UID';
  taxIdNumber: string;
  taxFormClassification: 'W-8BEN-E' | 'W-9' | 'OECD_CRS_SELF_CERT';
  taxDocumentRef: string;
  bankName: string;
  beneficiaryName: string;
  ibanOrAccountNumber: string;
  swiftBicCode: string;
  settlementCurrency: 'USD' | 'AED' | 'CHF';
}

export const ROLE_PRESET_ACCOUNTS: Record<UserRole, PlatformUserSession> = {
  CUSTOMER: {
    userId: 'USR-CLAIRE-8841',
    email: 'claire.moreau@geneva-private.ch',
    name: 'Claire Moreau',
    role: 'CUSTOMER',
    authProvider: 'EMAIL_PASSWORD',
    verified: true,
    preferredSalon: 'Geneva Flagship Salon',
    signedInAt: '2026-10-25T14:20:00Z',
  },
  VENDOR: {
    userId: 'VND-ARUSHA-01',
    email: 'consignment@arusha-lapidary.co.tz',
    name: 'Kassim Mbeki · Arusha Lapidary',
    role: 'VENDOR',
    authProvider: 'EMAIL_PASSWORD',
    verified: true,
    organization: 'Arusha Lapidary Cooperative Ltd.',
    preferredSalon: 'Geneva Vault Intake',
    signedInAt: '2026-10-25T15:05:00Z',
  },
  ADMIN: {
    userId: 'ADM-ARCHIVIST-01',
    email: 'archivist@maihangems.com',
    name: 'Dr. Aria Rostami · Chief Archivist',
    role: 'ADMIN',
    authProvider: 'SSO_PASSKEY',
    verified: true,
    organization: 'Maihan Gems Geneva Governance',
    preferredSalon: 'Geneva Flagship Salon',
    signedInAt: '2026-10-25T16:00:00Z',
  },
};

export const INITIAL_PLATFORM_INVENTORY: PlatformInventoryItem[] = [
  {
    id: 'INV-101',
    sku: 'MG-TZ-0131',
    title: '1.31 ct Violetish Blue Tanzanite',
    category: 'Gemstones',
    subCategory: 'Tanzanite · Round',
    caratOrWeight: '1.31 ct (6.82 × 6.85 mm)',
    originOrAtelier: 'Merelani Block D, Tanzania',
    treatmentOrHallmark: 'Heat-treated (Disclosed — SSEF)',
    priceUsd: 2480,
    vendorId: 'VND-ARUSHA-01',
    vendorName: 'Arusha Lapidary Cooperative',
    status: 'APPROVED_IN_VAULT',
    image: '/images/gems/tanzanite-gem.jpg',
    updatedAt: '2026-10-24T11:30:00Z',
    reviewerNote: 'Verified SSEF dossier #MG-LAB-2026-0131.',
  },
  {
    id: 'INV-102',
    sku: 'MG-SAP-0204',
    title: '2.04 ct Ratnapura Cornflower Blue Sapphire',
    category: 'Gemstones',
    subCategory: 'Sapphire · Cushion',
    caratOrWeight: '2.04 ct (7.64 × 6.58 mm)',
    originOrAtelier: 'Ratnapura, Sri Lanka (Ceylon)',
    treatmentOrHallmark: 'No Heat (Unheated — SSEF Certified)',
    priceUsd: 8950,
    vendorId: 'VND-RATNAPURA-02',
    vendorName: 'Ratnapura Corundum Syndicate',
    status: 'APPROVED_IN_VAULT',
    image: '/images/gems/sapphire-gem.jpg',
    updatedAt: '2026-10-24T09:15:00Z',
    reviewerNote: 'Intact rutile silk confirmed via darkfield microscopy.',
  },
  {
    id: 'INV-103',
    sku: 'VND-LOT-992',
    title: '3.15 ct Cushion Tanzanite (Merelani Block C)',
    category: 'Gemstones',
    subCategory: 'Tanzanite · Cushion',
    caratOrWeight: '3.15 ct (8.90 × 7.40 mm)',
    originOrAtelier: 'Tanzania (Merelani)',
    treatmentOrHallmark: 'Unheated (Pending XRF & Raman verification)',
    priceUsd: 6400,
    vendorId: 'VND-ARUSHA-01',
    vendorName: 'Arusha Lapidary Cooperative',
    status: 'PENDING_LAB_INTAKE',
    image: '/images/gems/tanzanite-gem.jpg',
    updatedAt: '2026-10-25T08:40:00Z',
    reviewerNote: 'Awaiting Geneva goniometer & UV-Vis spectroscopy intake.',
  },
  {
    id: 'INV-104',
    sku: 'SET-ARCH-SOL-01',
    title: 'Architectural Cathedral Solitaire Ring',
    category: 'Settings',
    subCategory: 'Ring Setting · Solitaire',
    caratOrWeight: 'PT950 / 18k Gold · 2.1 mm Band',
    originOrAtelier: 'Geneva Rue du Rhône Bench #4',
    treatmentOrHallmark: 'PT950 & Au750 Swiss Assay Hallmark',
    priceUsd: 1650,
    vendorId: 'VND-GENEVA-03',
    vendorName: 'Geneva Master Bench #4',
    status: 'APPROVED_IN_VAULT',
    image: '/images/gems/setting-ring.jpg',
    updatedAt: '2026-10-23T14:00:00Z',
    reviewerNote: 'Calibrated for round, oval, and cushion center stones.',
  },
  {
    id: 'INV-105',
    sku: 'SET-TRILOGY-TAPER-03',
    title: 'Tapered Baguette Atelier Ring Setting',
    category: 'Settings',
    subCategory: 'Ring Setting · Three-Stone',
    caratOrWeight: '0.36 ct tw F-VVS Baguettes · PT950',
    originOrAtelier: 'Paris Place Vendôme Partner Workshop',
    treatmentOrHallmark: 'Au750 / PT950 Hallmarked',
    priceUsd: 2890,
    vendorId: 'VND-GENEVA-03',
    vendorName: 'Geneva Master Bench #4',
    status: 'APPROVED_IN_VAULT',
    image: '/images/gems/setting-ring.jpg',
    updatedAt: '2026-10-22T17:20:00Z',
    reviewerNote: 'Side diamond baguettes matched for color and step symmetry.',
  },
  {
    id: 'INV-106',
    sku: 'MG-RG-0215',
    title: 'Elysian Diamond Ring',
    category: 'Fine Jewellery',
    subCategory: 'Finished Ring · Radiant Diamond',
    caratOrWeight: '2.15 ct D-VVS1 Type IIa Diamond',
    originOrAtelier: 'Botswana / Geneva Atelier',
    treatmentOrHallmark: 'None (GIA #GIA-2026-88215 · PT950)',
    priceUsd: 12800,
    vendorId: 'VND-GENEVA-03',
    vendorName: 'Geneva Master Bench #4',
    status: 'APPROVED_IN_VAULT',
    image: '/images/elysian-ring.jpg',
    updatedAt: '2026-10-23T19:10:00Z',
    reviewerNote: 'Flagship salon piece inspected and sealed.',
  },
  {
    id: 'INV-107',
    sku: 'MG-NK-0432',
    title: 'Verdant Drop Emerald Necklace',
    category: 'Fine Jewellery',
    subCategory: 'Finished Necklace · Emerald Drop',
    caratOrWeight: '4.32 ct Muzo Green Emerald · 18k Gold',
    originOrAtelier: 'Colombia / Geneva Atelier',
    treatmentOrHallmark: 'Minor Cedarwood Oil (F1 Disclosed · SSEF)',
    priceUsd: 18500,
    vendorId: 'VND-CHIVOR-04',
    vendorName: 'Bogotá & Chivor Emerald Guild',
    status: 'APPROVED_IN_VAULT',
    image: '/images/verdant-drop.jpg',
    updatedAt: '2026-10-24T12:00:00Z',
    reviewerNote: 'Accompanied by SSEF origin report and 45 cm solid 18k chain.',
  },
  {
    id: 'INV-108',
    sku: 'VND-LOT-974',
    title: '2.10 ct Octagon Emerald (Zambia)',
    category: 'Gemstones',
    subCategory: 'Emerald · Octagon',
    caratOrWeight: '2.10 ct (8.20 × 6.40 mm)',
    originOrAtelier: 'Kafubu, Zambia',
    treatmentOrHallmark: 'Rejected — Undisclosed synthetic polymer resin detected',
    priceUsd: 5100,
    vendorId: 'VND-ARUSHA-01',
    vendorName: 'Arusha Lapidary Cooperative',
    status: 'REJECTED_UNDISCLOSED_TREATMENT',
    image: '/images/gems/emerald-gem.jpg',
    updatedAt: '2026-10-20T16:45:00Z',
    reviewerNote: 'FTIR spectrum identified non-traditional polymer filler.',
  },
];

export const INITIAL_PAYMENT_AUDIT_LOGS: PaymentAuditLogEntry[] = [
  {
    transactionId: 'TXN-2026-88410',
    timestamp: '2026-10-25T14:32:18Z',
    orderId: 'ORD-2026-9011',
    poNumber: 'PO-MG-2026-441',
    customerId: 'USR-CLAIRE-8841',
    vendorId: 'VND-ARUSHA-01',
    vendorName: 'Arusha Lapidary Cooperative',
    vendorJurisdiction: 'Tanzania · Merelani Zone',
    vendorSettlementRef: 'CRDB / UBS · TZ59CRDB...2900',
    stoneSku: 'MG-TZ-0131',
    direction: 'INBOUND_CUSTOMER_CAPTURE',
    grossAmountUsd: 4480,
    platformCommissionUsd: 672,
    netPayoutUsd: 3808,
    currency: 'USD',
    paymentMethod: 'STRIPE_3DS_CARD',
    status: 'SETTLED',
    referenceHash: 'ch_3Q9xLm2eZvKYlo2C0941aBcD',
    actorEmail: 'system-treasury@maihangems.com',
    auditNote: '3D-Secure 2.2 customer payment captured and reconciled against Order ORD-2026-9011.',
  },
  {
    transactionId: 'TXN-2026-88414',
    timestamp: '2026-10-25T16:10:05Z',
    orderId: 'ORD-2026-9011',
    poNumber: 'PO-MG-2026-441',
    customerId: 'USR-CLAIRE-8841',
    vendorId: 'VND-ARUSHA-01',
    vendorName: 'Arusha Lapidary Cooperative',
    vendorJurisdiction: 'Tanzania · Merelani Zone',
    vendorSettlementRef: 'CRDB / UBS · TZ59CRDB...2900',
    stoneSku: 'MG-TZ-0131',
    direction: 'OUTBOUND_VENDOR_PAYOUT',
    grossAmountUsd: 2480,
    platformCommissionUsd: 298,
    netPayoutUsd: 2182,
    currency: 'USD',
    paymentMethod: 'SWIFT_TREASURY_WIRE',
    status: 'SETTLED',
    referenceHash: 'UETR-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    actorEmail: 'archivist@maihangems.com',
    auditNote: 'Net 15 vendor memo settlement released via Geneva UBS SWIFT wire after SSEF confirmation.',
  },
  {
    transactionId: 'TXN-2026-88422',
    timestamp: '2026-10-25T18:45:50Z',
    orderId: 'ORD-2026-9012',
    poNumber: 'PO-MG-2026-438',
    customerId: 'USR-TARIQ-7712',
    vendorId: 'VND-RATNAPURA-02',
    vendorName: 'Ratnapura Corundum Syndicate',
    vendorJurisdiction: 'Sri Lanka · Sabaragamuwa',
    vendorSettlementRef: 'Commercial Bank PLC · LK88CCEY...7102',
    stoneSku: 'MG-SAP-0204',
    direction: 'ESCROW_VAULT_HOLD',
    grossAmountUsd: 8950,
    platformCommissionUsd: 1074,
    netPayoutUsd: 7876,
    currency: 'USD',
    paymentMethod: 'ESCROW_VAULT_LEDGER',
    status: 'ESCROW_HOLD',
    referenceHash: 'ESC-2026-MG-9012-HOLD',
    actorEmail: 'archivist@maihangems.com',
    auditNote: 'Funds held in Swiss vault escrow pending 14-day client inspection window completion.',
  },
  {
    transactionId: 'TXN-2026-88429',
    timestamp: '2026-10-26T01:12:40Z',
    orderId: 'ORD-2026-9015',
    poNumber: 'PO-MG-2026-449',
    customerId: 'USR-ELENA-6409',
    vendorId: 'VND-ARUSHA-01',
    vendorName: 'Arusha Lapidary Cooperative',
    vendorJurisdiction: 'Tanzania · Merelani Zone',
    vendorSettlementRef: 'CRDB / UBS · TZ59CRDB...2900',
    stoneSku: 'MG-PAIR-SPN-0290',
    direction: 'OUTBOUND_VENDOR_PAYOUT',
    grossAmountUsd: 7600,
    platformCommissionUsd: 912,
    netPayoutUsd: 6688,
    currency: 'USD',
    paymentMethod: 'SWIFT_TREASURY_WIRE',
    status: 'PENDING_WIRE',
    referenceHash: 'UETR-7c4e1a90-88f1-4c22-a119-09e2f44b8821',
    actorEmail: 'consignment@arusha-lapidary.co.tz',
    auditNote: 'Queued for Friday Geneva treasury batch settlement (50% advance approved).',
  },
  {
    transactionId: 'TXN-2026-88391',
    timestamp: '2026-10-21T11:04:12Z',
    orderId: 'ORD-2026-8994',
    poNumber: 'PO-MG-2026-412',
    customerId: 'USR-MARCUS-3310',
    vendorId: 'VND-CHIVOR-04',
    vendorName: 'Bogotá & Chivor Emerald Guild',
    vendorJurisdiction: 'Colombia · Boyacá District',
    vendorSettlementRef: 'Bancolombia · CO890070...1029',
    stoneSku: 'VND-LOT-974',
    direction: 'REFUND_REVERSAL',
    grossAmountUsd: 5100,
    platformCommissionUsd: 0,
    netPayoutUsd: 0,
    currency: 'USD',
    paymentMethod: 'STRIPE_3DS_CARD',
    status: 'REFUNDED',
    referenceHash: 're_3Q8aKp2eZvKYlo2C0118zXyW',
    actorEmail: 'archivist@maihangems.com',
    auditNote: 'Full buyer refund issued prior to dispatch due to FTIR treatment disclosure mismatch.',
  },
];

export const INITIAL_VENDOR_ONBOARDING_SUBMISSIONS: VendorOnboardingSubmission[] = [
  {
    applicationId: 'KYB-2026-0104',
    vendorId: 'VND-ARUSHA-01',
    inviteToken: 'INV-MHG-2026-0104',
    invitedByAdmin: 'archivist@maihangems.com',
    invitedAt: '2026-10-15T08:00:00Z',
    submittedAt: '2026-10-18T09:30:00Z',
    updatedAt: '2026-10-19T14:15:00Z',
    legalBusinessName: 'Arusha Lapidary Cooperative Ltd.',
    dbaTradeName: 'Arusha Merelani Lapidary',
    entityStructure: 'Mining & Lapidary Cooperative',
    incorporationDate: '2014-03-19',
    registeredAddress: 'Plot 44, Sokoine Road, Arusha, Tanzania',
    primarySupplyCategory: 'Gemstones',
    beneficialOwnerFullName: 'Kassim Mbeki (Managing Director, 35% Cooperative Share)',
    registrationNumber: 'TZ-BRELA-1094821',
    jurisdictionCountry: 'Tanzania',
    primaryContactName: 'Kassim Mbeki',
    primaryContactEmail: 'consignment@arusha-lapidary.co.tz',
    miningOrLapidaryLicenseRef: 'TMC-EXP-2026-8841',
    taxIdType: 'TIN',
    taxIdNumber: '104-882-910',
    taxFormClassification: 'W-8BEN-E',
    taxDocumentRef: 'W8BENE-ARUSHA-2026-SIGNED.pdf',
    bankName: 'CRDB Bank Corporate / UBS Correspondent',
    beneficiaryName: 'Arusha Lapidary Cooperative Ltd.',
    ibanOrAccountNumber: 'TZ59CRDB01502948102900',
    swiftBicCode: 'CORUTZTZ',
    settlementCurrency: 'USD',
    kimberleyProcessAttested: true,
    amlKycPolicyAttested: true,
    treatmentDisclosureAttested: true,
    status: 'VERIFIED_PARTNER',
    reviewerAuditNote: 'Verified Tanzania Mining Commission export license and W-8BEN-E tax treaty dossier.',
  },
  {
    applicationId: 'KYB-2026-0119',
    vendorId: 'VND-RATNAPURA-02',
    inviteToken: 'INV-MHG-2026-0119',
    invitedByAdmin: 'archivist@maihangems.com',
    invitedAt: '2026-10-22T10:15:00Z',
    submittedAt: '2026-10-25T17:20:00Z',
    updatedAt: '2026-10-25T17:20:00Z',
    legalBusinessName: 'Ratnapura Heritage Gems (Pvt) Ltd.',
    dbaTradeName: 'Ratnapura Corundum Syndicate',
    entityStructure: 'Private Limited (Pvt Ltd)',
    incorporationDate: '2018-07-11',
    registeredAddress: '18 Gem Bourse Lane, Ratnapura 70000, Sri Lanka',
    primarySupplyCategory: 'Gemstones',
    beneficialOwnerFullName: 'Nalin Wijesinghe (68% Equity Holder)',
    registrationNumber: 'LK-ROC-PV88412',
    jurisdictionCountry: 'Sri Lanka',
    primaryContactName: 'Nalin Wijesinghe',
    primaryContactEmail: 'vault@ratnapuragems.lk',
    miningOrLapidaryLicenseRef: 'NGJA-SL-2026-4410',
    taxIdType: 'VAT',
    taxIdNumber: '114902841-7000',
    taxFormClassification: 'W-8BEN-E',
    taxDocumentRef: 'W8BENE-RATNAPURA-2026.pdf',
    bankName: 'Commercial Bank of Ceylon PLC',
    beneficiaryName: 'Ratnapura Heritage Gems (Pvt) Ltd.',
    ibanOrAccountNumber: 'LK88CCEY000192847102',
    swiftBicCode: 'CCEYLKLX',
    settlementCurrency: 'USD',
    kimberleyProcessAttested: true,
    amlKycPolicyAttested: true,
    treatmentDisclosureAttested: true,
    status: 'PENDING_KYB_REVIEW',
    reviewerAuditNote: 'Awaiting final admin sign-off on NGJA Sri Lanka export license.',
  },
  {
    applicationId: 'KYB-2026-8841',
    vendorId: 'VND-GENEVA-05',
    inviteToken: 'INV-MHG-2026-8841',
    invitedByAdmin: 'archivist@maihangems.com',
    invitedAt: '2026-10-26T06:30:00Z',
    submittedAt: '2026-10-26T06:30:00Z',
    updatedAt: '2026-10-26T06:30:00Z',
    legalBusinessName: 'Vaucher & Fils Haute Joaillerie SA',
    dbaTradeName: 'Atelier Vaucher Genève',
    entityStructure: 'Société Anonyme (SA)',
    incorporationDate: '2011-05-04',
    registeredAddress: 'Rue du Rhône 42, 1204 Genève, Switzerland',
    primarySupplyCategory: 'Settings',
    beneficialOwnerFullName: 'Henri-Luc Vaucher',
    registrationNumber: 'CHE-391.402.881',
    jurisdictionCountry: 'Switzerland',
    primaryContactName: 'Henri-Luc Vaucher',
    primaryContactEmail: 'compliance@vaucher-geneve.ch',
    miningOrLapidaryLicenseRef: 'ASFCMP-CH-2026-719',
    taxIdType: 'SWISS_UID',
    taxIdNumber: 'CHE-391.402.881 MWST',
    taxFormClassification: 'OECD_CRS_SELF_CERT',
    taxDocumentRef: 'AFC-SWISS-UID-CERT-2026.pdf',
    bankName: 'UBS Switzerland AG (Geneva Private Corporate)',
    beneficiaryName: 'Vaucher & Fils Haute Joaillerie SA',
    ibanOrAccountNumber: 'CH9300762011623852957',
    swiftBicCode: 'UBSWCHZH80A',
    settlementCurrency: 'CHF',
    kimberleyProcessAttested: true,
    amlKycPolicyAttested: true,
    treatmentDisclosureAttested: true,
    status: 'INVITED_PENDING_ONBOARDING',
    reviewerAuditNote: 'Admin onboarding invitation issued. Awaiting supplier 4-step wizard completion.',
  },
];

export function filterPaymentAuditLogs(
  logs: PaymentAuditLogEntry[],
  filters: {
    status?: string;
    direction?: string;
    vendorId?: string;
    paymentMethod?: string;
    query?: string;
  }
): PaymentAuditLogEntry[] {
  return logs.filter((entry) => {
    if (filters.status && filters.status !== 'ALL' && entry.status !== filters.status) {
      return false;
    }
    if (filters.direction && filters.direction !== 'ALL' && entry.direction !== filters.direction) {
      return false;
    }
    if (filters.vendorId && filters.vendorId !== 'ALL' && entry.vendorId !== filters.vendorId) {
      return false;
    }
    if (
      filters.paymentMethod &&
      filters.paymentMethod !== 'ALL' &&
      entry.paymentMethod !== filters.paymentMethod
    ) {
      return false;
    }
    if (filters.query && filters.query.trim().length > 0) {
      const q = filters.query.trim().toLowerCase();
      const haystack = [
        entry.transactionId,
        entry.timestamp,
        entry.orderId,
        entry.poNumber,
        entry.customerId,
        entry.vendorId,
        entry.vendorName,
        entry.vendorJurisdiction || '',
        entry.vendorSettlementRef || '',
        entry.stoneSku,
        entry.referenceHash,
        entry.auditNote,
        String(entry.grossAmountUsd),
        String(entry.netPayoutUsd),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function calculatePaymentLedgerMetrics(logs: PaymentAuditLogEntry[]): {
  totalSettledVolumeUsd: number;
  activeEscrowHoldUsd: number;
  pendingWirePayoutUsd: number;
  totalPlatformCommissionUsd: number;
  transactionCount: number;
} {
  let totalSettledVolumeUsd = 0;
  let activeEscrowHoldUsd = 0;
  let pendingWirePayoutUsd = 0;
  let totalPlatformCommissionUsd = 0;

  for (const log of logs) {
    if (log.status === 'SETTLED') {
      totalSettledVolumeUsd += log.grossAmountUsd;
      totalPlatformCommissionUsd += log.platformCommissionUsd;
    } else if (log.status === 'ESCROW_HOLD') {
      activeEscrowHoldUsd += log.grossAmountUsd;
    } else if (log.status === 'PENDING_WIRE') {
      pendingWirePayoutUsd += log.netPayoutUsd;
    }
  }

  return {
    totalSettledVolumeUsd,
    activeEscrowHoldUsd,
    pendingWirePayoutUsd,
    totalPlatformCommissionUsd,
    transactionCount: logs.length,
  };
}

export function createAdminVendorInvite(
  existingSubmissions: VendorOnboardingSubmission[],
  input: {
    legalBusinessName: string;
    primaryContactName: string;
    primaryContactEmail: string;
    jurisdictionCountry: string;
    primarySupplyCategory: InventoryCategory;
    invitedByAdmin: string;
  }
): {
  ok: boolean;
  error?: string;
  invite?: VendorOnboardingSubmission;
  inviteUrlPath?: string;
  updatedList: VendorOnboardingSubmission[];
} {
  if (!input.legalBusinessName || input.legalBusinessName.trim().length < 3) {
    return {
      ok: false,
      error: 'Legal business name is required (min 3 characters) to generate an onboarding invite.',
      updatedList: existingSubmissions,
    };
  }
  if (!input.primaryContactName || input.primaryContactName.trim().length < 2) {
    return {
      ok: false,
      error: 'Primary supplier contact name is required.',
      updatedList: existingSubmissions,
    };
  }
  if (
    !input.primaryContactEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.primaryContactEmail.trim())
  ) {
    return {
      ok: false,
      error: 'A valid supplier corporate email is required to issue an invitation link.',
      updatedList: existingSubmissions,
    };
  }
  if (!input.jurisdictionCountry || input.jurisdictionCountry.trim().length < 2) {
    return {
      ok: false,
      error: 'Jurisdiction country is required.',
      updatedList: existingSubmissions,
    };
  }

  const suffix = String(1000 + ((existingSubmissions.length * 173 + Date.now()) % 9000));
  const inviteToken = `INV-MHG-2026-${suffix}`;
  const nowIso = new Date().toISOString();

  const invite: VendorOnboardingSubmission = {
    applicationId: `KYB-2026-${suffix}`,
    vendorId: `VND-INV-${suffix}`,
    inviteToken,
    invitedByAdmin: input.invitedByAdmin.trim() || 'archivist@maihangems.com',
    invitedAt: nowIso,
    submittedAt: nowIso,
    updatedAt: nowIso,
    legalBusinessName: input.legalBusinessName.trim(),
    dbaTradeName: input.legalBusinessName.trim(),
    entityStructure: 'Private Limited (Pvt Ltd)',
    incorporationDate: '2020-01-15',
    registeredAddress: '',
    primarySupplyCategory: input.primarySupplyCategory,
    beneficialOwnerFullName: input.primaryContactName.trim(),
    registrationNumber: '',
    jurisdictionCountry: input.jurisdictionCountry.trim(),
    primaryContactName: input.primaryContactName.trim(),
    primaryContactEmail: input.primaryContactEmail.trim(),
    miningOrLapidaryLicenseRef: '',
    taxIdType: 'TIN',
    taxIdNumber: '',
    taxFormClassification: 'W-8BEN-E',
    taxDocumentRef: '',
    bankName: '',
    beneficiaryName: input.legalBusinessName.trim(),
    ibanOrAccountNumber: '',
    swiftBicCode: '',
    settlementCurrency: 'USD',
    kimberleyProcessAttested: false,
    amlKycPolicyAttested: false,
    treatmentDisclosureAttested: false,
    status: 'INVITED_PENDING_ONBOARDING',
    reviewerAuditNote: `Admin invitation link (${inviteToken}) generated by ${
      input.invitedByAdmin.trim() || 'archivist@maihangems.com'
    }. Awaiting supplier onboarding submission.`,
  };

  return {
    ok: true,
    invite,
    inviteUrlPath: `/vendor?invite=${inviteToken}`,
    updatedList: [invite, ...existingSubmissions],
  };
}

export function findVendorInviteByToken(
  submissions: VendorOnboardingSubmission[],
  token?: string | null
): VendorOnboardingSubmission | undefined {
  if (!token || !token.trim()) return undefined;
  const clean = token.trim().toUpperCase();
  return submissions.find(
    (sub) =>
      (sub.inviteToken && sub.inviteToken.toUpperCase() === clean) ||
      sub.applicationId.toUpperCase() === clean
  );
}

export function validateVendorWizardStep(
  step: 1 | 2 | 3,
  data: Partial<VendorOnboardingWizardData>
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (step === 1) {
    if (!data.legalBusinessName || data.legalBusinessName.trim().length < 3) {
      errors.push('Legal business name is required (minimum 3 characters).');
    }
    if (!data.primaryContactName || data.primaryContactName.trim().length < 2) {
      errors.push('Primary compliance officer name is required.');
    }
    if (
      !data.primaryContactEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.primaryContactEmail.trim())
    ) {
      errors.push('A valid corporate contact email address is required.');
    }
    if (!data.jurisdictionCountry || data.jurisdictionCountry.trim().length < 2) {
      errors.push('Jurisdiction / country of incorporation is required.');
    }
    if (!data.registeredAddress || data.registeredAddress.trim().length < 5) {
      errors.push('Registered corporate street address is required.');
    }
  } else if (step === 2) {
    if (!data.entityStructure) {
      errors.push('Legal entity structure selection is required.');
    }
    if (!data.registrationNumber || data.registrationNumber.trim().length < 4) {
      errors.push('Corporate registration number is required (minimum 4 characters).');
    }
    if (!data.incorporationDate || data.incorporationDate.trim().length < 4) {
      errors.push('Date of incorporation is required.');
    }
    if (!data.miningOrLapidaryLicenseRef || data.miningOrLapidaryLicenseRef.trim().length < 4) {
      errors.push('Mining, lapidary, or assay trade license reference is required.');
    }
    if (!data.beneficialOwnerFullName || data.beneficialOwnerFullName.trim().length < 3) {
      errors.push('Ultimate Beneficial Owner (UBO) declaration is required.');
    }
    if (
      !data.kimberleyProcessAttested ||
      !data.amlKycPolicyAttested ||
      !data.treatmentDisclosureAttested
    ) {
      errors.push(
        'All three statutory attestations (Kimberley Process, AML/KYC, and CIBJO Treatment Disclosure) must be checked.'
      );
    }
  } else if (step === 3) {
    if (!data.taxIdNumber || data.taxIdNumber.trim().length < 5) {
      errors.push('Valid Tax Identification Number (TIN / EIN / VAT / UID) is required.');
    }
    if (!data.taxDocumentRef || data.taxDocumentRef.trim().length < 4) {
      errors.push('Tax certificate or W-8BEN-E / W-9 document reference is required.');
    }
    if (!data.bankName || data.bankName.trim().length < 3) {
      errors.push('Settlement bank name is required.');
    }
    if (!data.ibanOrAccountNumber || data.ibanOrAccountNumber.trim().length < 8) {
      errors.push('Valid IBAN or corporate treasury account number is required (min 8 chars).');
    }
    if (!data.swiftBicCode || data.swiftBicCode.trim().length < 6) {
      errors.push('Valid SWIFT / BIC routing code is required (min 6 chars).');
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateVendorOnboardingInput(input: {
  legalBusinessName: string;
  registrationNumber: string;
  jurisdictionCountry: string;
  primaryContactName: string;
  primaryContactEmail: string;
  miningOrLapidaryLicenseRef: string;
  taxIdNumber: string;
  bankName: string;
  ibanOrAccountNumber: string;
  swiftBicCode: string;
  kimberleyProcessAttested: boolean;
  amlKycPolicyAttested: boolean;
  treatmentDisclosureAttested: boolean;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.legalBusinessName || input.legalBusinessName.trim().length < 3) {
    errors.push('Legal business name is required (minimum 3 characters).');
  }
  if (!input.registrationNumber || input.registrationNumber.trim().length < 4) {
    errors.push('Corporate registration number is required.');
  }
  if (!input.jurisdictionCountry || input.jurisdictionCountry.trim().length < 2) {
    errors.push('Country of incorporation is required.');
  }
  if (!input.primaryContactName || input.primaryContactName.trim().length < 2) {
    errors.push('Primary compliance contact name is required.');
  }
  if (
    !input.primaryContactEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.primaryContactEmail.trim())
  ) {
    errors.push('A valid business email address is required.');
  }
  if (!input.miningOrLapidaryLicenseRef || input.miningOrLapidaryLicenseRef.trim().length < 4) {
    errors.push('Mining or lapidary trade license reference is required.');
  }
  if (!input.taxIdNumber || input.taxIdNumber.trim().length < 5) {
    errors.push('Valid Tax Identification Number (TIN / EIN / VAT) is required.');
  }
  if (!input.bankName || input.bankName.trim().length < 3) {
    errors.push('Settlement bank name is required.');
  }
  if (!input.ibanOrAccountNumber || input.ibanOrAccountNumber.trim().length < 8) {
    errors.push('Valid IBAN or corporate bank account number is required (min 8 chars).');
  }
  if (!input.swiftBicCode || input.swiftBicCode.trim().length < 6) {
    errors.push('Valid SWIFT / BIC routing code is required.');
  }
  if (
    !input.kimberleyProcessAttested ||
    !input.amlKycPolicyAttested ||
    !input.treatmentDisclosureAttested
  ) {
    errors.push(
      'All mandatory compliance, AML/KYC, and CIBJO treatment disclosures must be attested.'
    );
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function completeVendorOnboardingWizard(
  existingSubmissions: VendorOnboardingSubmission[],
  payload: VendorOnboardingWizardData & { inviteToken: string }
): {
  ok: boolean;
  errors: string[];
  submission?: VendorOnboardingSubmission;
  updatedList: VendorOnboardingSubmission[];
} {
  if (!payload.inviteToken || !payload.inviteToken.trim()) {
    return {
      ok: false,
      errors: [
        'Admin Onboarding Invitation Token is required. Vendors can only be onboarded via an Admin invitation link.',
      ],
      updatedList: existingSubmissions,
    };
  }

  const invitedRecord = findVendorInviteByToken(existingSubmissions, payload.inviteToken);
  if (!invitedRecord) {
    return {
      ok: false,
      errors: [
        `Invalid or unrecognized Admin Invitation Token "${payload.inviteToken}". Please request a valid onboarding link from the Maihan Vault Administrator.`,
      ],
      updatedList: existingSubmissions,
    };
  }

  const step1 = validateVendorWizardStep(1, payload);
  const step2 = validateVendorWizardStep(2, payload);
  const step3 = validateVendorWizardStep(3, payload);
  const allErrors = [...step1.errors, ...step2.errors, ...step3.errors];

  if (allErrors.length > 0) {
    return {
      ok: false,
      errors: allErrors,
      updatedList: existingSubmissions,
    };
  }

  const nowIso = new Date().toISOString();
  const completed: VendorOnboardingSubmission = {
    ...invitedRecord,
    submittedAt: nowIso,
    updatedAt: nowIso,
    legalBusinessName: payload.legalBusinessName.trim(),
    dbaTradeName: payload.dbaTradeName.trim() || payload.legalBusinessName.trim(),
    entityStructure: payload.entityStructure,
    incorporationDate: payload.incorporationDate.trim(),
    registeredAddress: payload.registeredAddress.trim(),
    primarySupplyCategory: payload.primarySupplyCategory,
    beneficialOwnerFullName: payload.beneficialOwnerFullName.trim(),
    registrationNumber: payload.registrationNumber.trim(),
    jurisdictionCountry: payload.jurisdictionCountry.trim(),
    primaryContactName: payload.primaryContactName.trim(),
    primaryContactEmail: payload.primaryContactEmail.trim(),
    miningOrLapidaryLicenseRef: payload.miningOrLapidaryLicenseRef.trim(),
    taxIdType: payload.taxIdType,
    taxIdNumber: payload.taxIdNumber.trim(),
    taxFormClassification: payload.taxFormClassification,
    taxDocumentRef: payload.taxDocumentRef.trim(),
    bankName: payload.bankName.trim(),
    beneficiaryName: payload.beneficiaryName.trim() || payload.legalBusinessName.trim(),
    ibanOrAccountNumber: payload.ibanOrAccountNumber.trim(),
    swiftBicCode: payload.swiftBicCode.trim().toUpperCase(),
    settlementCurrency: payload.settlementCurrency,
    kimberleyProcessAttested: payload.kimberleyProcessAttested,
    amlKycPolicyAttested: payload.amlKycPolicyAttested,
    treatmentDisclosureAttested: payload.treatmentDisclosureAttested,
    status: 'PENDING_KYB_REVIEW',
    reviewerAuditNote: `Completed 4-step supplier onboarding wizard via Admin token ${invitedRecord.inviteToken}. Ready for Geneva Admin KYB & Tax verification.`,
  };

  const updatedList = existingSubmissions.map((item) =>
    item.applicationId === invitedRecord.applicationId ? completed : item
  );

  return {
    ok: true,
    errors: [],
    submission: completed,
    updatedList,
  };
}

export function validateInventorySubmission(input: {
  sku: string;
  title: string;
  category: InventoryCategory;
  caratOrWeight: string;
  originOrAtelier: string;
  treatmentOrHallmark: string;
  priceUsd: number;
}): { ok: boolean; error?: string } {
  if (!input.sku.trim() || input.sku.trim().length < 3) {
    return { ok: false, error: 'SKU / Parcel code is required (min 3 characters).' };
  }
  if (!input.title.trim() || input.title.trim().length < 4) {
    return { ok: false, error: 'Item title is required (min 4 characters).' };
  }
  if (!input.caratOrWeight.trim()) {
    return { ok: false, error: 'Carat weight or precious metal specification is required.' };
  }
  if (!input.originOrAtelier.trim()) {
    return { ok: false, error: 'Geological origin or atelier workshop is required.' };
  }
  if (!input.treatmentOrHallmark.trim()) {
    return { ok: false, error: 'Mandatory treatment disclosure or metal hallmark is required.' };
  }
  if (typeof input.priceUsd !== 'number' || Number.isNaN(input.priceUsd) || input.priceUsd <= 0) {
    return { ok: false, error: 'Price (USD) must be a positive number.' };
  }
  return { ok: true };
}

// Browser storage helpers for cross-portal reactivity
const STORAGE_KEYS = {
  SESSION: 'maihan_active_session_v1',
  INVENTORY: 'maihan_inventory_ledger_v1',
  PAYMENTS: 'maihan_payment_audit_v1',
  ONBOARDING: 'maihan_vendor_onboarding_v2',
} as const;

export function loadStoredSession(): PlatformUserSession {
  if (typeof window === 'undefined') return ROLE_PRESET_ACCOUNTS.CUSTOMER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return ROLE_PRESET_ACCOUNTS.CUSTOMER;
    return JSON.parse(raw) as PlatformUserSession;
  } catch {
    return ROLE_PRESET_ACCOUNTS.CUSTOMER;
  }
}

export function saveStoredSession(session: PlatformUserSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  } catch {
    // ignore storage quota errors
  }
}

export function loadStoredInventory(): PlatformInventoryItem[] {
  if (typeof window === 'undefined') return INITIAL_PLATFORM_INVENTORY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) return INITIAL_PLATFORM_INVENTORY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PLATFORM_INVENTORY;
  } catch {
    return INITIAL_PLATFORM_INVENTORY;
  }
}

export function saveStoredInventory(items: PlatformInventoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function loadStoredPaymentAuditLogs(): PaymentAuditLogEntry[] {
  if (typeof window === 'undefined') return INITIAL_PAYMENT_AUDIT_LOGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!raw) return INITIAL_PAYMENT_AUDIT_LOGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PAYMENT_AUDIT_LOGS;
  } catch {
    return INITIAL_PAYMENT_AUDIT_LOGS;
  }
}

export function saveStoredPaymentAuditLogs(logs: PaymentAuditLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function loadStoredVendorOnboarding(): VendorOnboardingSubmission[] {
  if (typeof window === 'undefined') return INITIAL_VENDOR_ONBOARDING_SUBMISSIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ONBOARDING);
    if (!raw) return INITIAL_VENDOR_ONBOARDING_SUBMISSIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_VENDOR_ONBOARDING_SUBMISSIONS;
  } catch {
    return INITIAL_VENDOR_ONBOARDING_SUBMISSIONS;
  }
}

export function saveStoredVendorOnboarding(submissions: VendorOnboardingSubmission[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(submissions));
  } catch {
    // ignore
  }
}
