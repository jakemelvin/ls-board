'use client';

import { type ElementType, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CircleAlert,
  Clock3,
  Package,
  PackageCheck,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLatestRequest } from '@/hooks/use-latest-request';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency';
import {
  getCollectorIncomingShipments,
  rejectIncomingShipment,
  validateIncomingShipment,
} from '@/lib/shipments/api';
import {
  formatShipmentDate,
  getShipmentPaymentStatusClassName,
  getShipmentStatusClassName,
  getShipmentStatusLabel,
  getShipmentTransactionStatusClassName,
  SHIPMENT_PAYMENT_STATUS_LABELS,
  SHIPMENT_PRIORITY_LABELS,
  SHIPMENT_TRANSACTION_STATUS_LABELS,
} from '@/lib/shipments/presentation';
import type { CollectorIncomingShipment } from '@/lib/shipments/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export function CollectorReception() {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const token = useAuthStore((state) => state.token);
  const [shipments, setShipments] = useState<CollectorIncomingShipment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<CollectorIncomingShipment | null>(null);
  const [isIdentityChecked, setIsIdentityChecked] = useState(false);
  const [isParcelChecked, setIsParcelChecked] = useState(false);
  const [isCompanyPaymentChecked, setIsCompanyPaymentChecked] = useState(false);
  const [referenceInput, setReferenceInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [validatedCount, setValidatedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const loadIncomingShipments = useCallback(async () => {
    if (!token) {
      setError('Session expiree');
      setLoading(false);
      return;
    }

    const requestId = beginRequest();

    setLoading(true);
    setError(null);

    try {
      const response = await getCollectorIncomingShipments(token, {
        page,
        size: PAGE_SIZE,
      });

      if (isLatestRequest(requestId)) {
        setShipments(response.content ?? []);
        setTotalPages(response.totalPages ?? 0);
        setTotalElements(response.totalElements ?? 0);
      }
    } catch (err) {
      if (isLatestRequest(requestId)) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Impossible de charger les colis a receptionner.',
        );
        setShipments([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } finally {
      if (isLatestRequest(requestId)) setLoading(false);
    }
  }, [beginRequest, isLatestRequest, page, token]);

  useEffect(() => {
    void loadIncomingShipments();
  }, [loadIncomingShipments]);

  const filteredShipments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return shipments;

    return shipments.filter((shipment) =>
      [
        String(shipment.shipmentId),
        shipment.senderFullName,
        shipment.receiverFullName,
        shipment.originCollectionPointName,
        shipment.destinationCollectionPointName,
        shipment.companyName,
        shipment.parcelTypeName,
        shipment.transportModeName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [searchTerm, shipments]);

  const isReferenceReady = referenceInput.trim().length > 0;
  const selectedShipmentRequiresCollection =
    selectedShipment?.paymentStatus === 'UNPAID' &&
    selectedShipment.transactionStatus === 'PLATFORM_FEE_PAID';
  const selectedShipmentPaymentIsBlocked =
    selectedShipment?.paymentStatus === 'UNPAID' && !selectedShipmentRequiresCollection;
  const isReadyForFinalValidation =
    isIdentityChecked &&
    isParcelChecked &&
    isReferenceReady &&
    !selectedShipmentPaymentIsBlocked &&
    (!selectedShipmentRequiresCollection || isCompanyPaymentChecked);

  const openValidateDialog = (shipment: CollectorIncomingShipment) => {
    if (
      shipment.paymentStatus === 'UNPAID' &&
      shipment.transactionStatus !== 'PLATFORM_FEE_PAID'
    ) {
      toast({
        title: t('collectorReception.payments.platformFeeRequiredTitle'),
        description: t('collectorReception.payments.platformFeeRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    setSelectedShipment(shipment);
    setIsIdentityChecked(false);
    setIsParcelChecked(false);
    setIsCompanyPaymentChecked(false);
    setReferenceInput('');
    setIsValidateDialogOpen(true);
  };

  const openRejectDialog = (shipment: CollectorIncomingShipment) => {
    setSelectedShipment(shipment);
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };

  const resetValidateDialog = () => {
    setIsValidateDialogOpen(false);
    setSelectedShipment(null);
    setIsIdentityChecked(false);
    setIsParcelChecked(false);
    setIsCompanyPaymentChecked(false);
    setReferenceInput('');
  };

  const resetRejectDialog = () => {
    setIsRejectDialogOpen(false);
    setSelectedShipment(null);
    setRejectReason('');
  };

  const handleValidateDialogChange = (open: boolean) => {
    if (actionLoading) return;

    setIsValidateDialogOpen(open);
    if (!open) {
      resetValidateDialog();
    }
  };

  const handleRejectDialogChange = (open: boolean) => {
    if (actionLoading) return;

    setIsRejectDialogOpen(open);
    if (!open) {
      resetRejectDialog();
    }
  };

  const handleFinalValidation = async () => {
    if (!token || !selectedShipment || !isReadyForFinalValidation) {
      return;
    }

    if (selectedShipmentPaymentIsBlocked) {
      toast({
        title: t('collectorReception.payments.blockedTitle'),
        description: t('collectorReception.payments.platformFeeRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);

    try {
      const response = await validateIncomingShipment(token, selectedShipment.shipmentId, {
        shipmentReference: referenceInput.trim(),
      });

      toast({
        title: 'Colis receptionne',
        description:
          response.note ??
          `Le colis #${selectedShipment.shipmentId} a ete valide par le collecteur.`,
      });
      setValidatedCount((current) => current + 1);
      resetValidateDialog();
      await loadIncomingShipments();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Impossible de valider la reception du colis.';
      toast({
        title: 'Validation refusee',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token || !selectedShipment || !rejectReason.trim()) {
      return;
    }

    setActionLoading(true);

    try {
      const response = await rejectIncomingShipment(token, selectedShipment.shipmentId, {
        reason: rejectReason.trim(),
      });

      toast({
        title: 'Colis rejete',
        description:
          response.note ??
          `Le colis #${selectedShipment.shipmentId} a ete rejete par le collecteur.`,
      });
      setRejectedCount((current) => current + 1);
      resetRejectDialog();
      await loadIncomingShipments();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Impossible de rejeter la reception du colis.';
      toast({
        title: 'Rejet impossible',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Flux de Reception</h2>
          <p className="text-muted-foreground">
            Receptionnez ou rejetez les colis remis par les clients au point de collecte.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-fit gap-2"
          onClick={() => void loadIncomingShipments()}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ReceptionStatCard
          icon={Clock3}
          label="A receptionner"
          value={totalElements}
          className="bg-warning/15 text-warning"
        />
        <ReceptionStatCard
          icon={Check}
          label="Valides session"
          value={validatedCount}
          className="bg-success/15 text-success"
        />
        <ReceptionStatCard
          icon={X}
          label="Rejetes session"
          value={rejectedCount}
          className="bg-destructive/15 text-destructive"
        />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher par expediteur, destinataire, point ou type..."
              className="bg-secondary pl-10"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => void loadIncomingShipments()}
              >
                <RefreshCw className="h-4 w-4" />
                Reessayer
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Colis</TableHead>
                      <TableHead className="text-muted-foreground">Client</TableHead>
                      <TableHead className="text-muted-foreground">Trajet</TableHead>
                      <TableHead className="text-muted-foreground">Statut paiement</TableHead>
                      <TableHead className="text-muted-foreground">Statut</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment) => {
                      const requiresCollection =
                        shipment.paymentStatus === 'UNPAID' &&
                        shipment.transactionStatus === 'PLATFORM_FEE_PAID';
                      const paymentBlocked =
                        shipment.paymentStatus === 'UNPAID' && !requiresCollection;

                      return (
                      <TableRow key={shipment.shipmentId} className="border-border">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">#{shipment.shipmentId}</p>
                            <p className="text-xs text-muted-foreground">
                              {shipment.parcelTypeName ?? 'Type non renseigne'}
                              {shipment.transportModeName ? ` - ${shipment.transportModeName}` : ''}
                            </p>
                            {shipment.priority && (
                              <Badge variant="outline">
                                {SHIPMENT_PRIORITY_LABELS[shipment.priority]}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-foreground">
                              {shipment.senderFullName ?? 'Expediteur non renseigne'}
                            </p>
                            <p className="text-muted-foreground">
                              Vers {shipment.receiverFullName ?? 'destinataire non renseigne'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="text-foreground">
                              {shipment.originCollectionPointName ?? 'Origine non renseignee'}
                            </p>
                            <p className="text-muted-foreground">
                              {shipment.destinationCollectionPointName ?? 'Destination non renseignee'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-foreground">
                              {formatMoney(shipment.price, { fallback: 'Non renseigne' })}
                            </p>
                            {shipment.paymentStatus ? (
                              <Badge
                                className={cn(
                                  'border-0',
                                  getShipmentPaymentStatusClassName(shipment.paymentStatus),
                                )}
                              >
                                {SHIPMENT_PAYMENT_STATUS_LABELS[shipment.paymentStatus]}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Paiement non renseigne</Badge>
                            )}
                            {shipment.transactionStatus && (
                              <Badge
                                className={cn(
                                  'border-0',
                                  getShipmentTransactionStatusClassName(shipment.transactionStatus),
                                )}
                              >
                                {SHIPMENT_TRANSACTION_STATUS_LABELS[shipment.transactionStatus]}
                              </Badge>
                            )}
                            {requiresCollection && (
                              <p className="text-xs font-medium text-warning">
                                {t('collectorReception.payments.collectCompanyPrice', {
                                  values: { amount: formatMoney(shipment.companyPrice) },
                                })}
                              </p>
                            )}
                            {paymentBlocked && (
                              <p className="text-xs text-destructive">
                                {t('collectorReception.payments.platformFeePending')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {shipment.status ? (
                            <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
                              {getShipmentStatusLabel(shipment.status)}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Non renseigne</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => openRejectDialog(shipment)}
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Rejeter
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1 bg-success text-success-foreground hover:bg-success/90"
                              disabled={paymentBlocked}
                              title={
                                paymentBlocked
                                  ? t('collectorReception.payments.platformFeeRequiredTitle')
                                  : undefined
                              }
                              onClick={() => openValidateDialog(shipment)}
                            >
                              <PackageCheck className="h-4 w-4" />
                              {requiresCollection
                                ? t('collectorReception.payments.collectAndReceive')
                                : paymentBlocked
                                  ? t('collectorReception.payments.blockedButton')
                                  : 'Receptionner'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}

                    {filteredShipments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <p className="font-medium text-foreground">Aucun colis a receptionner</p>
                            <p className="text-sm text-muted-foreground">
                              Les colis entrants valides par le backend apparaitront ici.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {totalPages === 0 ? 0 : page + 1} sur {totalPages} - {totalElements} colis
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                  >
                    Precedent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={totalPages === 0 || page >= totalPages - 1}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isValidateDialogOpen} onOpenChange={handleValidateDialogChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reception du colis client</DialogTitle>
            <DialogDescription>
              Controlez le deposant, le colis et saisissez la reference lue sur le colis.
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ReceptionInfoPanel
                  title="Remise client"
                  rows={[
                    ['Expediteur', selectedShipment.senderFullName],
                    ['Destinataire', selectedShipment.receiverFullName],
                    ['Cree le', formatShipmentDate(selectedShipment.createdAt)],
                    ['Entreprise', selectedShipment.companyName],
                  ]}
                />
                <ReceptionInfoPanel
                  title="Colis"
                  rows={[
                    ['Type', selectedShipment.parcelTypeName],
                    ['Transport', selectedShipment.transportModeName],
                    [
                      'Priorite',
                      selectedShipment.priority
                        ? SHIPMENT_PRIORITY_LABELS[selectedShipment.priority]
                        : undefined,
                    ],
                    ['Prix', formatMoney(selectedShipment.price, { fallback: 'Non renseigne' })],
                  ]}
                />
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                {selectedShipmentPaymentIsBlocked && (
                  <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                    {t('collectorReception.payments.platformFeeRequiredDescription')}
                  </div>
                )}
                {selectedShipmentRequiresCollection && (
                  <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-3 text-sm text-foreground">
                    <p className="font-semibold">
                      {t('collectorReception.payments.companyPriceDue', {
                        values: { amount: formatMoney(selectedShipment.companyPrice) },
                      })}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {t('collectorReception.payments.companyPriceDueDescription')}
                    </p>
                  </div>
                )}
                <div className="mb-3 flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reference du colis</p>
                    <p className="text-sm text-muted-foreground">
                      La reference n&apos;est pas exposee dans la liste pour eviter une validation
                      automatique. Le backend verifiera la reference saisie.
                    </p>
                  </div>
                </div>
                <Input
                  value={referenceInput}
                  onChange={(event) => setReferenceInput(event.target.value)}
                  placeholder="Reference presente sur le colis ou le bordereau"
                  className="bg-secondary"
                  disabled={actionLoading}
                />
                <div
                  className={cn(
                    'mt-3 flex items-start gap-3 rounded-lg border px-3 py-3',
                    isReferenceReady
                      ? 'border-success/40 bg-success/10'
                      : 'border-warning/40 bg-warning/10',
                  )}
                >
                  <CircleAlert
                    className={cn(
                      'mt-0.5 h-5 w-5',
                      isReferenceReady ? 'text-success' : 'text-warning',
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    {isReferenceReady
                      ? 'Reference prete pour verification backend.'
                      : 'Saisissez la reference du colis remis par le client.'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Checklist obligatoire</p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <Checkbox
                      checked={isIdentityChecked}
                      onCheckedChange={(checked) => setIsIdentityChecked(checked === true)}
                      disabled={actionLoading}
                      aria-label="Confirmer la verification du deposant"
                    />
                    <span className="text-sm text-foreground">
                      J&apos;ai verifie l&apos;identite du deposant et la coherence avec le colis.
                    </span>
                  </label>
                  {selectedShipmentRequiresCollection && (
                    <label className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 px-3 py-3">
                      <Checkbox
                        checked={isCompanyPaymentChecked}
                        onCheckedChange={(checked) => setIsCompanyPaymentChecked(checked === true)}
                        disabled={actionLoading}
                        aria-label={t('collectorReception.payments.confirmCashAria')}
                      />
                      <span className="text-sm text-foreground">
                        {t('collectorReception.payments.confirmCash', {
                          values: { amount: formatMoney(selectedShipment.companyPrice) },
                        })}
                      </span>
                    </label>
                  )}
                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <Checkbox
                      checked={isParcelChecked}
                      onCheckedChange={(checked) => setIsParcelChecked(checked === true)}
                      disabled={actionLoading}
                      aria-label="Confirmer la verification physique du colis"
                    />
                    <span className="text-sm text-foreground">
                      J&apos;ai controle physiquement le colis avant la prise en charge.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleValidateDialogChange(false)}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={() => void handleFinalValidation()}
              disabled={!isReadyForFinalValidation || actionLoading}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              {actionLoading ? 'Validation...' : 'Valider la reception'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={handleRejectDialogChange}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rejeter la reception</DialogTitle>
            <DialogDescription>
              Indiquez le motif de rejet du colis #{selectedShipment?.shipmentId}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium text-foreground">Motif du rejet</label>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Colis endommage, reference incoherente, client non conforme..."
              className="min-h-[100px] bg-secondary"
              disabled={actionLoading}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleRejectDialogChange(false)}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleReject()}
              disabled={!rejectReason.trim() || actionLoading}
              className="gap-2"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {actionLoading ? 'Rejet...' : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceptionStatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: ElementType;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', className)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReceptionInfoPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string | number | undefined]>;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>
      <div className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium text-foreground">
              {value || 'Non renseigne'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
