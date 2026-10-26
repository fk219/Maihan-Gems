import {
  getAllGemstones,
  getAllSettings,
  getAllMatchedPairs,
  getGemstoneBySlugOrId,
  getSettingBySkuOrSlug,
  searchCatalogue,
  buildDeterministicDyoCode,
  formatUsd,
} from './storefront-data';
import type { GemstoneItem, SettingItem, MatchedPairItem } from './fixtures/types';

export type GemologistFocusMode =
  | 'all'
  | 'stone_finder'
  | 'compare'
  | 'dyoj'
  | 'provenance';

export interface GemologistCitation {
  index: number;
  label: string;
  sublabel: string;
  href: string;
}

export type ConciergeClientAction =
  | {
      type: 'ADD_TO_WISHLIST';
      stoneId: string;
      stoneName: string;
      sku: string;
    }
  | {
      type: 'ADD_TO_CART';
      item: {
        id: string;
        sku: string;
        slug: string;
        name: string;
        subtitle: string;
        price: number;
        image: string;
        kind: 'gemstone' | 'pair' | 'setting' | 'dyo';
        configurationCode?: string;
      };
    }
  | {
      type: 'SYNC_COMPARE';
      stoneIds: string[];
    };

export interface ConciergeDyoProposal {
  stone: GemstoneItem;
  setting: SettingItem;
  metalCode: 'PT950' | '18K_YG' | '18K_RG' | '18K_WG';
  metalLabel: string;
  ringSize: string;
  totalPrice: number;
  configurationCode: string;
}

export interface ConciergeAgentResponse {
  reply: string;
  gemologicalNotes: string[];
  citations: GemologistCitation[];
  intent:
    | 'show_products'
    | 'compare_products'
    | 'design_jewelry'
    | 'add_to_wishlist'
    | 'add_to_cart';
  products: GemstoneItem[];
  comparedProducts: GemstoneItem[];
  dyoProposal: ConciergeDyoProposal | null;
  matchedPairs: MatchedPairItem[];
  clientActions: ConciergeClientAction[];
  suggestedFollowUps: string[];
}

export interface AgentEvaluationOptions {
  focusMode?: GemologistFocusMode;
  maxBudget?: number | null;
  unheatedOnly?: boolean;
}

function findReferencedStones(
  rawPrompt: string,
  options?: AgentEvaluationOptions
): GemstoneItem[] {
  const q = rawPrompt.trim().toLowerCase();
  const allStones = getAllGemstones();

  // 1. Check for explicit SKU / ID matches first (e.g. MG-TZ-0131)
  const explicitMatches = allStones.filter(
    (s) =>
      q.includes(s.id.toLowerCase()) ||
      q.includes(s.sku.toLowerCase()) ||
      q.includes(s.slug.toLowerCase()) ||
      q.includes(s.carat.toFixed(2))
  );

  // 2. Check variety matches — interleave across matched varieties so 'Compare Tanzanite & Sapphire' includes both
  const allVarieties = Array.from(new Set(allStones.map((s) => s.variety.toLowerCase())));
  const matchedVarietyNames = allVarieties.filter((v) => q.includes(v));

  let varietyMatches: GemstoneItem[] = [];
  if (matchedVarietyNames.length > 1) {
    const buckets = matchedVarietyNames.map((vName) =>
      allStones.filter((s) => s.variety.toLowerCase() === vName)
    );
    const maxLen = Math.max(...buckets.map((b) => b.length));
    for (let i = 0; i < maxLen; i++) {
      for (const bucket of buckets) {
        if (bucket[i]) varietyMatches.push(bucket[i]);
      }
    }
  } else {
    varietyMatches = allStones.filter(
      (s) =>
        q.includes(s.variety.toLowerCase()) ||
        q.includes(s.varietySlug.toLowerCase()) ||
        q.includes(s.origin.toLowerCase())
    );
  }

  // 3. Check treatment / budget filters
  let filtered = [...allStones];
  const wantsUnheated =
    options?.unheatedOnly ||
    q.includes('unheated') ||
    q.includes('untreated') ||
    q.includes('no heat');

  if (wantsUnheated) {
    filtered = filtered.filter(
      (s) =>
        s.treatmentDisclosed.toLowerCase().includes('no heat') ||
        s.treatmentDisclosed.toLowerCase().includes('unheated') ||
        s.treatmentDisclosed.toLowerCase().includes('untreated')
    );
  }

  const budgetMatch = q.match(/(?:under|below|less than|max)\s*\$?\s*([0-9,]+)/i);
  const parsedPromptBudget = budgetMatch
    ? Number(budgetMatch[1].replace(/,/g, ''))
    : null;
  const effectiveBudget =
    parsedPromptBudget && !Number.isNaN(parsedPromptBudget) && parsedPromptBudget > 0
      ? parsedPromptBudget
      : options?.maxBudget || null;

  if (effectiveBudget && effectiveBudget > 0) {
    const budgetFiltered = filtered.filter((s) => s.price <= effectiveBudget);
    if (budgetFiltered.length > 0) {
      filtered = budgetFiltered;
    }
  }

  if (explicitMatches.length > 0) {
    const rest = varietyMatches.filter((v) => !explicitMatches.some((e) => e.id === v.id));
    return [...explicitMatches, ...rest];
  }

  if (varietyMatches.length > 0) {
    const refined = varietyMatches.filter((v) => filtered.some((f) => f.id === v.id));
    return refined.length > 0 ? refined : varietyMatches;
  }

  const catalogSearch = searchCatalogue(rawPrompt).gemstones;
  if (catalogSearch.length > 0) {
    const refinedCatalog = catalogSearch.filter((v) => filtered.some((f) => f.id === v.id));
    return refinedCatalog.length > 0 ? refinedCatalog : catalogSearch;
  }

  return filtered.length > 0 ? filtered : allStones;
}

function findPreferredSettingAndMetal(
  rawPrompt: string,
  stone: GemstoneItem
): {
  setting: SettingItem;
  metalCode: 'PT950' | '18K_YG' | '18K_RG' | '18K_WG';
  metalLabel: string;
  ringSize: string;
} {
  const q = rawPrompt.toLowerCase();
  const allSettings = getAllSettings().filter((s) => !s.acceptsPairsOnly);

  let setting = allSettings[0];
  if (q.includes('pendant') || q.includes('necklace')) {
    setting = allSettings.find((s) => s.category === 'pendant') || setting;
  } else if (q.includes('bezel') || q.includes('signet')) {
    setting = allSettings.find((s) => s.sku.includes('BEZEL')) || setting;
  } else if (q.includes('trilogy') || q.includes('three')) {
    setting = allSettings.find((s) => s.sku.includes('TRILOGY')) || setting;
  } else {
    setting =
      allSettings.find((s) => s.compatibleShapes.includes(stone.shape)) || allSettings[0];
  }

  let metalOption = setting.metals[0];
  if (q.includes('yellow') || q.includes('18k yg') || q.includes('gold')) {
    metalOption = setting.metals.find((m) => m.code === '18K_YG') || metalOption;
  } else if (q.includes('rose')) {
    metalOption = setting.metals.find((m) => m.code === '18K_RG') || metalOption;
  } else if (q.includes('platinum') || q.includes('pt950')) {
    metalOption = setting.metals.find((m) => m.code === 'PT950') || metalOption;
  }

  const sizeMatch = q.match(/size\s*(\d(?:\.\d)?)/i);
  const ringSize =
    sizeMatch && setting.sizes.includes(sizeMatch[1]) ? sizeMatch[1] : setting.sizes[2] || '6.0';

  return {
    setting,
    metalCode: metalOption.code,
    metalLabel: metalOption.label,
    ringSize,
  };
}

export function buildConciergeDyoProposal(
  stoneIdOrSlug: string,
  settingSkuOrSlug?: string,
  metalCode?: 'PT950' | '18K_YG' | '18K_RG' | '18K_WG',
  ringSize = '6.0'
): ConciergeDyoProposal {
  const stone = getGemstoneBySlugOrId(stoneIdOrSlug) || getAllGemstones()[0];
  const nonPairSettings = getAllSettings().filter((s) => !s.acceptsPairsOnly);
  const setting =
    (settingSkuOrSlug ? getSettingBySkuOrSlug(settingSkuOrSlug) : null) ||
    nonPairSettings.find((s) => s.compatibleShapes.includes(stone.shape)) ||
    nonPairSettings[0];

  const metal =
    (metalCode ? setting.metals.find((m) => m.code === metalCode) : null) || setting.metals[0];

  const totalPrice = stone.price + setting.basePrice + metal.priceDelta;
  const configurationCode = buildDeterministicDyoCode(
    stone.id,
    setting.sku,
    metal.code,
    ringSize
  );

  return {
    stone,
    setting,
    metalCode: metal.code,
    metalLabel: metal.label,
    ringSize,
    totalPrice,
    configurationCode,
  };
}

export function evaluateConciergeAgentTurn(
  rawPrompt: string,
  options?: AgentEvaluationOptions
): ConciergeAgentResponse {
  const q = rawPrompt.trim();
  const lower = q.toLowerCase();
  const focusMode = options?.focusMode || 'all';

  const candidateStones = findReferencedStones(q, options);
  const leadStone = candidateStones[0] || getAllGemstones()[0];
  const matchedPairs =
    lower.includes('pair') || lower.includes('earring')
      ? getAllMatchedPairs().slice(0, 2)
      : [];

  const wantsWishlist =
    lower.includes('wishlist') ||
    lower.includes('wish list') ||
    lower.includes('favorite') ||
    lower.includes('favourite') ||
    lower.includes('save ') ||
    lower.includes('bookmark') ||
    lower.includes('heart');

  const wantsCart =
    lower.includes('add to cart') ||
    lower.includes('add to bag') ||
    lower.includes('put in cart') ||
    lower.includes('put in bag') ||
    lower.includes('add it to cart') ||
    lower.includes('add to my cart') ||
    lower.includes('add to my bag') ||
    /\b(buy|acquire|purchase)\b/.test(lower) ||
    (lower.includes('add ') && (lower.includes('cart') || lower.includes('bag') || lower.includes('card')));

  const wantsCompare =
    focusMode === 'compare' ||
    lower.includes('compare') ||
    lower.includes(' vs ') ||
    lower.includes('versus') ||
    lower.includes('difference') ||
    lower.includes('side by side');

  const wantsDyo =
    focusMode === 'dyoj' ||
    lower.includes('design') ||
    lower.includes('dyo') ||
    lower.includes('setting') ||
    lower.includes('mount') ||
    lower.includes('ring') ||
    lower.includes('pendant') ||
    lower.includes('bespoke') ||
    lower.includes('jewellery') ||
    lower.includes('jewelry') ||
    lower.includes('custom');

  const clientActions: ConciergeClientAction[] = [];

  if (wantsWishlist) {
    clientActions.push({
      type: 'ADD_TO_WISHLIST',
      stoneId: leadStone.id,
      stoneName: leadStone.name,
      sku: leadStone.sku,
    });
  }

  let dyoProposal: ConciergeDyoProposal | null = null;
  if (wantsDyo) {
    const pref = findPreferredSettingAndMetal(q, leadStone);
    dyoProposal = buildConciergeDyoProposal(
      leadStone.id,
      pref.setting.sku,
      pref.metalCode,
      pref.ringSize
    );
  }

  if (wantsCart) {
    if (dyoProposal) {
      clientActions.push({
        type: 'ADD_TO_CART',
        item: {
          id: dyoProposal.configurationCode,
          sku: `${dyoProposal.stone.sku} + ${dyoProposal.setting.sku}`,
          slug: dyoProposal.stone.slug,
          name: `Bespoke ${dyoProposal.stone.name} in ${dyoProposal.setting.name}`,
          subtitle: `${dyoProposal.metalLabel} · Size ${dyoProposal.ringSize}`,
          price: dyoProposal.totalPrice,
          image: dyoProposal.stone.images[0],
          kind: 'dyo',
          configurationCode: dyoProposal.configurationCode,
        },
      });
    } else {
      clientActions.push({
        type: 'ADD_TO_CART',
        item: {
          id: leadStone.id,
          sku: leadStone.sku,
          slug: leadStone.slug,
          name: leadStone.name,
          subtitle: `${leadStone.carat.toFixed(2)} ct · ${leadStone.origin}`,
          price: leadStone.price,
          image: leadStone.images[0],
          kind: 'gemstone',
        },
      });
    }
  }

  let comparedProducts: GemstoneItem[] = [];
  if (wantsCompare) {
    comparedProducts = candidateStones.slice(0, 3);
    if (comparedProducts.length < 2) {
      const fallbackSecond =
        getAllGemstones().find(
          (g) => g.id !== leadStone.id && g.varietySlug === leadStone.varietySlug
        ) ||
        getAllGemstones().find((g) => g.id !== leadStone.id)!;
      comparedProducts = [leadStone, fallbackSecond];
    }
    clientActions.push({
      type: 'SYNC_COMPARE',
      stoneIds: comparedProducts.map((s) => s.id),
    });
  }

  // Primary intent classification
  let intent: ConciergeAgentResponse['intent'] = 'show_products';
  if (wantsCart) intent = 'add_to_cart';
  else if (wantsWishlist) intent = 'add_to_wishlist';
  else if (wantsCompare) intent = 'compare_products';
  else if (wantsDyo) intent = 'design_jewelry';

  const displayProducts = wantsCompare
    ? comparedProducts
    : candidateStones.slice(0, 3);

  // Build concise, ultra-luxury maison response text
  let reply = '';
  if (wantsCart && wantsWishlist) {
    reply = `${leadStone.name} (${leadStone.id}) has been saved to your Wishlist and placed in your Vault Bag (${formatUsd(leadStone.price)}).`;
  } else if (wantsCart && dyoProposal) {
    reply = `Your bespoke ${dyoProposal.stone.name} mounted in the ${dyoProposal.setting.name} (${dyoProposal.metalLabel}, ${formatUsd(dyoProposal.totalPrice)}) has been added to your Vault Bag.`;
  } else if (wantsCart) {
    reply = `${leadStone.name} (${leadStone.id} · ${leadStone.origin}) has been added to your Vault Bag at ${formatUsd(leadStone.price)}.`;
  } else if (wantsWishlist) {
    reply = `${leadStone.name} (${leadStone.id} · ${formatUsd(leadStone.price)}) has been saved to your private Wishlist.`;
  } else if (wantsCompare) {
    const names = comparedProducts.map((c) => `${c.id} (${c.carat.toFixed(2)} ct)`).join(' vs ');
    reply = `Side-by-side gemological comparison prepared for ${names} and synced to your Compare Tray.`;
  } else if (wantsDyo && dyoProposal) {
    reply = `Bespoke DYOJ pairing prepared: ${dyoProposal.stone.name} (${dyoProposal.stone.id}) set in our ${dyoProposal.setting.name} in ${dyoProposal.metalLabel} (${formatUsd(dyoProposal.totalPrice)} complete). Customize your alloy, setting, or ring size directly below.`;
  } else {
    reply = `Curated ${displayProducts.length} natural vault ${
      displayProducts.length === 1 ? 'specimen' : 'specimens'
    } for “${q}”. Lead recommendation: ${leadStone.name} (${leadStone.id} · ${leadStone.origin}, ${formatUsd(leadStone.price)}).`;
  }

  // Gemological analysis bullet points (Perplexity / Claude style structured insights)
  const gemologicalNotes: string[] = displayProducts.map((stone, idx) => {
    const perCarat = Math.round(stone.price / stone.carat);
    return `[${idx + 1}] ${stone.name} (${stone.id}): ${stone.carat.toFixed(2)} ct ${stone.shape} from ${stone.origin} · Clarity ${stone.clarity} · ${stone.treatmentDisclosed} · ${formatUsd(stone.price)} (${formatUsd(perCarat)}/ct).`;
  });

  if (dyoProposal) {
    gemologicalNotes.push(
      `Atelier Setting Pairing: ${dyoProposal.setting.name} (${dyoProposal.metalLabel}, Size ${dyoProposal.ringSize}) engineered to secure ${dyoProposal.stone.carat.toFixed(2)} ct ${dyoProposal.stone.shape} geometry.`
    );
  }

  // Build Perplexity-style numbered citations
  const citations: GemologistCitation[] = displayProducts.map((stone, idx) => ({
    index: idx + 1,
    label: `${stone.id} · ${stone.variety}`,
    sublabel: `${stone.carat.toFixed(2)} ct · ${stone.origin}`,
    href: `/gemstones/${stone.slug}`,
  }));

  if (dyoProposal) {
    citations.push({
      index: citations.length + 1,
      label: dyoProposal.setting.name,
      sublabel: `DYOJ Studio · ${dyoProposal.metalLabel}`,
      href: `/design-your-own?code=${encodeURIComponent(dyoProposal.configurationCode)}`,
    });
  } else {
    citations.push({
      index: citations.length + 1,
      label: 'Maihan Provenance Dossier',
      sublabel: 'GIA · SSEF · Gübelin Standards',
      href: '/about',
    });
  }

  const suggestedFollowUps = [
    `Compare ${leadStone.id} with similar stones`,
    `Design a Platinum ring with ${leadStone.id}`,
    `Explain the origin & lab report of ${leadStone.id}`,
    `Add ${leadStone.id} to Vault Bag`,
  ];

  return {
    reply,
    gemologicalNotes,
    citations,
    intent,
    products: displayProducts,
    comparedProducts,
    dyoProposal,
    matchedPairs,
    clientActions,
    suggestedFollowUps,
  };
}
