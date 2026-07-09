'use client';

import { useRouter } from 'next/navigation';

import { CompanyBrand } from '@/components/company-brand';
import { DashboardProfileMenu } from '@/components/dashboard-profile-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { SendamLogo } from '@/components/sendam-logo';
import { logout } from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import type { CompanyResponse } from '@/lib/auth/types';
import type { User } from '@/lib/mock-data';

interface DashboardHeaderProps {
  currentUser: User;
  company?: CompanyResponse | null;
}

const MOBILE_APP_LOGO_ROLES = new Set<User['role']>([
  'SUPER_ADMIN',
  'COLLECTOR',
  'TRANSPORTER',
]);

export function DashboardHeader({
  currentUser,
  company,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { token, clearAuth } = useAuthStore();
  const shouldShowMobileAppLogo =
    !company && MOBILE_APP_LOGO_ROLES.has(currentUser.role);

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
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:min-h-16 sm:gap-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {company && (
          <CompanyBrand
            company={company}
            variant="header"
            className="flex max-w-[min(58vw,14rem)]"
          />
        )}
        {shouldShowMobileAppLogo && (
          <SendamLogo className="flex max-w-[min(58vw,12.75rem)] md:hidden" />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {token && <NotificationBell token={token} />}

        <DashboardProfileMenu currentUser={currentUser} onLogout={() => void handleLogout()} />
      </div>
    </header>
  );
}
