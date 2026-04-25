'use client';

import { useState } from 'react';
import { Package, Check, X, AlertTriangle, QrCode, ShieldCheck, UserRound, CircleAlert } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  getKycDocumentLabel,
  getKycVerificationStatusColor,
  getKycVerificationStatusLabel,
  getStatusLabel,
  getStatusColor,
  type Parcel,
} from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function CollectorReception() {
  const { parcels, collectionPoints, updateParcelStatus, updatePointStock } = useStore();
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isKycChecked, setIsKycChecked] = useState(false);
  const [isParcelChecked, setIsParcelChecked] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Parcels waiting to be received (CREATED status)
  const pendingParcels = parcels.filter((p) => p.status === 'CREATED');
  const receivedToday = parcels.filter((p) => p.status === 'RECEIVED_AT_COLLECTION_POINT').length;
  const rejectedTotal = parcels.filter((p) => p.status === 'REJECTED').length;

  const getPointName = (pointId: string) => {
    return collectionPoints.find((p) => p.id === pointId)?.name || pointId;
  };

  const handleValidate = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setIsKycChecked(false);
    setIsParcelChecked(false);
    setIsValidateDialogOpen(true);
  };

  const handleFinalValidation = () => {
    if (!selectedParcel || !isKycChecked || !isParcelChecked) {
      return;
    }

    updateParcelStatus(
      selectedParcel.id,
      'RECEIVED_AT_COLLECTION_POINT',
      'collector-1',
      'Jean Bastos',
      getPointName(selectedParcel.originPointId)
    );
    updatePointStock(selectedParcel.originPointId, 1);
    setSelectedParcel(null);
    setIsKycChecked(false);
    setIsParcelChecked(false);
    setIsValidateDialogOpen(false);
  };

  const handleReject = () => {
    if (selectedParcel) {
      updateParcelStatus(
        selectedParcel.id,
        'REJECTED',
        'collector-1',
        'Jean Bastos',
        getPointName(selectedParcel.originPointId)
      );
      setSelectedParcel(null);
      setRejectReason('');
      setIsRejectDialogOpen(false);
    }
  };

  const openRejectDialog = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setIsRejectDialogOpen(true);
  };

  const handleValidateDialogChange = (open: boolean) => {
    setIsValidateDialogOpen(open);

    if (!open) {
      setSelectedParcel(null);
      setIsKycChecked(false);
      setIsParcelChecked(false);
    }
  };

  const handleRejectDialogChange = (open: boolean) => {
    setIsRejectDialogOpen(open);

    if (!open) {
      setSelectedParcel(null);
      setRejectReason('');
    }
  };

  const isReadyForFinalValidation = isKycChecked && isParcelChecked;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Flux de Reception</h2>
        <p className="text-muted-foreground">
          Validez ou rejetez les colis soumis par les clients
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingParcels.length}</p>
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
              <p className="text-2xl font-bold text-foreground">{receivedToday}</p>
              <p className="text-xs text-muted-foreground">Valides</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rejectedTotal}</p>
              <p className="text-xs text-muted-foreground">Rejetes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Parcels Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                <TableHead className="text-muted-foreground">Client</TableHead>
                <TableHead className="text-muted-foreground">Poids</TableHead>
                <TableHead className="text-muted-foreground">Destination</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingParcels.map((parcel) => (
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
                  <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => openRejectDialog(parcel)}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-success text-success-foreground hover:bg-success/90"
                        onClick={() => handleValidate(parcel)}
                      >
                        <Check className="h-4 w-4" />
                        Valider
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendingParcels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Check className="h-8 w-8 text-success" />
                      <p className="font-medium text-foreground">Tous les colis sont traites</p>
                      <p className="text-sm text-muted-foreground">Aucun colis en attente de validation</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Validate Dialog */}
      <Dialog open={isValidateDialogOpen} onOpenChange={handleValidateDialogChange}>
        <DialogContent className="max-w-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Verification avant prise en charge</DialogTitle>
            <DialogDescription>
              Controlez les informations KYC du deposant ainsi que les caracteristiques du colis avant la validation finale.
            </DialogDescription>
          </DialogHeader>

          {selectedParcel && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                      <UserRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Identite du deposant</p>
                      <p className="text-sm text-muted-foreground">Point de controle KYC</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Nom complet</span>
                      <span className="font-medium text-foreground">{selectedParcel.senderName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Telephone</span>
                      <span className="font-medium text-foreground">{selectedParcel.senderPhone}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Piece presentee</span>
                      <span className="font-medium text-foreground">
                        {getKycDocumentLabel(selectedParcel.senderKyc.documentType)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Numero de piece</span>
                      <span className="font-mono font-medium text-foreground">
                        {selectedParcel.senderKyc.documentNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Statut KYC</span>
                      <span
                        className={cn(
                          'rounded-lg px-2 py-1 text-xs font-medium',
                          getKycVerificationStatusColor(selectedParcel.senderKyc.verificationStatus)
                        )}
                      >
                        {getKycVerificationStatusLabel(selectedParcel.senderKyc.verificationStatus)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Derniere verification</span>
                      <span className="font-medium text-foreground">
                        {selectedParcel.senderKyc.verifiedAt.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15">
                      <Package className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Informations du colis</p>
                      <p className="text-sm text-muted-foreground">Controle physique avant acceptation</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Numero de suivi</span>
                      <span className="font-mono font-medium text-foreground">{selectedParcel.trackingNumber}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Destinataire</span>
                      <span className="font-medium text-foreground">{selectedParcel.recipientName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Description</span>
                      <span className="font-medium text-foreground">{selectedParcel.description}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Poids declare</span>
                      <span className="font-medium text-foreground">{selectedParcel.weight} kg</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Valeur declaree</span>
                      <span className="font-medium text-foreground">{selectedParcel.declaredValue.toLocaleString('fr-FR')} EUR</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Etat du colis</span>
                      <span className="font-medium text-foreground">
                        {selectedParcel.packageCondition === 'FRAGILE' ? 'Fragile' : 'Conforme'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                      <span className="text-muted-foreground">Destination</span>
                      <span className="font-medium text-foreground">
                        {getPointName(selectedParcel.destinationPointId)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Checklist de validation</p>
                    <p className="text-sm text-muted-foreground">
                      La validation finale reste bloquee tant que les deux controles ne sont pas confirmes.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <Checkbox
                      checked={isKycChecked}
                      onCheckedChange={(checked) => setIsKycChecked(checked === true)}
                      aria-label="Confirmer la verification KYC"
                    />
                    <span className="text-sm text-foreground">
                      J&apos;ai verifie l&apos;identite du deposant, la piece presentee et la coherence des informations KYC.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <Checkbox
                      checked={isParcelChecked}
                      onCheckedChange={(checked) => setIsParcelChecked(checked === true)}
                      aria-label="Confirmer la verification du colis"
                    />
                    <span className="text-sm text-foreground">
                      J&apos;ai controle le colis physiquement, son etat, son poids declare et les informations de destination.
                    </span>
                  </label>
                </div>
              </div>

              {!isReadyForFinalValidation && (
                <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
                  <CircleAlert className="mt-0.5 h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-foreground">Validation finale verrouillee</p>
                    <p className="text-sm text-muted-foreground">
                      Les confirmations KYC et colis sont requises avant la prise en charge.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleValidateDialogChange(false)}>Annuler</Button>
            <Button
              onClick={handleFinalValidation}
              disabled={!isReadyForFinalValidation}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              <QrCode className="h-4 w-4" />
              Valider la prise en charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={handleRejectDialogChange}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rejeter le colis</DialogTitle>
            <DialogDescription>
              Vous allez rejeter le colis {selectedParcel?.trackingNumber}. Veuillez indiquer le motif du rejet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium text-foreground">Motif du rejet</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Colis endommage, poids incorrect, emballage non conforme..."
              className="bg-secondary min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRejectDialogChange(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
