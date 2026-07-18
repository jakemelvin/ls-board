'use client';

import { useState } from 'react';
import { Boxes, CreditCard, LayoutDashboard, Map, Menu, PackageSearch, ShieldCheck } from 'lucide-react';

import { SIDEBAR_ITEMS } from '@/components/dashboard-sidebar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { CompanyResponse } from '@/lib/auth/types';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import type { UserRole } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface DashboardMobileNavProps {
  currentRole: UserRole;
  activeSection: string;
  onSectionChange: (section: string) => void;
  company?: CompanyResponse | null;
}

const primaryItems = [
  { id: 'dashboard', labelKey: 'shell.sections.dashboardShort', icon: LayoutDashboard },
  { id: 'points-map', labelKey: 'shell.sections.pointsMapShort', icon: Map },
];

const SUPER_ADMIN_ITEMS = [
  { id: 'super-admin', labelKey: 'shell.sections.administration', icon: ShieldCheck },
  { id: 'catalog', labelKey: 'shell.sections.catalog', icon: Boxes },
  { id: 'super-admin-shipments', labelKey: 'shell.sections.platformShipmentsShort', icon: PackageSearch },
  { id: 'platform-finance', labelKey: 'shell.sections.platformFinanceShort', icon: CreditCard },
];

export function DashboardMobileNav({
  currentRole,
  activeSection,
  onSectionChange,
}: DashboardMobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const authRole = useAuthStore((s) => s.role);
  const { t } = useTranslation('dashboard');
  const isSuperAdmin = authRole === 'SUPER_ADMIN' || currentRole === 'SUPER_ADMIN';
  const availableItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(currentRole));
  const mobilePrimaryItems = isSuperAdmin
    ? SUPER_ADMIN_ITEMS.filter((item) =>
        ['super-admin', 'super-admin-shipments'].includes(item.id),
      )
    : primaryItems.filter((item) =>
        availableItems.some((availableItem) => availableItem.id === item.id),
      );
  const isMenuActive = !mobilePrimaryItems.some((item) => item.id === activeSection);

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {mobilePrimaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium transition-colors',
              isMenuActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Menu className="h-5 w-5" />
            <span>{t('shell.mobile.menu')}</span>
          </button>
        </div>
      </nav>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="px-4 pb-2 pt-5 text-left">
            <SheetTitle>{t('shell.mobile.title')}</SheetTitle>
            <SheetDescription>{t('shell.mobile.description')}</SheetDescription>
          </SheetHeader>

          <div className="grid gap-2 px-4 pb-5">
            {availableItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'outline'}
                  className="h-12 justify-start gap-3"
                  onClick={() => handleSectionChange(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  {t(item.labelKey)}
                </Button>
              );
            })}

            {isSuperAdmin && (
              <>
                <div className="my-1 border-t border-border" />
                {SUPER_ADMIN_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? 'default' : 'outline'}
                      className="h-12 justify-start gap-3"
                      onClick={() => handleSectionChange(item.id)}
                    >
                      <Icon className="h-5 w-5" />
                      {t(item.labelKey)}
                    </Button>
                  );
                })}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
