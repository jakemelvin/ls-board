'use client';

import { useCallback, useMemo, useState, type ElementType } from 'react';
import {
  Check,
  ClipboardCheck,
  Package,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLatestRequest } from '@/hooks/use-latest-request';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { toast } from '@/hooks/use-toast';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import {
  deliverShipment,
  getCollectorDestinationDepositRequests,
  getDestinationDepositRequest,
  getDestinationIncomingGroups,
  getDestinationIncomingShipments,
  getReadyForPickupShipments,
  reviewDestinationDepositRequest,
} from '@/lib/shipments/api';
import {
  formatShipmentDate,
  getShipmentDestinationDepositItemStatusClassName,
  getShipmentDestinationDepositStatusClassName,
  SHIPMENT_DESTINATION_DEPOSIT_ITEM_STATUS_LABELS,
  SHIPMENT_DESTINATION_DEPOSIT_STATUS_LABELS,
} from '@/lib/shipments/presentation';
import type {
  CollectorPickupShipment,
  ShipmentDestinationDepositRequest,
  ShipmentDestinationDepositRequestItem,
  ShipmentDestinationDepositRequestSummary,
  ShipmentDestinationIncomingShipment,
  ShipmentTransportGroupSummary,
} from '@/lib/shipments/types';
import { cn } from '@/lib/utils';

export function LocalStock() {
  const { t } = useTranslation('local-stock');
  const token = useAuthStore((state) => state.token);
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedDeposit, setSelectedDeposit] =
    useState<ShipmentDestinationDepositRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<number[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [reviewNote, setReviewNote] = useState('');

  const [selectedPickup, setSelectedPickup] = useState<CollectorPickupShipment | null>(null);
  const [isDeliverOpen, setIsDeliverOpen] = useState(false);
  const [shipmentReference, setShipmentReference] = useState('');
  const [shipmentCode, setShipmentCode] = useState('');
  const [deliverNote, setDeliverNote] = useState('');
  const { beginRequest: beginDetailRequest, isLatestRequest: isLatestDetailRequest } =
    useLatestRequest();

  const depositQuery = useCallback(
    (page: number, pageSize: number) =>
      getCollectorDestinationDepositRequests(token, { page, size: pageSize }),
    [token],
  );
  const incomingShipmentQuery = useCallback(
    (page: number, pageSize: number) =>
      getDestinationIncomingShipments(token, { page, size: pageSize }),
    [token],
  );
  const incomingGroupQuery = useCallback(
    (page: number, pageSize: number) =>
      getDestinationIncomingGroups(token, { page, size: pageSize }),
    [token],
  );
  const pickupQuery = useCallback(
    (page: number, pageSize: number) =>
      getReadyForPickupShipments(token, { page, size: pageSize }),
    [token],
  );
  const depositPagination = usePaginatedQuery({
    query: depositQuery,
    enabled: Boolean(token),
    initialPageSize: 50,
    errorMessage: t('errors.loadDeposits'),
  });
  const incomingShipmentPagination = usePaginatedQuery({
    query: incomingShipmentQuery,
    enabled: Boolean(token),
    initialPageSize: 50,
    errorMessage: t('errors.loadIncoming'),
  });
  const incomingGroupPagination = usePaginatedQuery({
    query: incomingGroupQuery,
    enabled: Boolean(token),
    initialPageSize: 50,
    errorMessage: t('errors.loadGroups'),
  });
  const pickupPagination = usePaginatedQuery({
    query: pickupQuery,
    enabled: Boolean(token),
    initialPageSize: 50,
    errorMessage: t('errors.loadPickup'),
  });
  const depositRequests = depositPagination.items;
  const incomingShipments = incomingShipmentPagination.items;
  const incomingGroups = incomingGroupPagination.items;
  const pickupShipments = pickupPagination.items;
  const loading =
    depositPagination.loading ||
    incomingShipmentPagination.loading ||
    incomingGroupPagination.loading ||
    pickupPagination.loading;
  const error =
    depositPagination.error ||
    incomingShipmentPagination.error ||
    incomingGroupPagination.error ||
    pickupPagination.error;
  const loadStock = useCallback(
    async () => {
      await Promise.all([
        depositPagination.reload(),
        incomingShipmentPagination.reload(),
        incomingGroupPagination.reload(),
        pickupPagination.reload(),
      ]);
    },
    [
      depositPagination,
      incomingGroupPagination,
      incomingShipmentPagination,
      pickupPagination,
    ],
  );

  const pendingDepositCount = depositRequests.filter(
    (request) => request.status === 'PENDING_COLLECTOR_REVIEW',
  ).length;

  const counters = useMemo(
    () => ({
      deposits: pendingDepositCount,
      incoming: incomingShipments.length + incomingGroups.length,
      pickup: pickupShipments.length,
    }),
    [incomingGroups.length, incomingShipments.length, pendingDepositCount, pickupShipments.length],
  );

  const openReview = async (request: ShipmentDestinationDepositRequestSummary) => {
    if (!token) return;

    const requestId = beginDetailRequest();

    setActionLoading(true);

    try {
      const detail = await getDestinationDepositRequest(token, request.requestId);
      if (isLatestDetailRequest(requestId)) {
        const pendingItems = detail.items?.filter((item) => item.status !== 'REJECTED') ?? [];
        setSelectedDeposit(detail);
        setAcceptedIds(pendingItems.map((item) => item.shipmentId));
        setRejectionReasons({});
        setReviewNote('');
        setIsReviewOpen(true);
      }
    } catch (err) {
      if (isLatestDetailRequest(requestId)) {
        toast({
          title: t('toasts.detailUnavailable'),
          description:
            err instanceof ApiError ? err.message : t('toasts.loadRequestFailed'),
          variant: 'destructive',
        });
      }
    } finally {
      if (isLatestDetailRequest(requestId)) setActionLoading(false);
    }
  };

  const toggleAccepted = (shipmentId: number) => {
    setAcceptedIds((current) =>
      current.includes(shipmentId)
        ? current.filter((id) => id !== shipmentId)
        : [...current, shipmentId],
    );
  };

  const setRejectedReason = (shipmentId: number, reason: string) => {
    setRejectionReasons((current) => ({ ...current, [shipmentId]: reason }));
  };

  const handleReview = async () => {
    if (!token || !selectedDeposit) return;

    const rejectedItems = (selectedDeposit.items ?? []).filter(
      (item) => !acceptedIds.includes(item.shipmentId),
    );

    const missingReason = rejectedItems.some(
      (item) => !rejectionReasons[item.shipmentId]?.trim(),
    );

    if (missingReason) {
      toast({
        title: t('toasts.reasonRequiredTitle'),
        description: t('toasts.reasonRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);

    try {
      await reviewDestinationDepositRequest(token, selectedDeposit.requestId, {
        acceptedShipmentIds: acceptedIds,
        rejectedShipments: rejectedItems.map((item) => ({
          shipmentId: item.shipmentId,
          reason: rejectionReasons[item.shipmentId].trim(),
        })),
        note: reviewNote.trim() || undefined,
      });

      toast({
        title: t('toasts.reviewSuccess'),
        description: t('toasts.reviewSuccessDescription', {
          values: { accepted: acceptedIds.length, rejected: rejectedItems.length },
        }),
      });
      setIsReviewOpen(false);
      setSelectedDeposit(null);
      await loadStock();
    } catch (err) {
      toast({
        title: t('toasts.reviewFailedTitle'),
        description:
          err instanceof ApiError ? err.message : t('toasts.reviewFailedDescription'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openDeliver = (shipment: CollectorPickupShipment) => {
    setSelectedPickup(shipment);
    setShipmentReference(shipment.reference ?? '');
    setShipmentCode('');
    setDeliverNote('');
    setIsDeliverOpen(true);
  };

  const handleDeliver = async () => {
    if (!token || !selectedPickup || !shipmentReference.trim() || !shipmentCode.trim()) return;

    setActionLoading(true);

    try {
      await deliverShipment(token, selectedPickup.shipmentId, {
        shipmentReference: shipmentReference.trim(),
        shipmentCode: shipmentCode.trim(),
        note: deliverNote.trim() || undefined,
      });

      toast({
        title: t('toasts.deliveredTitle'),
        description: t('toasts.deliveredDescription', {
          values: { reference: shipmentReference.trim() },
        }),
      });
      setIsDeliverOpen(false);
      setSelectedPickup(null);
      await loadStock();
    } catch (err) {
      toast({
        title: t('toasts.deliverFailedTitle'),
        description:
          err instanceof ApiError ? err.message : t('toasts.deliverFailedDescription'),
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
          <h2 className="text-2xl font-bold text-foreground">{t('title')}</h2>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button variant="outline" className="w-fit gap-2" onClick={() => void loadStock()}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          {t('actions.refresh')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StockMetric icon={ClipboardCheck} label={t('metrics.depositsToReview')} value={counters.deposits} className="bg-warning/15 text-warning" />
        <StockMetric icon={Truck} label={t('metrics.incomingDeclared')} value={counters.incoming} className="bg-primary/15 text-primary" />
        <StockMetric icon={PackageCheck} label={t('metrics.readyForPickup')} value={counters.pickup} className="bg-success/15 text-success" />
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void loadStock()}>{t('actions.retry')}</Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>{t('deposits.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('deposits.description')}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {depositRequests.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title={t('deposits.emptyTitle')}
                  description={t('deposits.emptyDescription')}
                />
              ) : (
                <>
                <div className="space-y-3 p-4 md:hidden">
                  {depositRequests.map((request) => (
                    <MobileDepositRequestCard
                      key={request.requestId}
                      request={request}
                      onOpen={() => void openReview(request)}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">{t('deposits.columns.request')}</TableHead>
                        <TableHead className="text-muted-foreground">{t('deposits.columns.transporter')}</TableHead>
                        <TableHead className="text-muted-foreground">{t('deposits.columns.destination')}</TableHead>
                        <TableHead className="text-muted-foreground">{t('deposits.columns.parcels')}</TableHead>
                        <TableHead className="text-muted-foreground">{t('deposits.columns.status')}</TableHead>
                        <TableHead className="text-right text-muted-foreground">{t('deposits.columns.action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depositRequests.map((request) => (
                        <TableRow key={request.requestId} className="border-border">
                          <TableCell className="font-mono text-foreground">#{request.requestId}</TableCell>
                          <TableCell className="text-foreground">
                            {request.transporterUsername ?? t('labels.transporterFallback')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.destinationCollectionPointName ?? t('labels.destinationFallback')}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-foreground">
                              {t('deposits.acceptedCount', {
                                values: {
                                  accepted: request.acceptedShipmentCount ?? 0,
                                  total: request.totalShipmentCount ?? 0,
                                },
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('deposits.rejectedCount', {
                                values: { count: request.rejectedShipmentCount ?? 0 },
                              })}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('border-0', getShipmentDestinationDepositStatusClassName(request.status))}>
                              {SHIPMENT_DESTINATION_DEPOSIT_STATUS_LABELS[request.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={request.status === 'PENDING_COLLECTOR_REVIEW' ? 'default' : 'outline'}
                              className="gap-2"
                              onClick={() => void openReview(request)}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              {request.status === 'PENDING_COLLECTOR_REVIEW' ? t('actions.review') : t('actions.view')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
            {depositPagination.totalElements > 0 && (
              <DataPagination
                page={depositPagination.page}
                pageSize={depositPagination.pageSize}
                totalPages={depositPagination.totalPages}
                totalElements={depositPagination.totalElements}
                onPageChange={depositPagination.setPage}
                onPageSizeChange={depositPagination.setPageSize}
                loading={depositPagination.loading}
                className="mx-4 mb-4"
              />
            )}
          </Card>

          <div className="grid gap-6 2xl:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>{t('incoming.title')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('incoming.description')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {incomingShipments.length === 0 && incomingGroups.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title={t('incoming.emptyTitle')}
                    description={t('incoming.emptyDescription')}
                  />
                ) : (
                  <>
                    {incomingShipments.map((shipment) => (
                      <IncomingShipmentRow key={shipment.shipmentId} shipment={shipment} />
                    ))}
                    {incomingGroups.map((group) => (
                      <div key={group.groupId} className="rounded-lg border border-border bg-secondary p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-mono text-sm font-medium text-foreground">
                              {group.reference ?? `Groupe #${group.groupId}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{group.name ?? t('incoming.groupFallback')}</p>
                          </div>
                          <Badge variant="outline">
                            {t('incoming.parcelsCount', { values: { count: group.activeShipmentCount ?? 0 } })}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
              <div className="space-y-3 px-4 pb-4">
                {incomingShipmentPagination.totalElements > 0 && (
                  <DataPagination
                    page={incomingShipmentPagination.page}
                    pageSize={incomingShipmentPagination.pageSize}
                    totalPages={incomingShipmentPagination.totalPages}
                    totalElements={incomingShipmentPagination.totalElements}
                    onPageChange={incomingShipmentPagination.setPage}
                    onPageSizeChange={incomingShipmentPagination.setPageSize}
                    loading={incomingShipmentPagination.loading}
                  />
                )}
                {incomingGroupPagination.totalElements > 0 && (
                  <DataPagination
                    page={incomingGroupPagination.page}
                    pageSize={incomingGroupPagination.pageSize}
                    totalPages={incomingGroupPagination.totalPages}
                    totalElements={incomingGroupPagination.totalElements}
                    onPageChange={incomingGroupPagination.setPage}
                    onPageSizeChange={incomingGroupPagination.setPageSize}
                    loading={incomingGroupPagination.loading}
                  />
                )}
              </div>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>{t('pickup.title')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('pickup.description')}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {pickupShipments.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title={t('pickup.emptyTitle')}
                    description={t('pickup.emptyDescription')}
                  />
                ) : (
                  <>
                  <div className="space-y-3 p-4 md:hidden">
                    {pickupShipments.map((shipment) => (
                      <MobilePickupShipmentCard
                        key={shipment.shipmentId}
                        shipment={shipment}
                        onDeliver={() => openDeliver(shipment)}
                      />
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">{t('pickup.columns.reference')}</TableHead>
                          <TableHead className="text-muted-foreground">{t('pickup.columns.client')}</TableHead>
                          <TableHead className="text-muted-foreground">{t('pickup.columns.type')}</TableHead>
                          <TableHead className="text-muted-foreground">{t('pickup.columns.updatedAt')}</TableHead>
                          <TableHead className="text-right text-muted-foreground">{t('pickup.columns.action')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pickupShipments.map((shipment) => (
                          <TableRow key={shipment.shipmentId} className="border-border">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium text-foreground">
                                  {shipment.reference ?? `#${shipment.shipmentId}`}
                                </span>
                                {shipment.reference && (
                                  <CopyTrackingNumberButton trackingNumber={shipment.reference} />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">
                                {shipment.senderFullName ?? t('labels.senderFallback')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t('labels.to')} {shipment.receiverFullName ?? t('labels.receiverFallback')}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {shipment.parcelTypeName ?? t('labels.typeFallback')}
                              {shipment.transportModeName ? ` - ${shipment.transportModeName}` : ''}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatShipmentDate(shipment.updatedAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" className="gap-2" onClick={() => openDeliver(shipment)}>
                                <PackageCheck className="h-4 w-4" />
                                {t('actions.deliver')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  </>
                )}
              </CardContent>
              {pickupPagination.totalElements > 0 && (
                <DataPagination
                  page={pickupPagination.page}
                  pageSize={pickupPagination.pageSize}
                  totalPages={pickupPagination.totalPages}
                  totalElements={pickupPagination.totalElements}
                  onPageChange={pickupPagination.setPage}
                  onPageSizeChange={pickupPagination.setPageSize}
                  loading={pickupPagination.loading}
                  className="mx-4 mb-4"
                />
              )}
            </Card>
          </div>
        </>
      )}

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t('reviewDialog.title', { values: { id: selectedDeposit?.requestId ?? '' } })}
            </DialogTitle>
            <DialogDescription>
              {t('reviewDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary p-4">
                <p className="font-medium text-foreground">
                  {selectedDeposit.destinationCollectionPointName ?? t('labels.destinationFallback')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('reviewDialog.transporter', {
                    values: { name: selectedDeposit.transporterUsername ?? t('labels.notSpecified') },
                  })}
                </p>
              </div>
              <div className="space-y-3">
                {(selectedDeposit.items ?? []).map((item) => (
                  <ReviewItem
                    key={item.itemId}
                    item={item}
                    accepted={acceptedIds.includes(item.shipmentId)}
                    reason={rejectionReasons[item.shipmentId] ?? ''}
                    disabled={selectedDeposit.status !== 'PENDING_COLLECTOR_REVIEW' || actionLoading}
                    onToggle={() => toggleAccepted(item.shipmentId)}
                    onReasonChange={(reason) => setRejectedReason(item.shipmentId, reason)}
                  />
                ))}
              </div>
              {selectedDeposit.status === 'PENDING_COLLECTOR_REVIEW' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('reviewDialog.globalNote')}</label>
                  <Textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    className="min-h-[90px] bg-secondary"
                    disabled={actionLoading}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewOpen(false)} disabled={actionLoading}>
              {t('actions.close')}
            </Button>
            {selectedDeposit?.status === 'PENDING_COLLECTOR_REVIEW' && (
              <Button onClick={() => void handleReview()} disabled={actionLoading} className="gap-2">
                {actionLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                {t('actions.confirmReview')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeliverOpen} onOpenChange={setIsDeliverOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('deliverDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deliverDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('deliverDialog.reference')}</label>
              <Input
                value={shipmentReference}
                onChange={(event) => setShipmentReference(event.target.value)}
                className="bg-secondary"
                disabled={actionLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('deliverDialog.pickupCode')}</label>
              <Input
                value={shipmentCode}
                onChange={(event) => setShipmentCode(event.target.value)}
                placeholder={t('deliverDialog.pickupCodePlaceholder')}
                className="bg-secondary"
                disabled={actionLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('deliverDialog.note')}</label>
              <Textarea
                value={deliverNote}
                onChange={(event) => setDeliverNote(event.target.value)}
                className="min-h-[80px] bg-secondary"
                disabled={actionLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeliverOpen(false)} disabled={actionLoading}>
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleDeliver()}
              disabled={actionLoading || !shipmentReference.trim() || !shipmentCode.trim()}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('actions.deliver')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StockMetric({
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

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <p className="mt-3 font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function IncomingShipmentRow({ shipment }: { shipment: ShipmentDestinationIncomingShipment }) {
  const { t } = useTranslation('local-stock');

  return (
    <div className="rounded-lg border border-border bg-secondary p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-foreground">
              {shipment.reference ?? `#${shipment.shipmentId}`}
            </span>
            {shipment.reference && <CopyTrackingNumberButton trackingNumber={shipment.reference} />}
          </div>
          <p className="text-sm text-muted-foreground">
            {shipment.senderFullName ?? t('labels.senderFallback')} {t('labels.to')}{' '}
            {shipment.receiverFullName ?? t('labels.receiverFallback')}
          </p>
        </div>
        <div className="text-sm text-muted-foreground sm:text-right">
          <p>{shipment.transporterUsername ?? t('labels.transporterFallback')}</p>
          <p>{shipment.sourceGroupReference ?? t('incoming.noGroup')}</p>
        </div>
      </div>
    </div>
  );
}

function MobileDepositRequestCard({
  request,
  onOpen,
}: {
  request: ShipmentDestinationDepositRequestSummary;
  onOpen: () => void;
}) {
  const { t } = useTranslation('local-stock');

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-foreground">#{request.requestId}</p>
          <p className="truncate text-sm text-muted-foreground">
            {request.destinationCollectionPointName ?? t('labels.destinationFallback')}
          </p>
        </div>
        <Badge className={cn('shrink-0 border-0', getShipmentDestinationDepositStatusClassName(request.status))}>
          {SHIPMENT_DESTINATION_DEPOSIT_STATUS_LABELS[request.status]}
        </Badge>
      </div>
      <div className="grid gap-2 text-sm">
        <MobileInfo label={t('deposits.columns.transporter')} value={request.transporterUsername} />
        <MobileInfo
          label={t('deposits.acceptedCount', {
            values: {
              accepted: request.acceptedShipmentCount ?? 0,
              total: request.totalShipmentCount ?? 0,
            },
          })}
          value=""
        />
        <MobileInfo
          label={t('deposits.rejectedCount', { values: { count: request.rejectedShipmentCount ?? 0 } })}
          value=""
        />
      </div>
      <Button
        size="sm"
        variant={request.status === 'PENDING_COLLECTOR_REVIEW' ? 'default' : 'outline'}
        className="w-full gap-2"
        onClick={onOpen}
      >
        <ShieldCheck className="h-4 w-4" />
        {request.status === 'PENDING_COLLECTOR_REVIEW' ? t('actions.review') : t('actions.view')}
      </Button>
    </div>
  );
}

function MobilePickupShipmentCard({
  shipment,
  onDeliver,
}: {
  shipment: CollectorPickupShipment;
  onDeliver: () => void;
}) {
  const { t } = useTranslation('local-stock');

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {shipment.reference ?? `#${shipment.shipmentId}`}
          </span>
          {shipment.reference && <CopyTrackingNumberButton trackingNumber={shipment.reference} />}
        </div>
        <p className="text-sm text-muted-foreground">
          {shipment.senderFullName ?? t('labels.senderFallback')} {t('labels.to')}{' '}
          {shipment.receiverFullName ?? t('labels.receiverFallback')}
        </p>
      </div>
      <div className="grid gap-2 text-sm">
        <MobileInfo
          label={t('pickup.columns.type')}
          value={`${shipment.parcelTypeName ?? t('labels.notSpecified')}${shipment.transportModeName ? ` - ${shipment.transportModeName}` : ''}`}
        />
        <MobileInfo label={t('labels.updatedAt')} value={formatShipmentDate(shipment.updatedAt)} />
      </div>
      <Button size="sm" className="w-full gap-2" onClick={onDeliver}>
        <PackageCheck className="h-4 w-4" />
        {t('actions.deliver')}
      </Button>
    </div>
  );
}

function MobileInfo({ label, value }: { label: string; value?: string | number }) {
  const { t } = useTranslation('local-stock');

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium text-foreground">
        {value || t('labels.notSpecified')}
      </span>
    </div>
  );
}

function ReviewItem({
  item,
  accepted,
  reason,
  disabled,
  onToggle,
  onReasonChange,
}: {
  item: ShipmentDestinationDepositRequestItem;
  accepted: boolean;
  reason: string;
  disabled: boolean;
  onToggle: () => void;
  onReasonChange: (reason: string) => void;
}) {
  const { t } = useTranslation('local-stock');

  return (
    <div
      className={cn(
        'rounded-lg border border-border p-4',
        accepted ? 'bg-success/5' : 'bg-destructive/5',
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={accepted}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label={t('labels.acceptAria', {
            values: { reference: item.shipmentReference ?? item.shipmentId },
          })}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-foreground">
                  {item.shipmentReference ?? `#${item.shipmentId}`}
                </span>
                {item.shipmentReference && (
                  <CopyTrackingNumberButton trackingNumber={item.shipmentReference} />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {item.senderFullName ?? t('labels.senderFallback')} {t('labels.to')}{' '}
                {item.receiverFullName ?? t('labels.receiverFallback')}
              </p>
              {item.sourceGroupReference && (
                <p className="text-xs text-muted-foreground">
                  {t('labels.group', { values: { reference: item.sourceGroupReference } })}
                </p>
              )}
            </div>
            {item.status && (
              <Badge className={cn('border-0', getShipmentDestinationDepositItemStatusClassName(item.status))}>
                {SHIPMENT_DESTINATION_DEPOSIT_ITEM_STATUS_LABELS[item.status]}
              </Badge>
            )}
          </div>
          {!accepted && !disabled && (
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-foreground">{t('reviewDialog.rejectReason')}</label>
              <Input
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder={t('reviewDialog.rejectReasonPlaceholder')}
                className="bg-secondary"
              />
            </div>
          )}
          {item.rejectionReason && (
            <p className="mt-2 text-sm text-destructive">
              {t('labels.reason', { values: { reason: item.rejectionReason } })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
