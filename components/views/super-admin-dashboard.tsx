'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Package,
  RefreshCw,
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuperAdminDashboard } from '@/lib/dashboard/api';
import type {
  CompanyHealthMetric,
  PriorityAlert,
  SuperAdminDashboardResponse,
} from '@/lib/dashboard/types';
import {
  getDashboardPeriodRange,
  type DashboardPeriodPreset,
  type DateRange,
} from '@/lib/dashboard-period';
import { useAuthStore } from '@/lib/auth/store';
import { formatMoney } from '@/lib/commissions';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type RiskLevel = 'critical' | 'warning' | 'info';

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'var(--muted-foreground)',
  PAID: 'var(--chart-3)',
  AWAITING_DROP_OFF: 'var(--warning)',
  RECEIVED_AT_COLLECTION_POINT: 'var(--chart-1)',
  READY_FOR_TRANSPORT: 'var(--chart-4)',
  IN_TRANSIT: 'var(--warning)',
  ARRIVED_DESTINATION_POINT: 'var(--chart-2)',
  READY_FOR_PICKUP: 'var(--chart-5)',
  DELIVERED: 'var(--success)',
  CANCELLED: 'var(--destructive)',
  RETURNED: 'var(--destructive)',
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
  const token = useAuthStore((state) => state.token);
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('CURRENT_MONTH');
  const [periodRange, setPeriodRange] = useState<DateRange>(() =>
    getDashboardPeriodRange('CURRENT_MONTH'),
  );
  const [dashboard, setDashboard] = useState<SuperAdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getSuperAdminDashboard(token, {
        startDate: formatApiDate(periodRange.from),
        endDate: formatApiDate(periodRange.to),
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  }, [periodRange.from, periodRange.to, t, token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const snapshot = useMemo(() => mapSuperAdminDashboard(dashboard, t), [dashboard, t]);

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

        <div className="flex flex-col gap-2 sm:items-end">
          <DashboardPeriodFilter
            preset={periodPreset}
            range={periodRange}
            referenceDate={new Date()}
            onChange={handlePeriodChange}
          />
          {error && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadDashboard()}>
              <RefreshCw className="h-4 w-4" />
              {t('common.retry')}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          loading={loading}
          icon={Building2}
          title={t('superAdmin.overview.metrics.companies')}
          value={snapshot.metrics.companies.toString()}
          detail={t('superAdmin.overview.metrics.companiesDetail')}
        />
        <MetricCard
          loading={loading}
          icon={Package}
          title={t('superAdmin.overview.metrics.shipments')}
          value={snapshot.metrics.shipments.toString()}
          detail={t('superAdmin.overview.metrics.shipmentsDetail')}
        />
        <MetricCard
          loading={loading}
          icon={WalletCards}
          title={t('superAdmin.overview.metrics.platformRevenue')}
          value={formatMoney(snapshot.metrics.platformRevenue)}
          detail={t('superAdmin.overview.metrics.platformRevenueDetail')}
        />
        <MetricCard
          loading={loading}
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
                        {company.status} - {company.shipments}{' '}
                        {t('superAdmin.overview.companyHealth.shipments')}
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
                    <span>{company.deliveryRate}% livraison</span>
                    <span>{formatMoney(company.revenue)}</span>
                  </div>
                </div>
              ))}
              {!snapshot.companyHealth.length && (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t('common.noResults')}
                </p>
              )}
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
  loading,
}: {
  icon: ElementType;
  title: string;
  value: string;
  detail: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 shrink-0 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground sm:text-3xl">
          {loading ? <span className="inline-block h-8 w-20 animate-pulse rounded bg-secondary" /> : value}
        </div>
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

function mapSuperAdminDashboard(
  dashboard: SuperAdminDashboardResponse | null,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const metrics = dashboard?.metrics;
  const operations = dashboard?.operations;

  return {
    metrics: {
      companies: round(metrics?.companyCount),
      shipments: round(metrics?.shipmentCount),
      platformRevenue: round(metrics?.platformRevenue),
      deliveryRate: round(metrics?.deliveryRatePercent),
      exceptionRate: round(metrics?.exceptionRatePercent),
    },
    trends: {
      volume: (dashboard?.shipmentVolumeByDay ?? []).map((item) => ({
        name: formatChartDate(item.date),
        colis: round(item.shipmentCount),
      })),
      revenue: (dashboard?.platformRevenueByDay ?? []).map((item) => ({
        name: formatChartDate(item.date),
        revenue: round(item.platformRevenue),
      })),
    },
    statusDistribution: (dashboard?.statusDistribution ?? []).map((item) => ({
      name: item.label ?? item.key ?? '-',
      value: round(item.count),
      color: getStatusColor(item),
    })),
    companyHealth: (dashboard?.companyHealth ?? []).map(mapCompanyHealth),
    risks: (dashboard?.priorityAlerts ?? []).map(mapPriorityAlert),
    operations: [
      {
        label: t('superAdmin.overview.operations.users'),
        value: round(operations?.totalUserCount),
        description: t('superAdmin.overview.operations.usersDetail'),
        icon: Users,
        colorClassName: 'bg-primary/15 text-primary',
      },
      {
        label: t('superAdmin.overview.operations.transit'),
        value: round(operations?.inTransitShipmentCount),
        description: t('superAdmin.overview.operations.transitDetail'),
        icon: Truck,
        colorClassName: 'bg-warning/15 text-warning',
      },
      {
        label: t('superAdmin.overview.operations.paidCommissions'),
        value: round(operations?.paidCommissionCount),
        description: t('superAdmin.overview.operations.paidCommissionsDetail'),
        icon: CreditCard,
        colorClassName: 'bg-success/15 text-success',
      },
      {
        label: t('superAdmin.overview.operations.maintenance'),
        value: round(operations?.maintenanceVehicleCount),
        description: t('superAdmin.overview.operations.maintenanceDetail'),
        icon: ShieldAlert,
        colorClassName: 'bg-destructive/15 text-destructive',
      },
      {
        label: t('superAdmin.overview.operations.delivered'),
        value: round(operations?.deliveredShipmentCount),
        description: t('superAdmin.overview.operations.deliveredDetail'),
        icon: CheckCircle2,
        colorClassName: 'bg-chart-2/15 text-chart-2',
      },
      {
        label: t('superAdmin.overview.operations.exceptions'),
        value: round(operations?.exceptionShipmentCount),
        description: t('superAdmin.overview.operations.exceptionsDetail'),
        icon: AlertTriangle,
        colorClassName: 'bg-destructive/15 text-destructive',
      },
    ],
  };
}

function mapCompanyHealth(company: CompanyHealthMetric) {
  const score = round(company.healthScorePercent);
  return {
    id: String(company.companyId),
    name: company.companyName ?? '-',
    status: company.statusLabel ?? '-',
    score,
    shipments: round(company.shipmentCount),
    revenue: round(company.platformRevenue),
    deliveryRate: round(company.deliveryRatePercent),
    risk: getRiskLevel(score, round(company.exceptionRatePercent), !company.exploitable),
  };
}

function mapPriorityAlert(alert: PriorityAlert) {
  const count = round(alert.count);
  const percentage = round(alert.percentage);
  const level: RiskLevel = alert.available === false || count > 0 ? 'warning' : 'info';

  return {
    id: alert.key ?? alert.label ?? String(count),
    level,
    title: alert.label ?? '-',
    value: percentage > 0 ? `${percentage}%` : count.toString(),
    detail: alert.description ?? '-',
  };
}

function getRiskLevel(score: number, exceptionRate: number, blocked: boolean): RiskLevel {
  if (blocked || score < 50 || exceptionRate >= 20) return 'critical';
  if (score < 75 || exceptionRate >= 10) return 'warning';
  return 'info';
}

function getStatusColor(item: { key?: string; statuses?: string[] }) {
  const status = item.statuses?.[0] ?? item.key ?? '';
  return STATUS_COLORS[status] ?? 'var(--muted-foreground)';
}

function formatChartDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function round(value?: number) {
  return Math.round(value ?? 0);
}
