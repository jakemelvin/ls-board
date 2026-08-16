'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getPaymentProviderCountries } from '@/lib/payments/api';
import type { OnlinePaymentProvider, PaymentCountryResponse } from '@/lib/payments/types';

type MobileMoneyProvider = Extract<OnlinePaymentProvider, 'MTN' | 'ORANGE'>;

interface MobileMoneyFieldsProps {
  token: string | null;
  provider: MobileMoneyProvider;
  country: string;
  payerMsisdn: string;
  onCountryChange: (country: string) => void;
  onPayerMsisdnChange: (payerMsisdn: string) => void;
  labels: {
    countryLabel: string;
    countryPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneHint: string;
    loadingCountries: string;
    countriesError: string;
    otpRequired: string;
  };
}

export function MobileMoneyFields({
  token,
  provider,
  country,
  payerMsisdn,
  onCountryChange,
  onPayerMsisdnChange,
  labels,
}: MobileMoneyFieldsProps) {
  const [countries, setCountries] = useState<PaymentCountryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setCountries([]);
    onCountryChange('');

    getPaymentProviderCountries(token, provider)
      .then((response) => {
        if (cancelled) return;
        setCountries(response);
        const defaultCountry = response.find((item) => item.code === 'CM') ?? response[0];
        onCountryChange(defaultCountry?.code ?? '');
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onCountryChange, provider, token]);

  const selectedCountry = countries.find((item) => item.code === country);

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">{labels.countryLabel}</span>
        <select
          value={country}
          onChange={(event) => onCountryChange(event.target.value)}
          disabled={loading || countries.length === 0}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{loading ? labels.loadingCountries : labels.countryPlaceholder}</option>
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name} ({item.callingCode} · {item.currency})
            </option>
          ))}
        </select>
      </label>

      {loadFailed && <p className="text-sm text-destructive">{labels.countriesError}</p>}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">{labels.phoneLabel}</span>
        <div className="flex overflow-hidden rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <span className="flex shrink-0 items-center border-r border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
            {selectedCountry?.callingCode ?? '—'}
          </span>
          <Input
            value={payerMsisdn}
            onChange={(event) => onPayerMsisdnChange(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder={labels.phonePlaceholder}
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <span className="block text-xs leading-5 text-muted-foreground">{labels.phoneHint}</span>
        {selectedCountry?.otpRequired && (
          <span className="block text-xs font-medium text-primary">{labels.otpRequired}</span>
        )}
      </label>
      {loading && <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" aria-label={labels.loadingCountries} />}
    </div>
  );
}
