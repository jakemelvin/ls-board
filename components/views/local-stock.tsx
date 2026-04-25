'use client';

import { useState } from 'react';
import { Warehouse, Package, MapPin } from 'lucide-react';
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
import { getStatusLabel, getStatusColor } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function LocalStock() {
  const { parcels, collectionPoints } = useStore();
  const [selectedPoint, setSelectedPoint] = useState<string | null>(
    collectionPoints[0]?.id || null
  );

  // Parcels at collection points (RECEIVED_AT_COLLECTION_POINT)
  const stockParcels = parcels.filter((p) => p.status === 'RECEIVED_AT_COLLECTION_POINT');

  const selectedPointData = collectionPoints.find((p) => p.id === selectedPoint);
  const parcelsAtSelectedPoint = stockParcels.filter(
    (p) => p.originPointId === selectedPoint || p.destinationPointId === selectedPoint
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Stock Local</h2>
        <p className="text-muted-foreground">
          Visualisation des colis presents dans votre point de collecte
        </p>
      </div>

      {/* Point Selection */}
      <div className="grid gap-4 md:grid-cols-3">
        {collectionPoints.map((point) => {
          const saturation = Math.round((point.currentStock / point.capacity) * 100);
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
                      <p className="text-xs text-muted-foreground">{point.city}</p>
                    </div>
                  </div>
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
                    {point.currentStock} / {point.capacity} colis
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Table */}
      {selectedPointData && (
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-semibold text-foreground">
                Colis a {selectedPointData.name}
              </h3>
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {parcelsAtSelectedPoint.length} colis en stock
                </span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                  <TableHead className="text-muted-foreground">Expediteur</TableHead>
                  <TableHead className="text-muted-foreground">Destinataire</TableHead>
                  <TableHead className="text-muted-foreground">Poids</TableHead>
                  <TableHead className="text-muted-foreground">Destination</TableHead>
                  <TableHead className="text-muted-foreground">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelsAtSelectedPoint.map((parcel) => (
                  <TableRow key={parcel.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-mono font-medium text-foreground">
                          {parcel.trackingNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{parcel.senderName}</TableCell>
                    <TableCell className="text-foreground">{parcel.recipientName}</TableCell>
                    <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                    <TableCell className="text-muted-foreground">
                      {collectionPoints.find((p) => p.id === parcel.destinationPointId)?.name}
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
                  </TableRow>
                ))}
                {parcelsAtSelectedPoint.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <p className="font-medium text-foreground">Stock vide</p>
                        <p className="text-sm text-muted-foreground">Aucun colis en attente dans ce point</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
