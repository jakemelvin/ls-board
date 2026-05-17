'use client';

import type { ElementType } from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  CreditCard,
  HandCoins,
  MapPin,
  Map,
  Users,
  Settings,
  DollarSign,
  ClipboardList,
  Warehouse,
  ArrowRightLeft,
  Route,
  PackageCheck,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/mock-data';
import { ADMIN_LIKE_ROLES } from '@/lib/roles';
import { SendamLogo } from '@/components/sendam-logo';
import { useAuthStore } from '@/lib/auth/store';

interface SidebarItem {
  id: string;
  label: string;
  icon: ElementType;
  roles: UserRole[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: [...ADMIN_LIKE_ROLES, 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'points-map', label: 'Carte des Points', icon: Map, roles: [...ADMIN_LIKE_ROLES, 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'parcels', label: 'Gestion des Colis', icon: Package, roles: [...ADMIN_LIKE_ROLES, 'COLLECTOR'] },
  { id: 'tracking', label: 'Gestion des Colis', icon: ClipboardList, roles: [...ADMIN_LIKE_ROLES, 'TRANSPORTER'] },
  { id: 'transfer-requests', label: 'Demandes de Prise', icon: ArrowRightLeft, roles: [...ADMIN_LIKE_ROLES, 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'fleet', label: 'Gestion de Flotte', icon: Truck, roles: ADMIN_LIKE_ROLES },
  { id: 'collection-points', label: 'Gestion Territoriale', icon: MapPin, roles: ADMIN_LIKE_ROLES },
  { id: 'pricing', label: 'Moteur de Tarification', icon: DollarSign, roles: ADMIN_LIKE_ROLES },
  { id: 'billing', label: 'Facturation', icon: CreditCard, roles: ADMIN_LIKE_ROLES },
  { id: 'commissions', label: 'Commissions', icon: HandCoins, roles: ADMIN_LIKE_ROLES },
  { id: 'team', label: 'Gestion d\'Équipe', icon: Users, roles: ADMIN_LIKE_ROLES },
  // Collector specific
  { id: 'reception', label: 'Flux de Réception', icon: PackageCheck, roles: ['COLLECTOR'] },
  { id: 'local-stock', label: 'Stock Local', icon: Warehouse, roles: ['COLLECTOR'] },
  // Transporter specific
  { id: 'my-tour', label: 'Ma Tournée', icon: Route, roles: ['TRANSPORTER'] },
  { id: 'pickup-request', label: 'Nouvelle Demande', icon: ArrowRightLeft, roles: ['TRANSPORTER'] },
  // Admin/Employee specific
  { id: 'announcements', label: 'Annonces de Départ', icon: Megaphone, roles: ADMIN_LIKE_ROLES },
];

interface DashboardSidebarProps {
  currentRole: UserRole;
  activeSection: string;
  onSectionChange: (section: string) => void;
  className?: string;
}

export function DashboardSidebar({
  currentRole,
  activeSection,
  onSectionChange,
  className,
}: DashboardSidebarProps) {
  const authRole = useAuthStore((s) => s.role);
  const filteredItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className={cn('flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar', className)}>
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-sidebar-border px-5">
        <SendamLogo />
      </div>

      {/* Navigation */}
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
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Settings + Super Admin */}
      <div className="border-t border-sidebar-border p-4 space-y-1">
        {authRole === 'SUPER_ADMIN' && (
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
            Administration
          </button>
        )}
        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          <Settings className="h-5 w-5" />
          Paramètres
        </button>
      </div>
    </aside>
  );
}
