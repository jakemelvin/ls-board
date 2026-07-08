'use client';

import { useRouter } from 'next/navigation';

import { CompanyBrand } from '@/components/company-brand';
import { DashboardProfileMenu } from '@/components/dashboard-profile-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { logout } from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import type { CompanyResponse } from '@/lib/auth/types';
import { useTranslation } from '@/lib/i18n';
import type { User, UserRole } from '@/lib/mock-data';
import { ALL_ROLES, ROLE_CONFIG } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  currentUser: User;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  company?: CompanyResponse | null;
}

export function DashboardHeader({
  currentUser,
  currentRole,
  onRoleChange,
  company,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { token, clearAuth } = useAuthStore();
  const { t } = useTranslation('dashboard');

  const handleLogout = async () => {
    if (token) {
      await logout(token).catch(() => {
        // Clear the local session even if the backend logout endpoint is unavailable.
      });
    }
    clearAuth();
    router.replace('/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 pt-[env(safe-area-inset-top)] sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {company && (
          <CompanyBrand
            company={company}
            variant="header"
            className="flex max-w-[min(52vw,13rem)] md:hidden"
          />
        )}
        <span
          className={cn(
            'hidden text-sm text-muted-foreground',
            company ? 'md:inline' : 'sm:inline',
          )}
        >
          {t('shell.demoMode')}
        </span>
        <div
          className={cn(
            'min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-secondary p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            company ? 'hidden md:flex' : 'flex',
          )}
        >
          {ALL_ROLES.map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            const isActive = currentRole === role;

            return (
              <button
                key={role}
                onClick={() => onRoleChange(role)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all sm:px-3',
                  isActive
                    ? config.color
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(config.translationKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <LanguageSwitcher />

        {token && <NotificationBell token={token} />}

        <DashboardProfileMenu currentUser={currentUser} onLogout={() => void handleLogout()} />
      </div>
    </header>
  );
}
