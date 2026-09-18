'use client';

import { type ElementType, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  CircleAlert,
  Clock3,
  CreditCard,
  Package,
  PackageCheck,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ShipmentPaymentDialog } from '@/components/payments/shipment-payment-dialog';
import { QrCodeScannerDialog } from '@/components/shipments/qr-code-scanner-dialog';
import { useLatestRequest } from '@/hooks/use-latest-request';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataPagination } from '@/components/ui/data-pagination';
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
  getShipment,
  rejectIncomingShipment,
  validateIncomingShipment,
} from '@/lib/shipments/api';
import {
  formatShipmentDate,
  getShipmentPaymentStatusClassName,
  getShipmentStatusClassName,
  getShipmentTransactionStatusClassName,
} from '@/lib/shipments/presentation';
import type { CollectorIncomingShipment } from '@/lib/shipments/types';
import {
  inferShipmentIdFromReference,
  normalizeShipmentReference,
  parseScannedShipmentPayload,
} from '@/lib/shipments/qr';
import { cn } from '@/lib/utils';

type SortDirection = 'desc' | 'asc';

export function CollectorReception() {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const token = useAuthStore((state) => state.token);
  const [shipments, setShipments] = useState<CollectorIncomingShipment[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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
  const [paymentTarget, setPaymentTarget] = useState<CollectorIncomingShipment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'find' | 'reference' | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [validatedCount, setValidatedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const loadIncomingShipments = useCallback(async () => {
    if (!token) {
      setError(t('parcelManagement.errors.sessionExpired'));
      setLoading(false);
      return;
    }

    const requestId = beginRequest();

    setLoading(true);
    setError(null);

    try {
      const response = await getCollectorIncomingShipments(token, {
        page,
        size: pageSize,
        sort: `createdAt,${sortDirection}`,
      });

      // The reception endpoint currently omits paymentCollectionMode. Load the
      // shipment details when needed so PLATFORM shipments collect the full
      // shipment amount while COLLECTION_POINT shipments retain their local
      // collection flow.
      const incomingShipments = response.content ?? [];
      const detailResults = await Promise.allSettled(
        incomingShipments
          .filter((shipment) => !shipment.paymentCollectionMode)
          .map(async (shipment) => ({
            shipmentId: shipment.shipmentId,
            paymentCollectionMode: (await getShipment(token, shipment.shipmentId)).paymentCollectionMode,
          })),
      );
      const paymentCollectionModes = new Map(
        detailResults.flatMap((result) =>
          result.status === 'fulfilled' && result.value.paymentCollectionMode
            ? [[result.value.shipmentId, result.value.paymentCollectionMode] as const]
            : [],
        ),
      );
      const resolvedShipments = incomingShipments.map((shipment) => ({
        ...shipment,
        paymentCollectionMode:
          shipment.paymentCollectionMode ?? paymentCollectionModes.get(shipment.shipmentId),
      }));

      if (isLatestRequest(requestId)) {
        setShipments(resolvedShipments);
        setTotalPages(response.totalPages ?? 0);
        setTotalElements(response.totalElements ?? 0);
      }
    } catch (err) {
      if (isLatestRequest(requestId)) {
        setError(
          err instanceof ApiError
            ? err.message
            : t('collectorReception.errors.loadIncoming'),
        );
        setShipments([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } finally {
      if (isLatestRequest(requestId)) setLoading(false);
    }
  }, [beginRequest, isLatestRequest, page, pageSize, sortDirection, token]);

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

  const openValidateDialog = (
    shipment: CollectorIncomingShipment,
    scannedReference = '',
  ) => {
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
    setReferenceInput(scannedReference);
    setIsValidateDialogOpen(true);
  };

  const findIncomingShipment = async (shipmentId: number) => {
    const loadedShipment = shipments.find((shipment) => shipment.shipmentId === shipmentId);
    if (loadedShipment) return loadedShipment;
    if (!token) return null;

    let targetPage = 0;
    let pageCount = 1;

    do {
      const response = await getCollectorIncomingShipments(token, {
        page: targetPage,
        size: 100,
        sort: `createdAt,${sortDirection}`,
      });
      const match = response.content?.find((shipment) => shipment.shipmentId === shipmentId);
      if (match) return match;
      pageCount = response.totalPages ?? 0;
      targetPage += 1;
    } while (targetPage < pageCount);

    return null;
  };

  const resolveScannedShipment = async (scannedValue: string) => {
    if (!token) return null;
    const payload = parseScannedShipmentPayload(scannedValue);
    if (!payload) return null;
    const normalizedReference = normalizeShipmentReference(payload.reference);
    let resolvedReference = payload.reference;

    const referenceMatch = shipments.find((shipment) =>
      [shipment.shipmentReference, shipment.reference]
        .filter((value): value is string => Boolean(value))
        .some((value) => normalizeShipmentReference(value) === normalizedReference),
    );
    if (referenceMatch) return { shipment: referenceMatch, reference: payload.reference };

    let resolvedId = payload.shipmentId;
    const inferredId = resolvedId ?? inferShipmentIdFromReference(payload.reference);

    if (resolvedId && payload.reference === payload.raw) {
      const referenceIsOnlyAnId = /^\d+$/.test(payload.reference);
      const referenceIsAUrl = /^https?:\/\//i.test(payload.reference);
      if (referenceIsOnlyAnId || referenceIsAUrl) {
        try {
          const detail = await getShipment(token, resolvedId);
          resolvedReference = detail.reference;
        } catch {
          return null;
        }
      }
    }

    if (!resolvedId && inferredId) {
      try {
        const detail = await getShipment(token, inferredId);
        if (
          [detail.reference, detail.code]
            .filter((value): value is string => Boolean(value))
            .some((value) => normalizeShipmentReference(value) === normalizedReference)
        ) {
          resolvedId = detail.id;
        }
      } catch {
        // The current-page lookup below remains available when the reference is opaque.
      }
    }

    if (!resolvedId) {
      const detailResults = await Promise.allSettled(
        shipments.map((shipment) => getShipment(token, shipment.shipmentId)),
      );
      const detailMatch = detailResults.find(
        (result) =>
          result.status === 'fulfilled' &&
          [result.value.reference, result.value.code]
            .filter((value): value is string => Boolean(value))
            .some((value) => normalizeShipmentReference(value) === normalizedReference),
      );
      if (detailMatch?.status === 'fulfilled') resolvedId = detailMatch.value.id;
    }

    if (!resolvedId) return null;
    const incomingShipment = await findIncomingShipment(resolvedId);
    return incomingShipment ? { shipment: incomingShipment, reference: resolvedReference } : null;
  };

  const handleScannedValue = async (scannedValue: string) => {
    const payload = parseScannedShipmentPayload(scannedValue);
    if (!payload) return;

    if (scannerMode === 'reference') {
      setReferenceInput(payload.reference);
      toast({
        title: t('collectorReception.scanner.referenceFilledTitle'),
        description: t('collectorReception.scanner.referenceFilledDescription'),
      });
      return;
    }

    setIsResolvingScan(true);
    try {
      const result = await resolveScannedShipment(scannedValue);
      if (!result) {
        toast({
          title: t('collectorReception.scanner.notFoundTitle'),
          description: t('collectorReception.scanner.notFoundDescription'),
          variant: 'destructive',
        });
        return;
      }
      openValidateDialog(result.shipment, result.reference);
    } catch (err) {
      toast({
        title: t('collectorReception.scanner.lookupErrorTitle'),
        description:
          err instanceof ApiError
            ? err.message
            : t('collectorReception.scanner.lookupErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsResolvingScan(false);
    }
  };

  const openRejectDialog = (shipment: CollectorIncomingShipment) => {
    setSelectedShipment(shipment);
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };

  const openPaymentDialog = (shipment: CollectorIncomingShipment) => {
    setPaymentTarget(shipment);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentDialogChange = (open: boolean) => {
    setIsPaymentDialogOpen(open);
    if (!open) setPaymentTarget(null);
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
        title: t('collectorReception.toasts.receivedTitle'),
        description:
          response.note ??
          t('collectorReception.toasts.receivedDescription', { values: { id: selectedShipment.shipmentId } }),
      });
      setValidatedCount((current) => current + 1);
      resetValidateDialog();
      await loadIncomingShipments();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('collectorReception.toasts.validateFailed');
      toast({
        title: t('collectorReception.toasts.validationRefusedTitle'),
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
        title: t('collectorReception.toasts.rejectedTitle'),
        description:
          response.note ??
          t('collectorReception.toasts.rejectedDescription', { values: { id: selectedShipment.shipmentId } }),
      });
      setRejectedCount((current) => current + 1);
      resetRejectDialog();
      await loadIncomingShipments();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('collectorReception.toasts.rejectFailed');
      toast({
        title: t('collectorReception.toasts.rejectRefusedTitle'),
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
          <h2 className="text-2xl font-bold text-foreground">{t('collectorReception.title')}</h2>
          <p className="text-muted-foreground">
            {t('collectorReception.subtitle')}
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:w-auto">
          <label className="relative">
            <span className="sr-only">{t('common.sortOrder')}</span>
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sortDirection}
              onChange={(event) => {
                setSortDirection(event.target.value as SortDirection);
                setPage(0);
              }}
              className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-sm sm:w-44"
              aria-label={t('common.sortOrder')}
            >
              <option value="desc">{t('common.newestFirst')}</option>
              <option value="asc">{t('common.oldestFirst')}</option>
            </select>
          </label>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => void loadIncomingShipments()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <Button
        type="button"
        className="h-12 w-full gap-2 md:hidden"
        onClick={() => setScannerMode('find')}
        disabled={loading || isResolvingScan}
      >
        {isResolvingScan ? (
          <RefreshCw className="h-5 w-5 animate-spin" />
        ) : (
          <ScanLine className="h-5 w-5" />
        )}
        {isResolvingScan
          ? t('collectorReception.scanner.searching')
          : t('collectorReception.scanner.scanParcel')}
      </Button>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <ReceptionStatCard
          icon={Clock3}
          label={t('collectorReception.stats.toReceive')}
          value={totalElements}
          className="bg-warning/15 text-warning"
          cardClassName="col-span-2 md:col-span-1"
        />
        <ReceptionStatCard
          icon={Check}
          label={t('collectorReception.stats.validated')}
          value={validatedCount}
          className="bg-success/15 text-success"
        />
        <ReceptionStatCard
          icon={X}
          label={t('collectorReception.stats.rejected')}
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
              placeholder={t('collectorReception.list.searchPlaceholder')}
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
                {t('common.retry')}
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredShipments.map((shipment) => (
                  <MobileReceptionShipmentCard
                    key={shipment.shipmentId}
                    shipment={shipment}
                    onReject={openRejectDialog}
                    onReceive={openValidateDialog}
                    onPay={openPaymentDialog}
                  />
                ))}
                {filteredShipments.length === 0 && <ReceptionEmptyState />}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">{t('collectorReception.list.headers.parcel')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('collectorReception.list.headers.client')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('collectorReception.list.headers.route')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('collectorReception.list.headers.paymentStatus')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('collectorReception.list.headers.status')}</TableHead>
                      <TableHead className="text-right text-muted-foreground">{t('collectorReception.list.headers.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment) => {
                      return (
                      <TableRow key={shipment.shipmentId} className="border-border">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">#{shipment.shipmentId}</p>
                            <p className="text-xs text-muted-foreground">
                              {shipment.parcelTypeName ?? t('collectorReception.list.fallbacks.parcelType')}
                              {shipment.transportModeName ? ` - ${shipment.transportModeName}` : ''}
                            </p>
                            {shipment.priority && (
                              <Badge variant="outline">
                                {t(`shipmentPriority.${shipment.priority}`)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-foreground">
                              {shipment.senderFullName ?? t('collectorReception.list.fallbacks.sender')}
                            </p>
                            <p className="text-muted-foreground">
                              {t('collectorReception.list.fallbacks.to', { values: { name: shipment.receiverFullName ?? t('collectorReception.list.fallbacks.receiverShort') } })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="text-foreground">
                              {shipment.originCollectionPointName ?? t('collectorReception.list.fallbacks.origin')}
                            </p>
                            <p className="text-muted-foreground">
                              {shipment.destinationCollectionPointName ?? t('collectorReception.list.fallbacks.destination')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell><ReceptionPaymentSummary shipment={shipment} /></TableCell>
                        <TableCell>
                          {shipment.status ? (
                            <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
                              {t(`parcelManagement.statuses.${shipment.status}`)}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{t('collectorReception.list.fallbacks.unspecified')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <ReceptionActions
                            shipment={shipment}
                            onReject={openRejectDialog}
                            onReceive={openValidateDialog}
                            onPay={openPaymentDialog}
                          />
                        </TableCell>
                      </TableRow>
                      );
                    })}

                    {filteredShipments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center">
                          <ReceptionEmptyState />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataPagination
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                totalElements={totalElements}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                loading={loading}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isValidateDialogOpen} onOpenChange={handleValidateDialogChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('collectorReception.validateDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('collectorReception.validateDialog.description')}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ReceptionInfoPanel
                  title={t('collectorReception.validateDialog.clientPanel')}
                  rows={[
                    [t('collectorReception.validateDialog.rows.sender'), selectedShipment.senderFullName],
                    [t('collectorReception.validateDialog.rows.receiver'), selectedShipment.receiverFullName],
                    [t('collectorReception.validateDialog.rows.createdAt'), formatShipmentDate(selectedShipment.createdAt)],
                    [t('collectorReception.validateDialog.rows.company'), selectedShipment.companyName],
                  ]}
                />
                <ReceptionInfoPanel
                  title={t('collectorReception.validateDialog.parcelPanel')}
                  rows={[
                    [t('collectorReception.validateDialog.rows.type'), selectedShipment.parcelTypeName],
                    [t('collectorReception.validateDialog.rows.transport'), selectedShipment.transportModeName],
                    [
                      t('collectorReception.validateDialog.rows.priority'),
                      selectedShipment.priority ? t(`shipmentPriority.${selectedShipment.priority}`) : undefined,
                    ],
                    [t('collectorReception.validateDialog.rows.price'), formatMoney(selectedShipment.price, { fallback: t('collectorReception.list.fallbacks.unspecified') })],
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
                    <p className="text-sm font-semibold text-foreground">{t('collectorReception.validateDialog.referenceTitle')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('collectorReception.validateDialog.referenceHint')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap">
                  <Input
                    value={referenceInput}
                    onChange={(event) => setReferenceInput(event.target.value)}
                    placeholder={t('collectorReception.validateDialog.referencePlaceholder')}
                    className="w-full min-w-0 flex-1 bg-secondary"
                    disabled={actionLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full shrink-0 gap-2 min-[420px]:w-auto"
                    onClick={() => setScannerMode('reference')}
                    disabled={actionLoading}
                  >
                    <ScanLine className="h-4 w-4" />
                    {t('collectorReception.scanner.scanReference')}
                  </Button>
                </div>
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
                      ? t('collectorReception.validateDialog.referenceReady')
                      : t('collectorReception.validateDialog.referenceMissing')}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">{t('collectorReception.validateDialog.checklistTitle')}</p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <Checkbox
                      checked={isIdentityChecked}
                      onCheckedChange={(checked) => setIsIdentityChecked(checked === true)}
                      disabled={actionLoading}
                      aria-label={t('collectorReception.validateDialog.identityAria')}
                    />
                    <span className="text-sm text-foreground">
                      {t('collectorReception.validateDialog.identityCheck')}
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
                      aria-label={t('collectorReception.validateDialog.parcelAria')}
                    />
                    <span className="text-sm text-foreground">
                      {t('collectorReception.validateDialog.parcelCheck')}
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
              {t('common.cancel')}
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
              {actionLoading ? t('collectorReception.validateDialog.validating') : t('collectorReception.validateDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={handleRejectDialogChange}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('collectorReception.rejectDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('collectorReception.rejectDialog.description', { values: { id: selectedShipment?.shipmentId ?? '' } })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium text-foreground">{t('collectorReception.rejectDialog.reason')}</label>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder={t('collectorReception.rejectDialog.placeholder')}
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
              {t('common.cancel')}
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
              {actionLoading ? t('collectorReception.rejectDialog.rejecting') : t('collectorReception.rejectDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {paymentTarget && (
        <ShipmentPaymentDialog
          open={isPaymentDialogOpen}
          shipment={{
            id: paymentTarget.shipmentId,
            reference: `#${paymentTarget.shipmentId}`,
            paymentCollectionMode: paymentTarget.paymentCollectionMode,
            companyPrice: paymentTarget.companyPrice,
            feeAmount: paymentTarget.feeAmount,
            discountAmount: paymentTarget.discountAmount,
          }}
          onOpenChange={handlePaymentDialogChange}
          onPaymentSucceeded={async () => {
            await loadIncomingShipments();
          }}
        />
      )}

      <QrCodeScannerDialog
        open={scannerMode !== null}
        onOpenChange={(open) => {
          if (!open) setScannerMode(null);
        }}
        onScan={(value) => void handleScannedValue(value)}
      />
    </div>
  );
}

function getReceptionPaymentState(shipment: CollectorIncomingShipment) {
  const requiresCollection =
    shipment.paymentStatus === 'UNPAID' &&
    shipment.transactionStatus === 'PLATFORM_FEE_PAID';
  return {
    requiresCollection,
    paymentBlocked: shipment.paymentStatus === 'UNPAID' && !requiresCollection,
  };
}

function ReceptionPaymentSummary({ shipment }: { shipment: CollectorIncomingShipment }) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const { requiresCollection, paymentBlocked } = getReceptionPaymentState(shipment);

  return (
    <div className="min-w-0 space-y-1.5 text-sm">
      <p className="font-semibold text-foreground">
        {formatMoney(shipment.price, { fallback: t('collectorReception.list.fallbacks.unspecified') })}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {shipment.paymentStatus ? (
          <Badge
            className={cn(
              'max-w-full whitespace-normal border-0 text-left text-[11px]',
              getShipmentPaymentStatusClassName(shipment.paymentStatus),
            )}
          >
            {t(`shipmentPaymentStatuses.${shipment.paymentStatus}`)}
          </Badge>
        ) : (
          <Badge variant="outline">{t('collectorReception.list.fallbacks.payment')}</Badge>
        )}
        {shipment.transactionStatus && (
          <Badge
            className={cn(
              'max-w-full whitespace-normal border-0 text-left text-[11px]',
              getShipmentTransactionStatusClassName(shipment.transactionStatus),
            )}
          >
            {t(`shipmentTransactionStatuses.${shipment.transactionStatus}`)}
          </Badge>
        )}
      </div>
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
  );
}

function ReceptionActions({
  shipment,
  onReject,
  onReceive,
  onPay,
  mobile = false,
}: {
  shipment: CollectorIncomingShipment;
  onReject: (shipment: CollectorIncomingShipment) => void;
  onReceive: (shipment: CollectorIncomingShipment) => void;
  onPay: (shipment: CollectorIncomingShipment) => void;
  mobile?: boolean;
}) {
  const { t } = useTranslation('dashboard');
  const { requiresCollection, paymentBlocked } = getReceptionPaymentState(shipment);

  return (
    <div className={cn('flex gap-2', mobile ? 'w-full flex-col min-[420px]:flex-row' : 'justify-end')}>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'gap-1 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground',
          mobile && 'w-full',
        )}
        onClick={() => onReject(shipment)}
      >
        <AlertTriangle className="h-4 w-4" />
        {t('collectorReception.actions.reject')}
      </Button>
      {paymentBlocked ? (
        <Button
          size="sm"
          className={cn('gap-1', mobile && 'w-full')}
          onClick={() => onPay(shipment)}
        >
          <CreditCard className="h-4 w-4" />
          {t(shipment.paymentCollectionMode === 'PLATFORM' ? 'shipmentPayment.payFullShipment' : 'collectorReception.payments.payPlatformFee')}
        </Button>
      ) : (
        <Button
          size="sm"
          className={cn(
            'gap-1 bg-success text-success-foreground hover:bg-success/90',
            mobile && 'w-full',
          )}
          onClick={() => onReceive(shipment)}
        >
          <PackageCheck className="h-4 w-4" />
          {requiresCollection
            ? t('collectorReception.payments.collectAndReceive')
            : t('collectorReception.payments.receive')}
        </Button>
      )}
    </div>
  );
}

function MobileReceptionShipmentCard({
  shipment,
  onReject,
  onReceive,
  onPay,
}: {
  shipment: CollectorIncomingShipment;
  onReject: (shipment: CollectorIncomingShipment) => void;
  onReceive: (shipment: CollectorIncomingShipment) => void;
  onPay: (shipment: CollectorIncomingShipment) => void;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <article className="space-y-3 overflow-hidden rounded-xl border border-border bg-background p-3.5 shadow-sm">
      <div className="flex flex-col items-start gap-2 min-[400px]:flex-row min-[400px]:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-foreground">#{shipment.shipmentId}</p>
          <p className="break-words text-sm text-muted-foreground">
            {shipment.parcelTypeName ?? t('collectorReception.list.fallbacks.parcelType')}
            {shipment.transportModeName ? ` · ${shipment.transportModeName}` : ''}
          </p>
        </div>
        {shipment.status && (
          <Badge className={cn('max-w-full shrink-0 whitespace-normal border-0 text-left text-[11px]', getShipmentStatusClassName(shipment.status))}>
            {t(`parcelManagement.statuses.${shipment.status}`)}
          </Badge>
        )}
      </div>

      <div className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm">
        <MobileReceptionInfo
          label={t('collectorReception.mobile.sender')}
          value={shipment.senderFullName ?? t('collectorReception.list.fallbacks.unspecified')}
        />
        <MobileReceptionInfo
          label={t('collectorReception.mobile.receiver')}
          value={shipment.receiverFullName ?? t('collectorReception.list.fallbacks.unspecified')}
        />
        <div className="border-t border-border/70 pt-2">
          <p className="text-xs text-muted-foreground">{t('collectorReception.mobile.route')}</p>
          <p className="mt-1 break-words font-medium text-foreground">
            {shipment.originCollectionPointName ?? t('collectorReception.list.fallbacks.origin')}
          </p>
          <p className="break-words text-muted-foreground">
            → {shipment.destinationCollectionPointName ?? t('collectorReception.list.fallbacks.destination')}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 p-3">
        <ReceptionPaymentSummary shipment={shipment} />
      </div>

      <ReceptionActions
        shipment={shipment}
        onReject={onReject}
        onReceive={onReceive}
        onPay={onPay}
        mobile
      />
    </article>
  );
}

function MobileReceptionInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function ReceptionEmptyState() {
  const { t } = useTranslation('dashboard');
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Package className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium text-foreground">{t('collectorReception.empty.title')}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t('collectorReception.empty.description')}
      </p>
    </div>
  );
}

function ReceptionStatCard({
  icon: Icon,
  label,
  value,
  className,
  cardClassName,
}: {
  icon: ElementType;
  label: string;
  value: number;
  className: string;
  cardClassName?: string;
}) {
  return (
    <Card className={cn('border-border bg-card', cardClassName)}>
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
  const { t } = useTranslation('dashboard');
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>
      <div className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium text-foreground">
              {value || t('collectorReception.list.fallbacks.unspecified')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
