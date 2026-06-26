'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ElementType } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Coins,
  MapPin,
  Package,
  RefreshCw,
  Route,
  Truck,
  Weight,
} from 'lucide-react';

import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/lib/auth/store';
import { formatMoney } from '@/lib/commissions';
import { getTransporterDashboard } from '@/lib/dashboard/api';
import type { CommissionSummary, TransporterDashboardResponse } from '@/lib/dashboard/types';
import { useTranslation } from '@/lib/i18n';
import type { User } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface TransporterDashboardProps {
  currentUser: User;
}

export function TransporterDashboard({ currentUser }: TransporterDashboardProps) {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((state) => state.token);
  const [dashboard, setDashboard] = useState<TransporterDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      setDashboard(await getTransporterDashboard(token));
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const vehicle = dashboard?.vehicle;
  const metrics = dashboard?.metrics;
  const commissions = dashboard?.commissions;
  const displayName = dashboard?.transporterUsername ?? currentUser.name;
  const loadRate = round(metrics?.loadRatePercent ?? vehicle?.loadRatePercent);
  const currentWeight = metrics?.currentWeightKg ?? vehicle?.currentWeightKg ?? 0;
  const maxWeight = vehicle?.maxWeightKg ?? 0;

  if (!loading && !error && !vehicle) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
          <Truck className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-semibold text-foreground">Aucun vehicule assigne</p>
            <p className="text-sm text-muted-foreground">
              Ce transporteur n&apos;a pas encore de vehicule rattache dans l&apos;equipe.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tableau de bord transporteur</h2>
          <p className="text-muted-foreground">
            {vehicle?.type ?? displayName}
            {vehicle?.immatriculation ? ` - ${vehicle.immatriculation}` : ''}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Charge actuelle</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {currentWeight.toFixed(1)} / {maxWeight.toFixed(1)} kg
          </p>
        </div>
      </div>

      {(error || loading) && (
        <Card className={cn('border-border bg-card', error && 'border-destructive/30 bg-destructive/10')}>
          <CardContent className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className={cn('flex items-center gap-3', error ? 'text-destructive' : 'text-muted-foreground')}>
              {error ? <AlertTriangle className="h-5 w-5" /> : <RefreshCw className="h-5 w-5 animate-spin" />}
              <span>{error ?? 'Chargement du dashboard transporteur...'}</span>
            </div>
            {error && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadDashboard()}>
                <RefreshCw className="h-4 w-4" />
                {t('common.retry')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          icon={ArrowRightLeft}
          iconClassName="bg-warning/20 text-warning"
          value={round(metrics?.acceptedRequestsToLoadCount)}
          label="Demandes acceptees a charger"
        />
        <DashboardMetric
          icon={Package}
          iconClassName="bg-primary/20 text-primary"
          value={round(metrics?.onboardShipmentCount)}
          label="Colis a bord"
        />
        <DashboardMetric
          icon={Route}
          iconClassName="bg-chart-2/20 text-chart-2"
          value={round(metrics?.completedTripCount)}
          label="Trajets completes"
        />
        <DashboardMetric
          icon={CheckCircle2}
          iconClassName="bg-success/20 text-success"
          value={round(metrics?.deliveredShipmentCount)}
          label="Colis deja livres"
        />
      </div>

      {commissions && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Coins className="h-5 w-5 text-primary" />
              Mes commissions
            </CardTitle>
            <CardDescription>Montants generes par les trajets traites par le backend.</CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionGrid commissions={commissions} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Vehicule et disponibilite</CardTitle>
            <CardDescription>Etat de charge du vehicule assigne.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{vehicle?.immatriculation ?? '-'}</p>
                    <p className="text-sm text-muted-foreground">{vehicle?.type ?? '-'}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-lg px-2 py-1 text-xs font-medium',
                    vehicle?.status === 'DISPONIBLE'
                      ? 'bg-success/20 text-success'
                      : vehicle?.status === 'EN_TRANSIT'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-destructive/20 text-destructive',
                  )}
                >
                  {vehicle?.status ?? '-'}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Weight className="h-5 w-5 text-chart-1" />
                  <div>
                    <p className="font-medium text-foreground">Taux de charge</p>
                    <p className="text-sm text-muted-foreground">
                      {currentWeight.toFixed(1)} kg transportes actuellement
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{loadRate}%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    'h-full transition-all',
                    loadRate > 85 ? 'bg-destructive' : loadRate > 60 ? 'bg-warning' : 'bg-success',
                  )}
                  style={{ width: `${Math.min(loadRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Demandes a charger</CardTitle>
            <CardDescription>Demandes acceptees par les collecteurs et renvoyees par l'API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dashboard?.acceptedRequestsToLoad ?? []).map((request) => (
              <div key={request.requestId} className="rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {request.originCollectionPointName ?? 'Point de collecte'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Collecteur: {request.collectorUsername ?? '-'}
                    </p>
                  </div>
                  <span className="rounded-lg bg-chart-2/20 px-2 py-1 text-xs font-medium text-chart-2">
                    {request.status ?? '-'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>{round(request.shipmentCount)} colis</span>
                  <span>{round(request.pendingShipmentCount)} en attente</span>
                  <span>{formatDate(request.createdAt)}</span>
                </div>
              </div>
            ))}
            {!dashboard?.acceptedRequestsToLoad?.length && (
              <EmptyState label="Aucune demande acceptee a charger pour le moment." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Colis actuellement a bord</CardTitle>
          <CardDescription>Vue rapide sur votre tournee active.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Reference</TableHead>
                <TableHead className="text-muted-foreground">Expediteur</TableHead>
                <TableHead className="text-muted-foreground">Destinataire</TableHead>
                <TableHead className="text-muted-foreground">Destination</TableHead>
                <TableHead className="text-muted-foreground">Poids</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dashboard?.onboardShipments ?? []).map((shipment) => (
                <TableRow key={shipment.shipmentId} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground">
                        {shipment.shipmentReference ?? `#${shipment.shipmentId}`}
                      </span>
                      {shipment.shipmentReference && (
                        <CopyTrackingNumberButton trackingNumber={shipment.shipmentReference} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{shipment.senderFullName ?? '-'}</TableCell>
                  <TableCell className="text-foreground">{shipment.receiverFullName ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{shipment.destinationCollectionPointName ?? '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{round(shipment.weightKg)} kg</TableCell>
                  <TableCell>
                    <span className="rounded-lg bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                      {shipment.status ?? '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!dashboard?.onboardShipments?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    Aucun colis actuellement charge dans ce vehicule.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardMetric({
  icon: Icon,
  iconClassName,
  value,
  label,
}: {
  icon: ElementType;
  iconClassName: string;
  value: number;
  label: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CommissionGrid({ commissions }: { commissions: CommissionSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <InfoTile title="Taux configure" value={`${round(commissions.configuredPercentage)}%`} />
      <InfoTile title="A payer" value={formatMoney(round(commissions.pendingAmount))} />
      <InfoTile title="Deja paye" value={formatMoney(round(commissions.paidAmount))} />
      <InfoTile title="Colis commissionnes" value={round(commissions.commissionedShipmentCount).toString()} />
    </div>
  );
}

function InfoTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
}

function round(value?: number) {
  return Math.round(value ?? 0);
}
