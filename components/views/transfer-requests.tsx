'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  X,
  Clock,
  Eye,
  Truck,
  PackageCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { type Parcel, type User, type UserRole } from '@/lib/mock-data';
import { getRecipientDisplayName, getSenderDisplayName } from '@/lib/parcel-privacy';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface TransferRequestsProps {
  currentRole: UserRole;
  currentUser: User;
}

const isParcel = (parcel: Parcel | undefined): parcel is Parcel => Boolean(parcel);

function getRequestStatusBadge(status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED') {
  switch (status) {
    case 'PENDING':
      return 'bg-warning/20 text-warning';
    case 'ACCEPTED':
      return 'bg-chart-2/20 text-chart-2';
    case 'COMPLETED':
      return 'bg-success/20 text-success';
    case 'REJECTED':
      return 'bg-destructive/20 text-destructive';
  }
}

function getRequestStatusLabel(status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED') {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'ACCEPTED':
      return 'Acceptee';
    case 'COMPLETED':
      return 'Retrait confirme';
    case 'REJECTED':
      return 'Rejetee';
  }
}

export function TransferRequests({ currentRole, currentUser }: TransferRequestsProps) {
  const {
    transferRequests,
    parcels,
    users,
    vehicles,
    collectionPoints,
    updateTransferRequestStatus,
    completeTransferRequestPickup,
  } = useStore();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false);
  const [isHistoryDetailDialogOpen, setIsHistoryDetailDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedPickupParcelIds, setSelectedPickupParcelIds] = useState<string[]>([]);

  const getUser = (userId: string) => users.find((user) => user.id === userId);
  const getPoint = (pointId: string) => collectionPoints.find((point) => point.id === pointId);
  const getParcel = (parcelId: string) => parcels.find((parcel) => parcel.id === parcelId);

  const scopedRequests = useMemo(() => {
    if (currentRole === 'TRANSPORTER') {
      return transferRequests.filter((request) => request.transporterId === currentUser.id);
    }

    if (currentRole === 'COLLECTOR') {
      return transferRequests.filter((request) => request.collectorId === currentUser.id);
    }

    return transferRequests;
  }, [currentRole, currentUser.id, transferRequests]);

  const pendingRequests = scopedRequests.filter((request) => request.status === 'PENDING');
  const acceptedRequests = scopedRequests.filter((request) => request.status === 'ACCEPTED');
  const historyRequests = scopedRequests.filter(
    (request) => request.status === 'REJECTED' || request.status === 'COMPLETED'
  );

  const selectedRequest = selectedRequestId
    ? scopedRequests.find((request) => request.id === selectedRequestId) ?? null
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

    updateTransferRequestStatus(selectedRequestId, 'ACCEPTED');
    setSelectedRequestId(null);
    setIsAcceptDialogOpen(false);
  };

  const handleReject = () => {
    if (!selectedRequestId) {
      return;
    }

    updateTransferRequestStatus(selectedRequestId, 'REJECTED');
    setSelectedRequestId(null);
    setIsRejectDialogOpen(false);
  };

  const handleConfirmPickup = () => {
    if (!selectedRequest || selectedPickupParcelIds.length === 0) {
      return;
    }

    completeTransferRequestPickup(
      selectedRequest.id,
      selectedPickupParcelIds,
      currentUser.id,
      currentUser.name
    );
    setSelectedPickupParcelIds([]);
    setSelectedRequestId(null);
    setIsPickupDialogOpen(false);
  };

  const openAcceptDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setIsAcceptDialogOpen(true);
  };

  const openRejectDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setIsRejectDialogOpen(true);
  };

  const openPickupDialog = (requestId: string) => {
    const request = scopedRequests.find((item) => item.id === requestId);
    setSelectedRequestId(requestId);
    setSelectedPickupParcelIds(request?.parcelIds ?? []);
    setIsPickupDialogOpen(true);
  };

  const openHistoryDetailDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setIsHistoryDetailDialogOpen(true);
  };

  const resetSelectionState = () => {
    setSelectedRequestId(null);
    setSelectedPickupParcelIds([]);
  };

  const togglePickupParcel = (parcelId: string) => {
    setSelectedPickupParcelIds((current) =>
      current.includes(parcelId)
        ? current.filter((id) => id !== parcelId)
        : [...current, parcelId]
    );
  };

  const pendingTitle =
    currentRole === 'COLLECTOR' ? 'Demandes en attente' : 'Demandes envoyees en attente';
  const acceptedTitle =
    currentRole === 'TRANSPORTER' ? 'Demandes acceptees a charger' : 'Demandes acceptees';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Demandes de Prise en Charge</h2>
        <p className="text-muted-foreground">
          {currentRole === 'COLLECTOR'
            ? 'Validez les demandes puis laissez le transporteur confirmer les colis reels a embarquer'
            : currentRole === 'TRANSPORTER'
              ? 'Suivez vos demandes puis confirmez les colis que vous prenez reellement'
              : 'Suivi de toutes les demandes de transfert'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/20">
              <Check className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{acceptedRequests.length}</p>
              <p className="text-xs text-muted-foreground">Acceptees</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <PackageCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {historyRequests.filter((request) => request.status === 'COMPLETED').length}
              </p>
              <p className="text-xs text-muted-foreground">Retirees</p>
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
                {historyRequests.filter((request) => request.status === 'REJECTED').length}
              </p>
              <p className="text-xs text-muted-foreground">Rejetees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{pendingTitle}</h3>
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
                      <TableCell className="font-mono text-foreground">
                        #{request.id.split('-')[1]}
                      </TableCell>
                      <TableCell className="text-foreground">{transporter?.name}</TableCell>
                      <TableCell className="text-foreground">{point?.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {requestParcels.length} colis demandes
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {currentRole === 'TRANSPORTER'
                              ? 'En attente de validation collecteur'
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
                              <Check className="h-4 w-4" />
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
                      className="h-24 text-center text-muted-foreground"
                    >
                      Aucune demande en attente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {acceptedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{acceptedTitle}</h3>
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
                    {currentRole === 'TRANSPORTER' && (
                      <TableHead className="text-right text-muted-foreground">Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acceptedRequests.map((request) => {
                    const transporter = getUser(request.transporterId);
                    const point = getPoint(request.collectionPointId);

                    return (
                      <TableRow key={request.id} className="border-border">
                        <TableCell className="font-mono text-foreground">
                          #{request.id.split('-')[1]}
                        </TableCell>
                        <TableCell className="text-foreground">{transporter?.name}</TableCell>
                        <TableCell className="text-muted-foreground">{point?.name}</TableCell>
                        <TableCell className="text-foreground">{request.parcelIds.length} colis</TableCell>
                        <TableCell>
                          <span className="rounded-lg bg-chart-2/20 px-2 py-1 text-xs font-medium text-chart-2">
                            Acceptee
                          </span>
                        </TableCell>
                        {currentRole === 'TRANSPORTER' && (
                          <TableCell className="text-right">
                            <Button className="gap-2" size="sm" onClick={() => openPickupDialog(request.id)}>
                              <Truck className="h-4 w-4" />
                              Choisir les colis a prendre
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {historyRequests.length > 0 && (
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
                    <TableHead className="text-muted-foreground">Colis retires</TableHead>
                    <TableHead className="text-muted-foreground">Statut</TableHead>
                    <TableHead className="text-right text-muted-foreground">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRequests.map((request) => {
                    const transporter = getUser(request.transporterId);
                    const point = getPoint(request.collectionPointId);
                    const pickedCount = request.pickedParcelIds?.length ?? 0;

                    return (
                      <TableRow key={request.id} className="border-border opacity-85">
                        <TableCell className="font-mono text-foreground">
                          #{request.id.split('-')[1]}
                        </TableCell>
                        <TableCell className="text-foreground">{transporter?.name}</TableCell>
                        <TableCell className="text-muted-foreground">{point?.name}</TableCell>
                        <TableCell className="text-foreground">
                          {request.status === 'COMPLETED'
                            ? `${pickedCount}/${request.parcelIds.length} colis`
                            : `${request.parcelIds.length} colis`}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'rounded-lg px-2 py-1 text-xs font-medium',
                              getRequestStatusBadge(request.status)
                            )}
                          >
                            {getRequestStatusLabel(request.status)}
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

      <Dialog open={isAcceptDialogOpen} onOpenChange={(open) => {
        setIsAcceptDialogOpen(open);
        if (!open) {
          resetSelectionState();
        }
      }}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Accepter la demande</DialogTitle>
            <DialogDescription>
              Le transporteur pourra ensuite choisir les colis qu&apos;il embarque reellement.
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAcceptDialogOpen(false);
              resetSelectionState();
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleAccept}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              <Check className="h-4 w-4" />
              Confirmer l'acceptation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={(open) => {
        setIsRejectDialogOpen(open);
        if (!open) {
          resetSelectionState();
        }
      }}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rejeter la demande</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir rejeter cette demande de transfert ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRejectDialogOpen(false);
              resetSelectionState();
            }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject} className="gap-2">
              <X className="h-4 w-4" />
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPickupDialogOpen} onOpenChange={(open) => {
        setIsPickupDialogOpen(open);
        if (!open) {
          resetSelectionState();
        }
      }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Choisir les colis a embarquer</DialogTitle>
            <DialogDescription>
              Seuls les colis selectionnes passeront au statut EN_TRANSIT.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {getPoint(selectedRequest.collectionPointId)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPickupParcelIds.length}/{selectedRequest.parcelIds.length} colis selectionnes
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Vehicule: {selectedTransporterVehicle?.plate ?? 'Non assigne'}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {selectedRequestParcels.map((parcel) => {
                  const isSelected = selectedPickupParcelIds.includes(parcel.id);

                  return (
                    <label
                      key={parcel.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3',
                        isSelected && 'border-primary bg-primary/5'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePickupParcel(parcel.id)}
                        aria-label={`Selectionner ${parcel.trackingNumber}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {parcel.trackingNumber}
                          </span>
                          <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                        </div>
                        <p className="mt-1 text-sm text-foreground">
                          {getSenderDisplayName(parcel.senderName, currentRole)} vers{' '}
                          {getRecipientDisplayName(parcel.recipientName, currentRole)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{parcel.weight} kg</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPickupDialogOpen(false);
              resetSelectionState();
            }}>
              Retour
            </Button>
            <Button
              onClick={handleConfirmPickup}
              disabled={selectedPickupParcelIds.length === 0}
              className="gap-2"
            >
              <Truck className="h-4 w-4" />
              Confirmer le chargement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryDetailDialogOpen} onOpenChange={(open) => {
        setIsHistoryDetailDialogOpen(open);
        if (!open) {
          resetSelectionState();
        }
      }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Details de la demande</DialogTitle>
            <DialogDescription>
              Consultez les informations du transporteur et le resultat reel de la prise.
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
                          getRequestStatusBadge(selectedRequest.status)
                        )}
                      >
                        {getRequestStatusLabel(selectedRequest.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Date demande</span>
                      <span className="font-medium text-foreground">
                        {selectedRequest.createdAt.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Point</span>
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
                      <span className="text-muted-foreground">Vehicule</span>
                      <span className="font-medium text-foreground">
                        {selectedTransporterVehicle?.plate || 'Non renseigne'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Colis retires</span>
                      <span className="font-medium text-foreground">
                        {selectedRequest.pickedParcelIds?.length ?? 0}/{selectedRequest.parcelIds.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Colis concernes</p>
                <div className="space-y-3">
                  {selectedRequestParcels.map((parcel) => {
                    const wasPicked = selectedRequest.pickedParcelIds?.includes(parcel.id) ?? false;

                    return (
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
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">{parcel.weight} kg</p>
                            <p className={cn('font-medium', wasPicked ? 'text-success' : 'text-muted-foreground')}>
                              {wasPicked ? 'Pris en charge' : 'Non embarque'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsHistoryDetailDialogOpen(false);
              resetSelectionState();
            }}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
