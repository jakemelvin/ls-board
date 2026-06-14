import { Briefcase, MapPin, Shield, ShieldCheck, Truck } from 'lucide-react';
import type { UserRole } from '@/lib/mock-data';

export const ADMIN_LIKE_ROLES: UserRole[] = ['ADMIN', 'EMPLOYEE'];
export const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'COLLECTOR', 'TRANSPORTER'];

export const ROLE_CONFIG: Record<
  UserRole,
  {
    label: string;
    translationKey: string;
    icon: React.ElementType;
    color: string;
    badgeColor: string;
    surfaceColor: string;
  }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    translationKey: 'roles.superAdmin',
    icon: ShieldCheck,
    color: 'bg-violet-600 text-white',
    badgeColor: 'bg-violet-600/20 text-violet-400',
    surfaceColor: 'bg-violet-600/20 text-violet-400',
  },
  ADMIN: {
    label: 'Admin Entreprise',
    translationKey: 'roles.adminCompany',
    icon: Shield,
    color: 'bg-primary text-primary-foreground',
    badgeColor: 'bg-primary/20 text-primary',
    surfaceColor: 'bg-primary/20 text-primary',
  },
  EMPLOYEE: {
    label: 'Employe',
    translationKey: 'roles.employee',
    icon: Briefcase,
    color: 'bg-chart-1 text-foreground',
    badgeColor: 'bg-chart-1/20 text-chart-1',
    surfaceColor: 'bg-chart-1/20 text-chart-1',
  },
  COLLECTOR: {
    label: 'Collecteur',
    translationKey: 'roles.collector',
    icon: MapPin,
    color: 'bg-chart-2 text-foreground',
    badgeColor: 'bg-chart-2/20 text-chart-2',
    surfaceColor: 'bg-chart-2/20 text-chart-2',
  },
  TRANSPORTER: {
    label: 'Transporteur',
    translationKey: 'roles.transporter',
    icon: Truck,
    color: 'bg-warning text-warning-foreground',
    badgeColor: 'bg-warning/20 text-warning',
    surfaceColor: 'bg-warning/20 text-warning',
  },
};

export function isAdminLikeRole(role: UserRole) {
  return ADMIN_LIKE_ROLES.includes(role);
}
