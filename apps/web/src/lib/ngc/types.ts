export type NgcKind = 'loose_stone' | 'stone_pair' | 'setting' | 'jewelry' | 'dyo_composite';

export type FitStatus = 'fits' | 'needs_review' | 'incompatible';

export interface NgcMediaItem {
  readonly kind: string;
  readonly order: number;
  readonly url?: string | null;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly sourceType?: number | null;
  readonly pastCreation?: boolean;
  readonly localPath?: string | null;
  readonly fileName?: string | null;
  readonly thumbnail?: string | null;
  readonly variants?: { small?: string; medium?: string; full?: string } | null;
  readonly urlPattern?: string | null;
  readonly framesCount?: number | null;
  readonly cloudinaryPublicId?: string | null;
  readonly cloudinaryResourceType?: 'image' | 'video' | 'raw' | null;
  readonly secureUrl?: string | null;
}

export interface NgcStoneSpec {
  readonly stoneType: string | null;
  readonly stoneSubType: string | null;
  readonly weightCt: number | null;
  readonly lengthMm: number | null;
  readonly widthMm: number | null;
  readonly depthMm: number | null;
  readonly shape: string | null;
  readonly cut: string | null;
  readonly cuttingStyle: string | null;
  readonly color: string | null;
  readonly colorIntensity: string | null;
  readonly clarity: string | null;
  readonly enhancement: string | null;
  readonly origin: string | null;
  readonly lab: string | null;
  readonly labColor: string | null;
  readonly isStar: boolean;
  readonly starAppearance: string | null;
  readonly pricePerCt: number | null;
}

export interface NgcProduct extends NgcStoneSpec {
  readonly id: string;
  readonly kind: NgcKind;
  readonly category: string | null;
  readonly subcategory: string | null;
  readonly parentSubcategory: string | null;
  readonly title: string;
  readonly slug: string;
  readonly path: string;
  readonly listingPath: string | null;
  readonly sourceUrl: string | null;
  readonly priceUsd: number;
  readonly discountPriceUsd: number | null;
  readonly bankWirePriceUsd: number | null;
  readonly availability: string;
  readonly availabilityCode: number;
  readonly descriptionHtml: string;
  readonly seoTitle: string | null;
  readonly breadcrumbs: readonly { name: string; path: string | null }[];
  readonly detailsTable: readonly { label: string; values: readonly string[] }[];
  readonly colorCategories: readonly string[];
  readonly styles: readonly string[];
  readonly metals: readonly { code?: string; name?: string }[];
  readonly metalName: string | null;
  readonly metalCode: string | null;
  readonly pairStones: readonly NgcStoneSpec[];
  readonly centerStones: readonly NgcStoneSpec[];
  readonly sideStones: readonly NgcStoneSpec[];
  readonly dyoEnabled: boolean;
  readonly gemologistSuggestions: boolean;
  readonly interestCount: number;
  readonly shipDaysMin: number | null;
  readonly shipDaysMax: number | null;
  readonly estimatedShipDate: string | null;
  readonly settingType: string | null;
  readonly jewelryType: string | null;
  readonly ringSizes: unknown;
  readonly chainLength: number | string | null;
  readonly chainIncluded: boolean | null;
  readonly engravingMax: number | null;
  readonly vedicSetting: boolean;
  readonly containsVideo360: boolean;
  readonly containsSarin: boolean;
  readonly contains3D: boolean;
  readonly threeDFilePath: string | null;
  readonly sarinPath: string | null;
  readonly media: readonly NgcMediaItem[];
  readonly spin: { framesCount: number; urlPattern: string | null } | null;
  readonly settingRef: string | null;
  readonly stoneRef: string | null;
}

export interface NgcGemType {
  readonly name: string;
  readonly slug: string;
  readonly parent: string | null;
  readonly urls: { loose?: string; pairs?: string; rings?: string };
  readonly children: readonly string[];
}

export interface NgcTaxonomy {
  readonly roots: readonly { id: string; name: string; slug: string; all?: string; pairs?: string }[];
  readonly gemstones: readonly NgcGemType[];
  readonly colors: readonly { name: string; slug: string; loose: string | null; pairs: string | null; rings: string | null }[];
  readonly settings: readonly { name: string; path: string | null; styles: readonly { name: string; query: unknown }[] }[];
  readonly jewellery: readonly { name: string; path: string | null; styles: readonly { name: string; query: unknown }[] }[];
}

export interface StorefrontBrand {
  readonly slug: string;
  readonly name: string;
  readonly pathPrefix: string;
  readonly defaultStone: string | null;
  readonly wordmark: string;
  readonly kicker: string;
  readonly lede: string;
}
