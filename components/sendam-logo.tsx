import Image from 'next/image';

import { cn } from '@/lib/utils';

interface SendamLogoProps {
  compact?: boolean;
  className?: string;
}

export function SendamLogo({ compact = false, className }: SendamLogoProps) {
  return (
    <div className={cn('flex min-w-0 items-center', className)} aria-label="SENDAMhub">
      <Image
        src="/brand/sendamhub-logo.svg"
        alt="SENDAMhub"
        width={1488}
        height={490}
        priority
        className={cn(
          'block shrink-0 object-contain',
          compact ? 'h-10 w-10 object-left' : 'h-12 w-[12.75rem] object-left',
        )}
      />
    </div>
  );
}
