'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  AlertTriangle,
  DollarSign,
  Eye,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
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

import { OperationalReadinessDialog } from '@/components/company/operational-readiness';
import { DashboardPeriodFilter } from '@/components/dashboard-period-filter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCompanyOperationalReadiness } from '@/lib/admin/api';
import { useLatestRequest } from '@/hooks/use-latest-request';
import type { CompanyOperationalReadiness } from '@/lib/admin/types';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useCompanyContext } from '@/lib/company/use-company';
import { formatMoney } from '@/lib/commissions';
import { getCompanyDashboard } from '@/lib/dashboard/api';
import {
  DASHBOARD_CHART_COLORS,
  getStatusDistributionChartColor,
} from '@/lib/dashboard/chart-colors';
import type { CompanyDashboardResponse } from '@/lib/dashboard/types';
import {
  formatDashboardDateParam,
  getDashboardPeriodRange,
  type DashboardPeriodPreset,
  type DateRange,
} from '@/lib/dashboard-period';
import { useTranslation } from '@/lib/i18n';

const referenceDate = new Date();

export function AdminDashboard() {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((state) => state.token);
  const {
    status: companyStatus,
    company,
    error: companyError,
    retry: retryCompany,
  } = useCompanyContext();
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('CURRENT_MONTH');
  const [periodRange, setPeriodRange] = useState<DateRange>(() =>
    getDashboardPeriodRange('CURRENT_MONTH', referenceDate),
  );
  const [dashboard, setDashboard] = useState<CompanyDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();
  const companyId = company?.id;

  const loadDashboard = useCallback(async () => {
    if (!token || companyStatus !== 'resolved' || !companyId) {
      setLoading(companyStatus === 'loading');
      return;
    }

    const requestId = beginRequest();

    setLoading(true);
    setError(null);

    try {
      const response = await getCompanyDashboard(token, companyId, {
        startDate: formatDashboardDateParam(periodRange.from),
        endDate: formatDashboardDateParam(periodRange.to),
      });
      if (isLatestRequest(requestId)) setDashboard(response);
    } catch (err) {
      if (isLatestRequest(requestId)) {
        setDashboard(null);
        setError(err instanceof Error ? err.message : t('common.genericError'));
      }
    } finally {
      if (isLatestRequest(requestId)) setLoading(false);
    }
  }, [beginRequest, companyId, companyStatus, isLatestRequest, periodRange.from, periodRange.to, t, token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totalParcels = formatCount(dashboard?.shipmentCount);
  const deliveredParcels = formatCount(dashboard?.deliveredShipmentCount);
  const rejectedParcels = formatCount(dashboard?.quickOverview?.rejectedShipmentCount);
  const deliveryRate = numberValue(dashboard?.deliveryRatePercent);
  const activeVehicles = formatCount(dashboard?.quickOverview?.activeVehicleCount);
  const availableVehicles = formatCount(dashboard?.quickOverview?.availableVehicleCount);
  const teamMembers = formatCount(dashboard?.quickOverview?.teamMemberCount);
  const activeTeamMembers = formatCount(dashboard?.quickOverview?.activeTeamMemberCount);
  const revenue = numberValue(dashboard?.estimatedRevenue);
  const saturationRate = numberValue(dashboard?.collectionPointSaturationPercent);

  const volumeData = useMemo(
    () =>
      (dashboard?.shipmentVolumeByDay ?? []).map((item) => ({
        name: formatChartDate(item.date),
        colis: formatCount(item.shipmentCount),
      })),
    [dashboard?.shipmentVolumeByDay],
  );
  const revenueData = useMemo(
    () =>
      (dashboard?.revenueByDay ?? []).map((item) => ({
        name: formatChartDate(item.date),
        revenue: getDailyRevenue(item),
      })),
    [dashboard?.revenueByDay],
  );
  const statusDistribution = useMemo(
    () =>
      (dashboard?.statusDistribution ?? []).map((item) => ({
        name: item.label ?? item.key ?? '-',
        value: formatCount(item.count),
        color: getStatusDistributionChartColor(item),
      })),
    [dashboard?.statusDistribution],
  );

  const handlePeriodChange = (preset: DashboardPeriodPreset, range: DateRange) => {
    setPeriodPreset(preset);
    setPeriodRange(range);
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('adminDashboard.title')}</h2>
          <p className="text-muted-foreground">{t('adminDashboard.subtitle')}</p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <OperationalReadinessButton />
            <DashboardPeriodFilter
              preset={periodPreset}
              range={periodRange}
              referenceDate={referenceDate}
              onChange={handlePeriodChange}
            />
          </div>
        </div>
      </div>

      {(error || companyError) && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex flex-col gap-3 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <span>{error ?? companyError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (companyStatus === 'error' || companyStatus === 'forbidden') {
                  retryCompany();
                } else {
                  void loadDashboard();
                }
              }}
            >
              <RefreshCw className="h-4 w-4" />
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          loading={loading}
          icon={Package}
          title={t('adminDashboard.metrics.parcels.title')}
          value={totalParcels.toString()}
          description={t('adminDashboard.metrics.parcels.description')}
          descriptionIcon={TrendingUp}
        />
        <MetricCard
          loading={loading}
          icon={DollarSign}
          title={t('adminDashboard.metrics.revenue.title')}
          value={formatMoney(revenue)}
          description={t('adminDashboard.metrics.revenue.description')}
        />
        <MetricCard
          loading={loading}
          icon={Truck}
          title={t('adminDashboard.metrics.deliveryRate.title')}
          value={formatPercent(deliveryRate)}
          description={t('adminDashboard.metrics.deliveryRate.description', {
            values: { delivered: deliveredParcels, total: totalParcels },
          })}
        />
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('adminDashboard.metrics.saturation.title')}
            </CardTitle>
            <MapPin className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? <MetricSkeleton /> : formatPercent(saturationRate)}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${clampPercent(saturationRate)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{t('adminDashboard.charts.volume.title')}</CardTitle>
            <CardDescription>{t('adminDashboard.charts.volume.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="colorColis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={DASHBOARD_CHART_COLORS.volume} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={DASHBOARD_CHART_COLORS.volume} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="colis"
                    stroke={DASHBOARD_CHART_COLORS.volume}
                    strokeWidth={2}
                    fill="url(#colorColis)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{t('adminDashboard.charts.revenue.title')}</CardTitle>
            <CardDescription>{t('adminDashboard.charts.revenue.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    content={<ChartTooltip formatter={(value) => formatMoney(Number(value))} />}
                  />
                  <Bar dataKey="revenue" fill={DASHBOARD_CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{t('adminDashboard.statusDistribution.title')}</CardTitle>
            <CardDescription>{t('adminDashboard.statusDistribution.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution.filter((item) => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.filter((item) => item.value > 0).map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {statusDistribution.filter((item) => item.value > 0).map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{t('adminDashboard.collectionPoints.title')}</CardTitle>
            <CardDescription>{t('adminDashboard.collectionPoints.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboard?.collectionPoints ?? []).map((point) => {
                const saturation = numberValue(point.saturationPercent);
                return (
                  <div key={point.collectionPointId}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-foreground">
                        {point.collectionPointName ?? '-'}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatCapacity(point.currentLoad)} / {formatCapacity(point.maxCapacity)} {point.capacityUnit ?? ''}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full transition-all ${
                          saturation > 80 ? 'bg-destructive' : saturation > 50 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${clampPercent(saturation)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {!dashboard?.collectionPoints?.length && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {t('common.noResults')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{t('adminDashboard.quickStats.title')}</CardTitle>
            <CardDescription>{t('adminDashboard.quickStats.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <QuickStat
                icon={Truck}
                iconClassName="bg-primary/20 text-primary"
                title={t('adminDashboard.quickStats.activeVehicles.title')}
                description={t('adminDashboard.quickStats.activeVehicles.description', {
                  values: { available: availableVehicles },
                })}
                value={activeVehicles}
              />
              <QuickStat
                icon={Users}
                iconClassName="bg-chart-2/20 text-chart-2"
                title={t('adminDashboard.quickStats.teamMembers.title')}
                description={t('adminDashboard.quickStats.teamMembers.description', {
                  values: { active: activeTeamMembers, total: teamMembers },
                })}
                value={teamMembers}
              />
              <QuickStat
                icon={AlertTriangle}
                iconClassName="bg-destructive/20 text-destructive"
                title={t('adminDashboard.quickStats.rejectedParcels.title')}
                description={t('adminDashboard.quickStats.rejectedParcels.description')}
                value={rejectedParcels}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  descriptionIcon: DescriptionIcon,
  title,
  description,
  value,
  loading,
}: {
  icon: ElementType;
  descriptionIcon?: ElementType;
  title: string;
  description: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{loading ? <MetricSkeleton /> : value}</div>
        <p className="mt-1 flex items-center text-xs text-muted-foreground">
          {DescriptionIcon && <DescriptionIcon className="mr-1 h-3 w-3" />}
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function QuickStat({
  icon: Icon,
  iconClassName,
  title,
  description,
  value,
}: {
  icon: ElementType;
  iconClassName: string;
  title: string;
  description: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
  );
}

function OperationalReadinessButton() {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((state) => state.token);
  const { status, company, error: companyError, retry } = useCompanyContext();
  const [loading, setLoading] = useState(false);
  const [dialogData, setDialogData] = useState<CompanyOperationalReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    if (!token) {
      setError(t('adminDashboard.readiness.errors.sessionExpired'));
      return;
    }

    if (status === 'error') {
      retry();
      setError(companyError ?? t('adminDashboard.readiness.errors.companyResolveFailed'));
      return;
    }

    if (status !== 'resolved' || !company) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const readiness = await getCompanyOperationalReadiness(token, company.id);
      setDialogData(readiness);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('adminDashboard.readiness.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [company, companyError, retry, status, t, token]);

  const disabled = loading || status === 'loading' || status === 'empty' || status === 'forbidden';

  return (
    <>
      <OperationalReadinessDialog data={dialogData} onClose={() => setDialogData(null)} />

      <div className="flex flex-col gap-1 sm:items-end">
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleOpen}
          disabled={disabled}
          title={
            status === 'forbidden'
              ? t('adminDashboard.readiness.forbidden')
              : status === 'empty'
                ? t('adminDashboard.readiness.empty')
                : undefined
          }
        >
          {loading || status === 'loading' ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          <span>{t('adminDashboard.readiness.button')}</span>
          {!loading && status === 'resolved' && <Eye className="h-4 w-4" />}
        </Button>

        {error && <p className="text-xs text-destructive sm:text-right">{error}</p>}
      </div>
    </>
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

function MetricSkeleton() {
  return <span className="inline-block h-8 w-20 animate-pulse rounded bg-secondary" />;
}

function formatChartDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function getDailyRevenue(item: {
  platformRevenue?: number;
  estimatedRevenue?: number;
  grossShipmentRevenue?: number;
  revenue?: number;
  amount?: number;
}) {
  return numberValue(
    item.platformRevenue ?? item.estimatedRevenue ?? item.grossShipmentRevenue ?? item.revenue ?? item.amount,
  );
}

function numberValue(value?: number | string | null) {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCount(value?: number | null) {
  return Math.round(numberValue(value));
}

function formatCapacity(value?: number | null) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(numberValue(value));
}

function formatPercent(value?: number | null) {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
  }).format(numberValue(value))}%`;
}

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}
