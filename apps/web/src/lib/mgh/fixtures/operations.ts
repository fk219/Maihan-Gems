import type {
  OrderReadModel,
  SeoMetadataRecord,
  RedirectRuleRecord,
  AiOpsJobRecord,
  VendorListingRecord,
} from './types';

export const INITIAL_ORDERS: Record<string, OrderReadModel> = {
  'ORD-2026-9012': {
    orderId: 'ORD-2026-9012',
    createdAt: '2026-10-23T04:12:00Z',
    customerEmail: 'claire.moreau@example.ch',
    customerName: 'Claire Moreau',
    shippingAddress: {
      recipient: 'Claire Moreau',
      line1: ' Avenue de Champel 24',
      city: 'Genève',
      postalCode: '1206',
      country: 'Switzerland',
    },
    paymentStatus: 'PENDING_PAYMENT',
    paymentProviderNote:
      'Awaiting bank wire / simulated escrow settlement reconciliation. Vault hold active for 48 hours.',
    fulfillmentStatus: 'AWAITING_RECONCILIATION',
    items: [
      {
        id: 'MG-TZ-0131',
        kind: 'gemstone',
        sku: 'MG-TZ-0131',
        title: '1.31 ct Violetish Blue Tanzanite',
        subtitle: 'Round · VSI · Tanzania · Heat-treated (Disclosed)',
        price: 2480,
        quantity: 1,
      },
    ],
    subtotal: 2480,
    insuredCourierFee: 0,
    total: 2480,
  },
  'ORD-2026-8410': {
    orderId: 'ORD-2026-8410',
    createdAt: '2026-10-14T16:40:00Z',
    customerEmail: 'claire.moreau@example.ch',
    customerName: 'Claire Moreau',
    shippingAddress: {
      recipient: 'Claire Moreau',
      line1: 'Avenue de Champel 24',
      city: 'Genève',
      postalCode: '1206',
      country: 'Switzerland',
    },
    paymentStatus: 'RECONCILED_PAID',
    paymentProviderNote: 'Wire settlement verified by Geneva Treasury (#CH-994120).',
    fulfillmentStatus: 'DISPATCHED',
    items: [
      {
        id: 'MG-SAP-0174',
        kind: 'gemstone',
        sku: 'MG-SAP-0174',
        title: '1.74 ct Montana Oceanic Teal Sapphire',
        subtitle: 'Round · VS1 · Montana, USA',
        price: 4350,
        quantity: 1,
      },
      {
        id: 'SET-ARCH-SOL-01',
        kind: 'setting',
        sku: 'SET-ARCH-SOL-01',
        title: 'Architectural Cathedral Solitaire Ring (PT950, Size 6.0)',
        subtitle: 'Platinum 950 · Geneva Bench #4',
        price: 2000,
        quantity: 1,
      },
    ],
    subtotal: 6350,
    insuredCourierFee: 0,
    total: 6350,
  },
};

export const ACCOUNT_FIXTURE = {
  user: {
    id: 'USR-MG-019',
    name: 'Claire Moreau',
    email: 'claire.moreau@example.ch',
    phone: '+41 79 441 82 10',
    preferredSalon: 'Geneva Flagship Salon',
    memberSince: '2024-05-12',
    verificationCodeExpected: '842910',
  },
  addresses: [
    {
      id: 'ADDR-01',
      label: 'Primary Residence (Insured Signature Required)',
      recipient: 'Claire Moreau',
      line1: 'Avenue de Champel 24',
      city: 'Genève',
      postalCode: '1206',
      country: 'Switzerland',
      isDefault: true,
    },
    {
      id: 'ADDR-02',
      label: 'Zurich Office Hold',
      recipient: 'Claire Moreau',
      line1: 'Bahnhofstrasse 64',
      city: 'Zürich',
      postalCode: '8001',
      country: 'Switzerland',
      isDefault: false,
    },
  ],
  notifications: [
    {
      id: 'NOTIF-01',
      date: '2026-10-23',
      title: 'Order ORD-2026-9012 Pending Payment Reconciliation',
      body: 'Specimen MG-TZ-0131 is reserved in our Geneva vault pending settlement confirmation.',
      read: false,
    },
    {
      id: 'NOTIF-02',
      date: '2026-10-20',
      title: 'Saved Configuration DYO-MG-8841 Logged',
      body: 'Your custom Platinum 950 Cathedral Solitaire with 1.31 ct Tanzanite is saved for 30 days.',
      read: true,
    },
  ],
};

export const INITIAL_SEO_METADATA: SeoMetadataRecord[] = [
  {
    id: 'SEO-01',
    routePath: '/',
    title: 'Maihan Gems — Fine Gemstone Maison',
    description:
      'Provenance-evidenced loose gemstones, matched earring pairs, architectural settings, and bespoke jewellery configuration.',
    canonicalUrl: 'https://maihangems.example.com/',
    noindex: false,
    updatedAt: '2026-10-22T12:00:00Z',
  },
  {
    id: 'SEO-02',
    routePath: '/product/merelani-violetish-blue-tanzanite-1-31ct',
    title: '1.31 ct Violetish Blue Tanzanite (MG-TZ-0131) | Maihan Gems',
    description:
      'Anchor parcel MG-TZ-0131: a 1.31 ct round brilliant violetish blue tanzanite from Merelani Block D, graded VSI clarity with disclosed thermal enhancement.',
    canonicalUrl:
      'https://maihangems.example.com/product/merelani-violetish-blue-tanzanite-1-31ct',
    noindex: false,
    updatedAt: '2026-10-22T12:15:00Z',
  },
  {
    id: 'SEO-03',
    routePath: '/checkout/order-summary',
    title: 'Order Summary — Checkout | Maihan Gems',
    description: 'Review vault selection and insured shipping details.',
    canonicalUrl: 'https://maihangems.example.com/checkout/order-summary',
    noindex: true,
    updatedAt: '2026-10-20T09:00:00Z',
  },
];

export const INITIAL_REDIRECT_RULES: RedirectRuleRecord[] = [
  {
    id: 'RED-01',
    sourcePath: '/catalogue/tanzanite',
    destinationPath: '/varieties/tanzanite',
    statusCode: 301,
    createdAt: '2026-09-01',
    note: 'Legacy taxonomy migration to /varieties/[varietySlug]',
  },
  {
    id: 'RED-02',
    sourcePath: '/earring-pairs',
    destinationPath: '/pairs',
    statusCode: 308,
    createdAt: '2026-09-14',
    note: 'Permanent canonical consolidation for matched pairs',
  },
  {
    id: 'RED-03',
    sourcePath: '/custom-ring-builder',
    destinationPath: '/design-your-own',
    statusCode: 302,
    createdAt: '2026-10-01',
    note: 'Temporary campaign vanity route',
  },
];

export const INITIAL_NAVIGATION_CONFIG = {
  header: [
    { id: 'nav-1', label: 'Gemstones', href: '/browse', group: 'header' },
    { id: 'nav-2', label: 'Varieties', href: '/varieties', group: 'header' },
    { id: 'nav-3', label: 'Matched Pairs', href: '/pairs', group: 'header' },
    { id: 'nav-4', label: 'Settings', href: '/settings', group: 'header' },
    { id: 'nav-5', label: 'Design Your Own', href: '/design-your-own', group: 'header' },
  ],
  megaMenuColumns: [
    {
      title: 'By Variety',
      links: [
        { label: 'Merelani Tanzanite', href: '/varieties/tanzanite' },
        { label: 'Ceylon & Montana Sapphire', href: '/varieties/sapphire' },
        { label: 'Colombian & Panjshir Emerald', href: '/varieties/emerald' },
        { label: 'Mogok & Montepuez Ruby', href: '/varieties/ruby' },
        { label: 'Mahenge & Luc Yen Spinel', href: '/varieties/spinel' },
      ],
    },
    {
      title: 'By Spectral Hue',
      links: [
        { label: 'Violetish Blue', href: '/colour/violet-blue' },
        { label: 'Royal & Cornflower Blue', href: '/colour/blue' },
        { label: 'Muzo & Tsavo Green', href: '/colour/green' },
        { label: 'Crimson & Pigeon Blood', href: '/colour/red' },
        { label: 'Padparadscha & Mahenge Pink', href: '/colour/pink-orange' },
      ],
    },
    {
      title: 'Bespoke & Mountings',
      links: [
        { label: 'Matched Pairs (Earrings Only)', href: '/pairs' },
        { label: 'Architectural Settings', href: '/settings' },
        { label: 'Jewellery & Mountings Index', href: '/jewellery' },
        { label: 'Design Your Own Configurator', href: '/design-your-own' },
        { label: '3D WebAR Optical Studio', href: '/ar/webar-tz-0131' },
      ],
    },
  ],
  footer: [
    { label: 'Education Hub', href: '/education' },
    { label: 'Gemological Journal', href: '/blog' },
    { label: 'About the Maison', href: '/about' },
    { label: 'Showrooms & Vaults', href: '/showrooms' },
    { label: 'Financing', href: '/financing' },
    { label: 'Protection Plan', href: '/protection-plan' },
    { label: 'Shipping & Returns', href: '/policy/shipping-and-returns' },
    { label: 'Treatment Disclosure', href: '/policy/treatment-disclosure' },
  ],
};

export const INITIAL_AI_OPS_JOBS: AiOpsJobRecord[] = [
  {
    jobId: 'JOB-AI-9921',
    queue: 'CERT_OCR_VERIFY',
    targetSku: 'MG-TZ-0131',
    status: 'COMPLETED',
    attempts: 1,
    lastError: null,
    updatedAt: '2026-10-23T03:10:00Z',
    auditNote: 'Verified SSEF/Maihan dossier fields against Evidence Plate schema.',
  },
  {
    jobId: 'JOB-AI-9924',
    queue: 'WEBAR_MESH_BAKE',
    targetSku: 'MG-RUB-0152',
    status: 'DEAD_LETTER',
    attempts: 3,
    lastError: 'Goniometer facet table scan missing pavilion azimuth angle on frame 14.',
    updatedAt: '2026-10-23T04:05:00Z',
    auditNote: null,
  },
  {
    jobId: 'JOB-AI-9928',
    queue: 'SEO_LEDE_SYNC',
    targetSku: 'MG-SAP-0204',
    status: 'RUNNING',
    attempts: 1,
    lastError: null,
    updatedAt: '2026-10-23T05:18:00Z',
    auditNote: 'Syncing generateMetadata description from verified product lede.',
  },
  {
    jobId: 'JOB-AI-9930',
    queue: 'SPECTRAL_INDEX',
    targetSku: 'MG-EM-0262',
    status: 'DEAD_LETTER',
    attempts: 3,
    lastError: 'UV-Vis spectrum CSV checksum mismatch from Khenj intake batch.',
    updatedAt: '2026-10-23T04:50:00Z',
    auditNote: null,
  },
];

export const INITIAL_AI_OPS_LOGS: string[] = [
  '[2026-10-23T05:18:02Z] INFO  queue=SEO_LEDE_SYNC job=JOB-AI-9928 sku=MG-SAP-0204 Derived meta description (122 chars) from fixture lede.',
  '[2026-10-23T04:50:19Z] ERROR queue=SPECTRAL_INDEX job=JOB-AI-9930 sku=MG-EM-0262 Moved to DEAD_LETTER after 3 attempts: UV-Vis checksum mismatch.',
  '[2026-10-23T04:05:44Z] ERROR queue=WEBAR_MESH_BAKE job=JOB-AI-9924 sku=MG-RUB-0152 Moved to DEAD_LETTER: missing pavilion azimuth angle.',
  '[2026-10-23T03:10:11Z] INFO  queue=CERT_OCR_VERIFY job=JOB-AI-9921 sku=MG-TZ-0131 Evidence Plate verified (10/10 fields matched).',
];

export const VENDOR_LISTINGS: VendorListingRecord[] = [
  {
    lotId: 'VND-LOT-401',
    parcelName: 'Merelani Block D Rough & Preform Single',
    variety: 'Tanzanite',
    originMine: 'Merelani Hills, Tanzania',
    caratWeight: 1.31,
    disclosedTreatment: 'Heat-treated (Disclosed)',
    askingPriceUsd: 1650,
    inspectionState: 'APPROVED_ON_MEMO',
    submittedAt: '2026-10-01',
  },
  {
    lotId: 'VND-LOT-405',
    parcelName: 'Ratnapura Alluvial Unheated Cushion',
    variety: 'Sapphire',
    originMine: 'Ratnapura, Sri Lanka',
    caratWeight: 2.04,
    disclosedTreatment: 'No Heat (Unheated)',
    askingPriceUsd: 10200,
    inspectionState: 'APPROVED_ON_MEMO',
    submittedAt: '2026-10-08',
  },
  {
    lotId: 'VND-LOT-409',
    parcelName: 'Panjshir Khenj Dry Crystal Cushion',
    variety: 'Emerald',
    originMine: 'Panjshir Valley, Afghanistan',
    caratWeight: 2.62,
    disclosedTreatment: 'No Oil (Untreated)',
    askingPriceUsd: 15800,
    inspectionState: 'LAB_INTAKE',
    submittedAt: '2026-10-19',
  },
  {
    lotId: 'VND-LOT-412',
    parcelName: 'Ruby Oval Lot #19 (Undisclosed Lead-Glass Composite)',
    variety: 'Ruby',
    originMine: 'Unverified',
    caratWeight: 3.45,
    disclosedTreatment: 'Claimed Heated Only (Failed XRF Lead-Glass Screening)',
    askingPriceUsd: 4200,
    inspectionState: 'REJECTED_UNDISCLOSED_TREATMENT',
    submittedAt: '2026-10-21',
  },
];

export const VENDOR_ORDERS = [
  {
    poNumber: 'PO-MG-2026-118',
    vendorName: 'Arusha Mineral Cooperative Ltd.',
    stoneSku: 'MG-TZ-0131',
    settlementAmountUsd: 1650,
    paymentTerms: 'Net 15 post-SSEF verification',
    status: 'SETTLED',
    date: '2026-10-15',
  },
  {
    poNumber: 'PO-MG-2026-124',
    vendorName: 'Ratnapura Crown Lapidaries',
    stoneSku: 'MG-SAP-0204',
    settlementAmountUsd: 10200,
    paymentTerms: 'Consignment Memo — Settles upon client reconciliation',
    status: 'ACTIVE_MEMO',
    date: '2026-10-18',
  },
];
