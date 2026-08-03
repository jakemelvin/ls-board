'use client';

import { AlertCircle, CheckCircle2, Clock3, CreditCard } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCompanyPlanStatus } from '@/lib/billing/status';
import type { CompanyBillingDashboardResponse } from '@/lib/billing/types';
import type { ApiRole } from '@/lib/auth/types';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface SubscriptionStatusProps {
  dashboard: CompanyBillingDashboardResponse | null;
}

interface SubscriptionStatusBannerProps extends SubscriptionStatusProps {
  role: ApiRole;
  onManageSubscription: () => void;
}

const STATUS_STYLES = {
  ACTIVE: 'border-success/30 bg-success/15 text-success',
  PENDING: 'border-warning/30 bg-warning/15 text-warning',
  INACTIVE: 'border-destructive/30 bg-destructive/10 text-destructive',
} as const;

const STATUS_ICONS = {
  ACTIVE: CheckCircle2,
  PENDING: Clock3,
  INACTIVE: AlertCircle,
} as const;

export function SubscriptionStatusBadge({ dashboard }: SubscriptionStatusProps) {
  const { t } = useTranslation('billing');

  if (!dashboard) return null;

  const status = getCompanyPlanStatus(dashboard);
  const Icon = STATUS_ICONS[status];

  return (
    <Badge
      variant="outline"
      className={cn('h-7 max-w-36 gap-1.5 px-2', STATUS_STYLES[status])}
      data-testid="subscription-status-badge"
    >
      <Icon className="shrink-0" />
      <span className="sm:hidden">{t(`statusBadge.${status}.short`)}</span>
      <span className="hidden sm:inline">{t(`statusBadge.${status}.label`)}</span>
    </Badge>
  );
}

export function SubscriptionStatusBanner({
  dashboard,
  role,
  onManageSubscription,
}: SubscriptionStatusBannerProps) {
  const { t } = useTranslation('billing');

  if (!dashboard) return null;

  const status = getCompanyPlanStatus(dashboard);
  if (status === 'ACTIVE') return null;

  const isCompanyAdmin = role === 'ADMIN_COMPANY';
  const Icon = STATUS_ICONS[status];
  const descriptionKey = isCompanyAdmin
    ? `statusBanner.${status}.adminDescription`
    : `statusBanner.${status}.employeeDescription`;

  return (
    <Alert
      className={cn(
        'mb-4 items-center gap-y-3 sm:grid-cols-[1rem_minmax(0,1fr)_auto]',
        status === 'PENDING'
          ? 'border-warning/40 bg-warning/10'
          : 'border-destructive/30 bg-destructive/5',
      )}
      data-testid="subscription-status-banner"
    >
      <Icon className={status === 'PENDING' ? 'text-warning' : 'text-destructive'} />
      <AlertTitle className="line-clamp-none">
        {dashboard.alertTitle ?? t(`statusBanner.${status}.title`)}
      </AlertTitle>
      <AlertDescription className="col-start-2">
        {isCompanyAdmin && dashboard.alertMessage
          ? dashboard.alertMessage
          : t(descriptionKey)}
      </AlertDescription>
      {isCompanyAdmin && (
        <Button
          size="sm"
          className="col-start-2 mt-1 w-full gap-2 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:w-auto"
          onClick={onManageSubscription}
        >
          <CreditCard className="h-4 w-4" />
          {t(status === 'PENDING' ? 'statusBanner.finishPayment' : 'statusBanner.choosePlan')}
        </Button>
      )}
    </Alert>
  );
}
