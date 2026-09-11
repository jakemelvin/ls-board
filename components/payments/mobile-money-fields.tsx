'use client';

import { Input } from '@/components/ui/input';
import type { PaymentCountryResponse, PaymentMethodResponse } from '@/lib/payments/types';

interface MobileMoneyFieldsProps {
  countries: PaymentCountryResponse[];
  country: string;
  payerMsisdn: string;
  method?: PaymentMethodResponse;
  onCountryChange: (country: string) => void;
  onPayerMsisdnChange: (payerMsisdn: string) => void;
  labels: {
    countryLabel: string;
    countryPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneHint: string;
    otpRequired: string;
  };
}

export function MobileMoneyFields({
  countries,
  country,
  payerMsisdn,
  method,
  onCountryChange,
  onPayerMsisdnChange,
  labels,
}: MobileMoneyFieldsProps) {
  const selectedCountry = countries.find((item) => item.code === country);

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">{labels.countryLabel}</span>
        <select
          value={country}
          onChange={(event) => onCountryChange(event.target.value)}
          disabled={countries.length === 0}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{labels.countryPlaceholder}</option>
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name} ({item.callingCode} · {item.currency})
            </option>
          ))}
        </select>
      </label>

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
        {method?.otpRequired && (
          <span className="block text-xs font-medium text-primary">{labels.otpRequired}</span>
        )}
      </label>
    </div>
  );
}
