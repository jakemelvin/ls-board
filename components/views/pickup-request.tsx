'use client';

import { useState } from 'react';
import { Package, MapPin, Send, Check } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { isCollectionPointVisibleToClients } from '@/lib/collection-point-availability';
import { getCollectionPointLocationLabel } from '@/lib/collection-point-location';
import { getStatusLabel, getStatusColor, type Parcel, type User } from '@/lib/mock-data';
import {
  getRecipientColumnLabel,
  getRecipientDisplayName,
  getSenderColumnLabel,
  getSenderDisplayName,
} from '@/lib/parcel-privacy';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface PickupRequestProps {
  currentUser: User;
}

export function PickupRequest({ currentUser }: PickupRequestProps) {
  const { parcels, collectionPoints, countries, cities, zones, createTransferRequest } = useStore();
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Available parcels for pickup (RECEIVED_AT_COLLECTION_POINT)
  const visibleCollectionPointIds = new Set(
    collectionPoints.filter(isCollectionPointVisibleToClients).map((point) => point.id)
  );
  const availableParcels = parcels.filter(
    (p) => p.status === 'RECEIVED_AT_COLLECTION_POINT' && visibleCollectionPointIds.has(p.originPointId)
  );

  const toggleParcel = (parcelId: string) => {
    setSelectedParcels((prev) =>
      prev.includes(parcelId) ? prev.filter((id) => id !== parcelId) : [...prev, parcelId]
    );
  };

  const handleSendRequest = () => {
    const selectedCollectionPoint = collectionPoints.find((point) => point.id === selectedPoint);

    if (selectedParcels.length > 0 && selectedPoint && selectedCollectionPoint) {
      createTransferRequest({
        parcelIds: selectedParcels,
        transporterId: currentUser.id,
        collectorId: selectedCollectionPoint.responsibleId,
        collectionPointId: selectedPoint,
        status: 'PENDING',
      });
      setRequestSent(true);
      setIsConfirmDialogOpen(false);
      setTimeout(() => {
        setSelectedParcels([]);
        setSelectedPoint(null);
        setRequestSent(false);
      }, 3000);
    }
  };

  const getPointName = (pointId: string) => {
    return collectionPoints.find((p) => p.id === pointId)?.name || pointId;
  };

  // Group parcels by collection point
  const parcelsByPoint: Record<string, Parcel[]> = {};
  availableParcels.forEach((parcel) => {
    const pointId = parcel.originPointId;
    if (!parcelsByPoint[pointId]) {
      parcelsByPoint[pointId] = [];
    }
    parcelsByPoint[pointId].push(parcel);
  });

  const totalWeight = availableParcels
    .filter((p) => selectedParcels.includes(p.id))
    .reduce((sum, p) => sum + p.weight, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Nouvelle demande de prise</h2>
        <p className="text-muted-foreground">
          Selectionnez les colis a recuperer et envoyez une demande au collecteur
        </p>
      </div>

      {/* Success Message */}
      {requestSent && (
        <div className="flex items-center gap-3 rounded-xl bg-success/20 p-4">
          <Check className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-foreground">Demande envoyee avec succes!</p>
            <p className="text-sm text-muted-foreground">
              Le collecteur va valider votre demande de transfert
            </p>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedParcels.length > 0 && !requestSent && (
        <Card className="border-primary bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {selectedParcels.length} colis selectionne(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  Poids total: {totalWeight.toFixed(1)} kg
                </p>
              </div>
              <Button
                className="gap-2"
                onClick={() => setIsConfirmDialogOpen(true)}
                disabled={!selectedPoint}
              >
                <Send className="h-4 w-4" />
                Envoyer la demande
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection Points with Parcels */}
      <div className="space-y-6">
        {Object.entries(parcelsByPoint).map(([pointId, pointParcels]) => {
          const point = collectionPoints.find((p) => p.id === pointId);
          const isPointSelected = selectedPoint === pointId;
          const selectedInPoint = pointParcels.filter((p) => selectedParcels.includes(p.id)).length;

          return (
            <Card
              key={pointId}
              className={cn(
                'border-border bg-card transition-all',
                isPointSelected && 'border-primary'
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isPointSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/20'
                      )}
                    >
                      <MapPin className={cn('h-5 w-5', !isPointSelected && 'text-primary')} />
                    </div>
                    <div>
                      <CardTitle className="text-foreground">{point?.name}</CardTitle>
                      <CardDescription>
                        {point
                          ? `${getCollectionPointLocationLabel(point, zones, cities, countries)} - ${pointParcels.length} colis disponibles`
                          : `${pointParcels.length} colis disponibles`}
                        {selectedInPoint > 0 && ` (${selectedInPoint} selectionne(s))`}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant={isPointSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPoint(isPointSelected ? null : pointId)}
                  >
                    {isPointSelected ? 'Selectionne' : 'Selectionner'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                      <TableHead className="text-muted-foreground">
                        {getSenderColumnLabel('TRANSPORTER')}
                      </TableHead>
                      <TableHead className="text-muted-foreground">Poids</TableHead>
                      <TableHead className="text-muted-foreground">
                        {getRecipientColumnLabel('TRANSPORTER')}
                      </TableHead>
                      <TableHead className="text-muted-foreground">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointParcels.map((parcel) => {
                      const isSelected = selectedParcels.includes(parcel.id);

                      return (
                        <TableRow
                          key={parcel.id}
                          className={cn(
                            'cursor-pointer border-border transition-colors',
                            isSelected && 'bg-primary/10'
                          )}
                          onClick={() => {
                            toggleParcel(parcel.id);
                            if (!selectedPoint) setSelectedPoint(pointId);
                          }}
                        >
                          <TableCell>
                            <div
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded border',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border'
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-primary" />
                              <span className="font-mono font-medium text-foreground">{parcel.trackingNumber}</span>
                              <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground">
                            {getSenderDisplayName(parcel.senderName, 'TRANSPORTER')}
                          </TableCell>
                          <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                          <TableCell className="text-muted-foreground">
                            {getRecipientDisplayName(parcel.recipientName, 'TRANSPORTER')}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-block rounded px-2 py-0.5 text-xs font-medium',
                                getStatusColor(parcel.status)
                              )}
                            >
                              {getStatusLabel(parcel.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {availableParcels.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium text-foreground">Aucun colis disponible</p>
            <p className="text-sm text-muted-foreground">
              Tous les colis sont deja en transit ou livres
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmer la demande</DialogTitle>
            <DialogDescription>
              Vous allez envoyer une demande de prise en charge pour {selectedParcels.length} colis.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-secondary p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Point de collecte:</span>
              <span className="font-medium text-foreground">
                {collectionPoints.find((p) => p.id === selectedPoint)?.name}
              </span>
            </div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nombre de colis:</span>
              <span className="font-medium text-foreground">{selectedParcels.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Poids total:</span>
              <span className="font-medium text-foreground">{totalWeight.toFixed(1)} kg</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSendRequest} className="gap-2">
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
