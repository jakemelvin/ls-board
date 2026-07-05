'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';

import { resolveRemoteAssetUrl } from '@/lib/asset-url';
import type { CompanyResponse } from '@/lib/auth/types';
import { cn } from '@/lib/utils';

interface CompanyBrandProps {
  company: CompanyResponse | null;
  className?: string;
  variant?: 'sidebar' | 'header';
}

function getInitials(name?: string) {
  if (!name) return 'CO';

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'CO';
}

export function CompanyBrand({ company, className, variant = 'sidebar' }: CompanyBrandProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = useMemo(() => resolveRemoteAssetUrl(company?.logoUrl), [company?.logoUrl]);
  const showImage = Boolean(logoUrl && !imageFailed);
  const companyName = company?.name ?? 'Entreprise';
  const initials = getInitials(company?.name);
  const isHeader = variant === 'header';

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  if (!company) {
    return null;
  }

  return (
    <div
      className={cn(
        'group flex min-w-0 items-center gap-3 rounded-xl border transition-colors',
        isHeader
          ? 'h-11 max-w-[15rem] border-border bg-background/70 px-3 shadow-sm'
          : 'border-sidebar-border/80 bg-sidebar-accent/35 p-3',
        className,
      )}
      aria-label={companyName}
    >
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm',
          isHeader ? 'h-8 w-8' : 'h-10 w-10',
        )}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl ?? undefined}
            alt=""
            className="h-full w-full object-contain p-1"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-primary/10 text-xs font-black text-primary">
            {company.name ? initials : <Building2 className="h-4 w-4" />}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p
          className={cn(
            'truncate font-semibold leading-tight',
            isHeader ? 'text-sm text-foreground' : 'text-sm text-sidebar-foreground',
          )}
        >
          {companyName}
        </p>
        {!isHeader && company.companyUrl && (
          <p className="mt-0.5 truncate text-xs text-sidebar-foreground/50">
            {company.companyUrl.replace(/^https?:\/\//, '')}
          </p>
        )}
      </div>
    </div>
  );
}
