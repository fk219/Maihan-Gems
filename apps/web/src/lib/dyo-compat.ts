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
    return `A ${setting.title} in ${metal}${band}. Select a compatible stone to seat it.`;
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
  return `Atelier preview: a ${ct}${shape}${type}${origin} seated in ${setting!.title} (${metal}). Procedural studio render from the pairing — not a photograph of a finished jewel.`;
}
