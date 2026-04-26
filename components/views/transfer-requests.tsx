'use client';

import { useState } from 'react';
import { ArrowRightLeft, Check, X, Clock, QrCode, Eye, Truck } from 'lucide-react';
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
import { type Parcel, type UserRole } from '@/lib/mock-data';
import { getRecipientDisplayName, getSenderDisplayName } from '@/lib/parcel-privacy';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface TransferRequestsProps {
  currentRole: UserRole;
}

const isParcel = (parcel: Parcel | undefined): parcel is Parcel => Boolean(parcel);

export function TransferRequests({ currentRole }: TransferRequestsProps) {
  const {
    transferRequests,
    parcels,
    users,
    vehicles,
    collectionPoints,
    updateTransferRequestStatus,
    updateParcelStatus,
    assignParcelToVehicle,
  } = useStore();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isHistoryDetailDialogOpen, setIsHistoryDetailDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const getUser = (userId: string) => users.find((user) => user.id === userId);
  const getPoint = (pointId: string) => collectionPoints.find((point) => point.id === pointId);
  const getParcel = (parcelId: string) => parcels.find((parcel) => parcel.id === parcelId);

  const pendingRequests = transferRequests.filter((request) => request.status === 'PENDING');
  const processedRequests = transferRequests.filter((request) => request.status !== 'PENDING');
  const selectedRequest = selectedRequestId
    ? transferRequests.find((request) => request.id === selectedRequestId) ?? null
    : null;
  const selectedRequestParcels =
    selectedRequest?.parcelIds.map((parcelId) => getParcel(parcelId)).filter(isParcel) ?? [];
  const selectedTransporter = selectedRequest ? getUser(selectedRequest.transporterId) : null;
  const selectedTransporterVehicle = selectedTransporter?.assignedVehicleId
    ? vehicles.find((vehicle) => vehicle.id === selectedTransporter.assignedVehicleId) ?? null
    : null;

  const handleAccept = () => {
    if (!selectedRequestId) {
      return;
    }

    const request = transferRequests.find((item) => item.id === selectedRequestId);
    if (request) {
      updateTransferRequestStatus(selectedRequestId, 'ACCEPTED');

      const transporter = getUser(request.transporterId);
      const transporterVehicle = transporter?.assignedVehicleId;

      request.parcelIds.forEach((parcelId) => {
        updateParcelStatus(
          parcelId,
          'IN_TRANSIT',
          request.transporterId,
          transporter?.name || 'Transporteur',
          'Transfert accepte',
          transporterVehicle
        );

        if (transporterVehicle) {
          assignParcelToVehicle(parcelId, transporterVehicle);
        }
      });
    }

    setSelectedRequestId(null);
    setIsAcceptDialogOpen(false);
  };

  const handleReject = () => {
    if (selectedRequestId) {
      updateTransferRequestStatus(selectedRequestId, 'REJECTED');
      setSelectedRequestId(null);
      setIsRejectDialogOpen(false);
    }
  };

  const openAcceptDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setIsAcceptDialogOpen(true);
  };

  const openRejectDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setIsRejectDialogOpen(true);
  };

  const handleAcceptDialogChange = (open: boolean) => {
    setIsAcceptDialogOpen(open);

    if (!open) {
      setSelectedRequestId(null);
    }
  };

  const handleRejectDialogChange = (open: boolean) => {
    setIsRejectDialogOpen(open);

    if (!open) {
      setSelectedRequestId(null);
    }
  };

  const openHistoryDetailDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setIsHistoryDetailDialogOpen(true);
  };

  const handleHistoryDetailDialogChange = (open: boolean) => {
    setIsHistoryDetailDialogOpen(open);

    if (!open) {
      setSelectedRequestId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Demandes de Prise en Charge</h2>
        <p className="text-muted-foreground">
          {currentRole === 'COLLECTOR'
            ? 'Validez les demandes de transfert des transporteurs'
            : currentRole === 'TRANSPORTER'
              ? 'Vos demandes de recuperation de colis'
              : 'Suivi de toutes les demandes de transfert'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {transferRequests.filter((request) => request.status === 'ACCEPTED').length}
              </p>
              <p className="text-xs text-muted-foreground">Acceptees</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {transferRequests.filter((request) => request.status === 'REJECTED').length}
              </p>
              <p className="text-xs text-muted-foreground">Rejetees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Demandes en attente</h3>
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Transporteur</TableHead>
                  <TableHead className="text-muted-foreground">Point de collecte</TableHead>
                  <TableHead className="text-muted-foreground">Resume</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Statut</TableHead>
                  {currentRole === 'COLLECTOR' && (
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => {
                  const transporter = getUser(request.transporterId);
                  const point = getPoint(request.collectionPointId);
                  const requestParcels = request.parcelIds
                    .map((parcelId) => getParcel(parcelId))
                    .filter(isParcel);

                  return (
                    <TableRow key={request.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                            <ArrowRightLeft className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-mono font-medium text-foreground">
                            #{request.id.split('-')[1]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {transporter && (
                            <>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {transporter.avatar}
                              </div>
                              <span className="text-foreground">{transporter.name}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{point?.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {requestParcels.length} colis a transferer
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {currentRole === 'TRANSPORTER'
                              ? 'Informations expediteur masquees'
                              : requestParcels.map((parcel) => parcel.senderName).join(', ')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.createdAt.toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-lg bg-warning/20 px-2 py-1 text-xs font-medium text-warning">
                          En attente
                        </span>
                      </TableCell>
                      {currentRole === 'COLLECTOR' && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => openRejectDialog(request.id)}
                            >
                              <X className="h-4 w-4" />
                              Rejeter
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1 bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => openAcceptDialog(request.id)}
                            >
                              <QrCode className="h-4 w-4" />
                              Accepter
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {pendingRequests.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={currentRole === 'COLLECTOR' ? 7 : 6}
                      className="h-24 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Check className="h-8 w-8 text-success" />
                        <p className="font-medium text-foreground">Aucune demande en attente</p>
                        <p className="text-sm text-muted-foreground">
                          Toutes les demandes ont ete traitees
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Historique</h3>
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">ID</TableHead>
                    <TableHead className="text-muted-foreground">Transporteur</TableHead>
                    <TableHead className="text-muted-foreground">Point</TableHead>
                    <TableHead className="text-muted-foreground">Colis</TableHead>
                    <TableHead className="text-muted-foreground">Statut</TableHead>
                    <TableHead className="text-right text-muted-foreground">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => {
                    const transporter = getUser(request.transporterId);
                    const point = getPoint(request.collectionPointId);

                    return (
                      <TableRow key={request.id} className="border-border opacity-75">
                        <TableCell className="font-mono text-foreground">
                          #{request.id.split('-')[1]}
                        </TableCell>
                        <TableCell className="text-foreground">{transporter?.name}</TableCell>
                        <TableCell className="text-muted-foreground">{point?.name}</TableCell>
                        <TableCell className="text-foreground">{request.parcelIds.length} colis</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'rounded-lg px-2 py-1 text-xs font-medium',
                              request.status === 'ACCEPTED'
                                ? 'bg-success/20 text-success'
                                : 'bg-destructive/20 text-destructive'
                            )}
                          >
                            {request.status === 'ACCEPTED' ? 'Acceptee' : 'Rejetee'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openHistoryDetailDialog(request.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={isAcceptDialogOpen} onOpenChange={handleAcceptDialogChange}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Accepter la demande</DialogTitle>
            <DialogDescription>
              Confirmez le transfert des colis au transporteur. Les colis passeront au statut EN_TRANSIT.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 rounded-lg bg-secondary p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Transporteur</span>
                <span className="text-sm font-medium text-foreground">
                  {getUser(selectedRequest.transporterId)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Point de collecte</span>
                <span className="text-sm font-medium text-foreground">
                  {getPoint(selectedRequest.collectionPointId)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Nombre de colis</span>
                <span className="text-sm font-medium text-foreground">
                  {selectedRequestParcels.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Poids total</span>
                <span className="text-sm font-medium text-foreground">
                  {selectedRequestParcels
                    .reduce((total, parcel) => total + parcel.weight, 0)
                    .toFixed(1)}{' '}
                  kg
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleAcceptDialogChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAccept}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              <Check className="h-4 w-4" />
              Confirmer le transfert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={handleRejectDialogChange}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rejeter la demande</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir rejeter cette demande de transfert ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRejectDialogChange(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject} className="gap-2">
              <X className="h-4 w-4" />
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryDetailDialogOpen} onOpenChange={handleHistoryDetailDialogChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Details de la demande</DialogTitle>
            <DialogDescription>
              Consultez les informations du transporteur et les references des colis pris en charge.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Demande</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">ID</span>
                      <span className="font-medium text-foreground">
                        #{selectedRequest.id.split('-')[1]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Statut</span>
                      <span
                        className={cn(
                          'rounded-lg px-2 py-1 text-xs font-medium',
                          selectedRequest.status === 'ACCEPTED'
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        )}
                      >
                        {selectedRequest.status === 'ACCEPTED' ? 'Acceptee' : 'Rejetee'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium text-foreground">
                        {selectedRequest.createdAt.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Point de collecte</span>
                      <span className="font-medium text-foreground">
                        {getPoint(selectedRequest.collectionPointId)?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Transporteur</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-medium text-foreground">
                        {selectedTransporter?.name || 'Non renseigne'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium text-foreground">
                        {selectedTransporter?.email || 'Non renseigne'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Vehicule assigne</span>
                      <span className="font-medium text-foreground">
                        {selectedTransporterVehicle?.plate || 'Non renseigne'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Type vehicule</span>
                      <span className="font-medium text-foreground">
                        {selectedTransporterVehicle?.type || 'Non renseigne'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Colis pris en charge</p>
                <div className="space-y-3">
                  {selectedRequestParcels.map((parcel) => (
                    <div
                      key={parcel.id}
                      className="rounded-lg border border-border bg-secondary px-4 py-3"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-mono text-sm font-semibold text-foreground">
                              {parcel.trackingNumber}
                            </p>
                            <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getSenderDisplayName(parcel.senderName, currentRole)} vers{' '}
                            {getRecipientDisplayName(parcel.recipientName, currentRole)}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {parcel.weight} kg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleHistoryDetailDialogChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
