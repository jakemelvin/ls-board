'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Layers3,
  MapPin,
  Package,
  Power,
  RotateCcw,
  Warehouse,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import {
  formatCollectionPointLoadRatio,
  getCollectionPointSaturationRate,
} from '@/lib/collection-point-capacity';
import {
  formatOpeningHours,
  getCollectionPointStatusClassName,
  getCollectionPointStatusLabel,
} from '@/lib/collection-point-availability';
import { getCollectionPointLocationLabel } from '@/lib/collection-point-location';
import { getStatusColor, getStatusLabel, type Parcel, type User } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface LocalStockProps {
  currentUser: User;
}

const getReadinessMeta = (parcels: Parcel[]) => {
  const readyCount = parcels.filter((parcel) => parcel.pickupReadiness === 'READY').length;

  if (readyCount === 0) {
    return {
      label: 'En preparation',
      className: 'bg-muted text-muted-foreground',
    };
  }

  if (readyCount === parcels.length) {
    return {
      label: 'Pret a la prise',
      className: 'bg-success/20 text-success',
    };
  }

  return {
    label: 'Preparation partielle',
    className: 'bg-warning/20 text-warning',
  };
};

export function LocalStock({ currentUser }: LocalStockProps) {
  const {
    parcels,
    parcelGroups,
    collectionPoints,
    countries,
    cities,
    zones,
    updateParcelPickupReadiness,
    setCollectionPointOpenStatus,
  } = useStore();
  const [selectedPoint, setSelectedPoint] = useState<string | null>(
    currentUser.assignedPointId ?? collectionPoints[0]?.id ?? null
  );

  const stockParcels = useMemo(
    () => parcels.filter((parcel) => parcel.status === 'RECEIVED_AT_COLLECTION_POINT'),
    [parcels]
  );

  const selectedPointData = collectionPoints.find((point) => point.id === selectedPoint);
  const parcelsAtSelectedPoint = stockParcels.filter(
    (parcel) => parcel.originPointId === selectedPoint || parcel.destinationPointId === selectedPoint
  );

  const groupsAtSelectedPoint = parcelGroups
    .map((group) => ({
      ...group,
      parcels: parcelsAtSelectedPoint.filter((parcel) => parcel.groupId === group.id),
    }))
    .filter((group) => group.parcels.length > 0);

  const ungroupedParcels = parcelsAtSelectedPoint.filter((parcel) => !parcel.groupId);

  const readyCount = parcelsAtSelectedPoint.filter((parcel) => parcel.pickupReadiness === 'READY').length;
  const canToggleSelectedPoint =
    Boolean(selectedPointData) &&
    (selectedPointData?.responsibleId === currentUser.id || selectedPointData?.id === currentUser.assignedPointId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ma tournee collecteur</h2>
        <p className="text-muted-foreground">
          Preparez les colis du point de collecte avant la prise en charge par le transporteur.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {collectionPoints.map((point) => {
          const saturation = getCollectionPointSaturationRate(point, parcels);
          const isSelected = selectedPoint === point.id;

          return (
            <Card
              key={point.id}
              className={cn(
                'cursor-pointer border-border bg-card transition-all hover:border-primary/50',
                isSelected && 'border-primary'
              )}
              onClick={() => setSelectedPoint(point.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/20'
                      )}
                    >
                      <MapPin className={cn('h-5 w-5', isSelected ? '' : 'text-primary')} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{point.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getCollectionPointLocationLabel(point, zones, cities, countries)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatOpeningHours(point)}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-lg px-2 py-1 text-xs font-medium',
                      getCollectionPointStatusClassName(point)
                    )}
                  >
                    {getCollectionPointStatusLabel(point)}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saturation</span>
                    <span className="font-medium text-foreground">{saturation}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        'h-full transition-all',
                        saturation > 80 ? 'bg-destructive' : saturation > 50 ? 'bg-warning' : 'bg-success'
                      )}
                      style={{ width: `${saturation}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCollectionPointLoadRatio(point, parcels)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPointData && (
        <>
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  {selectedPointData.isOpen ? (
                    <Eye className="h-5 w-5 text-primary" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedPointData.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatOpeningHours(selectedPointData)}
                  </p>
                  {!selectedPointData.isOpen && selectedPointData.closedReason && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Motif: {selectedPointData.closedReason}
                    </p>
                  )}
                </div>
              </div>
              {canToggleSelectedPoint && (
                <Button
                  variant={selectedPointData.isOpen ? 'outline' : 'default'}
                  className="gap-2"
                  onClick={() =>
                    setCollectionPointOpenStatus(
                      selectedPointData.id,
                      !selectedPointData.isOpen,
                      selectedPointData.isOpen ? 'Ferme par le collecteur' : undefined
                    )
                  }
                >
                  <Power className="h-4 w-4" />
                  {selectedPointData.isOpen ? 'Fermer temporairement' : 'Rouvrir le point'}
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <Warehouse className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Colis sur le point</p>
                  <p className="text-xl font-semibold text-foreground">{parcelsAtSelectedPoint.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <Layers3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Lots actifs</p>
                  <p className="text-xl font-semibold text-foreground">{groupsAtSelectedPoint.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Colis prets a la prise</p>
                  <p className="text-xl font-semibold text-foreground">{readyCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Colis a preparer</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Le collecteur prepare les colis; le transporteur cree ensuite ses lots dans Ma tournee.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                    <TableHead className="text-muted-foreground">Expediteur</TableHead>
                    <TableHead className="text-muted-foreground">Destinataire</TableHead>
                    <TableHead className="text-muted-foreground">Etat prise</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ungroupedParcels.map((parcel) => (
                    <TableRow key={parcel.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-mono font-medium text-foreground">{parcel.trackingNumber}</span>
                          <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{parcel.senderName}</TableCell>
                      <TableCell className="text-foreground">{parcel.recipientName}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-lg px-2 py-1 text-xs font-medium',
                            parcel.pickupReadiness === 'READY'
                              ? 'bg-success/20 text-success'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {parcel.pickupReadiness === 'READY' ? 'Pret' : 'En attente'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateParcelPickupReadiness(
                              [parcel.id],
                              parcel.pickupReadiness === 'READY' ? 'PENDING' : 'READY'
                            )
                          }
                        >
                          {parcel.pickupReadiness === 'READY' ? 'Repasser attente' : 'Marquer pret'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ungroupedParcels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Aucun colis individuel a preparer sur ce point.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {groupsAtSelectedPoint.map((group) => {
              const totalWeight = group.parcels.reduce((sum, parcel) => sum + parcel.weight, 0);
              const readinessMeta = getReadinessMeta(group.parcels);

              return (
                <Card key={group.id} className="border-border bg-card">
                  <CardHeader className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference lot</p>
                        <h3 className="text-lg font-semibold text-foreground">{group.reference}</h3>
                        <p className="text-sm text-muted-foreground">
                          {group.parcels.length} colis, {totalWeight.toFixed(1)} kg, cree par {group.createdByName}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={cn('rounded-lg px-2 py-1 text-xs font-medium', readinessMeta.className)}>
                          {readinessMeta.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          updateParcelPickupReadiness(
                            group.parcels.map((parcel) => parcel.id),
                            'READY'
                          )
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Tout marquer pret
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          updateParcelPickupReadiness(
                            group.parcels.map((parcel) => parcel.id),
                            'PENDING'
                          )
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                        Repasser en attente
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">NÂ° Suivi</TableHead>
                          <TableHead className="text-muted-foreground">Destinataire</TableHead>
                          <TableHead className="text-muted-foreground">Poids</TableHead>
                          <TableHead className="text-muted-foreground">Statut</TableHead>
                          <TableHead className="text-muted-foreground">Etat prise</TableHead>
                          <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.parcels.map((parcel) => (
                          <TableRow key={parcel.id} className="border-border">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                <span className="font-mono font-medium text-foreground">{parcel.trackingNumber}</span>
                                <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground">{parcel.recipientName}</TableCell>
                            <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  'inline-flex rounded-lg px-2 py-1 text-xs font-medium',
                                  getStatusColor(parcel.status)
                                )}
                              >
                                {getStatusLabel(parcel.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  'inline-flex rounded-lg px-2 py-1 text-xs font-medium',
                                  parcel.pickupReadiness === 'READY'
                                    ? 'bg-success/20 text-success'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {parcel.pickupReadiness === 'READY' ? 'Pret' : 'En attente'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateParcelPickupReadiness(
                                    [parcel.id],
                                    parcel.pickupReadiness === 'READY' ? 'PENDING' : 'READY'
                                  )
                                }
                              >
                                {parcel.pickupReadiness === 'READY' ? 'Repasser attente' : 'Marquer pret'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}

            {groupsAtSelectedPoint.length === 0 && (
              <Card className="border-dashed border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Layers3 className="h-8 w-8 text-muted-foreground" />
                  <p className="font-medium text-foreground">Aucun lot sur ce point</p>
                  <p className="text-sm text-muted-foreground">
                    Regroupez les colis de la tournee pour accelerer la preparation et le chargement.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

    </div>
  );
}


