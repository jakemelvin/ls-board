'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardMobileNav } from '@/components/dashboard-mobile-nav';
import { DashboardHeader } from '@/components/dashboard-header';
import { useAuthStore } from '@/lib/auth/store';
import { AdminDashboard } from '@/components/views/admin-dashboard';
import { CollectorDashboard } from '@/components/views/collector-dashboard';
import { FleetManagement } from '@/components/views/fleet-management';
import { PricingEngine } from '@/components/views/pricing-engine';
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
import { CompanyAnnouncements } from '@/components/views/announcements';
import { DEMO_USERS, type UserRole, type User } from '@/lib/mock-data';
import { isAdminLikeRole } from '@/lib/roles';
import { useStore } from '@/lib/store';

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

export default function DashboardPage() {
  const router = useRouter();
  const { token, isHydrated } = useAuthStore();
  const { users } = useStore();
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  useEffect(() => {
    if (isHydrated && !token) {
      router.replace('/login');
    }
  }, [isHydrated, token, router]);

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
        return <ParcelManagement currentRole={currentRole} currentUser={currentUser} />;
      case 'transfer-requests':
        return <TransferRequests currentRole={currentRole} currentUser={currentUser} />;

      // Collector sections
      case 'reception':
        return <CollectorReception />;
      case 'local-stock':
        return <LocalStock currentUser={currentUser} />;

      // Transporter sections
      case 'my-tour':
        return <TransporterTour currentUser={currentUser} />;
      case 'pickup-request':
        return <PickupRequest currentUser={currentUser} />;

      // Super Admin
      case 'super-admin':
        return <SuperAdminManagement />;
      case 'catalog':
        return <CatalogManagement />;

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
