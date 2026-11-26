export interface SettingAcceptRule {
  /** Accepted seat shape; null/undefined = any shape (not evidenced per design). */
  shape: string | null;
  minCarat: number | null;
  maxCarat: number | null;
}

export interface StorefrontCard {
  id: string;
  sku: string;
  slug: string;
  title: string;
  kind: 'gemstone' | 'jewelry' | 'setting';
  description: string | null;
  priceUsd: number;
  stoneType: string | null;
  variety: string | null;
  caratTotal: number | null;
  shape: string | null;
  colorHue: string | null;
  originCountry: string | null;
  treatment: string | null;
  quantityType: string | null;
  jewelryType: string | null;
  settingFor: string | null;
  style: string[] | null;
  metalType: string | null;
  metalColor: string | null;
  imageUrl: string | null;
  hoverImageUrl?: string | null;
  vendorName: string | null;
  certificateLab: string | null;
  colorIntensity?: string | null;
  clarity?: string | null;
  cut?: string | null;
  cuttingStyle?: string | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  availability?: string | null;
}

export interface SettingForDyo extends StorefrontCard {
  accepts: SettingAcceptRule[];
  /** M5 (DYOJ port): real seams carried for the applet configurator —
   *  design identity, style descriptor, the SETTING-variant SKU the DYO
   *  create API resolves, and the row's metal descriptor. Null = the row
   *  does not evidence it (never substituted). */
  designCode?: string | null;
  styleCode?: string | null;
  styleLabel?: string | null;
  variantSku?: string | null;
  metalCode?: string | null;
  metalLabel?: string | null;
  metalColour?: string | null;
}
