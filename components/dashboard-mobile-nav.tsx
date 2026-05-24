'use client';

import { Boxes, LayoutDashboard, Map, Menu, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SIDEBAR_ITEMS } from '@/components/dashboard-sidebar';
import type { UserRole } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/store';

interface DashboardMobileNavProps {
  currentRole: UserRole;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const primaryItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'points-map', label: 'Carte', icon: Map },
];

const SUPER_ADMIN_ITEMS = [
  { id: 'super-admin', label: 'Administration', icon: ShieldCheck },
  { id: 'catalog', label: 'Catalogue', icon: Boxes },
];

export function DashboardMobileNav({
  currentRole,
  activeSection,
  onSectionChange,
}: DashboardMobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const authRole = useAuthStore((s) => s.role);
  const isSuperAdmin = authRole === 'SUPER_ADMIN' || currentRole === 'SUPER_ADMIN';
  const availableItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(currentRole));
  const isMenuActive = !primaryItems.some((item) => item.id === activeSection);

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {primaryItems.map((item) => {
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
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
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
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="px-4 pb-2 pt-5 text-left">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Acces rapide aux sections disponibles pour votre role.</SheetDescription>
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
                  {item.label}
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
                      {item.label}
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
