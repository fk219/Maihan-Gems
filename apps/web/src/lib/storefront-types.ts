export interface SettingAcceptRule {
  shape: string;
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
  vendorName: string | null;
  certificateLab: string | null;
}

export interface SettingForDyo extends StorefrontCard {
  accepts: SettingAcceptRule[];
}
