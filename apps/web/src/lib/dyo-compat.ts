import type { SettingAcceptRule, SettingForDyo, StorefrontCard } from './storefront-types.js';

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
