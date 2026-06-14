'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardMobileNav } from '@/components/dashboard-mobile-nav';
import { DashboardHeader } from '@/components/dashboard-header';
import { useAuthStore } from '@/lib/auth/store';
import { AdminDashboard } from '@/components/views/admin-dashboard';
import { CollectorDashboard } from '@/components/views/collector-dashboard';
import { FleetManagement } from '@/components/views/fleet-management';
import { PricingEngine } from '@/components/views/pricing-engine';
import { DeliveryEstimatesView } from '@/components/views/delivery-estimates';
import { RouteExceptionsView } from '@/components/views/route-exceptions';
import { BillingSubscriptionView } from '@/components/views/billing-subscription';
import { CommissionManagement } from '@/components/views/commission-management';
import { TeamManagement } from '@/components/views/team-management';
import { ParcelTypesManagement } from '@/components/views/parcel-types-management';
import { TransportModesManagement } from '@/components/views/transport-modes-management';
import { ParcelManagement } from '@/components/views/parcel-management';
import { CollectionPointsView } from '@/components/views/collection-points';
import { CollectionPointsMap } from '@/components/views/collection-points-map';
import { CollectorReception } from '@/components/views/collector-reception';
import { LocalStock } from '@/components/views/local-stock';
import { TransporterTour } from '@/components/views/transporter-tour';
import { TransporterDashboard } from '@/components/views/transporter-dashboard';
import { PickupRequest } from '@/components/views/pickup-request';
import { TransferRequests } from '@/components/views/transfer-requests';
import { SuperAdminManagement } from '@/components/views/super-admin-management';
import { CatalogManagement } from '@/components/views/catalog-management';
import { PlatformFinanceSettings } from '@/components/views/platform-finance-settings';
import { CompanyAnnouncements } from '@/components/views/announcements';
import { DEMO_USERS, type UserRole, type User } from '@/lib/mock-data';
import { isAdminLikeRole } from '@/lib/roles';
import { useStore } from '@/lib/store';
import type { ApiRole } from '@/lib/auth/types';

// Map roles to their default users
const ROLE_USERS: Record<UserRole, User> = {
  SUPER_ADMIN: DEMO_USERS.find((u) => u.role === 'SUPER_ADMIN')!,
  ADMIN: DEMO_USERS.find((u) => u.role === 'ADMIN')!,
  EMPLOYEE: DEMO_USERS.find((u) => u.role === 'EMPLOYEE')!,
  COLLECTOR: DEMO_USERS.find((u) => u.role === 'COLLECTOR')!,
  TRANSPORTER: DEMO_USERS.find((u) => u.role === 'TRANSPORTER')!,
};

// Default section for each role
const DEFAULT_SECTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'dashboard',
  EMPLOYEE: 'dashboard',
  COLLECTOR: 'dashboard',
  TRANSPORTER: 'dashboard',
};

function mapApiRoleToUserRole(role: ApiRole | undefined): UserRole {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN';
    case 'EMPLOYEE_COMPANY':
      return 'EMPLOYEE';
    case 'COLLECTOR':
      return 'COLLECTOR';
    case 'TRANSPORTER':
      return 'TRANSPORTER';
    case 'ADMIN_COMPANY':
    default:
      return 'ADMIN';
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, role: authRole, isHydrated } = useAuthStore();
  const { users } = useStore();
  const didSyncRoleFromAuth = useRef(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  useEffect(() => {
    if (isHydrated && !token) {
      router.replace('/login');
    }
  }, [isHydrated, token, router]);

  useEffect(() => {
    if (!isHydrated || didSyncRoleFromAuth.current) {
      return;
    }

    const mappedRole = mapApiRoleToUserRole(authRole);
    setCurrentRole(mappedRole);
    setActiveSection(DEFAULT_SECTIONS[mappedRole]);
    didSyncRoleFromAuth.current = true;
  }, [authRole, isHydrated]);

  if (!isHydrated || !token) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const currentUser =
    users.find((user) => user.role === currentRole) ?? ROLE_USERS[currentRole];

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setActiveSection(DEFAULT_SECTIONS[role]);
  };

  const renderContent = () => {
    switch (activeSection) {
      // Admin sections
      case 'dashboard':
        if (currentRole === 'COLLECTOR') {
          return <CollectorDashboard currentUser={currentUser} />;
        }

        if (currentRole === 'TRANSPORTER') {
          return <TransporterDashboard currentUser={currentUser} />;
        }

        return <AdminDashboard />;
      case 'fleet':
        return <FleetManagement />;
      case 'pricing':
        return <PricingEngine />;
      case 'delivery-estimates':
        return isAdminLikeRole(currentRole) ? <DeliveryEstimatesView /> : <AdminDashboard />;
      case 'route-exceptions':
        return isAdminLikeRole(currentRole) ? <RouteExceptionsView /> : <AdminDashboard />;
      case 'billing':
        return isAdminLikeRole(currentRole) ? <BillingSubscriptionView /> : <AdminDashboard />;
      case 'commissions':
        return isAdminLikeRole(currentRole) ? <CommissionManagement /> : <AdminDashboard />;
      case 'team':
        return <TeamManagement />;
      case 'parcel-types':
        return isAdminLikeRole(currentRole) ? <ParcelTypesManagement /> : <AdminDashboard />;
      case 'transport-modes':
        return isAdminLikeRole(currentRole) ? <TransportModesManagement /> : <AdminDashboard />;
      case 'parcels':
        return <ParcelManagement currentRole={currentRole} currentUser={currentUser} />;
      case 'collection-points':
        return <CollectionPointsView currentRole={currentRole} currentUser={currentUser} />;
      case 'points-map':
        return <CollectionPointsMap currentRole={currentRole} currentUser={currentUser} />;
      case 'tracking':
        return currentRole === 'TRANSPORTER' ? (
          <TransporterDashboard currentUser={currentUser} />
        ) : (
          <ParcelManagement currentRole={currentRole} currentUser={currentUser} />
        );
      case 'transfer-requests':
        return currentRole === 'COLLECTOR' || currentRole === 'TRANSPORTER' ? (
          <TransferRequests currentRole={currentRole} />
        ) : (
          <AdminDashboard />
        );

      // Collector sections
      case 'reception':
        return <CollectorReception />;
      case 'local-stock':
        return <LocalStock />;

      // Transporter sections
      case 'my-tour':
        return <TransporterTour />;
      case 'pickup-request':
        return <PickupRequest />;

      // Super Admin
      case 'super-admin':
        return <SuperAdminManagement />;
      case 'catalog':
        return <CatalogManagement />;
      case 'platform-finance':
        return <PlatformFinanceSettings />;

      case 'announcements':
        return <CompanyAnnouncements />;

      default:
        return isAdminLikeRole(currentRole) ? (
          <AdminDashboard />
        ) : (
          <CollectorDashboard currentUser={currentUser} />
        );
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <DashboardSidebar
        currentRole={currentRole}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        className="hidden md:flex"
      />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader
          currentUser={currentUser}
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:p-4 md:p-6 md:pb-6">
          {renderContent()}
        </main>
      </div>

      <DashboardMobileNav
        currentRole={currentRole}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
    </div>
  );
}
