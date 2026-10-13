import type { FitStatus, NgcProduct } from './types.js';

function settingSeat(setting: NgcProduct): 'earring' | 'bracelet' | 'ring' | 'pendant' {
  if (setting.settingType === 'earring' || /earring/i.test(setting.subcategory ?? '')) return 'earring';
  if (setting.settingType === 'bracelet' || /bracelet/i.test(setting.subcategory ?? '')) return 'bracelet';
  if (setting.settingType === 'pendant_necklace' || /pendant|necklace/i.test(setting.subcategory ?? '')) return 'pendant';
  return 'ring';
}

function isPair(stone: NgcProduct): boolean {
  return stone.kind === 'stone_pair';
}

function carat(stone: NgcProduct): number {
  return stone.weightCt ?? stone.pairStones.reduce((sum, s) => sum + (s.weightCt ?? 0), 0);
}

function longestMm(stone: NgcProduct): number {
  return Math.max(stone.lengthMm ?? 0, stone.widthMm ?? 0);
}

const OPEN_STYLES = ['solitaire', 'bezel', "men's", 'mens', 'celtic', 'two stone'];

function isOpenSetting(setting: NgcProduct): boolean {
  return setting.styles.some((s) => OPEN_STYLES.includes(s.toLowerCase()));
}

export function fitStoneToSetting(stone: NgcProduct, setting: NgcProduct): FitStatus {
  if (stone.kind === 'setting' || setting.kind !== 'setting') return 'incompatible';
  const seat = settingSeat(setting);
  const pair = isPair(stone);

  if (seat === 'earring' && !pair) return 'incompatible';
  if (seat !== 'earring' && pair) return 'incompatible';

  const ct = carat(stone);
  const mm = longestMm(stone);

  if (seat === 'bracelet') {
    if (ct > 8 || mm > 12) return 'incompatible';
    if (ct > 5 || mm > 10) return 'needs_review';
    return 'fits';
  }

  if (ct > 100 || mm > 40) return 'incompatible';
  if (ct > 30) return isOpenSetting(setting) ? 'needs_review' : 'incompatible';
  if (ct > 5) return isOpenSetting(setting) ? 'fits' : 'needs_review';
  if (ct > 0 && ct < 0.35) return 'needs_review';
  return 'fits';
}

export function compatibleSettings(stone: NgcProduct, settings: readonly NgcProduct[]): NgcProduct[] {
  return settings.filter((setting) => fitStoneToSetting(stone, setting) !== 'incompatible');
}

export function compatibleStonesForSetting(setting: NgcProduct, stones: readonly NgcProduct[]): NgcProduct[] {
  return stones.filter((stone) => fitStoneToSetting(stone, setting) !== 'incompatible');
}

export function reviewNote(status: FitStatus): string | null {
  if (status === 'needs_review') {
    return 'This pairing sits near the seat’s size band. A jeweller will review the prongs before the piece is made.';
  }
  if (status === 'incompatible') {
    return 'These items are likely incompatible. Choose another stone or setting, or send a custom-design enquiry.';
  }
  return null;
}

export function imageTo3dHook(product: NgcProduct): { status: 'ready' | 'procedural' | 'pending_service'; inputImage: string | null } {
  if (product.threeDFilePath) return { status: 'ready', inputImage: null };
  const photo = product.media.find((m) => m.kind === 'image');
  return {
    status: 'pending_service',
    inputImage: photo?.url ?? null,
  };
}
