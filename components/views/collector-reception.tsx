'use client';

import { useState } from 'react';
import {
  Package,
  Check,
  X,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  CircleAlert,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { parcels, collectionPoints, updateParcelStatus } = useStore();
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isKycChecked, setIsKycChecked] = useState(false);
  const [isParcelChecked, setIsParcelChecked] = useState(false);
  const [referenceInput, setReferenceInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const pendingParcels = parcels.filter((parcel) => parcel.status === 'CREATED');
  const receivedToday = parcels.filter(
    (parcel) => parcel.status === 'RECEIVED_AT_COLLECTION_POINT'
  ).length;
  const rejectedTotal = parcels.filter((parcel) => parcel.status === 'REJECTED').length;

  const getPointName = (pointId: string) =>
    collectionPoints.find((point) => point.id === pointId)?.name || pointId;

  const normalizedReference = referenceInput.trim().toUpperCase();
  const expectedReference = selectedParcel?.trackingNumber.trim().toUpperCase() ?? '';
  const isReferenceValid = normalizedReference.length > 0 && normalizedReference === expectedReference;
  const isReadyForFinalValidation = isKycChecked && isParcelChecked && isReferenceValid;

  const handleValidate = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setIsKycChecked(false);
    setIsParcelChecked(false);
    setReferenceInput('');
    setIsValidateDialogOpen(true);
  };

  const handleFinalValidation = () => {
    if (!selectedParcel || !isReadyForFinalValidation) {
      return;
    }

    updateParcelStatus(
      selectedParcel.id,
      'RECEIVED_AT_COLLECTION_POINT',
      'collector-1',
      'Jean Bastos',
      getPointName(selectedParcel.originPointId)
    );
    setSelectedParcel(null);
    setIsKycChecked(false);
    setIsParcelChecked(false);
    setReferenceInput('');
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
      setReferenceInput('');
    }
  };

  const handleRejectDialogChange = (open: boolean) => {
    setIsRejectDialogOpen(open);

    if (!open) {
      setSelectedParcel(null);
      setRejectReason('');
    }
  };

  const referenceHelperText =
    referenceInput.trim().length === 0
      ? 'Saisissez le numero de reference figurant sur le colis ou le bordereau client.'
      : isReferenceValid
        ? 'Numero de reference valide.'
        : 'Le numero de reference saisi ne correspond pas au colis en cours de reception.';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Flux de Reception</h2>
        <p className="text-muted-foreground">Validez ou rejetez les colis soumis par les clients</p>
      </div>

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

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
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
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Check className="h-8 w-8 text-success" />
                      <p className="font-medium text-foreground">Tous les colis sont traites</p>
                      <p className="text-sm text-muted-foreground">
                        Aucun colis en attente de validation
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isValidateDialogOpen} onOpenChange={handleValidateDialogChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Verification avant prise en charge</DialogTitle>
            <DialogDescription>
              Controlez le deposant, le colis et le numero de reference avant la validation finale.
            </DialogDescription>
          </DialogHeader>

          {selectedParcel && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Identite deposant</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-medium text-foreground">{selectedParcel.senderName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Telephone</span>
                      <span className="font-medium text-foreground">{selectedParcel.senderPhone}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Piece</span>
                      <span className="font-medium text-foreground">
                        {getKycDocumentLabel(selectedParcel.senderKyc.documentType)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
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
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Colis a receptionner</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Destinataire</span>
                      <span className="font-medium text-foreground">{selectedParcel.recipientName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Poids</span>
                      <span className="font-medium text-foreground">{selectedParcel.weight} kg</span>
                    </div>
                    {selectedParcel.estimatedPrice !== undefined && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Prix estime</span>
                        <span className="font-medium text-foreground">
                          {selectedParcel.estimatedPrice.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          EUR
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Etat</span>
                      <span className="font-medium text-foreground">
                        {selectedParcel.packageCondition === 'FRAGILE' ? 'Fragile' : 'Conforme'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Destination</span>
                      <span className="font-medium text-foreground">
                        {getPointName(selectedParcel.destinationPointId)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Numero de reference</p>
                    <p className="text-sm text-muted-foreground">
                      Saisissez la reference du colis pour confirmer qu&apos;il s&apos;agit bien de la bonne remise client.
                    </p>
                  </div>
                </div>
                <Input
                  value={referenceInput}
                  onChange={(event) => setReferenceInput(event.target.value)}
                  placeholder="Entrer le numero de reference"
                  className="bg-secondary"
                />
                <div
                  className={cn(
                    'mt-3 flex items-start gap-3 rounded-lg border px-3 py-3',
                    isReferenceValid
                      ? 'border-success/40 bg-success/10'
                      : 'border-warning/40 bg-warning/10'
                  )}
                >
                  <CircleAlert
                    className={cn(
                      'mt-0.5 h-5 w-5',
                      isReferenceValid ? 'text-success' : 'text-warning'
                    )}
                  />
                  <p className="text-sm text-muted-foreground">{referenceHelperText}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Checklist obligatoire</p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <Checkbox
                      checked={isKycChecked}
                      onCheckedChange={(checked) => setIsKycChecked(checked === true)}
                      aria-label="Confirmer la verification KYC"
                    />
                    <span className="text-sm text-foreground">
                      J&apos;ai verifie l&apos;identite du deposant et la coherence des informations KYC.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <Checkbox
                      checked={isParcelChecked}
                      onCheckedChange={(checked) => setIsParcelChecked(checked === true)}
                      aria-label="Confirmer la verification du colis"
                    />
                    <span className="text-sm text-foreground">
                      J&apos;ai controle le colis physiquement, son etat et ses informations logistiques.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleValidateDialogChange(false)}>
              Annuler
            </Button>
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

      <Dialog open={isRejectDialogOpen} onOpenChange={handleRejectDialogChange}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto border-border bg-card">
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
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Colis endommage, poids incorrect, emballage non conforme..."
              className="min-h-[100px] bg-secondary"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRejectDialogChange(false)}>
              Annuler
            </Button>
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
