'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getExchangeRates } from './api';
import {
  SUPPORTED_CURRENCIES,
  type CachedExchangeRates,
  type Currency,
  type ExchangeRateResponse,
} from './types';
import { useI18n } from '@/lib/i18n';

const CURRENCY_STORAGE_KEY = 'sendam_currency';
const RATES_STORAGE_KEY = 'sendam_exchange_rates';
const RATES_TTL_MS = 6 * 60 * 60_000;

interface CurrencyContextValue {
  currency: Currency;
  rates: ExchangeRateResponse | null;
  ratesLoading: boolean;
  ratesError: boolean;
  setCurrency: (currency: Currency) => void;
  convertMoney: (amount: number, sourceCurrency?: Currency) => number;
  formatMoney: (
    amount?: number | null,
    options?: { sourceCurrency?: Currency; fallback?: string },
  ) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isCurrency(value: string | null): value is Currency {
  return SUPPORTED_CURRENCIES.includes(value as Currency);
}

function isValidRates(value: unknown): value is ExchangeRateResponse {
  if (!value || typeof value !== 'object') return false;
  const rates = value as Partial<ExchangeRateResponse>;
  return (
    typeof rates.dollarExchangeRate === 'number' &&
    Number.isFinite(rates.dollarExchangeRate) &&
    rates.dollarExchangeRate > 0 &&
    typeof rates.euroExchangeRate === 'number' &&
    Number.isFinite(rates.euroExchangeRate) &&
    rates.euroExchangeRate > 0
  );
}

function readCachedRates(): CachedExchangeRates | null {
  try {
    const raw = window.localStorage.getItem(RATES_STORAGE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedExchangeRates>;
    if (typeof cached.cachedAt !== 'number' || !isValidRates(cached.rates)) return null;
    return cached as CachedExchangeRates;
  } catch {
    return null;
  }
}

function getRate(currency: Currency, rates: ExchangeRateResponse | null) {
  if (currency === 'USD') return rates?.dollarExchangeRate;
  if (currency === 'EUR') return rates?.euroExchangeRate;
  return 1;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const [currency, setCurrencyState] = useState<Currency>('XAF');
  const [rates, setRates] = useState<ExchangeRateResponse | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(false);

  useEffect(() => {
    const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    const cached = readCachedRates();
    if (cached) setRates(cached.rates);
    if (isCurrency(storedCurrency) && (storedCurrency === 'XAF' || cached)) {
      setCurrencyState(storedCurrency);
    }
    const cacheIsFresh = cached && Date.now() - cached.cachedAt < RATES_TTL_MS;

    if (cacheIsFresh) {
      setRatesLoading(false);
      return;
    }

    let isCurrent = true;
    setRatesLoading(true);
    getExchangeRates()
      .then((response) => {
        if (!isCurrent || !isValidRates(response)) return;
        setRates(response);
        if (isCurrency(storedCurrency)) setCurrencyState(storedCurrency);
        setRatesError(false);
        window.localStorage.setItem(
          RATES_STORAGE_KEY,
          JSON.stringify({ rates: response, cachedAt: Date.now() } satisfies CachedExchangeRates),
        );
      })
      .catch(() => {
        if (isCurrent) setRatesError(true);
      })
      .finally(() => {
        if (isCurrent) setRatesLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === CURRENCY_STORAGE_KEY &&
        isCurrency(event.newValue) &&
        (event.newValue === 'XAF' || rates)
      ) {
        setCurrencyState(event.newValue);
      }
      if (event.key === RATES_STORAGE_KEY) {
        const cached = readCachedRates();
        if (cached) setRates(cached.rates);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [rates]);

  const setCurrency = useCallback((nextCurrency: Currency) => {
    if (nextCurrency !== 'XAF' && !rates) return;
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
    setCurrencyState(nextCurrency);
  }, [rates]);

  const convertMoney = useCallback(
    (amount: number, sourceCurrency: Currency = 'XAF') => {
      const sourceRate = getRate(sourceCurrency, rates);
      const targetRate = getRate(currency, rates);
      if (!sourceRate || !targetRate) return amount;
      return (amount * sourceRate) / targetRate;
    },
    [currency, rates],
  );

  const formatMoney = useCallback(
    (
      amount?: number | null,
      options?: { sourceCurrency?: Currency; fallback?: string },
    ) => {
      if (amount == null || !Number.isFinite(amount)) return options?.fallback ?? '--';
      return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'XAF' ? 0 : 2,
        minimumFractionDigits: currency === 'XAF' ? 0 : 2,
      }).format(convertMoney(amount, options?.sourceCurrency));
    },
    [convertMoney, currency, locale],
  );

  const value = useMemo(
    () => ({
      currency,
      rates,
      ratesLoading,
      ratesError,
      setCurrency,
      convertMoney,
      formatMoney,
    }),
    [currency, rates, ratesLoading, ratesError, setCurrency, convertMoney, formatMoney],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used inside CurrencyProvider');
  return context;
}
