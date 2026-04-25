'use client';

import { useState } from 'react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { AdminDashboard } from '@/components/views/admin-dashboard';
import { FleetManagement } from '@/components/views/fleet-management';
import { PricingEngine } from '@/components/views/pricing-engine';
import { TeamManagement } from '@/components/views/team-management';
import { ParcelManagement } from '@/components/views/parcel-management';
import { CollectionPointsView } from '@/components/views/collection-points';
import { CollectorReception } from '@/components/views/collector-reception';
import { LocalStock } from '@/components/views/local-stock';
import { TransporterTour } from '@/components/views/transporter-tour';
import { PickupRequest } from '@/components/views/pickup-request';
import { TransferRequests } from '@/components/views/transfer-requests';
import { DEMO_USERS, type UserRole, type User } from '@/lib/mock-data';

// Map roles to their default users
const ROLE_USERS: Record<UserRole, User> = {
  ADMIN: DEMO_USERS.find((u) => u.role === 'ADMIN')!,
  COLLECTOR: DEMO_USERS.find((u) => u.role === 'COLLECTOR')!,
  TRANSPORTER: DEMO_USERS.find((u) => u.role === 'TRANSPORTER')!,
};

// Default section for each role
const DEFAULT_SECTIONS: Record<UserRole, string> = {
  ADMIN: 'dashboard',
  COLLECTOR: 'reception',
  TRANSPORTER: 'my-tour',
};

export default function DashboardPage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  const currentUser = ROLE_USERS[currentRole];

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setActiveSection(DEFAULT_SECTIONS[role]);
  };

  const renderContent = () => {
    switch (activeSection) {
      // Admin sections
      case 'dashboard':
        return <AdminDashboard />;
      case 'fleet':
        return <FleetManagement />;
      case 'pricing':
        return <PricingEngine />;
      case 'team':
        return <TeamManagement />;
      case 'parcels':
        return <ParcelManagement />;
      case 'collection-points':
        return <CollectionPointsView />;
      case 'tracking':
        return <ParcelManagement />;
      case 'transfer-requests':
        return <TransferRequests currentRole={currentRole} />;

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

      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <DashboardSidebar
        currentRole={currentRole}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader
          currentUser={currentUser}
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
