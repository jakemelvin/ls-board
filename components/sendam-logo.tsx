'use client';

import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SendamLogoProps {
  compact?: boolean;
  className?: string;
}

export function SendamLogo({ compact = false, className }: SendamLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)} aria-label="SENDAMhub">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.45),transparent_36%),linear-gradient(135deg,#1f5fa8_0%,#17437f_52%,#102f68_100%)] shadow-[0_12px_28px_rgba(21,101,216,0.28)]">
        <span className="text-[0.88rem] font-black leading-none tracking-[-0.04em] text-white">
          SAH
        </span>
        <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0d6dfd] shadow-[0_0_0_3px_rgba(13,109,253,0.18)]">
          <Truck className="h-2.5 w-2.5 fill-white text-white" />
        </span>
      </div>

      {!compact && (
        <div className="min-w-0">
          <div className="flex items-baseline leading-none">
            <span className="font-serif text-[1.34rem] font-black tracking-[0.08em] text-white">
              SEND
            </span>
            <span className="font-serif text-[1.34rem] font-black tracking-[0.08em] text-[#5b91ff]">
              AM
            </span>
            <span className="font-serif text-[1.34rem] font-black tracking-[0.08em] text-white">
              hub
            </span>
          </div>
          <p className="mt-1 text-[0.68rem] font-semibold tracking-[0.18em] text-sidebar-foreground/45">
            FAST. SECURE. DELIVERED.
          </p>
        </div>
      )}
    </div>
  );
}
