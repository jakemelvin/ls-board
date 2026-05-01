'use client';

import { useMemo } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Route,
  Truck,
  Weight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { getCollectionPointLocationLabel } from '@/lib/collection-point-location';
import { getStatusColor, getStatusLabel, type User } from '@/lib/mock-data';
import {
  getRecipientDisplayName,
  getSenderDisplayName,
} from '@/lib/parcel-privacy';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface TransporterDashboardProps {
  currentUser: User;
}

export function TransporterDashboard({ currentUser }: TransporterDashboardProps) {
  const {
    users,
    vehicles,
    parcels,
    transferRequests,
    collectionPoints,
    countries,
    cities,
    zones,
  } = useStore();

  const transporter = users.find((user) => user.id === currentUser.id) ?? currentUser;
  const assignedVehicle = transporter.assignedVehicleId
    ? vehicles.find((vehicle) => vehicle.id === transporter.assignedVehicleId) ?? null
    : null;

  const pendingPickupRequests = useMemo(
    () =>
      transferRequests.filter(
        (request) => request.transporterId === transporter.id && request.status === 'PENDING'
      ),
    [transferRequests, transporter.id]
  );

  const acceptedPickupRequests = useMemo(
    () =>
      transferRequests.filter(
        (request) => request.transporterId === transporter.id && request.status === 'ACCEPTED'
      ),
    [transferRequests, transporter.id]
  );

  const onboardParcels = useMemo(
    () =>
      assignedVehicle
        ? parcels.filter(
            (parcel) =>
              parcel.currentVehicleId === assignedVehicle.id && parcel.status === 'IN_TRANSIT'
          )
        : [],
    [assignedVehicle, parcels]
  );

  const completedTrips = useMemo(
    () =>
      parcels.filter((parcel) =>
        parcel.history.some(
          (entry) => entry.actorId === transporter.id && entry.status === 'ARRIVED_AT_DESTINATION'
        )
      ).length,
    [parcels, transporter.id]
  );

  const deliveredParcels = useMemo(
    () =>
      parcels.filter(
        (parcel) =>
          parcel.status === 'DELIVERED' &&
          parcel.history.some((entry) => entry.actorId === transporter.id)
      ).length,
    [parcels, transporter.id]
  );

  const totalOnboardWeight = onboardParcels.reduce((sum, parcel) => sum + parcel.weight, 0);
  const weightUtilization =
    assignedVehicle && assignedVehicle.maxWeight > 0
      ? Math.round((totalOnboardWeight / assignedVehicle.maxWeight) * 100)
      : 0;

  const requestRows = acceptedPickupRequests
    .map((request) => {
      const point = collectionPoints.find((collectionPoint) => collectionPoint.id === request.collectionPointId);
      const relatedParcels = request.parcelIds
        .map((parcelId) => parcels.find((parcel) => parcel.id === parcelId))
        .filter((parcel): parcel is NonNullable<typeof parcel> => Boolean(parcel));

      return {
        request,
        point,
        parcelCount: relatedParcels.length,
        totalWeight: relatedParcels.reduce((sum, parcel) => sum + parcel.weight, 0),
      };
    })
    .slice(0, 5);

  const currentRoute = onboardParcels.slice(0, 5);

  if (!assignedVehicle) {
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
            {assignedVehicle.type} · {assignedVehicle.plate}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Charge actuelle</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {totalOnboardWeight.toFixed(1)} / {assignedVehicle.maxWeight} kg
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <ArrowRightLeft className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{acceptedPickupRequests.length}</p>
              <p className="text-xs text-muted-foreground">Demandes acceptees a charger</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{onboardParcels.length}</p>
              <p className="text-xs text-muted-foreground">Colis a bord</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/20">
              <Route className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedTrips}</p>
              <p className="text-xs text-muted-foreground">Trajets completes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{deliveredParcels}</p>
              <p className="text-xs text-muted-foreground">Colis deja livres</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Vehicule et disponibilite</CardTitle>
            <CardDescription>Etat de charge de votre vehicule assigne</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{assignedVehicle.plate}</p>
                    <p className="text-sm text-muted-foreground">{assignedVehicle.type}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-lg px-2 py-1 text-xs font-medium',
                    assignedVehicle.status === 'AVAILABLE'
                      ? 'bg-success/20 text-success'
                      : assignedVehicle.status === 'IN_TRANSIT'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-destructive/20 text-destructive'
                  )}
                >
                  {assignedVehicle.status}
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
                      {totalOnboardWeight.toFixed(1)} kg transportes actuellement
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{weightUtilization}%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    'h-full transition-all',
                    weightUtilization > 85
                      ? 'bg-destructive'
                      : weightUtilization > 60
                        ? 'bg-warning'
                        : 'bg-success'
                  )}
                  style={{ width: `${Math.min(weightUtilization, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Demandes a charger</CardTitle>
            <CardDescription>Demandes acceptees par le collecteur en attente de choix reel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestRows.length > 0 ? (
              requestRows.map(({ request, point, parcelCount, totalWeight }) => (
                <div key={request.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{point?.name ?? 'Point de collecte'}</p>
                      <p className="text-sm text-muted-foreground">
                        {point
                          ? getCollectionPointLocationLabel(point, zones, cities, countries)
                          : 'Localisation indisponible'}
                      </p>
                    </div>
                    <span className="rounded-lg bg-chart-2/20 px-2 py-1 text-xs font-medium text-chart-2">
                      Acceptee
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{parcelCount} colis</span>
                    <span>{totalWeight.toFixed(1)} kg</span>
                    <span>{request.createdAt.toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Aucune demande acceptee a charger pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Colis actuellement a bord</CardTitle>
          <CardDescription>Vue rapide sur votre tournee active</CardDescription>
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
              {currentRoute.map((parcel) => {
                const destination = collectionPoints.find(
                  (point) => point.id === parcel.destinationPointId
                );

                return (
                  <TableRow key={parcel.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground">{parcel.trackingNumber}</span>
                        <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {getSenderDisplayName(parcel.senderName, 'TRANSPORTER')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {getRecipientDisplayName(parcel.recipientName, 'TRANSPORTER')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{destination?.name ?? 'Point de destination'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-lg px-2 py-1 text-xs font-medium',
                          getStatusColor(parcel.status)
                        )}
                      >
                        {getStatusLabel(parcel.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {currentRoute.length === 0 && (
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
