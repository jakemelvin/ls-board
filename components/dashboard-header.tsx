'use client';

import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut } from 'lucide-react';

import { LanguageSwitcher } from '@/components/language-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import type { User, UserRole } from '@/lib/mock-data';
import { ALL_ROLES, ROLE_CONFIG } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  currentUser: User;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export function DashboardHeader({ currentUser, currentRole, onRoleChange }: DashboardHeaderProps) {
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
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {t('shell.demoMode')}
        </span>
        <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-secondary p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            3
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="h-10 w-10 rounded-xl">
            {currentUser.profilePhotoUrl && (
              <AvatarImage src={currentUser.profilePhotoUrl} alt={currentUser.name} />
            )}
            <AvatarFallback className="rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              {currentUser.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </div>

        <button
          onClick={handleLogout}
          title={t('shell.logout')}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
