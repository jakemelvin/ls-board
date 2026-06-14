'use client';

import type { ReactNode } from 'react';
import { BarChart3, MapPin, Package2 } from 'lucide-react';

import { LanguageSwitcher } from '@/components/language-switcher';
import { SendamLogo } from '@/components/sendam-logo';
import { useTranslation } from '@/lib/i18n';

const FEATURES = [
  { icon: Package2, translationKey: 'authLayout.features.parcels' },
  { icon: MapPin, translationKey: 'authLayout.features.collectionPoints' },
  { icon: BarChart3, translationKey: 'authLayout.features.dashboards' },
] as const;

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh bg-background">
      <div className="relative hidden overflow-hidden border-r border-border p-12 lg:flex lg:w-[480px] lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(96,165,250,0.12),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(91,145,255,0.08),transparent_60%)]" />

        <div className="relative">
          <SendamLogo />
        </div>

        <div className="relative space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground">
              {t('authLayout.headline.prefix')}{' '}
              <span className="text-primary">{t('authLayout.headline.highlight')}</span>
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {t('authLayout.description')}
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, translationKey }) => (
              <li key={translationKey} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-foreground/80">
                  {t(translationKey)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          {t('authLayout.legal', { values: { year: currentYear } })}
        </p>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <LanguageSwitcher />
        </div>

        <div className="mb-8 lg:hidden">
          <SendamLogo />
        </div>
        {children}
      </div>
    </div>
  );
}
