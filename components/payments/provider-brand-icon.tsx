import Image from 'next/image';
import type { OnlinePaymentProvider } from '@/lib/payments/types';
import { cn } from '@/lib/utils';

const BRAND_MARKS: Record<OnlinePaymentProvider, { mark: string; className: string; logo?: string }> = {
  MTN: { mark: 'MTN', className: 'bg-white', logo: '/payment-providers/mtn-momo.png' },
  ORANGE: { mark: 'O', className: 'bg-white', logo: '/payment-providers/orange.svg' },
  MOOV: { mark: 'moov', className: 'bg-white', logo: '/payment-providers/moov-money.png' },
  WAVE: { mark: 'W', className: 'bg-white', logo: '/payment-providers/wave.png' },
  EXPRESSO: { mark: 'e', className: 'bg-[#e31b54] text-white' },
  FREE: { mark: 'Mixx', className: 'bg-[#ed1b2f] text-white' },
  WLIGDICASH: { mark: 'L', className: 'bg-[#ed7d31] text-white' },
  CELTIIS: { mark: 'C', className: 'bg-white', logo: '/payment-providers/celtiis.svg' },
  CORIS: { mark: 'C', className: 'bg-white', logo: '/payment-providers/coris-money.svg' },
  TMONEY: { mark: 'TMoney', className: 'bg-white', logo: '/payment-providers/tmoney.png' },
  AIRTEL: { mark: 'a', className: 'bg-white', logo: '/payment-providers/airtel.svg' },
  TELECEL: { mark: 't', className: 'bg-white', logo: '/payment-providers/telecel.png' },
  MPESA: { mark: 'M', className: 'bg-white', logo: '/payment-providers/mpesa.svg' },
  AFRIMONEY: { mark: 'A', className: 'bg-[#e74c3c] text-white' },
  PAYPAL: { mark: 'P', className: 'bg-white', logo: '/payment-providers/paypal.svg' },
  STRIPE: { mark: 'S', className: 'bg-white', logo: '/payment-providers/stripe.svg' },
};

/** Provider logos are bundled locally so the checkout never relies on an external image host. */
export function ProviderBrandIcon({
  provider,
  className,
}: {
  provider: OnlinePaymentProvider;
  className?: string;
}) {
  const brand = BRAND_MARKS[provider];
  const isWordmark = brand.mark.length > 1;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold leading-none',
        isWordmark && !brand.logo ? 'px-0.5 text-[9px] tracking-[-0.08em]' : 'text-base',
        brand.className,
        className,
      )}
    >
      {brand.logo ? (
        <Image
          src={brand.logo}
          alt=""
          width={36}
          height={36}
          className="h-full w-full rounded-[inherit] object-contain p-1"
        />
      ) : brand.mark}
    </span>
  );
}
