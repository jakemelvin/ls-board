'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useCompanyContext } from '@/lib/company/use-company';
import type { CompanyResponse } from '@/lib/admin/types';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface ToastState {
  msg: string;
  type: 'success' | 'error';
}

export function useToastSimple() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return {
    toast,
    success: (msg: string) => setToast({ msg, type: 'success' }),
    error: (msg: string) => setToast({ msg, type: 'error' }),
  };
}

export function ToastBar({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        'fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg md:bottom-6 md:left-auto md:right-6 md:translate-x-0',
        toast.type === 'success'
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0" />
      )}
      {toast.msg}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {confirmLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StatusState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'muted',
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'muted' | 'warning' | 'destructive';
}) {
  const toneCls =
    tone === 'warning'
      ? 'bg-warning/10 text-warning'
      : tone === 'destructive'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground';
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', toneCls)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Resolves the active company and only renders `children` once a single company
 * is known. Handles loading, forbidden and empty states.
 */
export function CompanyGuard({
  children,
}: {
  children: (ctx: { companyId: number; company: CompanyResponse }) => ReactNode;
}) {
  const { status, company, error, retry } = useCompanyContext();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <StatusState
        icon={ShieldAlert}
        tone="warning"
        title="Entreprise introuvable"
        description={error ?? "Impossible de déterminer votre entreprise avec ce compte."}
      />
    );
  }

  if (status === 'empty') {
    return (
      <StatusState
        icon={Info}
        title="Aucune entreprise"
        description="Aucune entreprise n'est encore enregistrée."
      />
    );
  }

  if (status === 'error' || !company) {
    return (
      <StatusState
        icon={XCircle}
        tone="destructive"
        title="Erreur de chargement"
        description={error ?? 'Une erreur est survenue.'}
        action={
          <Button variant="outline" onClick={retry}>
            Réessayer
          </Button>
        }
      />
    );
  }

  return <>{children({ companyId: company.id, company })}</>;
}
