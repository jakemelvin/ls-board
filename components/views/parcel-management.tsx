'use client';

import { useState } from 'react';
import { Package, Search, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getStatusLabel,
  getStatusColor,
  type Parcel,
  type ParcelStatus,
} from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { TrackingStepper } from '@/components/tracking-stepper';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: { value: ParcelStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'CREATED', label: 'Cree' },
  { value: 'RECEIVED_AT_COLLECTION_POINT', label: 'Recu' },
  { value: 'IN_TRANSIT', label: 'En transit' },
  { value: 'ARRIVED_AT_DESTINATION', label: 'Arrive' },
  { value: 'DELIVERED', label: 'Livre' },
  { value: 'REJECTED', label: 'Rejete' },
];

export function ParcelManagement() {
  const { parcels, collectionPoints } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ParcelStatus | 'ALL'>('ALL');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const filteredParcels = parcels.filter((p) => {
    const matchesSearch =
      p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.recipientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPointName = (pointId: string) => {
    return collectionPoints.find((p) => p.id === pointId)?.name || pointId;
  };

  const openDetailDialog = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion des Colis</h2>
          <p className="text-muted-foreground">Liste complete et historique des colis</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        {STATUS_FILTERS.slice(1).map((filter) => {
          const count = parcels.filter((p) => p.status === filter.value).length;
          return (
            <Card key={filter.value} className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-xs text-muted-foreground">{filter.label}</span>
                <span className="text-xl font-bold text-foreground">{count}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numero, expediteur ou destinataire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Parcels Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                <TableHead className="text-muted-foreground">Expediteur</TableHead>
                <TableHead className="text-muted-foreground">Destinataire</TableHead>
                <TableHead className="text-muted-foreground">Poids</TableHead>
                <TableHead className="text-muted-foreground">Origine</TableHead>
                <TableHead className="text-muted-foreground">Destination</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParcels.map((parcel) => (
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
                    {getPointName(parcel.originPointId)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getPointName(parcel.destinationPointId)}
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
                  <TableCell className="text-muted-foreground">
                    {parcel.updatedAt.toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openDetailDialog(parcel)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredParcels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Aucun colis trouve
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Package className="h-5 w-5 text-primary" />
              {selectedParcel?.trackingNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedParcel && (
            <div className="space-y-6 py-4">
              {/* Tracking Stepper */}
              <TrackingStepper
                currentStatus={selectedParcel.status}
                history={selectedParcel.history}
              />

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Expediteur</p>
                  <p className="font-medium text-foreground">{selectedParcel.senderName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destinataire</p>
                  <p className="font-medium text-foreground">{selectedParcel.recipientName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Poids</p>
                  <p className="font-medium text-foreground">{selectedParcel.weight} kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cree le</p>
                  <p className="font-medium text-foreground">
                    {selectedParcel.createdAt.toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Origine</p>
                  <p className="font-medium text-foreground">
                    {getPointName(selectedParcel.originPointId)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium text-foreground">
                    {getPointName(selectedParcel.destinationPointId)}
                  </p>
                </div>
              </div>

              {/* History Table */}
              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Historique</p>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Statut</TableHead>
                      <TableHead className="text-muted-foreground">Date/Heure</TableHead>
                      <TableHead className="text-muted-foreground">Acteur</TableHead>
                      <TableHead className="text-muted-foreground">Lieu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedParcel.history.map((entry, index) => (
                      <TableRow key={index} className="border-border">
                        <TableCell>
                          <span
                            className={cn(
                              'inline-block rounded px-2 py-0.5 text-xs font-medium',
                              getStatusColor(entry.status)
                            )}
                          >
                            {getStatusLabel(entry.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {entry.timestamp.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-foreground">{entry.actorName}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
