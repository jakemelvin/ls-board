'use client';

import { useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Package,
  ShieldAlert,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DashboardPeriodFilter } from '@/components/dashboard-period-filter';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/commissions';
import {
  buildParcelVolumeSeries,
  buildRevenueSeries,
  filterParcelsByPeriod,
  getDashboardPeriodRange,
  getParcelRevenueTotal,
  isDateInRange,
  type DashboardPeriodPreset,
  type DateRange,
} from '@/lib/dashboard-period';
import { useTranslation } from '@/lib/i18n';
import type { Parcel } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type RiskLevel = 'critical' | 'warning' | 'info';

interface SuperAdminDashboardSnapshot {
  metrics: {
    companies: number;
    users: number;
    shipments: number;
    platformRevenue: number;
    deliveryRate: number;
    exceptionRate: number;
  };
  trends: {
    volume: Array<{ name: string; colis: number }>;
    revenue: Array<{ name: string; revenue: number }>;
  };
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  companyHealth: Array<{
    id: string;
    name: string;
    plan: string;
    status: string;
    score: number;
    shipments: number;
    revenue: number;
    risk: RiskLevel;
  }>;
  risks: Array<{
    id: string;
    level: RiskLevel;
    title: string;
    value: string;
    detail: string;
  }>;
  operations: Array<{
    label: string;
    value: number;
    description: string;
    icon: ElementType;
    colorClassName: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'var(--muted-foreground)',
  RECEIVED_AT_COLLECTION_POINT: 'var(--chart-1)',
  IN_TRANSIT: 'var(--warning)',
  ARRIVED_AT_DESTINATION: 'var(--chart-2)',
  DELIVERED: 'var(--success)',
  REJECTED: 'var(--destructive)',
};

const RISK_STYLES: Record<RiskLevel, string> = {
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  info: 'border-primary/30 bg-primary/10 text-primary',
};

const RISK_DOT_STYLES: Record<RiskLevel, string> = {
  critical: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-primary',
};

export function SuperAdminDashboard() {
  const { t } = useTranslation('dashboard');
  const {
    parcels,
    users,
    collectionPoints,
    networkCollectionPoints,
    vehicles,
    transferRequests,
    subscriptionPlans,
    companySubscription,
    subscriptionUsage,
    commissions,
  } = useStore();

  const referenceDate = useMemo(() => getLatestParcelDate(parcels), [parcels]);
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('CURRENT_MONTH');
  const [periodRange, setPeriodRange] = useState<DateRange>(() =>
    getDashboardPeriodRange('CURRENT_MONTH', referenceDate),
  );

  const snapshot = useMemo(
    () =>
      buildSuperAdminDashboardSnapshot({
        t,
        parcels,
        users,
        collectionPoints,
        networkCollectionPoints,
        vehicles,
        transferRequests,
        subscriptionPlans,
        companySubscription,
        subscriptionUsage,
        commissions,
        periodRange,
      }),
    [
      t,
      parcels,
      users,
      collectionPoints,
      networkCollectionPoints,
      vehicles,
      transferRequests,
      subscriptionPlans,
      companySubscription,
      subscriptionUsage,
      commissions,
      periodRange,
    ],
  );

  const handlePeriodChange = (preset: DashboardPeriodPreset, range: DateRange) => {
    setPeriodPreset(preset);
    setPeriodRange(range);
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t('superAdmin.overview.eyebrow')}
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
            {t('superAdmin.overview.title')}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t('superAdmin.overview.subtitle')}
          </p>
        </div>

        <DashboardPeriodFilter
          preset={periodPreset}
          range={periodRange}
          referenceDate={referenceDate}
          onChange={handlePeriodChange}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Building2}
          title={t('superAdmin.overview.metrics.companies')}
          value={snapshot.metrics.companies.toString()}
          detail={t('superAdmin.overview.metrics.companiesDetail')}
        />
        <MetricCard
          icon={Package}
          title={t('superAdmin.overview.metrics.shipments')}
          value={snapshot.metrics.shipments.toString()}
          detail={t('superAdmin.overview.metrics.shipmentsDetail')}
        />
        <MetricCard
          icon={WalletCards}
          title={t('superAdmin.overview.metrics.platformRevenue')}
          value={formatMoney(snapshot.metrics.platformRevenue)}
          detail={t('superAdmin.overview.metrics.platformRevenueDetail')}
        />
        <MetricCard
          icon={TrendingUp}
          title={t('superAdmin.overview.metrics.deliveryRate')}
          value={`${snapshot.metrics.deliveryRate}%`}
          detail={t('superAdmin.overview.metrics.exceptionRate', {
            values: { rate: snapshot.metrics.exceptionRate },
          })}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle>{t('superAdmin.overview.charts.volumeTitle')}</CardTitle>
            <CardDescription>{t('superAdmin.overview.charts.volumeDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshot.trends.volume}>
                  <defs>
                    <linearGradient id="superAdminVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="colis"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#superAdminVolume)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle>{t('superAdmin.overview.charts.statusTitle')}</CardTitle>
            <CardDescription>{t('superAdmin.overview.charts.statusDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={snapshot.statusDistribution.filter((item) => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {snapshot.statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {snapshot.statusDistribution
                .filter((item) => item.value > 0)
                .map((item) => (
                  <div key={item.name} className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle>{t('superAdmin.overview.charts.revenueTitle')}</CardTitle>
            <CardDescription>{t('superAdmin.overview.charts.revenueDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.trends.revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    content={<ChartTooltip formatter={(value) => formatMoney(Number(value))} />}
                  />
                  <Bar dataKey="revenue" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle>{t('superAdmin.overview.companyHealth.title')}</CardTitle>
            <CardDescription>{t('superAdmin.overview.companyHealth.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {snapshot.companyHealth.map((company) => (
                <div key={company.id} className="space-y-2 rounded-xl bg-secondary p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{company.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {company.plan} - {company.shipments} {t('superAdmin.overview.companyHealth.shipments')}
                      </p>
                    </div>
                    <Badge className={cn('shrink-0 border', RISK_STYLES[company.risk])}>
                      {company.score}%
                    </Badge>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        company.risk === 'critical'
                          ? 'bg-destructive'
                          : company.risk === 'warning'
                            ? 'bg-warning'
                            : 'bg-success',
                      )}
                      style={{ width: `${company.score}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{company.status}</span>
                    <span>{formatMoney(company.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>{t('superAdmin.overview.risks.title')}</CardTitle>
            <CardDescription>{t('superAdmin.overview.risks.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {snapshot.risks.map((risk) => (
                <div key={risk.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', RISK_DOT_STYLES[risk.level])}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{risk.title}</p>
                        <span className="shrink-0 text-sm font-bold text-foreground">{risk.value}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{risk.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle>{t('superAdmin.overview.operations.title')}</CardTitle>
            <CardDescription>{t('superAdmin.overview.operations.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {snapshot.operations.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', item.colorClassName)}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xl font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: ElementType;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 shrink-0 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground sm:text-3xl">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string }>;
  label?: string;
  formatter?: (value: number | string) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-semibold text-foreground">
              {formatter ? formatter(item.value ?? 0) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildSuperAdminDashboardSnapshot({
  t,
  parcels,
  users,
  collectionPoints,
  networkCollectionPoints,
  vehicles,
  transferRequests,
  subscriptionPlans,
  companySubscription,
  subscriptionUsage,
  commissions,
  periodRange,
}: {
  t: ReturnType<typeof useTranslation>['t'];
  parcels: ReturnType<typeof useStore.getState>['parcels'];
  users: ReturnType<typeof useStore.getState>['users'];
  collectionPoints: ReturnType<typeof useStore.getState>['collectionPoints'];
  networkCollectionPoints: ReturnType<typeof useStore.getState>['networkCollectionPoints'];
  vehicles: ReturnType<typeof useStore.getState>['vehicles'];
  transferRequests: ReturnType<typeof useStore.getState>['transferRequests'];
  subscriptionPlans: ReturnType<typeof useStore.getState>['subscriptionPlans'];
  companySubscription: ReturnType<typeof useStore.getState>['companySubscription'];
  subscriptionUsage: ReturnType<typeof useStore.getState>['subscriptionUsage'];
  commissions: ReturnType<typeof useStore.getState>['commissions'];
  periodRange: DateRange;
}): SuperAdminDashboardSnapshot {
  const filteredParcels = filterParcelsByPeriod(parcels, periodRange);
  const deliveredParcels = filteredParcels.filter((parcel) => parcel.status === 'DELIVERED').length;
  const rejectedParcels = filteredParcels.filter((parcel) => parcel.status === 'REJECTED').length;
  const exceptions = filteredParcels.filter(
    (parcel) => parcel.status === 'REJECTED' || parcel.senderKyc.verificationStatus === 'PENDING_REVIEW',
  ).length;
  const revenue = getParcelRevenueTotal(filteredParcels);
  const platformFeeRevenue = Math.round(revenue * 0.12);
  const currentPlan = subscriptionPlans.find((plan) => plan.id === companySubscription.planId);
  const subscriptionRevenue = currentPlan?.monthlyPrice ?? 0;
  const commissionCost = commissions
    .filter((commission) => isDateInRange(commission.earnedAt, periodRange))
    .reduce((sum, commission) => sum + commission.commissionAmount, 0);
  const platformRevenue = Math.max(0, platformFeeRevenue + subscriptionRevenue - commissionCost);
  const allCompanyIds = new Set<string>();

  collectionPoints.forEach((point) => {
    if (point.organizationId) {
      allCompanyIds.add(point.organizationId);
    }
  });
  networkCollectionPoints.forEach((point) => allCompanyIds.add(point.organizationId));

  const activeCompanies = Math.max(allCompanyIds.size, 1);
  const deliveryRate =
    filteredParcels.length > 0 ? Math.round((deliveredParcels / filteredParcels.length) * 100) : 0;
  const exceptionRate =
    filteredParcels.length > 0 ? Math.round((exceptions / filteredParcels.length) * 100) : 0;
  const pendingTransfers = transferRequests.filter((request) => request.status === 'PENDING').length;
  const closedPoints = collectionPoints.filter((point) => !point.isOpen).length;
  const maintenanceVehicles = vehicles.filter((vehicle) => vehicle.status === 'MAINTENANCE').length;
  const pendingKyc = filteredParcels.filter(
    (parcel) => parcel.senderKyc.verificationStatus === 'PENDING_REVIEW',
  ).length;
  const quotaLimit = currentPlan?.nationalShipmentLimit ?? null;
  const quotaRate =
    quotaLimit && quotaLimit > 0 ? Math.round((subscriptionUsage.nationalUsed / quotaLimit) * 100) : 0;

  const statusLabels: Record<string, string> = {
    CREATED: t('adminDashboard.status.created'),
    RECEIVED_AT_COLLECTION_POINT: t('adminDashboard.status.received'),
    IN_TRANSIT: t('adminDashboard.status.transit'),
    ARRIVED_AT_DESTINATION: t('adminDashboard.status.arrived'),
    DELIVERED: t('adminDashboard.status.delivered'),
    REJECTED: t('adminDashboard.status.rejected'),
  };

  return {
    metrics: {
      companies: activeCompanies,
      users: users.length,
      shipments: filteredParcels.length,
      platformRevenue,
      deliveryRate,
      exceptionRate,
    },
    trends: {
      volume: buildParcelVolumeSeries(filteredParcels, periodRange),
      revenue: buildRevenueSeries(filteredParcels, periodRange),
    },
    statusDistribution: Object.entries(statusLabels).map(([status, name]) => ({
      name,
      value: filteredParcels.filter((parcel) => parcel.status === status).length,
      color: STATUS_COLORS[status] ?? 'var(--muted-foreground)',
    })),
    companyHealth: [
      {
        id: 'company-sendam',
        name: 'Sendam Express',
        plan: currentPlan?.name ?? t('superAdmin.overview.companyHealth.noPlan'),
        status:
          quotaRate >= 100
            ? t('superAdmin.overview.companyHealth.quotaReached')
            : t('superAdmin.overview.companyHealth.active'),
        score: clamp(92 - closedPoints * 8 - pendingTransfers * 5 - rejectedParcels * 4),
        shipments: filteredParcels.length,
        revenue,
        risk: quotaRate >= 100 || closedPoints > 1 ? 'warning' : 'info',
      },
      {
        id: 'network-urban-drop',
        name: 'Urban Drop',
        plan: t('superAdmin.overview.companyHealth.networkPartner'),
        status: t('superAdmin.overview.companyHealth.pendingReview'),
        score: 68,
        shipments: Math.max(2, Math.round(filteredParcels.length * 0.22)),
        revenue: Math.round(revenue * 0.18),
        risk: 'warning',
      },
      {
        id: 'new-company-onboarding',
        name: 'Nouveau compte onboarding',
        plan: t('superAdmin.overview.companyHealth.trial'),
        status: t('superAdmin.overview.companyHealth.setupIncomplete'),
        score: 42,
        shipments: 0,
        revenue: 0,
        risk: 'critical',
      },
    ],
    risks: [
      {
        id: 'quota',
        level: quotaRate >= 100 ? 'critical' : 'warning',
        title: t('superAdmin.overview.risks.quota.title'),
        value: `${quotaRate}%`,
        detail: t('superAdmin.overview.risks.quota.detail'),
      },
      {
        id: 'closed-points',
        level: closedPoints > 1 ? 'critical' : closedPoints > 0 ? 'warning' : 'info',
        title: t('superAdmin.overview.risks.closedPoints.title'),
        value: closedPoints.toString(),
        detail: t('superAdmin.overview.risks.closedPoints.detail'),
      },
      {
        id: 'pending-transfers',
        level: pendingTransfers > 1 ? 'warning' : 'info',
        title: t('superAdmin.overview.risks.pendingTransfers.title'),
        value: pendingTransfers.toString(),
        detail: t('superAdmin.overview.risks.pendingTransfers.detail'),
      },
      {
        id: 'kyc',
        level: pendingKyc > 0 ? 'warning' : 'info',
        title: t('superAdmin.overview.risks.kyc.title'),
        value: pendingKyc.toString(),
        detail: t('superAdmin.overview.risks.kyc.detail'),
      },
    ],
    operations: [
      {
        label: t('superAdmin.overview.operations.users'),
        value: users.length,
        description: t('superAdmin.overview.operations.usersDetail'),
        icon: Users,
        colorClassName: 'bg-primary/15 text-primary',
      },
      {
        label: t('superAdmin.overview.operations.transit'),
        value: filteredParcels.filter((parcel) => parcel.status === 'IN_TRANSIT').length,
        description: t('superAdmin.overview.operations.transitDetail'),
        icon: Truck,
        colorClassName: 'bg-warning/15 text-warning',
      },
      {
        label: t('superAdmin.overview.operations.paidCommissions'),
        value: commissions.filter((commission) => commission.status === 'PAID').length,
        description: t('superAdmin.overview.operations.paidCommissionsDetail'),
        icon: CreditCard,
        colorClassName: 'bg-success/15 text-success',
      },
      {
        label: t('superAdmin.overview.operations.maintenance'),
        value: maintenanceVehicles,
        description: t('superAdmin.overview.operations.maintenanceDetail'),
        icon: ShieldAlert,
        colorClassName: 'bg-destructive/15 text-destructive',
      },
      {
        label: t('superAdmin.overview.operations.delivered'),
        value: deliveredParcels,
        description: t('superAdmin.overview.operations.deliveredDetail'),
        icon: CheckCircle2,
        colorClassName: 'bg-chart-2/15 text-chart-2',
      },
      {
        label: t('superAdmin.overview.operations.exceptions'),
        value: exceptions,
        description: t('superAdmin.overview.operations.exceptionsDetail'),
        icon: AlertTriangle,
        colorClassName: 'bg-destructive/15 text-destructive',
      },
    ],
  };
}

function getLatestParcelDate(parcels: Parcel[]) {
  return (
    parcels.reduce<Date | null>((latestDate, parcel) => {
      if (!latestDate || parcel.createdAt.getTime() > latestDate.getTime()) {
        return parcel.createdAt;
      }

      return latestDate;
    }, null) ?? new Date()
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
