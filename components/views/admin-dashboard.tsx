'use client';

import { useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { AlertTriangle, DollarSign, MapPin, Package, TrendingUp, Truck, Users } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatCollectionPointLoadRatio,
  getCollectionPointSaturationRate,
} from '@/lib/collection-point-capacity';
import { formatMoney } from '@/lib/commissions';
import {
  buildParcelVolumeSeries,
  buildRevenueSeries,
  filterParcelsByPeriod,
  getDashboardPeriodRange,
  getParcelRevenueTotal,
  type DashboardPeriodPreset,
  type DateRange,
} from '@/lib/dashboard-period';
import type { Parcel } from '@/lib/mock-data';
import { useStore } from '@/lib/store';

export function AdminDashboard() {
  const { parcels, collectionPoints, vehicles, users } = useStore();
  const referenceDate = useMemo(() => getLatestParcelDate(parcels), [parcels]);
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('CURRENT_MONTH');
  const [periodRange, setPeriodRange] = useState<DateRange>(() =>
    getDashboardPeriodRange('CURRENT_MONTH', referenceDate)
  );

  const filteredParcels = useMemo(
    () => filterParcelsByPeriod(parcels, periodRange),
    [parcels, periodRange]
  );
  const totalParcels = filteredParcels.length;
  const deliveredParcels = filteredParcels.filter((parcel) => parcel.status === 'DELIVERED').length;
  const rejectedParcels = filteredParcels.filter((parcel) => parcel.status === 'REJECTED').length;
  const deliveryRate = totalParcels > 0 ? Math.round((deliveredParcels / totalParcels) * 100) : 0;
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'IN_TRANSIT').length;
  const revenue = getParcelRevenueTotal(filteredParcels);
  const saturationRate =
    collectionPoints.length > 0
      ? Math.round(
          collectionPoints.reduce(
            (sum, point) => sum + getCollectionPointSaturationRate(point, parcels),
            0
          ) / collectionPoints.length
        )
      : 0;

  const volumeData = useMemo(
    () => buildParcelVolumeSeries(filteredParcels, periodRange),
    [filteredParcels, periodRange]
  );
  const revenueData = useMemo(
    () => buildRevenueSeries(filteredParcels, periodRange),
    [filteredParcels, periodRange]
  );

  const statusDistribution = [
    { name: 'Cree', value: filteredParcels.filter((p) => p.status === 'CREATED').length, color: 'var(--muted)' },
    {
      name: 'Recu',
      value: filteredParcels.filter((p) => p.status === 'RECEIVED_AT_COLLECTION_POINT').length,
      color: 'var(--chart-1)',
    },
    { name: 'Transit', value: filteredParcels.filter((p) => p.status === 'IN_TRANSIT').length, color: 'var(--warning)' },
    {
      name: 'Arrive',
      value: filteredParcels.filter((p) => p.status === 'ARRIVED_AT_DESTINATION').length,
      color: 'var(--chart-2)',
    },
    { name: 'Livre', value: deliveredParcels, color: 'var(--success)' },
    { name: 'Rejete', value: rejectedParcels, color: 'var(--destructive)' },
  ];

  const handlePeriodChange = (preset: DashboardPeriodPreset, range: DateRange) => {
    setPeriodPreset(preset);
    setPeriodRange(range);
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tableau de bord</h2>
          <p className="text-muted-foreground">
            Analyse operationnelle filtree par periode pour suivre l'activite de l'entreprise.
          </p>
        </div>
        <DashboardPeriodFilter
          preset={periodPreset}
          range={periodRange}
          referenceDate={referenceDate}
          onChange={handlePeriodChange}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Colis sur la periode</CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalParcels}</div>
            <p className="mt-1 flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3" />
              Donnees issues des colis crees
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatMoney(revenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Base: prix d'expedition estime</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taux de livraison</CardTitle>
            <Truck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{deliveryRate}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {deliveredParcels}/{totalParcels} colis livres
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saturation Points</CardTitle>
            <MapPin className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{saturationRate}%</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${saturationRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Volume de Colis</CardTitle>
            <CardDescription>Evolution sur la periode selectionnee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="colorColis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'var(--foreground)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="colis"
                    stroke="var(--primary)"
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
            <CardTitle className="text-foreground">Revenus</CardTitle>
            <CardDescription>Chiffre d'affaires par jour sur la periode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    formatter={(value) => [formatMoney(Number(value)), 'Revenus']}
                  />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Distribution des Statuts</CardTitle>
            <CardDescription>Repartition des colis sur la periode</CardDescription>
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
                    {statusDistribution.filter((item) => item.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
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
            <CardTitle className="text-foreground">Points de Collecte</CardTitle>
            <CardDescription>Saturation actuelle par point</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {collectionPoints.map((point) => {
                const saturation = getCollectionPointSaturationRate(point, parcels);
                return (
                  <div key={point.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{point.name}</span>
                      <span className="text-muted-foreground">
                        {formatCollectionPointLoadRatio(point, parcels)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full transition-all ${
                          saturation > 80 ? 'bg-destructive' : saturation > 50 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${saturation}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Apercu Rapide</CardTitle>
            <CardDescription>Ressources et alertes sur la periode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <QuickStat
                icon={Truck}
                iconClassName="bg-primary/20 text-primary"
                title="Vehicules actifs"
                description="En circulation"
                value={activeVehicles}
              />
              <QuickStat
                icon={Users}
                iconClassName="bg-chart-2/20 text-chart-2"
                title="Membres d'equipe"
                description="Total equipe"
                value={users.length}
              />
              <QuickStat
                icon={AlertTriangle}
                iconClassName="bg-destructive/20 text-destructive"
                title="Colis rejetes"
                description="Sur la periode"
                value={rejectedParcels}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
