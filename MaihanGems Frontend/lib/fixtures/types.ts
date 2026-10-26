export type Evidenced<T> = T | null;

export interface EvidencePlate {
  laboratory: string | null;
  reportNumber: string | null;
  reportDate: string | null;
  miningDistrict: string | null;
  refractiveIndex: string | null;
  pleochroism: string | null;
  fluorescence: string | null;
  specificGravity: string | null;
  dimensionsMm: string | null;
  cutGrade: string | null;
}

export interface GemstoneItem {
  id: string;
  sku: string;
  slug: string;
  name: string;
  variety: string;
  varietySlug: string;
  colourHue: string;
  colourSlug: string;
  carat: number;
  shape: 'Round' | 'Cushion' | 'Octagon' | 'Oval' | 'Pear' | 'Asscher' | 'Radiant' | 'Marquise';
  clarity: 'FL' | 'IF' | 'VVS1' | 'VVS2' | 'VSI' | 'VS1' | 'VS2' | 'SI1';
  treatmentDisclosed: string;
  origin: string;
  price: number; // Fixed from data only — never computed from weight in UI
  currency: 'USD';
  availability: 'IN_VAULT' | 'ON_MEMO' | 'RESERVED';
  isHeroAnchor?: boolean;
  images: string[];
  webarAssetId: string | null;
  lede: string;
  description: string;
  evidence: EvidencePlate;
}

export interface MatchedPairItem {
  id: string;
  sku: string;
  slug: string;
  name: string;
  variety: string;
  varietySlug: string;
  colourHue: string;
  colourSlug: string;
  totalCarat: number;
  eachCarat: [number, number];
  shape: 'Cushion' | 'Round' | 'Oval' | 'Pear' | 'Octagon';
  clarity: 'VVS1' | 'VVS2' | 'VSI' | 'VS1';
  treatmentDisclosed: string;
  origin: string;
  symmetryMatchToleranceMm: string | null;
  price: number;
  availability: 'IN_VAULT' | 'RESERVED';
  attachmentConstraint: 'EARRINGS_ONLY';
  images: string[];
  webarAssetId: string | null;
  lede: string;
  description: string;
  evidence: EvidencePlate;
}

export interface SettingMetalOption {
  code: 'PT950' | '18K_YG' | '18K_RG' | '18K_WG';
  label: string;
  hallmark: string | null;
  priceDelta: number;
}

export interface SettingItem {
  sku: string;
  slug: string;
  name: string;
  category: 'ring' | 'earrings' | 'pendant';
  style: string;
  basePrice: number;
  compatibleShapes: string[];
  acceptsPairsOnly: boolean;
  metals: SettingMetalOption[];
  sizes: string[];
  bandWidthMm: string | null;
  galleryHeightMm: string | null;
  originAtelier: string | null;
  images: string[];
  webarAssetId: string | null;
  lede: string;
  description: string;
}

export interface DyoConfigurationRecord {
  configurationCode: string;
  createdAt: string;
  stoneId: string;
  settingSku: string;
  metalCode: SettingMetalOption['code'];
  ringSize: string;
  engravingNote: string | null;
  bespokeBenchNote: string | null;
  estimatedCompletionWeeks: number | null;
  benchMasterAssigned: string | null;
}

export interface OrderLineItem {
  id: string;
  kind: 'gemstone' | 'pair' | 'setting' | 'dyo';
  sku: string;
  title: string;
  subtitle: string;
  price: number;
  quantity: number;
}

export interface OrderReadModel {
  orderId: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: {
    recipient: string;
    line1: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentStatus: 'PENDING_PAYMENT' | 'RECONCILED_PAID' | 'FAILED_VERIFICATION';
  paymentProviderNote: string;
  fulfillmentStatus: 'AWAITING_RECONCILIATION' | 'VAULT_INSPECTION' | 'DISPATCHED';
  items: OrderLineItem[];
  subtotal: number;
  insuredCourierFee: number;
  total: number;
}

export interface WebArAssetRecord {
  assetId: string;
  title: string;
  sku: string;
  kind: 'gemstone' | 'pair' | 'setting';
  cutGeometry: 'round' | 'cushion' | 'octagon' | 'oval' | 'solitaire-ring';
  primaryColorHex: string;
  secondaryColorHex: string;
  ior: number;
  caratOrScale: number;
  dimensionsMm: string;
  calibrationNote: string;
}

export interface EducationArticle {
  path: string[];
  slugKey: string;
  title: string;
  category: string;
  readingMinutes: number;
  updatedAt: string;
  lede: string;
  sections: { heading: string; body: string }[];
}

export interface BlogPost {
  slug: string;
  title: string;
  publishedAt: string;
  author: string;
  authorRole: string;
  category: string;
  lede: string;
  body: string[];
}

export interface SubpageContent {
  slug: string;
  title: string;
  kicker: string;
  lede: string;
  sections: { heading: string; body: string; facts?: { label: string; value: string | null }[] }[];
}

export interface ShowroomRecord {
  slug: string;
  city: string;
  name: string;
  address: string;
  hours: string;
  phone: string;
  vaultCapabilities: string[];
  securityProtocol: string;
  lede: string;
  description: string;
}

export interface SeoMetadataRecord {
  id: string;
  routePath: string;
  title: string;
  description: string;
  canonicalUrl: string;
  noindex: boolean;
  updatedAt: string;
}

export interface RedirectRuleRecord {
  id: string;
  sourcePath: string;
  destinationPath: string;
  statusCode: 301 | 302 | 307 | 308;
  createdAt: string;
  note: string;
}

export interface AiOpsJobRecord {
  jobId: string;
  queue: 'SPECTRAL_INDEX' | 'CERT_OCR_VERIFY' | 'WEBAR_MESH_BAKE' | 'SEO_LEDE_SYNC';
  targetSku: string;
  status: 'COMPLETED' | 'RUNNING' | 'DEAD_LETTER';
  attempts: number;
  lastError: string | null;
  updatedAt: string;
  auditNote: string | null;
}

export interface VendorListingRecord {
  lotId: string;
  parcelName: string;
  variety: string;
  originMine: string;
  caratWeight: number;
  disclosedTreatment: string;
  askingPriceUsd: number;
  inspectionState: 'LAB_INTAKE' | 'APPROVED_ON_MEMO' | 'REJECTED_UNDISCLOSED_TREATMENT';
  submittedAt: string;
}
