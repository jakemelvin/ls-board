'use client';

import {
  type ElementType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowDownUp,
  Check,
  Clock,
  Eye,
  PackageCheck,
  RefreshCw,
  StickyNote,
  Truck,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import {
  addTransmissionTransitNote,
  approveTransmissionRequest,
  embarkTransmissionShipments,
  getCollectorTransmissionRequests,
  getTransmissionRequest,
  getTransporterTransmissionRequests,
  rejectTransmissionRequest,
} from '@/lib/shipments/api';
import {
  formatShipmentDate,
  getShipmentStatusClassName,
  getShipmentTransmissionStatusClassName,
} from '@/lib/shipments/presentation';
import type {
  ShipmentTransmissionRequest,
  ShipmentTransmissionRequestSummary,
} from '@/lib/shipments/types';
import type { UserRole } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface TransferRequestsProps {
  currentRole: UserRole;
}

type TranslateFn = (key: string, options?: { values?: Record<string, string | number> }) => string;

type ActionMode = 'approve' | 'reject' | 'embark' | 'note' | null;
type SortDirection = 'desc' | 'asc';

export function TransferRequests({ currentRole }: TransferRequestsProps) {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((state) => state.token);
  const [requests, setRequests] = useState<ShipmentTransmissionRequestSummary[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ShipmentTransmissionRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const { beginRequest, isLatestRequest } = useLatestRequest();
  const { beginRequest: beginDetailRequest, isLatestRequest: isLatestDetailRequest } =
    useLatestRequest();

  const canUseScreen = currentRole === 'COLLECTOR' || currentRole === 'TRANSPORTER';

  const loadRequests = useCallback(async () => {
    if (!token || !canUseScreen) {
      setLoading(false);
      return;
    }

    const requestId = beginRequest();

    setLoading(true);
    setError(null);

    try {
      const response =
        currentRole === 'COLLECTOR'
          ? await getCollectorTransmissionRequests(token, {
              page,
              size: pageSize,
              sort: `createdAt,${sortDirection}`,
            })
          : await getTransporterTransmissionRequests(token, {
              page,
              size: pageSize,
              sort: `createdAt,${sortDirection}`,
            });

      if (isLatestRequest(requestId)) {
        setRequests(response.content ?? []);
        setTotalPages(response.totalPages ?? 0);
        setTotalElements(response.totalElements ?? 0);
      }
    } catch (err) {
      if (isLatestRequest(requestId)) {
        setError(
          err instanceof ApiError
            ? err.message
            : t('transferRequests.errors.load'),
        );
        setRequests([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } finally {
      if (isLatestRequest(requestId)) setLoading(false);
    }
  }, [beginRequest, canUseScreen, currentRole, isLatestRequest, page, pageSize, sortDirection, token]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const counters = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === 'PENDING_COLLECTOR_APPROVAL')
        .length,
      approved: requests.filter((request) => request.status === 'COLLECTOR_APPROVED').length,
      dispatched: requests.filter((request) =>
        request.status === 'FULLY_DISPATCHED' || request.status === 'PARTIALLY_DISPATCHED',
      ).length,
      rejected: requests.filter((request) => request.status === 'COLLECTOR_REJECTED').length,
    }),
    [requests],
  );

  const openDetail = async (
    request: ShipmentTransmissionRequestSummary,
    nextActionMode: ActionMode = null,
  ) => {
    if (!token) return;

    const requestId = beginDetailRequest();

    setActionLoading(true);
    setError(null);

    try {
      const detail = await getTransmissionRequest(token, request.requestId);
      if (isLatestDetailRequest(requestId)) {
        setSelectedRequest(detail);
        setSelectedShipmentIds(
          detail.items?.filter((item) => !item.embarked).map((item) => item.shipmentId) ?? [],
        );
        setNote('');
        setRejectReason('');
        setActionMode(nextActionMode);
        setDetailOpen(nextActionMode == null);
      }
    } catch (err) {
      if (isLatestDetailRequest(requestId)) {
        toast({
          title: t('transferRequests.errors.detailTitle'),
          description:
            err instanceof ApiError ? err.message : t('transferRequests.errors.detailLoad'),
          variant: 'destructive',
        });
      }
    } finally {
      if (isLatestDetailRequest(requestId)) setActionLoading(false);
    }
  };

  const resetAction = () => {
    setActionMode(null);
    setSelectedRequest(null);
    setSelectedShipmentIds([]);
    setNote('');
    setRejectReason('');
  };

  const toggleShipment = (shipmentId: number) => {
    setSelectedShipmentIds((current) =>
      current.includes(shipmentId)
        ? current.filter((id) => id !== shipmentId)
        : [...current, shipmentId],
    );
  };

  const refreshAfterAction = async (updated?: ShipmentTransmissionRequest) => {
    if (updated) setSelectedRequest(updated);
    await loadRequests();
  };

  const handleApprove = async () => {
    if (!token || !selectedRequest) return;

    setActionLoading(true);

    try {
      const updated = await approveTransmissionRequest(token, selectedRequest.requestId, {
        note: note.trim() || undefined,
      });
      toast({
        title: t('transferRequests.toasts.approvedTitle'),
        description: t('transferRequests.toasts.approvedDescription'),
      });
      resetAction();
      await refreshAfterAction(updated);
    } catch (err) {
      toast({
        title: t('transferRequests.toasts.approveFailedTitle'),
        description:
          err instanceof ApiError ? err.message : t('transferRequests.errors.approve'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token || !selectedRequest || !rejectReason.trim()) return;

    setActionLoading(true);

    try {
      const updated = await rejectTransmissionRequest(token, selectedRequest.requestId, {
        reason: rejectReason.trim(),
      });
      toast({
        title: t('transferRequests.toasts.rejectedTitle'),
        description: t('transferRequests.toasts.rejectedDescription'),
      });
      resetAction();
      await refreshAfterAction(updated);
    } catch (err) {
      toast({
        title: t('transferRequests.toasts.rejectFailedTitle'),
        description:
          err instanceof ApiError ? err.message : t('transferRequests.errors.reject'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmbark = async () => {
    if (!token || !selectedRequest || selectedShipmentIds.length === 0) return;

    setActionLoading(true);

    try {
      const updated = await embarkTransmissionShipments(token, selectedRequest.requestId, {
        shipmentIds: selectedShipmentIds,
        note: note.trim() || undefined,
      });
      toast({
        title: t('transferRequests.toasts.embarkedTitle'),
        description: t('transferRequests.toasts.embarkedDescription', {
          values: { count: selectedShipmentIds.length },
        }),
      });
      resetAction();
      await refreshAfterAction(updated);
    } catch (err) {
      toast({
        title: t('transferRequests.toasts.embarkFailedTitle'),
        description:
          err instanceof ApiError ? err.message : t('transferRequests.errors.embark'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTransitNote = async () => {
    if (!token || !selectedRequest || selectedShipmentIds.length === 0 || !note.trim()) return;

    setActionLoading(true);

    try {
      const updated = await addTransmissionTransitNote(token, selectedRequest.requestId, {
        shipmentIds: selectedShipmentIds,
        description: note.trim(),
      });
      toast({
        title: t('transferRequests.toasts.noteAddedTitle'),
        description: t('transferRequests.toasts.noteAddedDescription'),
      });
      resetAction();
      await refreshAfterAction(updated);
    } catch (err) {
      toast({
        title: t('transferRequests.toasts.noteFailedTitle'),
        description:
          err instanceof ApiError ? err.message : t('transferRequests.errors.note'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const renderActions = (request: ShipmentTransmissionRequestSummary) => {
    if (currentRole === 'COLLECTOR' && request.status === 'PENDING_COLLECTOR_APPROVAL') {
      return (
        <div className="flex w-full flex-col gap-2 min-[420px]:flex-row md:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground md:w-auto"
            onClick={() => void openDetail(request, 'reject')}
          >
            <X className="h-4 w-4" />
            {t('transferRequests.actions.reject')}
          </Button>
          <Button
            size="sm"
            className="w-full gap-1 bg-success text-success-foreground hover:bg-success/90 md:w-auto"
            onClick={() => void openDetail(request, 'approve')}
          >
            <Check className="h-4 w-4" />
            {t('transferRequests.actions.approve')}
          </Button>
        </div>
      );
    }

    if (
      currentRole === 'TRANSPORTER' &&
      (request.status === 'COLLECTOR_APPROVED' || request.status === 'PARTIALLY_DISPATCHED') &&
      (request.pendingShipmentCount ?? 0) > 0
    ) {
      return (
        <Button
          size="sm"
          className="w-full gap-2 md:w-auto"
          onClick={() => void openDetail(request, 'embark')}
        >
          <Truck className="h-4 w-4" />
          {t('transferRequests.actions.embark')}
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full gap-2 md:h-8 md:w-8 md:p-0"
        onClick={() => void openDetail(request)}
        aria-label={t('transferRequests.actions.viewRequest', { values: { id: request.requestId } })}
      >
        <Eye className="h-4 w-4" />
        <span className="md:sr-only">{t('transferRequests.actions.view')}</span>
      </Button>
    );
  };

  if (!canUseScreen) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center">
          <p className="font-medium text-foreground">{t('transferRequests.restrictedTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('transferRequests.restrictedDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('transferRequests.title')}</h2>
          <p className="text-muted-foreground">
            {currentRole === 'COLLECTOR'
              ? t('transferRequests.subtitleCollector')
              : t('transferRequests.subtitleTransporter')}
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
            onClick={() => void loadRequests()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <RequestMetric icon={Clock} label={t('transferRequests.metrics.pending')} value={counters.pending} className="bg-warning/15 text-warning" />
        <RequestMetric icon={Check} label={t('transferRequests.metrics.approved')} value={counters.approved} className="bg-primary/15 text-primary" />
        <RequestMetric icon={PackageCheck} label={t('transferRequests.metrics.dispatched')} value={counters.dispatched} className="bg-success/15 text-success" />
        <RequestMetric icon={X} label={t('transferRequests.metrics.rejected')} value={counters.rejected} className="bg-destructive/15 text-destructive" />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void loadRequests()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {requests.length === 0 ? (
                  <MobileEmptyState
                    icon={Truck}
                    title={t('transferRequests.empty.title')}
                    description={t('transferRequests.empty.description')}
                  />
                ) : (
                  requests.map((request) => (
                    <MobileTransmissionRequestCard
                      key={request.requestId}
                      request={request}
                      actions={renderActions(request)}
                      t={t}
                    />
                  ))
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">{t('transferRequests.columns.request')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('transferRequests.columns.originPoint')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('transferRequests.columns.parties')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('transferRequests.columns.parcels')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('transferRequests.columns.status')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('transferRequests.columns.date')}</TableHead>
                      <TableHead className="text-right text-muted-foreground">{t('transferRequests.columns.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.requestId} className="border-border">
                        <TableCell className="font-mono text-foreground">#{request.requestId}</TableCell>
                        <TableCell className="text-foreground">
                          {request.originCollectionPointName ?? t('transferRequests.fallbacks.noPoint')}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">
                            {t('transferRequests.fields.transporter', { values: { name: request.transporterUsername ?? t('transferRequests.fallbacks.unspecified') } })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('transferRequests.fields.collector', { values: { name: request.collectorUsername ?? t('transferRequests.fallbacks.unspecified') } })}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">
                            {request.embarkedShipmentCount ?? 0}/{request.requestedShipmentCount ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.pendingShipmentCount ?? 0} {t('transferRequests.fields.remaining')}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border-0', getShipmentTransmissionStatusClassName(request.status))}>
                            {t(`transmissionStatuses.${request.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatShipmentDate(request.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">{renderActions(request)}</TableCell>
                      </TableRow>
                    ))}

                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-28 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Truck className="h-8 w-8 text-muted-foreground" />
                            <p className="font-medium text-foreground">{t('transferRequests.empty.title')}</p>
                            <p className="text-sm text-muted-foreground">
                              {t('transferRequests.empty.description')}
                            </p>
                          </div>
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
                className="m-4"
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t('transferRequests.detail.requestTitle', { values: { id: selectedRequest?.requestId ?? '' } })}
            </DialogTitle>
            <DialogDescription>
              {t('transferRequests.detail.description')}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <RequestDetail
              request={selectedRequest}
              canAddNote={currentRole === 'TRANSPORTER'}
              t={t}
              onAddNote={() => {
                setDetailOpen(false);
                setActionMode('note');
                setSelectedShipmentIds(
                  selectedRequest.items?.map((item) => item.shipmentId) ?? [],
                );
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {t('transferRequests.actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionMode)} onOpenChange={(open) => !open && resetAction()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{getActionTitle(actionMode, t)}</DialogTitle>
            <DialogDescription>{getActionDescription(actionMode, t)}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {t('transferRequests.detail.requestTitle', { values: { id: selectedRequest.requestId } })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.originCollectionPointName ?? t('transferRequests.fallbacks.noOriginPoint')}
                    </p>
                  </div>
                  <Badge className={cn('border-0', getShipmentTransmissionStatusClassName(selectedRequest.status))}>
                    {t(`transmissionStatuses.${selectedRequest.status}`)}
                  </Badge>
                </div>
              </div>

              {(actionMode === 'embark' || actionMode === 'note') && (
                <div className="space-y-2">
                  {(selectedRequest.items ?? []).map((item) => {
                    const disabled = actionMode === 'embark' && item.embarked;
                    const isSelected = selectedShipmentIds.includes(item.shipmentId);

                    return (
                      <label
                        key={item.itemId}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3',
                          isSelected && 'border-primary bg-primary/5',
                          disabled && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={disabled || actionLoading}
                          onCheckedChange={() => toggleShipment(item.shipmentId)}
                          aria-label={t('transferRequests.actions.selectParcel', { values: { id: item.reference ?? item.shipmentId } })}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {item.reference ?? `#${item.shipmentId}`}
                            </span>
                            {item.reference && (
                              <CopyTrackingNumberButton trackingNumber={item.reference} />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t('transferRequests.fields.route', {
                              values: {
                                sender: item.senderFullName ?? t('transferRequests.fallbacks.sender'),
                                receiver: item.receiverFullName ?? t('transferRequests.fallbacks.receiver'),
                              },
                            })}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.shipmentStatus && (
                              <Badge className={cn('border-0', getShipmentStatusClassName(item.shipmentStatus))}>
                                {t(`parcelManagement.statuses.${item.shipmentStatus}`)}
                              </Badge>
                            )}
                            {item.embarked && <Badge variant="outline">{t('transferRequests.badges.alreadyEmbarked')}</Badge>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {actionMode === 'reject' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('transferRequests.form.rejectReason')}</label>
                  <Textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    className="min-h-[100px] bg-secondary"
                    disabled={actionLoading}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {actionMode === 'note' ? t('transferRequests.form.transitNote') : t('transferRequests.form.note')}
                  </label>
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t('transferRequests.form.optionalComment')}
                    className="min-h-[100px] bg-secondary"
                    disabled={actionLoading}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetAction} disabled={actionLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (actionMode === 'approve') void handleApprove();
                if (actionMode === 'reject') void handleReject();
                if (actionMode === 'embark') void handleEmbark();
                if (actionMode === 'note') void handleAddTransitNote();
              }}
              disabled={!canSubmitAction(actionMode, selectedShipmentIds, note, rejectReason) || actionLoading}
              className="gap-2"
              variant={actionMode === 'reject' ? 'destructive' : 'default'}
            >
              {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestMetric({
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

function MobileTransmissionRequestCard({
  request,
  actions,
  t,
}: {
  request: ShipmentTransmissionRequestSummary;
  actions: ReactNode;
  t: TranslateFn;
}) {
  return (
    <article className="space-y-3 overflow-hidden rounded-xl border border-border bg-background p-3.5 shadow-sm">
      <div className="flex flex-col items-start gap-2 min-[400px]:flex-row min-[400px]:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-foreground">#{request.requestId}</p>
          <p className="break-words text-sm text-muted-foreground">
            {request.originCollectionPointName ?? t('transferRequests.fallbacks.noPoint')}
          </p>
        </div>
        <Badge className={cn('max-w-full shrink-0 whitespace-normal border-0 text-left text-[11px]', getShipmentTransmissionStatusClassName(request.status))}>
          {t(`transmissionStatuses.${request.status}`)}
        </Badge>
      </div>
      <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-sm">
        <MobileInfo label={t('transferRequests.fields.transporterLabel')} value={request.transporterUsername} emptyLabel={t('transferRequests.fallbacks.unspecified')} />
        <MobileInfo label={t('transferRequests.fields.collectorLabel')} value={request.collectorUsername} emptyLabel={t('transferRequests.fallbacks.unspecified')} />
        <MobileInfo
          label={t('transferRequests.fields.parcelsLabel')}
          value={`${request.embarkedShipmentCount ?? 0}/${request.requestedShipmentCount ?? 0} ${t('transferRequests.fields.embarkedShort')}`}
          emptyLabel={t('transferRequests.fallbacks.unspecified')}
        />
        <MobileInfo label={t('transferRequests.fields.dateLabel')} value={formatShipmentDate(request.createdAt)} emptyLabel={t('transferRequests.fallbacks.unspecified')} />
      </div>
      <div className="flex w-full">{actions}</div>
    </article>
  );
}

function MobileEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function MobileInfo({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value?: string | number;
  emptyLabel: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-right font-medium text-foreground">
        {value || emptyLabel}
      </span>
    </div>
  );
}

function RequestDetail({
  request,
  canAddNote,
  onAddNote,
  t,
}: {
  request: ShipmentTransmissionRequest;
  canAddNote: boolean;
  onAddNote: () => void;
  t: TranslateFn;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoBox label={t('transferRequests.detail.requested')} value={request.requestedShipmentCount ?? 0} />
        <InfoBox label={t('transferRequests.detail.embarked')} value={request.embarkedShipmentCount ?? 0} />
        <InfoBox label={t('transferRequests.detail.remaining')} value={request.pendingShipmentCount ?? 0} />
      </div>

      {canAddNote && (request.items?.length ?? 0) > 0 && (
        <Button variant="outline" className="gap-2" onClick={onAddNote}>
          <StickyNote className="h-4 w-4" />
          {t('transferRequests.actions.addTransitNote')}
        </Button>
      )}

      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{t('transferRequests.fields.parcelsLabel')}</p>
        </div>
        <div className="divide-y divide-border">
          {(request.items ?? []).map((item) => (
            <div key={item.itemId} className="px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {item.reference ?? `#${item.shipmentId}`}
                    </span>
                    {item.reference && <CopyTrackingNumberButton trackingNumber={item.reference} />}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('transferRequests.fields.route', {
                      values: {
                        sender: item.senderFullName ?? t('transferRequests.fallbacks.sender'),
                        receiver: item.receiverFullName ?? t('transferRequests.fallbacks.receiver'),
                      },
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('transferRequests.fields.destination', {
                      values: { destination: item.destinationCollectionPointName ?? t('transferRequests.fallbacks.unspecifiedFeminine') },
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.shipmentStatus && (
                    <Badge className={cn('border-0', getShipmentStatusClassName(item.shipmentStatus))}>
                      {t(`parcelManagement.statuses.${item.shipmentStatus}`)}
                    </Badge>
                  )}
                  {item.embarked && <Badge variant="outline">{t('transferRequests.badges.embarked')}</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(request.actions?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">{t('transferRequests.detail.history')}</p>
          <div className="space-y-3">
            {request.actions?.map((action) => (
              <div key={action.actionId} className="rounded-lg bg-secondary px-3 py-2 text-sm">
                <p className="font-medium text-foreground">
                  {t('transferRequests.history.actionBy', {
                    values: { type: action.actionType, actor: action.actorUsername ?? t('transferRequests.fallbacks.system') },
                  })}
                </p>
                <p className="text-muted-foreground">
                  {action.note || action.rejectionReason || t('transferRequests.history.noNote')}
                </p>
                <p className="text-xs text-muted-foreground">{formatShipmentDate(action.actedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function getActionTitle(actionMode: ActionMode, t: TranslateFn) {
  switch (actionMode) {
    case 'approve':
      return t('transferRequests.dialogTitles.approve');
    case 'reject':
      return t('transferRequests.dialogTitles.reject');
    case 'embark':
      return t('transferRequests.dialogTitles.embark');
    case 'note':
      return t('transferRequests.dialogTitles.note');
    default:
      return t('transferRequests.dialogTitles.action');
  }
}

function getActionDescription(actionMode: ActionMode, t: TranslateFn) {
  switch (actionMode) {
    case 'approve':
      return t('transferRequests.dialogDescriptions.approve');
    case 'reject':
      return t('transferRequests.dialogDescriptions.reject');
    case 'embark':
      return t('transferRequests.dialogDescriptions.embark');
    case 'note':
      return t('transferRequests.dialogDescriptions.note');
    default:
      return '';
  }
}

function canSubmitAction(
  actionMode: ActionMode,
  selectedShipmentIds: number[],
  note: string,
  rejectReason: string,
) {
  if (actionMode === 'approve') return true;
  if (actionMode === 'reject') return rejectReason.trim().length > 0;
  if (actionMode === 'embark') return selectedShipmentIds.length > 0;
  if (actionMode === 'note') return selectedShipmentIds.length > 0 && note.trim().length > 0;
  return false;
}
