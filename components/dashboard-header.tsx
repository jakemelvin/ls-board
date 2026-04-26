'use client';

import { Bell, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User, UserRole } from '@/lib/mock-data';
import { ALL_ROLES, ROLE_CONFIG } from '@/lib/roles';

interface DashboardHeaderProps {
  currentUser: User;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export function DashboardHeader({ currentUser, currentRole, onRoleChange }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Role Switcher (Demo) */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Mode démo :</span>
        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          {ALL_ROLES.map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            const isActive = currentRole === role;

            return (
              <button
                key={role}
                onClick={() => onRoleChange(role)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  isActive
                    ? config.color
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            3
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            {currentUser.avatar}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
