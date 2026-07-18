export const SUPPORTED_CURRENCIES = ['XAF', 'USD', 'EUR'] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface ExchangeRateResponse {
  dollarExchangeRate: number;
  euroExchangeRate: number;
  refreshedAt?: string;
  source?: string;
}

export interface CachedExchangeRates {
  cachedAt: number;
  rates: ExchangeRateResponse;
}
