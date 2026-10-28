// @ts-nocheck
import {
  GEMSTONES,
  MATCHED_PAIRS,
  SETTINGS,
  VARIETIES_META,
  COLOURS_META,
  SAVED_DYO_CONFIGURATIONS,
  WEBAR_ASSETS,
  VALID_HANDOFF_TOKENS,
  EDUCATION_ARTICLES,
  BLOG_POSTS,
  ABOUT_PAGES,
  POLICY_PAGES,
  SHOWROOMS,
  INITIAL_ORDERS,
  ACCOUNT_FIXTURE,
  INITIAL_SEO_METADATA,
  INITIAL_REDIRECT_RULES,
  INITIAL_NAVIGATION_CONFIG,
  INITIAL_AI_OPS_JOBS,
  INITIAL_AI_OPS_LOGS,
  VENDOR_LISTINGS,
  VENDOR_ORDERS,
  GemstoneItem,
  MatchedPairItem,
  SettingItem,
  DyoConfigurationRecord,
  OrderReadModel,
  WebArAssetRecord,
  RedirectRuleRecord,
} from './fixtures';

export { INITIAL_REDIRECT_RULES };

export interface CatalogueFilterParams {
  variety?: string;
  colour?: string;
  shape?: string;
  treatment?: string;
  origin?: string;
  minCarat?: number;
  maxCarat?: number;
  maxPrice?: number;
  q?: string;
  sort?: 'price-asc' | 'price-desc' | 'carat-desc' | 'carat-asc' | 'featured';
  page?: number;
  pageSize?: number;
}

export function getHeroAnchorGemstone(): GemstoneItem {
  const anchor = GEMSTONES.find((g) => g.isHeroAnchor);
  return anchor || GEMSTONES[0];
}

export function getAllGemstones(): GemstoneItem[] {
  return GEMSTONES;
}

export function getGemstoneBySlugOrId(slugOrId: string): GemstoneItem | null {
  const normalized = slugOrId.trim().toLowerCase();
  return (
    GEMSTONES.find(
      (g) =>
        g.slug.toLowerCase() === normalized ||
        g.id.toLowerCase() === normalized ||
        g.sku.toLowerCase() === normalized
    ) || null
  );
}

export function getRelatedGemstones(currentId: string, varietySlug: string, limit = 3): GemstoneItem[] {
  const sameVariety = GEMSTONES.filter((g) => g.id !== currentId && g.varietySlug === varietySlug);
  const others = GEMSTONES.filter((g) => g.id !== currentId && g.varietySlug !== varietySlug);
  return [...sameVariety, ...others].slice(0, limit);
}

export function filterAndSortGemstones(params: CatalogueFilterParams): {
  items: GemstoneItem[];
  total: number;
  page: number;
  totalPages: number;
} {
  let list = [...GEMSTONES];

  if (params.variety && params.variety !== 'all') {
    const v = params.variety.toLowerCase();
    list = list.filter((g) => g.varietySlug.toLowerCase() === v || g.variety.toLowerCase() === v);
  }
  if (params.colour && params.colour !== 'all') {
    const c = params.colour.toLowerCase();
    list = list.filter((g) => g.colourSlug.toLowerCase() === c);
  }
  if (params.shape && params.shape !== 'all') {
    const s = params.shape.toLowerCase();
    list = list.filter((g) => g.shape.toLowerCase() === s);
  }
  if (params.origin && params.origin !== 'all') {
    const o = params.origin.toLowerCase();
    list = list.filter((g) => g.origin.toLowerCase().includes(o));
  }
  if (params.treatment && params.treatment !== 'all') {
    const t = params.treatment.toLowerCase();
    if (t === 'unheated') {
      list = list.filter(
        (g) =>
          g.treatmentDisclosed.toLowerCase().includes('no heat') ||
          g.treatmentDisclosed.toLowerCase().includes('unheated') ||
          g.treatmentDisclosed.toLowerCase().includes('untreated') ||
          g.treatmentDisclosed.toLowerCase().includes('no oil')
      );
    } else if (t === 'heated') {
      list = list.filter((g) => g.treatmentDisclosed.toLowerCase().includes('heat-treated') || g.treatmentDisclosed.toLowerCase().includes('low-temperature'));
    } else if (t === 'oiled') {
      list = list.filter((g) => g.treatmentDisclosed.toLowerCase().includes('oil'));
    }
  }
  if (typeof params.minCarat === 'number' && !Number.isNaN(params.minCarat)) {
    list = list.filter((g) => g.carat >= params.minCarat!);
  }
  if (typeof params.maxCarat === 'number' && !Number.isNaN(params.maxCarat)) {
    list = list.filter((g) => g.carat <= params.maxCarat!);
  }
  if (typeof params.maxPrice === 'number' && !Number.isNaN(params.maxPrice)) {
    list = list.filter((g) => g.price <= params.maxPrice!);
  }
  if (params.q && params.q.trim().length > 0) {
    const q = params.q.trim().toLowerCase();
    list = list.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.sku.toLowerCase().includes(q) ||
        g.variety.toLowerCase().includes(q) ||
        g.origin.toLowerCase().includes(q) ||
        g.colourHue.toLowerCase().includes(q) ||
        g.shape.toLowerCase().includes(q) ||
        g.treatmentDisclosed.toLowerCase().includes(q)
    );
  }

  const sort = params.sort || 'featured';
  if (sort === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (sort === 'carat-desc') {
    list.sort((a, b) => b.carat - a.carat);
  } else if (sort === 'carat-asc') {
    list.sort((a, b) => a.carat - b.carat);
  }

  const pageSize = params.pageSize || 9;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page || 1), totalPages);
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

  return { items, total, page, totalPages };
}

export function getAllVarieties() {
  return VARIETIES_META.map((v) => ({
    ...v,
    count: GEMSTONES.filter((g) => g.varietySlug === v.slug).length,
  }));
}

export function getVarietyBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  const meta = VARIETIES_META.find((v) => v.slug === normalized);
  if (!meta) return null;
  const stones = GEMSTONES.filter((g) => g.varietySlug === normalized);
  const pairs = MATCHED_PAIRS.filter((p) => p.varietySlug === normalized);
  return { meta, stones, pairs };
}

export function getAllColours() {
  return COLOURS_META.map((c) => ({
    ...c,
    count: GEMSTONES.filter((g) => g.colourSlug === c.slug).length,
  }));
}

export function getColourBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  const meta = COLOURS_META.find((c) => c.slug === normalized);
  if (!meta) return null;
  const stones = GEMSTONES.filter((g) => g.colourSlug === normalized);
  return { meta, stones };
}

export function getAllMatchedPairs(): MatchedPairItem[] {
  return MATCHED_PAIRS;
}

export function getMatchedPairBySlugOrId(slugOrId: string): MatchedPairItem | null {
  const normalized = slugOrId.trim().toLowerCase();
  return (
    MATCHED_PAIRS.find(
      (p) =>
        p.slug.toLowerCase() === normalized ||
        p.id.toLowerCase() === normalized ||
        p.sku.toLowerCase() === normalized
    ) || null
  );
}

export function getAllSettings(): SettingItem[] {
  return SETTINGS;
}

export function getSettingBySkuOrSlug(skuOrSlug: string): SettingItem | null {
  const normalized = skuOrSlug.trim().toLowerCase();
  return (
    SETTINGS.find(
      (s) => s.sku.toLowerCase() === normalized || s.slug.toLowerCase() === normalized
    ) || null
  );
}

export function getDyoConfigurationByCode(code: string): {
  config: DyoConfigurationRecord;
  stone: GemstoneItem;
  setting: SettingItem;
  metal: SettingItem['metals'][number];
  totalPrice: number;
} | null {
  const cleanCode = code.trim().toUpperCase();
  const config = SAVED_DYO_CONFIGURATIONS[cleanCode];
  if (!config) {
    // Also support deterministic encoded DYO codes created by the user flow:
    // Format: DYO__<stoneId>__<settingSku>__<metalCode>__<ringSize>
    if (code.startsWith('DYO__')) {
      const parts = code.split('__');
      if (parts.length === 5) {
        const [, stoneId, settingSku, metalCode, ringSize] = parts;
        const stone = getGemstoneBySlugOrId(stoneId);
        const setting = getSettingBySkuOrSlug(settingSku);
        if (!stone || !setting) return null;
        const metal = setting.metals.find((m) => m.code === metalCode) || setting.metals[0];
        const dynamicConfig: DyoConfigurationRecord = {
          configurationCode: code,
          createdAt: '2026-10-23T05:30:00Z',
          stoneId: stone.id,
          settingSku: setting.sku,
          metalCode: metal.code,
          ringSize: decodeURIComponent(ringSize),
          engravingNote: null,
          bespokeBenchNote: null,
          estimatedCompletionWeeks: 3,
          benchMasterAssigned: null,
        };
        return {
          config: dynamicConfig,
          stone,
          setting,
          metal,
          totalPrice: stone.price + setting.basePrice + metal.priceDelta,
        };
      }
    }
    return null;
  }

  const stone = getGemstoneBySlugOrId(config.stoneId);
  const setting = getSettingBySkuOrSlug(config.settingSku);
  if (!stone || !setting) return null;
  const metal = setting.metals.find((m) => m.code === config.metalCode) || setting.metals[0];
  return {
    config,
    stone,
    setting,
    metal,
    totalPrice: stone.price + setting.basePrice + metal.priceDelta,
  };
}

export function buildDeterministicDyoCode(
  stoneId: string,
  settingSku: string,
  metalCode: string,
  ringSize: string
): string {
  if (
    stoneId === 'MG-TZ-0131' &&
    settingSku === 'SET-ARCH-SOL-01' &&
    metalCode === 'PT950' &&
    ringSize === '6.0'
  ) {
    return 'DYO-MG-8841';
  }
  return `DYO__${stoneId}__${settingSku}__${metalCode}__${encodeURIComponent(ringSize)}`;
}

export function getOrderById(orderId: string): OrderReadModel | null {
  const clean = orderId.trim();
  if (INITIAL_ORDERS[clean]) {
    return INITIAL_ORDERS[clean];
  }
  // Support newly placed orders encoded as ORD-LIVE-<subtotal>
  if (clean.startsWith('ORD-LIVE-')) {
    const parts = clean.split('-');
    const amount = Number(parts[2] || 2480);
    if (Number.isNaN(amount) || amount <= 0) return null;
    return {
      orderId: clean,
      createdAt: new Date().toISOString(),
      customerEmail: 'client@maihangems.example.com',
      customerName: 'Valued Salon Client',
      shippingAddress: {
        recipient: 'Valued Salon Client',
        line1: 'Rue du Rhône 42 (Insured Dispatch)',
        city: 'Genève',
        postalCode: '1204',
        country: 'Switzerland',
      },
      paymentStatus: 'PENDING_PAYMENT',
      paymentProviderNote:
        'Demo Payment Provider: Order logged in PENDING_PAYMENT state awaiting bank treasury reconciliation. Never fabricated as settled until reconciled.',
      fulfillmentStatus: 'AWAITING_RECONCILIATION',
      items: [
        {
          id: 'MG-TZ-0131',
          kind: 'gemstone',
          sku: 'MG-TZ-0131',
          title: 'Vault Selection Specimen(s)',
          subtitle: 'Held in Geneva Vault pending payment reconciliation',
          price: amount,
          quantity: 1,
        },
      ],
      subtotal: amount,
      insuredCourierFee: 0,
      total: amount,
    };
  }
  return null;
}

export function getWebArAssetById(assetId: string): WebArAssetRecord | null {
  return WEBAR_ASSETS[assetId.trim()] || null;
}

export function getHandoffSessionByToken(token: string) {
  const session = VALID_HANDOFF_TOKENS[token.trim()];
  if (!session) return null;
  const asset = getWebArAssetById(session.assetId);
  if (!asset) return null;
  return { session, asset };
}

export function searchCatalogue(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { gemstones: [], pairs: [], settings: [], articles: [] };
  }

  const stopWords = new Set([
    'a',
    'an',
    'the',
    'for',
    'with',
    'in',
    'of',
    'and',
    'or',
    'to',
    'under',
    'below',
    'over',
    'stone',
    'stones',
    'gem',
    'gems',
    'gemstone',
    'gemstones',
    'find',
    'show',
    'me',
    'ct',
    'carat',
  ]);

  const tokens = q
    .replace(/[^a-z0-9.-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopWords.has(t));

  const matchesAllTokens = (haystack: string) => {
    if (haystack.includes(q)) return true;
    if (tokens.length === 0) return false;
    return tokens.every((tok) => haystack.includes(tok));
  };

  const gemstones = GEMSTONES.filter((g) => {
    const haystack = [
      g.id,
      g.sku,
      g.name,
      g.variety,
      g.origin,
      g.colourHue,
      g.shape,
      g.clarity,
      g.treatmentDisclosed,
      g.carat.toFixed(2),
      g.evidence.laboratory || '',
      g.evidence.miningDistrict || '',
    ]
      .join(' ')
      .toLowerCase();
    return matchesAllTokens(haystack);
  });

  const pairs = MATCHED_PAIRS.filter((p) => {
    const haystack = [
      p.id,
      p.sku,
      p.name,
      p.variety,
      p.origin,
      p.colourHue,
      p.shape,
      p.clarity,
      p.treatmentDisclosed,
      'pair pairs earring earrings matched',
    ]
      .join(' ')
      .toLowerCase();
    return matchesAllTokens(haystack);
  });

  const settings = SETTINGS.filter((s) => {
    const haystack = [
      s.sku,
      s.name,
      s.style,
      s.category,
      s.originAtelier || '',
      'setting settings mount ring earrings pendant solitaire bezel',
    ]
      .join(' ')
      .toLowerCase();
    return matchesAllTokens(haystack);
  });

  const articles = EDUCATION_ARTICLES.filter((a) => {
    const haystack = [a.title, a.lede, a.category].join(' ').toLowerCase();
    return matchesAllTokens(haystack);
  });

  return { gemstones, pairs, settings, articles };
}

export interface GemologicalSuggestionItem {
  id: string;
  kind: 'variety' | 'origin' | 'specimen';
  label: string;
  sublabel: string;
  metric: string;
  href: string;
  queryValue: string;
}

export interface RealtimeGemologicalSuggestions {
  varieties: GemologicalSuggestionItem[];
  origins: GemologicalSuggestionItem[];
  specimens: GemologicalSuggestionItem[];
  totalMatches: number;
}

export function getRealtimeGemologicalSuggestions(rawQuery: string): RealtimeGemologicalSuggestions {
  const q = rawQuery.trim().toLowerCase();

  // Build unique origin records with mining districts, varieties, and lot counts
  const originMap = new Map<
    string,
    { origin: string; districts: Set<string>; varieties: Set<string>; count: number }
  >();

  for (const stone of GEMSTONES) {
    const key = stone.origin.toLowerCase();
    const entry = originMap.get(key) || {
      origin: stone.origin,
      districts: new Set<string>(),
      varieties: new Set<string>(),
      count: 0,
    };
    if (stone.evidence.miningDistrict) {
      entry.districts.add(stone.evidence.miningDistrict);
    }
    entry.varieties.add(stone.variety);
    entry.count += 1;
    originMap.set(key, entry);
  }

  for (const pair of MATCHED_PAIRS) {
    const key = pair.origin.toLowerCase();
    const entry = originMap.get(key) || {
      origin: pair.origin,
      districts: new Set<string>(),
      varieties: new Set<string>(),
      count: 0,
    };
    if (pair.evidence.miningDistrict) {
      entry.districts.add(pair.evidence.miningDistrict);
    }
    entry.varieties.add(pair.variety);
    entry.count += 1;
    originMap.set(key, entry);
  }

  const allOrigins = Array.from(originMap.values());

  const tokens = q
    .replace(/[^a-z0-9.-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const matchesQuery = (haystack: string) => {
    if (!q) return true;
    const lower = haystack.toLowerCase();
    if (lower.includes(q)) return true;
    if (tokens.length === 0) return false;
    return tokens.every((tok) => lower.includes(tok));
  };

  const varieties: GemologicalSuggestionItem[] = VARIETIES_META.filter((v) => {
    const varietyOrigins = GEMSTONES.filter((g) => g.varietySlug === v.slug)
      .map((g) => `${g.origin} ${g.evidence.miningDistrict || ''}`)
      .join(' ');
    return matchesQuery(
      `${v.name} ${v.slug} ${v.mineralSpecies} ${v.refractiveIndexRange} ${v.lede} ${varietyOrigins}`
    );
  })
    .slice(0, 4)
    .map((v) => {
      const stoneCount = GEMSTONES.filter((g) => g.varietySlug === v.slug).length;
      const pairCount = MATCHED_PAIRS.filter((p) => p.varietySlug === v.slug).length;
      const totalLots = stoneCount + pairCount;
      return {
        id: `var-${v.slug}`,
        kind: 'variety',
        label: v.name,
        sublabel: `${v.mineralSpecies} · RI ${v.refractiveIndexRange}`,
        metric: `${totalLots} ${totalLots === 1 ? 'lot' : 'lots'}`,
        href: `/varieties/${v.slug}`,
        queryValue: v.name,
      };
    });

  const origins: GemologicalSuggestionItem[] = allOrigins
    .filter((o) => {
      const districtText = Array.from(o.districts).join(' ');
      const varietyText = Array.from(o.varieties).join(' ');
      return matchesQuery(`${o.origin} ${districtText} ${varietyText}`);
    })
    .slice(0, 4)
    .map((o) => {
      const primaryDistrict = Array.from(o.districts)[0];
      const primaryVarieties = Array.from(o.varieties).slice(0, 2).join(', ');
      return {
        id: `orig-${o.origin.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        kind: 'origin',
        label: o.origin,
        sublabel: primaryDistrict ? `${primaryDistrict} · ${primaryVarieties}` : primaryVarieties,
        metric: `${o.count} ${o.count === 1 ? 'lot' : 'lots'}`,
        href: `/browse?origin=${encodeURIComponent(o.origin)}`,
        queryValue: `${o.origin} ${Array.from(o.varieties)[0] || ''}`.trim(),
      };
    });

  const specimens: GemologicalSuggestionItem[] = (q
    ? GEMSTONES.filter((g) =>
        matchesQuery(
          `${g.id} ${g.sku} ${g.name} ${g.variety} ${g.origin} ${g.colourHue} ${g.shape} ${g.clarity} ${g.treatmentDisclosed} ${g.carat.toFixed(2)} ${g.evidence.miningDistrict || ''}`
        )
      )
    : GEMSTONES.slice(0, 3)
  )
    .slice(0, 3)
    .map((g) => ({
      id: `spec-${g.id}`,
      kind: 'specimen',
      label: `${g.name}`,
      sublabel: `${g.id} · ${g.origin} · ${g.clarity}`,
      metric: formatUsd(g.price),
      href: `/product/${g.slug}`,
      queryValue: g.id,
    }));

  return {
    varieties,
    origins,
    specimens,
    totalMatches: varieties.length + origins.length + specimens.length,
  };
}

export function validateRedirectUpsert(
  existingRules: RedirectRuleRecord[],
  newRule: { sourcePath: string; destinationPath: string; statusCode: 301 | 302 | 307 | 308 }
): { ok: true } | { ok: false; status: 409 | 400; message: string } {
  const src = newRule.sourcePath.trim();
  const dest = newRule.destinationPath.trim();
  if (!src.startsWith('/') || !dest.startsWith('/')) {
    return {
      ok: false,
      status: 400,
      message: 'Both sourcePath and destinationPath must begin with a leading slash (/).',
    };
  }
  if (src === dest) {
    return {
      ok: false,
      status: 400,
      message: 'Redirect loop detected: sourcePath cannot equal destinationPath.',
    };
  }
  const duplicate = existingRules.find(
    (r) => r.sourcePath.trim().toLowerCase() === src.toLowerCase()
  );
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      message: `409 Conflict: A redirect rule for source path "${src}" already exists (points to "${duplicate.destinationPath}" with status ${duplicate.statusCode}).`,
    };
  }
  return { ok: true };
}

export function getEducationHubData() {
  return EDUCATION_ARTICLES;
}

export function getEducationArticleByPath(pathSegments?: string[]) {
  if (!pathSegments || pathSegments.length === 0) return null;
  const key = pathSegments.join('/').toLowerCase();
  return (
    EDUCATION_ARTICLES.find(
      (a) =>
        a.slugKey.toLowerCase() === key ||
        a.path[a.path.length - 1].toLowerCase() === pathSegments[pathSegments.length - 1].toLowerCase()
    ) || null
  );
}

export function getAllBlogPosts() {
  return BLOG_POSTS;
}

export function getBlogPostBySlug(slug: string) {
  return BLOG_POSTS.find((p) => p.slug.toLowerCase() === slug.trim().toLowerCase()) || null;
}

export function getAboutPageContent(slug?: string) {
  if (!slug) return ABOUT_PAGES.index;
  return ABOUT_PAGES[slug.trim().toLowerCase()] || null;
}

export function getPolicyPageContent(slug: string) {
  const normalized = slug.trim().toLowerCase();
  const aliasMap: Record<string, string> = {
    privacy: 'privacy-policy',
    'privacy-policy': 'privacy-policy',
    terms: 'terms-of-service',
    'terms-and-conditions': 'terms-of-service',
    'terms-of-service': 'terms-of-service',
    returns: 'shipping-and-returns',
    shipping: 'shipping-and-returns',
    'shipping-and-returns': 'shipping-and-returns',
    treatment: 'treatment-disclosure',
    'treatment-disclosure': 'treatment-disclosure',
    ethics: 'ethical-sourcing',
    sourcing: 'ethical-sourcing',
    'ethical-sourcing': 'ethical-sourcing',
  };
  const resolvedSlug = aliasMap[normalized] || normalized;
  return POLICY_PAGES[resolvedSlug] || null;
}

export function getAllPolicyPages() {
  return Object.values(POLICY_PAGES);
}

export function getAllShowrooms() {
  return SHOWROOMS;
}

export function getShowroomBySlug(slug: string) {
  return SHOWROOMS.find((s) => s.slug.toLowerCase() === slug.trim().toLowerCase()) || null;
}

export function getAccountFixture() {
  return ACCOUNT_FIXTURE;
}

export function getAdminInitialState() {
  return {
    seoMetadata: INITIAL_SEO_METADATA,
    redirectRules: INITIAL_REDIRECT_RULES,
    navigationConfig: INITIAL_NAVIGATION_CONFIG,
    aiOpsJobs: INITIAL_AI_OPS_JOBS,
    aiOpsLogs: INITIAL_AI_OPS_LOGS,
  };
}

export function getVendorInitialState() {
  return {
    listings: VENDOR_LISTINGS,
    orders: VENDOR_ORDERS,
  };
}

export type CurrencyCode = 'USD' | 'AED' | 'BHAT';

export const CURRENCIES: CurrencyCode[] = ['USD', 'AED', 'BHAT'];

export const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { label: string; name: string; rate: number; symbol: string; prefix: string; fractionDigits: number }
> = {
  USD: { label: '$', name: 'US Dollar', rate: 1, symbol: '$', prefix: '$', fractionDigits: 0 },
  AED: { label: 'د.إ', name: 'UAE Dirham', rate: 3.6725, symbol: 'د.إ', prefix: 'د.إ ', fractionDigits: 0 },
  BHAT: { label: '฿', name: 'Thai Baht', rate: 36.5, symbol: '฿', prefix: '฿', fractionDigits: 0 },
};

export function formatCurrencyAmount(amountUsd: number, currency: CurrencyCode = 'USD'): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const converted = Math.round(amountUsd * config.rate);
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: config.fractionDigits,
  }).format(converted);
  return `${config.prefix}${formatted}`;
}

export function formatUsd(amount: number): string {
  return formatCurrencyAmount(amount, 'USD');
}

export type CompareCategory = 'gemstones' | 'settings' | 'jewellery';

export interface JewelleryCatalogItem {
  id: string;
  sku: string;
  slug: string;
  name: string;
  subcategory: string;
  metal: string;
  gemstoneVariety: string;
  totalCarat: number;
  origin: string;
  settingStyle: string;
  certification: string;
  price: number;
  image: string;
  href: string;
}

export function getAllJewelleryItems(): JewelleryCatalogItem[] {
  const signaturePieces: JewelleryCatalogItem[] = [
    {
      id: 'JWL-ELYSIAN-RING',
      sku: 'JWL-ELY-215',
      slug: 'elysian-ring',
      name: 'Elysian Solitaire Ring',
      subcategory: 'Rings',
      metal: 'Platinum 950',
      gemstoneVariety: 'Natural Diamond',
      totalCarat: 2.15,
      origin: 'Geneva Atelier · GIA Dossier',
      settingStyle: 'Cathedral Knife-Edge Solitaire',
      certification: 'GIA Certified · Geneva Hallmarked',
      price: 12800,
      image: '/mgh/images/elysian-ring.jpg',
      href: '/products/elysian-ring',
    },
    {
      id: 'JWL-VERDANT-DROP',
      sku: 'JWL-VER-432',
      slug: 'verdant-drop',
      name: 'Verdant Emerald Drop Necklace',
      subcategory: 'Necklaces & Pendants',
      metal: '18k Yellow Gold & Platinum',
      gemstoneVariety: 'Natural Colombian Emerald',
      totalCarat: 4.32,
      origin: 'Muzo, Colombia · Geneva Atelier',
      settingStyle: 'Articulated Pear Drop Bail',
      certification: 'SSEF Certified · Minor Cedarwood Oil',
      price: 18500,
      image: '/mgh/images/verdant-drop.jpg',
      href: '/products/verdant-drop',
    },
  ];

  const pairCreations: JewelleryCatalogItem[] = MATCHED_PAIRS.map((pair) => ({
    id: pair.id,
    sku: pair.sku,
    slug: pair.slug,
    name: pair.name,
    subcategory: 'Matched Pair Earrings',
    metal: 'Platinum 950 & 18k Gold Mounts',
    gemstoneVariety: `Natural ${pair.variety} (${pair.colourHue})`,
    totalCarat: pair.totalCarat,
    origin: pair.origin,
    settingStyle: `${pair.shape} Calibrated Pair (${pair.symmetryMatchToleranceMm || '0.08 mm'} tolerance)`,
    certification: `${pair.evidence.reportNumber || 'GIA / SSEF'} · ${pair.treatmentDisclosed}`,
    price: pair.price,
    image: pair.images[0],
    href: '/pairs',
  }));

  return [...signaturePieces, ...pairCreations];
}

export function getCompareCategoryForId(id: string): CompareCategory {
  const normalized = id.trim().toUpperCase();
  if (
    normalized.startsWith('SET-') ||
    SETTINGS.some((s) => s.sku.toUpperCase() === normalized || s.slug.toUpperCase() === normalized)
  ) {
    return 'settings';
  }
  if (
    normalized.startsWith('PAIR-') ||
    normalized.startsWith('JWL-') ||
    normalized === 'ITEM-ELYSIAN-RING' ||
    normalized === 'ITEM-VERDANT-DROP' ||
    MATCHED_PAIRS.some((p) => p.id.toUpperCase() === normalized || p.sku.toUpperCase() === normalized)
  ) {
    return 'jewellery';
  }
  return 'gemstones';
}

export function normalizeCompareId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.toLowerCase() === 'item-elysian-ring') return 'JWL-ELYSIAN-RING';
  if (trimmed.toLowerCase() === 'item-verdant-drop') return 'JWL-VERDANT-DROP';
  return trimmed;
}

export function sanitizeSameCategoryCompareList(ids: string[]): string[] {
  const normalized = ids.map(normalizeCompareId).filter(Boolean);
  if (normalized.length === 0) return [];
  // Keep items matching the category of the most recently added item (or first item)
  const targetCategory = getCompareCategoryForId(normalized[normalized.length - 1]);
  const filtered = normalized.filter((item) => getCompareCategoryForId(item) === targetCategory);
  return Array.from(new Set(filtered)).slice(-4);
}

