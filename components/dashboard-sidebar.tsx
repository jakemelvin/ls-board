'use client';

import {
  LayoutDashboard,
  Package,
  Truck,
  MapPin,
  Users,
  Settings,
  DollarSign,
  ClipboardList,
  Warehouse,
  ArrowRightLeft,
  Route,
  PackageCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/mock-data';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ADMIN', 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'parcels', label: 'Gestion des Colis', icon: Package, roles: ['ADMIN', 'COLLECTOR'] },
  { id: 'tracking', label: 'Suivi des Étapes', icon: ClipboardList, roles: ['ADMIN', 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'transfer-requests', label: 'Demandes de Prise', icon: ArrowRightLeft, roles: ['ADMIN', 'COLLECTOR', 'TRANSPORTER'] },
  { id: 'fleet', label: 'Gestion de Flotte', icon: Truck, roles: ['ADMIN'] },
  { id: 'collection-points', label: 'Points de Collecte', icon: MapPin, roles: ['ADMIN'] },
  { id: 'pricing', label: 'Moteur de Tarification', icon: DollarSign, roles: ['ADMIN'] },
  { id: 'team', label: 'Gestion d\'Équipe', icon: Users, roles: ['ADMIN'] },
  // Collector specific
  { id: 'reception', label: 'Flux de Réception', icon: PackageCheck, roles: ['COLLECTOR'] },
  { id: 'local-stock', label: 'Stock Local', icon: Warehouse, roles: ['COLLECTOR'] },
  // Transporter specific
  { id: 'my-tour', label: 'Ma Tournée', icon: Route, roles: ['TRANSPORTER'] },
  { id: 'pickup-request', label: 'Demande de Prise', icon: ArrowRightLeft, roles: ['TRANSPORTER'] },
];

interface DashboardSidebarProps {
  currentRole: UserRole;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function DashboardSidebar({ currentRole, activeSection, onSectionChange }: DashboardSidebarProps) {
  const filteredItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-sidebar-foreground">Express</h1>
          <p className="text-xs text-muted-foreground">Logistics</p>
        </div>
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

      {/* Settings */}
      <div className="border-t border-sidebar-border p-4">
        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          <Settings className="h-5 w-5" />
          Paramètres
        </button>
      </div>
    </aside>
  );
}
