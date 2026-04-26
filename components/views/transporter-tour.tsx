'use client';

import { useState } from 'react';
import { Truck, Package, Play, CheckCircle2, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { getCollectionPointFullAddress } from '@/lib/collection-point-location';
import { getStatusLabel, getStatusColor, type Parcel } from '@/lib/mock-data';
import {
  getRecipientColumnLabel,
  getRecipientDisplayName,
  getSenderColumnLabel,
  getSenderDisplayName,
} from '@/lib/parcel-privacy';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function TransporterTour() {
  const {
    parcels,
    vehicles,
    collectionPoints,
    countries,
    cities,
    zones,
    updateParcelStatus,
    removeParcelFromVehicle,
  } = useStore();
  const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);

  // Get transporter's vehicle and parcels in transit
  const currentVehicle = vehicles.find((v) => v.id === 'vehicle-2');
  const tourParcels = parcels.filter((p) => p.status === 'IN_TRANSIT' && p.currentVehicleId === currentVehicle?.id);

  const handleSetAllInTransit = () => {
    tourParcels.forEach((parcel) => {
      if (parcel.status !== 'IN_TRANSIT') {
        updateParcelStatus(
          parcel.id,
          'IN_TRANSIT',
          'transporter-2',
          'Lucas Rapide',
          'En route',
          currentVehicle?.id
        );
      }
    });
  };

  const handleDeliverToPoint = () => {
    if (selectedParcel) {
      const destinationPoint = collectionPoints.find((p) => p.id === selectedParcel.destinationPointId);
      updateParcelStatus(
        selectedParcel.id,
        'ARRIVED_AT_DESTINATION',
        'transporter-2',
        'Lucas Rapide',
        destinationPoint?.name || 'Point de destination'
      );
      removeParcelFromVehicle(selectedParcel.id);
      setSelectedParcel(null);
      setIsDeliverDialogOpen(false);
    }
  };

  const openDeliverDialog = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setIsDeliverDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ma Tournee</h2>
        <p className="text-muted-foreground">Gerez les colis actuellement dans votre vehicule</p>
      </div>

      {/* Vehicle Info */}
      {currentVehicle && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
                  <Truck className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {currentVehicle.type} - {currentVehicle.plate}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Capacite: {currentVehicle.maxWeight} kg / {currentVehicle.maxVolume} m3
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary px-3 py-2 text-center">
                  <p className="text-2xl font-bold text-foreground">{tourParcels.length}</p>
                  <p className="text-xs text-muted-foreground">Colis</p>
                </div>
                <Button
                  className="gap-2"
                  variant="secondary"
                  disabled={tourParcels.length === 0}
                >
                  <Play className="h-4 w-4" />
                  En Transit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Banner */}
      {tourParcels.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-warning/20 p-4">
          <Truck className="h-5 w-5 text-warning" />
          <div>
            <p className="font-medium text-foreground">Vehicule en transit</p>
            <p className="text-sm text-muted-foreground">
              Tous les colis heritent du statut EN_TRANSIT
            </p>
          </div>
        </div>
      )}

      {/* Tour Parcels Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                <TableHead className="text-muted-foreground">
                  {getSenderColumnLabel('TRANSPORTER')}
                </TableHead>
                <TableHead className="text-muted-foreground">
                  {getRecipientColumnLabel('TRANSPORTER')}
                </TableHead>
                <TableHead className="text-muted-foreground">Poids</TableHead>
                <TableHead className="text-muted-foreground">Destination</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tourParcels.map((parcel) => {
                const destination = collectionPoints.find((p) => p.id === parcel.destinationPointId);

                return (
                  <TableRow key={parcel.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-mono font-medium text-foreground">{parcel.trackingNumber}</span>
                        <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {getSenderDisplayName(parcel.senderName, 'TRANSPORTER')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {getRecipientDisplayName(parcel.recipientName, 'TRANSPORTER')}
                    </TableCell>
                    <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{destination?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-block rounded-lg px-2 py-1 text-xs font-medium',
                          getStatusColor(parcel.status)
                        )}
                      >
                        {getStatusLabel(parcel.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openDeliverDialog(parcel)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Livrer
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {tourParcels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <p className="font-medium text-foreground">Vehicule vide</p>
                      <p className="text-sm text-muted-foreground">Aucun colis dans votre vehicule actuellement</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Deliver Dialog */}
      <Dialog open={isDeliverDialogOpen} onOpenChange={setIsDeliverDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Livrer au point de collecte</DialogTitle>
            <DialogDescription>
              Confirmez la livraison du colis {selectedParcel?.trackingNumber} au point de destination.
            </DialogDescription>
          </DialogHeader>
          {selectedParcel && (
            <div className="rounded-lg bg-secondary p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    {collectionPoints.find((p) => p.id === selectedParcel.destinationPointId)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const point = collectionPoints.find(
                        (collectionPoint) => collectionPoint.id === selectedParcel.destinationPointId
                      );

                      return point
                        ? getCollectionPointFullAddress(point, zones, cities, countries)
                        : '';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeliverDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleDeliverToPoint} className="gap-2 bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="h-4 w-4" />
              Confirmer la livraison
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
