'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Coins,
  ExternalLink,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';

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
import { getCollectorDashboard } from '@/lib/dashboard/api';
import type { CollectorDashboardResponse, OpeningHourSnapshot } from '@/lib/dashboard/types';
import { useTranslation } from '@/lib/i18n';
import type { User } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface CollectorDashboardProps {
  currentUser: User;
}

export function CollectorDashboard({ currentUser }: CollectorDashboardProps) {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((state) => state.token);
  const [dashboard, setDashboard] = useState<CollectorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      setDashboard(await getCollectorDashboard(token));
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

  const point = dashboard?.collectionPoint;
  const metrics = dashboard?.metrics;
  const commissions = dashboard?.commissions;
  const displayName = dashboard?.collectorUsername ?? currentUser.name;
  const locationMapUrl = getLocationMapUrl(dashboard?.location);

  if (!loading && !error && !point) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-semibold text-foreground">Aucun point assigne</p>
            <p className="text-sm text-muted-foreground">
              Ce collecteur n&apos;a pas encore de point de collecte rattache.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tableau de bord collecteur</h2>
          <p className="text-muted-foreground">
            {point?.name ?? displayName}
            {point?.cityName ? ` - ${point.cityName}` : ''}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 lg:min-w-80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Disponibilite du point</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatOpeningHours(point?.openingHours)}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium',
                point?.openNow ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning',
              )}
            >
              {point?.availabilityStatus ?? (point?.openNow ? 'OPEN' : 'CLOSED')}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Capacite</span>
            <span className="font-semibold text-foreground">
              {round(point?.currentLoad)} / {round(point?.maxCapacity)} {point?.capacityUnit ?? ''}
            </span>
          </div>
        </div>
      </div>

      {(error || loading) && (
        <Card className={cn('border-border bg-card', error && 'border-destructive/30 bg-destructive/10')}>
          <CardContent className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className={cn('flex items-center gap-3', error ? 'text-destructive' : 'text-muted-foreground')}>
              {error ? <AlertTriangle className="h-5 w-5" /> : <RefreshCw className="h-5 w-5 animate-spin" />}
              <span>{error ?? 'Chargement du dashboard collecteur...'}</span>
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
          icon={Package}
          iconClassName="bg-warning/20 text-warning"
          value={round(metrics?.pendingReceptionCount)}
          label="Receptions a valider"
        />
        <DashboardMetric
          icon={Warehouse}
          iconClassName="bg-primary/20 text-primary"
          value={round(metrics?.localStockCount)}
          label="Colis en stock local"
        />
        <DashboardMetric
          icon={ArrowRightLeft}
          iconClassName="bg-chart-1/20 text-chart-1"
          value={round(metrics?.pendingPickupRequestCount)}
          label="Demandes de prise en attente"
        />
        <DashboardMetric
          icon={CheckCircle2}
          iconClassName="bg-success/20 text-success"
          value={round(metrics?.arrivedAtPointCount)}
          label="Colis arrives au point"
        />
      </div>

      {commissions && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Coins className="h-5 w-5 text-primary" />
              Mes commissions
            </CardTitle>
            <CardDescription>Montants generes par les operations associees a votre point.</CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionGrid commissions={commissions} />
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-foreground">{t('collectorDashboard.location.title')}</CardTitle>
            <CardDescription>{t('collectorDashboard.location.description')}</CardDescription>
          </div>
          {locationMapUrl && (
            <Button variant="outline" className="gap-2" asChild>
              <a href={locationMapUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                {t('collectorDashboard.location.openMap')}
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <PointLocationMap
            location={dashboard?.location}
            address={formatPointAddress(point)}
            updatedAt={formatDateTime(dashboard?.location?.lastUpdatedAt)}
            t={t}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Priorites immediates</CardTitle>
            <CardDescription>Elements renvoyes par le backend pour guider le traitement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(dashboard?.priorities ?? []).map((priority) => (
              <div key={priority.key ?? priority.label} className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{priority.label ?? '-'}</p>
                      <p className="text-sm text-muted-foreground">{priority.description ?? '-'}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-foreground">{round(priority.count)}</span>
                </div>
              </div>
            ))}
            {!dashboard?.priorities?.length && <EmptyState label={t('common.noResults')} />}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Dernieres operations</CardTitle>
            <CardDescription>Operations recentes confirmees par l'API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dashboard?.recentOperations ?? []).map((operation) => (
              <div key={`${operation.type}-${operation.shipmentId}-${operation.operatedAt}`} className="rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {operation.shipmentReference ?? `#${operation.shipmentId ?? '-'}`}
                  </p>
                  <span className="rounded-lg bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                    {operation.label ?? operation.type ?? '-'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{operation.collectionPointName ?? point?.name ?? '-'}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{formatDateTime(operation.operatedAt)}</span>
                </div>
              </div>
            ))}
            {!dashboard?.recentOperations?.length && <EmptyState label="Aucune operation recente." />}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Receptions en attente</CardTitle>
          <CardDescription>Colis clients a verifier en priorite.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {(dashboard?.pendingReceptions ?? []).map((shipment) => (
              <div key={shipment.shipmentId} className="rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-foreground">
                      {shipment.shipmentReference ?? `#${shipment.shipmentId}`}
                    </p>
                    <p className="mt-1 truncate text-sm text-foreground">{shipment.senderFullName ?? '-'}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                    {round(shipment.weightKg)} kg
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <span>{shipment.senderKycDocumentsAvailable ? 'Documents disponibles' : 'KYC a verifier'}</span>
                  <span className="truncate">{shipment.destinationCollectionPointName ?? '-'}</span>
                </div>
              </div>
            ))}
            {!dashboard?.pendingReceptions?.length && (
              <EmptyState label="Aucun colis client en attente de validation." />
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Reference</TableHead>
                  <TableHead className="text-muted-foreground">Expediteur</TableHead>
                  <TableHead className="text-muted-foreground">KYC</TableHead>
                  <TableHead className="text-muted-foreground">Destination</TableHead>
                  <TableHead className="text-muted-foreground">Poids</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboard?.pendingReceptions ?? []).map((shipment) => (
                  <TableRow key={shipment.shipmentId} className="border-border">
                    <TableCell className="font-mono text-foreground">
                      {shipment.shipmentReference ?? `#${shipment.shipmentId}`}
                    </TableCell>
                    <TableCell className="text-foreground">{shipment.senderFullName ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {shipment.senderKycDocumentsAvailable ? 'Documents disponibles' : 'A verifier'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {shipment.destinationCollectionPointName ?? '-'}
                    </TableCell>
                    <TableCell className="text-foreground">{round(shipment.weightKg)} kg</TableCell>
                  </TableRow>
                ))}
                {!dashboard?.pendingReceptions?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      Aucun colis client en attente de validation.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
  icon: React.ElementType;
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

function CommissionGrid({ commissions }: { commissions: NonNullable<CollectorDashboardResponse['commissions']> }) {
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

function formatOpeningHours(hours?: OpeningHourSnapshot[]) {
  const firstOpen = hours?.find((hour) => !hour.closed && hour.openingTime && hour.closingTime);
  if (!firstOpen) return 'Horaires indisponibles';
  return `${firstOpen.openingTime} - ${firstOpen.closingTime}`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR');
}

function round(value?: number) {
  return Math.round(value ?? 0);
}

function PointLocationMap({
  location,
  address,
  updatedAt,
  t,
}: {
  location?: CollectorDashboardResponse['location'];
  address: string;
  updatedAt: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const previewUrl = getLocationPreviewUrl(location);

  if (!previewUrl) {
    return <EmptyState label={t('collectorDashboard.location.unavailable')} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-secondary/20">
      <div className="relative h-64 min-h-0 bg-secondary md:h-72">
        <iframe
          title={t('collectorDashboard.location.previewTitle')}
          src={previewUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/85 to-transparent p-4">
          <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-sm shadow-sm">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-foreground">{address}</span>
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-t border-border p-4 text-sm md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('collectorDashboard.location.address')}
          </p>
          <p className="mt-1 font-medium text-foreground">{address}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('collectorDashboard.location.updatedAt')}
          </p>
          <p className="mt-1 font-medium text-foreground">{updatedAt}</p>
        </div>
      </div>
    </div>
  );
}

function hasLocationCoordinates(
  location?: CollectorDashboardResponse['location'],
): location is CollectorDashboardResponse['location'] & { latitude: number; longitude: number } {
  return typeof location?.latitude === 'number' && typeof location.longitude === 'number';
}

function getLocationMapUrl(location?: CollectorDashboardResponse['location']) {
  if (location?.mapUrl) {
    return location.mapUrl;
  }

  if (!hasLocationCoordinates(location)) {
    return undefined;
  }

  return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
}

function getLocationPreviewUrl(location?: CollectorDashboardResponse['location']) {
  if (!hasLocationCoordinates(location)) {
    return undefined;
  }

  const latitude = location.latitude;
  const longitude = location.longitude;
  const delta = 0.006;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(',');

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function formatPointAddress(point?: CollectorDashboardResponse['collectionPoint']) {
  return [point?.address, point?.zoneName, point?.cityName, point?.countryName].filter(Boolean).join(', ') || '-';
}
