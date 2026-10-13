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

export function parseCurrency(value: string | null | undefined): StorefrontCurrency | null {
  if (value === 'USD' || value === 'AED' || value === 'THB') return value;
  return null;
}

function rateFor(currency: StorefrontCurrency, rates: Record<string, number> = DEFAULT_FX): number {
  const raw = Number(rates[currency]);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_FX[currency] ?? 1;
}

export function convertAmount(usd: number, currency: StorefrontCurrency, rates = DEFAULT_FX): number {
  return usd * rateFor(currency, rates);
}

export function formatMoney(usd: number, currency: StorefrontCurrency, rates = DEFAULT_FX): string {
  const amount = convertAmount(usd, currency, rates);
  const digits = amount >= 1000 ? 0 : 2;
  const number = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
  return `${currency} ${number}`;
}

export const CURRENCY_COOKIE = 'maihan_currency';
