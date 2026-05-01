'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  MapPin,
  Package,
  Power,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatCollectionPointLoadRatio,
  getCollectionPointParcelCount,
  getCollectionPointSaturationRate,
} from '@/lib/collection-point-capacity';
import {
  formatOpeningHours,
  getCollectionPointStatusClassName,
  getCollectionPointStatusLabel,
} from '@/lib/collection-point-availability';
import { getCollectionPointLocationLabel } from '@/lib/collection-point-location';
import { getKycVerificationStatusLabel, getStatusColor, getStatusLabel, type User } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface CollectorDashboardProps {
  currentUser: User;
}

export function CollectorDashboard({ currentUser }: CollectorDashboardProps) {
  const {
    users,
    parcels,
    collectionPoints,
    countries,
    cities,
    zones,
    transferRequests,
    setCollectionPointOpenStatus,
  } = useStore();

  const collector = users.find((user) => user.id === currentUser.id) ?? currentUser;
  const assignedPoint = collector.assignedPointId
    ? collectionPoints.find((point) => point.id === collector.assignedPointId) ?? null
    : null;

  const pendingReception = useMemo(
    () =>
      assignedPoint
        ? parcels.filter(
            (parcel) =>
              parcel.status === 'CREATED' && parcel.originPointId === assignedPoint.id
          )
        : [],
    [assignedPoint, parcels]
  );

  const localStockParcels = useMemo(
    () =>
      assignedPoint
        ? parcels.filter(
            (parcel) =>
              parcel.status === 'RECEIVED_AT_COLLECTION_POINT' &&
              (parcel.originPointId === assignedPoint.id ||
                parcel.destinationPointId === assignedPoint.id)
          )
        : [],
    [assignedPoint, parcels]
  );

  const pendingTransferRequests = useMemo(
    () =>
      assignedPoint
        ? transferRequests.filter(
            (request) =>
              request.collectionPointId === assignedPoint.id && request.status === 'PENDING'
          )
        : [],
    [assignedPoint, transferRequests]
  );

  const arrivalsAwaitingRelease = useMemo(
    () =>
      assignedPoint
        ? parcels.filter(
            (parcel) =>
              parcel.status === 'ARRIVED_AT_DESTINATION' &&
              parcel.destinationPointId === assignedPoint.id
          )
        : [],
    [assignedPoint, parcels]
  );

  const saturationRate = assignedPoint
    ? getCollectionPointSaturationRate(assignedPoint, parcels)
    : 0;
  const storedParcelsCount = assignedPoint
    ? getCollectionPointParcelCount(assignedPoint.id, parcels)
    : 0;

  const recentOperations = useMemo(() => {
    if (!assignedPoint) {
      return [];
    }

    return parcels
      .flatMap((parcel) =>
        parcel.history
          .filter((entry) => entry.actorId === collector.id)
          .map((entry) => ({
            parcelId: parcel.id,
            trackingNumber: parcel.trackingNumber,
            status: entry.status,
            timestamp: entry.timestamp,
            location: entry.location,
          }))
      )
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, 5);
  }, [assignedPoint, collector.id, parcels]);

  if (!assignedPoint) {
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tableau de bord collecteur</h2>
          <p className="text-muted-foreground">
            {assignedPoint.name} ·{' '}
            {getCollectionPointLocationLabel(assignedPoint, zones, cities, countries)}
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 lg:min-w-80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Disponibilite du point</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatOpeningHours(assignedPoint)}</p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
                getCollectionPointStatusClassName(assignedPoint)
              )}
            >
              {assignedPoint.isOpen ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {getCollectionPointStatusLabel(assignedPoint)}
            </span>
          </div>
          {!assignedPoint.isOpen && assignedPoint.closedReason && (
            <p className="text-xs text-muted-foreground">Motif: {assignedPoint.closedReason}</p>
          )}
          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Capacite</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCollectionPointLoadRatio(assignedPoint, parcels)}
              </p>
              <p className="text-xs text-muted-foreground">{storedParcelsCount} colis presents</p>
            </div>
            <Button
              variant={assignedPoint.isOpen ? 'outline' : 'default'}
              size="sm"
              className="gap-2"
              onClick={() =>
                setCollectionPointOpenStatus(
                  assignedPoint.id,
                  !assignedPoint.isOpen,
                  assignedPoint.isOpen ? 'Ferme par le collecteur' : undefined
                )
              }
            >
              <Power className="h-4 w-4" />
              {assignedPoint.isOpen ? 'Fermer le point' : 'Rouvrir'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingReception.length}</p>
              <p className="text-xs text-muted-foreground">Receptions a valider</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Warehouse className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{localStockParcels.length}</p>
              <p className="text-xs text-muted-foreground">Colis en stock local</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/20">
              <ArrowRightLeft className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingTransferRequests.length}</p>
              <p className="text-xs text-muted-foreground">Demandes de prise en attente</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{arrivalsAwaitingRelease.length}</p>
              <p className="text-xs text-muted-foreground">Colis arrives au point</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Priorites immediates</CardTitle>
            <CardDescription>Elements a traiter en premier sur votre point</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Controle KYC et reception</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingReception.length} colis client a confirmer
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{pendingReception.length}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="h-5 w-5 text-chart-1" />
                  <div>
                    <p className="font-medium text-foreground">Demandes transporteurs</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingTransferRequests.length} transfert(s) en attente de decision
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">
                  {pendingTransferRequests.length}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-foreground">Saturation du point</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCollectionPointLoadRatio(assignedPoint, parcels)}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{saturationRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Dernieres operations</CardTitle>
            <CardDescription>Vos traitements les plus recents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOperations.length > 0 ? (
              recentOperations.map((operation) => (
                <div
                  key={`${operation.parcelId}-${operation.timestamp.toISOString()}`}
                  className="rounded-xl border border-border bg-secondary/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {operation.trackingNumber}
                    </p>
                    <span
                      className={cn(
                        'rounded-lg px-2 py-1 text-xs font-medium',
                        getStatusColor(operation.status)
                      )}
                    >
                      {getStatusLabel(operation.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{operation.location}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{operation.timestamp.toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Aucune operation recente sur ce point.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Receptions en attente</CardTitle>
          <CardDescription>Colis clients a verifier en priorite</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
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
              {pendingReception.slice(0, 6).map((parcel) => (
                <TableRow key={parcel.id} className="border-border">
                  <TableCell className="font-mono text-foreground">{parcel.trackingNumber}</TableCell>
                  <TableCell className="text-foreground">{parcel.senderName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {getKycVerificationStatusLabel(parcel.senderKyc.verificationStatus)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {collectionPoints.find((point) => point.id === parcel.destinationPointId)?.name}
                  </TableCell>
                  <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                </TableRow>
              ))}
              {pendingReception.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    Aucun colis client en attente de validation.
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
