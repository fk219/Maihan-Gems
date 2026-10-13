export type StorefrontCurrency = 'USD' | 'AED' | 'THB';

export const CURRENCIES: readonly StorefrontCurrency[] = ['AED', 'THB', 'USD'];

export const DEFAULT_FX: Record<StorefrontCurrency, number> = {
  USD: 1,
  AED: 3.6725,
  THB: 34.5,
};

export function detectCurrencyFromLocale(): StorefrontCurrency {
  if (typeof Intl === 'undefined') return 'USD';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (/Dubai|Riyadh|Qatar|Muscat|Kuwait|Bahrain|Abu_Dhabi/i.test(tz)) return 'AED';
    if (/Bangkok|Phuket/i.test(tz)) return 'THB';
  } catch {
    /* ignore */
  }
  return 'USD';
}

export function convertAmount(usd: number, currency: StorefrontCurrency, rates = DEFAULT_FX): number {
  return usd * (rates[currency] ?? 1);
}

export function formatMoney(usd: number, currency: StorefrontCurrency, rates = DEFAULT_FX): string {
  const amount = convertAmount(usd, currency, rates);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
}

export const CURRENCY_COOKIE = 'maihan_currency';
