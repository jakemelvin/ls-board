'use client';

import type { ElementType } from 'react';
import {
  ArrowRightLeft,
  Ban,
  Boxes,
  Clock3,
  CreditCard,
  DollarSign,
  HandCoins,
  LayoutDashboard,
  Map,
  MapPin,
  Megaphone,
  Bell,
  Package,
  PackageCheck,
  PackageSearch,
  PackageOpen,
  ReceiptText,
  Route,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
  Waypoints,
} from 'lucide-react';

import { CompanyBrand } from '@/components/company-brand';
import { SendamLogo } from '@/components/sendam-logo';
import type { CompanyResponse } from '@/lib/auth/types';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import type { UserRole } from '@/lib/mock-data';
import { ADMIN_LIKE_ROLES } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  labelKey: string;
  icon: ElementType;
  roles: UserRole[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', labelKey: 'shell.sections.dashboard', icon: LayoutDashboard, roles: [...ADMIN_LIKE_ROLES, 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'points-map', labelKey: 'shell.sections.pointsMap', icon: Map, roles: [...ADMIN_LIKE_ROLES, 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'parcels', labelKey: 'shell.sections.parcels', icon: Package, roles: [...ADMIN_LIKE_ROLES, 'COLLECTOR'] },
  { id: 'transfer-requests', labelKey: 'shell.sections.transferRequests', icon: ArrowRightLeft, roles: ['COLLECTOR', 'TRANSPORTER'] },
  { id: 'fleet', labelKey: 'shell.sections.fleet', icon: Truck, roles: ADMIN_LIKE_ROLES },
  { id: 'collection-points', labelKey: 'shell.sections.collectionPoints', icon: MapPin, roles: ADMIN_LIKE_ROLES },
  { id: 'parcel-types', labelKey: 'shell.sections.parcelTypes', icon: Boxes, roles: ADMIN_LIKE_ROLES },
  { id: 'transport-modes', labelKey: 'shell.sections.transportModes', icon: Waypoints, roles: ADMIN_LIKE_ROLES },
  { id: 'pricing', labelKey: 'shell.sections.pricing', icon: DollarSign, roles: ADMIN_LIKE_ROLES },
  { id: 'delivery-estimates', labelKey: 'shell.sections.deliveryEstimates', icon: Clock3, roles: ADMIN_LIKE_ROLES },
  { id: 'route-exceptions', labelKey: 'shell.sections.routeExceptions', icon: Ban, roles: ADMIN_LIKE_ROLES },
  { id: 'billing', labelKey: 'shell.sections.billing', icon: CreditCard, roles: ADMIN_LIKE_ROLES },
  { id: 'financial-operations', labelKey: 'shell.sections.financialOperations', icon: ReceiptText, roles: ADMIN_LIKE_ROLES },
  { id: 'commissions', labelKey: 'shell.sections.commissions', icon: HandCoins, roles: [...ADMIN_LIKE_ROLES, 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'pickups', labelKey: 'shell.sections.pickups', icon: PackageOpen, roles: ADMIN_LIKE_ROLES },
  { id: 'team', labelKey: 'shell.sections.team', icon: Users, roles: ADMIN_LIKE_ROLES },
  { id: 'reception', labelKey: 'shell.sections.reception', icon: PackageCheck, roles: ['COLLECTOR'] },
  { id: 'local-stock', labelKey: 'shell.sections.localStock', icon: Warehouse, roles: ['COLLECTOR'] },
  { id: 'my-tour', labelKey: 'shell.sections.myTour', icon: Route, roles: ['TRANSPORTER'] },
  { id: 'pickup-request', labelKey: 'shell.sections.pickupRequest', icon: ArrowRightLeft, roles: ['TRANSPORTER'] },
  { id: 'announcements', labelKey: 'shell.sections.announcements', icon: Megaphone, roles: ADMIN_LIKE_ROLES },
  { id: 'notifications', labelKey: 'shell.sections.notifications', icon: Bell, roles: ['SUPER_ADMIN', ...ADMIN_LIKE_ROLES, 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'company-profile', labelKey: 'shell.sections.companyProfile', icon: Settings, roles: ADMIN_LIKE_ROLES },
];

interface DashboardSidebarProps {
  currentRole: UserRole;
  activeSection: string;
  onSectionChange: (section: string) => void;
  company?: CompanyResponse | null;
  className?: string;
}

export function DashboardSidebar({
  currentRole,
  activeSection,
  onSectionChange,
  company,
  className,
}: DashboardSidebarProps) {
  const authRole = useAuthStore((s) => s.role);
  const { t } = useTranslation('dashboard');
  const filteredItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className={cn('flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar', className)}>
      <div className="border-b border-sidebar-border px-5 py-4">
        <SendamLogo className="h-12" />
        {company && <CompanyBrand company={company} className="mt-3" />}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {t(item.labelKey)}
            </button>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-4">
        {(authRole === 'SUPER_ADMIN' || currentRole === 'SUPER_ADMIN') && (
          <>
            <button
              onClick={() => onSectionChange('super-admin')}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                activeSection === 'super-admin'
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <ShieldCheck className="h-5 w-5" />
              {t('shell.sections.administration')}
            </button>
            <button
              onClick={() => onSectionChange('catalog')}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                activeSection === 'catalog'
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <Boxes className="h-5 w-5" />
              {t('shell.sections.catalog')}
            </button>
            <button
              onClick={() => onSectionChange('super-admin-shipments')}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                activeSection === 'super-admin-shipments'
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <PackageSearch className="h-5 w-5" />
              {t('shell.sections.platformShipments')}
            </button>
            <button
              onClick={() => onSectionChange('platform-finance')}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                activeSection === 'platform-finance'
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <CreditCard className="h-5 w-5" />
              {t('shell.sections.platformFinance')}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
