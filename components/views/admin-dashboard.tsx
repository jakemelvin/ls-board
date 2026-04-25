'use client';

import { Package, TrendingUp, DollarSign, MapPin, Truck, Users, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useStore } from '@/lib/store';
import { getStatusLabel } from '@/lib/mock-data';

const volumeData = [
  { name: 'Lun', colis: 45 },
  { name: 'Mar', colis: 52 },
  { name: 'Mer', colis: 38 },
  { name: 'Jeu', colis: 65 },
  { name: 'Ven', colis: 78 },
  { name: 'Sam', colis: 42 },
  { name: 'Dim', colis: 28 },
];

const revenueData = [
  { name: 'Jan', revenue: 12500 },
  { name: 'Fev', revenue: 15200 },
  { name: 'Mar', revenue: 18700 },
  { name: 'Avr', revenue: 16300 },
  { name: 'Mai', revenue: 21000 },
  { name: 'Juin', revenue: 24500 },
];

export function AdminDashboard() {
  const { parcels, collectionPoints, vehicles, users } = useStore();

  const totalParcels = parcels.length;
  const deliveredParcels = parcels.filter((p) => p.status === 'DELIVERED').length;
  const deliveryRate = totalParcels > 0 ? Math.round((deliveredParcels / totalParcels) * 100) : 0;
  const activeVehicles = vehicles.filter((v) => v.status === 'IN_TRANSIT').length;
  const totalCapacity = collectionPoints.reduce((sum, p) => sum + p.capacity, 0);
  const currentStock = collectionPoints.reduce((sum, p) => sum + p.currentStock, 0);
  const saturationRate = totalCapacity > 0 ? Math.round((currentStock / totalCapacity) * 100) : 0;

  const statusDistribution = [
    { name: 'Cree', value: parcels.filter((p) => p.status === 'CREATED').length, color: 'var(--muted)' },
    { name: 'Recu', value: parcels.filter((p) => p.status === 'RECEIVED_AT_COLLECTION_POINT').length, color: 'var(--chart-1)' },
    { name: 'Transit', value: parcels.filter((p) => p.status === 'IN_TRANSIT').length, color: 'var(--warning)' },
    { name: 'Arrive', value: parcels.filter((p) => p.status === 'ARRIVED_AT_DESTINATION').length, color: 'var(--chart-2)' },
    { name: 'Livre', value: parcels.filter((p) => p.status === 'DELIVERED').length, color: 'var(--success)' },
    { name: 'Rejete', value: parcels.filter((p) => p.status === 'REJECTED').length, color: 'var(--destructive)' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Colis du jour</CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalParcels}</div>
            <p className="mt-1 flex items-center text-xs text-success">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12% vs hier
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chiffre d&apos;affaires</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">24,580 EUR</div>
            <p className="mt-1 flex items-center text-xs text-success">
              <TrendingUp className="mr-1 h-3 w-3" />
              +8% ce mois
            </p>
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

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Volume Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Volume de Colis</CardTitle>
            <CardDescription>Evolution hebdomadaire</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
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
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
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

        {/* Revenue Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Revenus Mensuels</CardTitle>
            <CardDescription>Evolution sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
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
                    formatter={(value) => [`${value} EUR`, 'Revenus']}
                  />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Distribution */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Distribution des Statuts</CardTitle>
            <CardDescription>Repartition actuelle des colis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.filter((d) => d.value > 0).map((entry, index) => (
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
              {statusDistribution.filter((d) => d.value > 0).map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Collection Points Status */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Points de Collecte</CardTitle>
            <CardDescription>Saturation par point</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {collectionPoints.map((point) => {
                const saturation = Math.round((point.currentStock / point.capacity) * 100);
                return (
                  <div key={point.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{point.name}</span>
                      <span className="text-muted-foreground">
                        {point.currentStock}/{point.capacity}
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

        {/* Quick Stats */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Apercu Rapide</CardTitle>
            <CardDescription>Ressources actives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Vehicules actifs</p>
                    <p className="text-xs text-muted-foreground">En circulation</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{activeVehicles}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/20">
                    <Users className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Employes</p>
                    <p className="text-xs text-muted-foreground">Total equipe</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{users.length}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Colis rejetes</p>
                    <p className="text-xs text-muted-foreground">Ce mois</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {parcels.filter((p) => p.status === 'REJECTED').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
