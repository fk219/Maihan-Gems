import type { SettingAcceptRule, SettingForDyo, StorefrontCard } from './storefront-types.js';

export type CardFit = 'fits' | 'needs_review' | 'incompatible';

function normShape(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[\s-]+/g, '_').replace(/_cut$/, '');
}

export function ruleAcceptsStone(rule: SettingAcceptRule, stone: StorefrontCard): boolean {
  if (normShape(rule.shape) !== normShape(stone.shape)) return false;
  const carat = stone.caratTotal ?? 0;
  if (rule.minCarat !== null && carat < rule.minCarat) return false;
  if (rule.maxCarat !== null && carat > rule.maxCarat) return false;
  return true;
}

export function settingAcceptsStone(setting: SettingForDyo, stone: StorefrontCard): boolean {
  if (setting.accepts.length === 0) return true;
  const earrings = setting.settingFor === 'earrings';
  if (earrings && stone.quantityType !== 'pair') return false;
  if (!earrings && stone.quantityType === 'pair') return false;
  return setting.accepts.some((rule) => ruleAcceptsStone(rule, stone));
}

export function compatibleStones(setting: SettingForDyo | null, stones: StorefrontCard[]): StorefrontCard[] {
  if (!setting) return [];
  return stones.filter((stone) => settingAcceptsStone(setting, stone));
}

export function compatibleSettings(
  stone: StorefrontCard | null,
  settings: SettingForDyo[],
): SettingForDyo[] {
  if (!stone) return settings;
  return settings.filter((setting) => settingAcceptsStone(setting, stone));
}

export function stoneFitStatus(setting: SettingForDyo, stone: StorefrontCard): CardFit {
  if (!settingAcceptsStone(setting, stone)) return 'incompatible';
  const carat = stone.caratTotal ?? 0;
  if (carat > 5) return 'needs_review';
  const rule = setting.accepts.find((row) => ruleAcceptsStone(row, stone));
  if (rule?.maxCarat != null && carat > rule.maxCarat * 0.85) return 'needs_review';
  if (rule?.minCarat != null && carat > 0 && carat < rule.minCarat * 1.2) return 'needs_review';
  return 'fits';
}

const METAL_LEAD =
  /^(?:(?:18|14)\s*k(?:arat)?(?:\s+(?:yellow|white|rose))?\s*gold|platinum(?:\s*\d+)?|palladium|yellow gold|white gold|rose gold)[\s,]*/i;
const SKU_TAIL = /\s+[A-Z]{1,3}\d+[A-Z0-9]*$/i;

/** Seat name without the catalogue metal or SKU, so live metal can be named once. */
export function settingSeatLabel(title: string, settingFor?: string | null): string {
  let text = title.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(METAL_LEAD, '').trim();
    if (next === text) break;
    text = next;
  }
  text = text.replace(SKU_TAIL, '').trim().toLowerCase();
  text = text.replace(/\s+setting\s+/g, ' ').replace(/\s+setting$/i, '').trim();
  const seat = (settingFor ?? '').replace(/_/g, ' ').toLowerCase();
  if (!text && !seat) return 'setting';
  if (seat && (text === seat || text.includes(seat))) return `${text} setting`.replace(/\s+/g, ' ').trim();
  if (seat) return `${text} ${seat} setting`.replace(/\s+/g, ' ').trim();
  return `${text} setting`.replace(/\s+/g, ' ').trim();
}

export function pairingCaption(
  setting: SettingForDyo | null,
  stone: StorefrontCard | null,
  metal: string,
): string {
  if (!setting && !stone) {
    return 'Choose a mounting, then a vault stone it will hold. The studio preview is assembled from cut, millimetres and metal — not a photograph.';
  }
  if (setting && !stone) {
    const seat = setting.accepts[0];
    const band = seat ? `, cut for a ${seat.shape} of ${seat.minCarat ?? 0}–${seat.maxCarat ?? '∞'} ct` : '';
    return `A ${settingSeatLabel(setting.title, setting.settingFor)} in ${metal}${band}. Select a compatible stone to seat it.`;
  }
  if (!setting && stone) {
    const facts = [stone.caratTotal ? `${stone.caratTotal} ct` : null, stone.shape, stone.originCountry]
      .filter(Boolean)
      .join(', ');
    return `${stone.title}${facts ? ` — ${facts}` : ''}. Choose a mounting that accepts this cut.`;
  }
  const origin = stone!.originCountry ? ` from ${stone!.originCountry}` : '';
  const ct = stone!.caratTotal ? `${stone!.caratTotal} ct ` : '';
  const shape = stone!.shape ? `${stone!.shape.toLowerCase()} ` : '';
  const type = (stone!.stoneType ?? 'gem').toLowerCase();
  const seat = settingSeatLabel(setting!.title, setting!.settingFor);
  return `Atelier preview: a ${ct}${shape}${type}${origin} seated in a ${seat} in ${metal}. Procedural studio render from the pairing — not a photograph of a finished jewel.`;
}
