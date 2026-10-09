'use client';

import { Input } from '@/components/ui/input';
import type { PaymentCountryResponse, PaymentMethodResponse } from '@/lib/payments/types';

interface MobileMoneyFieldsProps {
  countries: PaymentCountryResponse[];
  country: string;
  payerMsisdn: string;
  method?: PaymentMethodResponse;
  showCountry?: boolean;
  showPhone?: boolean;
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

// Local-format example numbers (without calling code), keyed by ISO country code.
const LOCAL_NUMBER_EXAMPLES: Record<string, string> = {
  CI: '07 01 23 45 67',
  CM: '6 90 12 34 56',
  SN: '77 123 45 67',
  BJ: '01 90 12 34 56',
  BF: '70 12 34 56',
  TG: '90 12 34 56',
  ML: '70 12 34 56',
  NE: '90 12 34 56',
  GN: '620 12 34 56',
  GA: '06 12 34 56',
  CG: '06 123 4567',
  CD: '81 234 5678',
};

export function MobileMoneyFields({
  countries,
  country,
  payerMsisdn,
  method,
  showCountry = true,
  showPhone = true,
  onCountryChange,
  onPayerMsisdnChange,
  labels,
}: MobileMoneyFieldsProps) {
  const selectedCountry = countries.find((item) => item.code === country);
  const localExample = selectedCountry ? LOCAL_NUMBER_EXAMPLES[selectedCountry.code.toUpperCase()] : undefined;
  const phonePlaceholder = localExample ? `Ex. ${localExample}` : labels.phonePlaceholder;

  return (
    <div className="space-y-3">
      {showCountry && <label className="block space-y-1.5">
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
      </label>}

      {showPhone && <label className="block space-y-1.5">
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
            placeholder={phonePlaceholder}
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <span className="block text-xs leading-5 text-muted-foreground">{labels.phoneHint}</span>
        {method?.otpRequired && (
          <span className="block text-xs font-medium text-primary">{labels.otpRequired}</span>
        )}
      </label>}
    </div>
  );
}
