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
  getShipmentStatusLabel,
  getShipmentTransmissionStatusClassName,
  SHIPMENT_TRANSMISSION_STATUS_LABELS,
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
            : 'Impossible de charger les demandes de prise.',
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
          title: 'Detail indisponible',
          description:
            err instanceof ApiError ? err.message : 'Impossible de charger la demande.',
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
      toast({ title: 'Demande approuvee', description: 'Le transporteur peut embarquer les colis.' });
      resetAction();
      await refreshAfterAction(updated);
    } catch (err) {
      toast({
        title: 'Approbation impossible',
        description:
          err instanceof ApiError ? err.message : "Impossible d'approuver la demande.",
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
      toast({ title: 'Demande rejetee', description: 'Le transporteur verra le motif de rejet.' });
      resetAction();
      await refreshAfterAction(updated);
    } catch (err) {
      toast({
        title: 'Rejet impossible',
        description:
          err instanceof ApiError ? err.message : 'Impossible de rejeter la demande.',
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
        title: 'Colis embarques',
        description: `${selectedShipmentIds.length} colis passent en transit.`,
      });
      resetAction();
      await refreshAfterAction(updated);
    } catch (err) {
      toast({
        title: 'Embarquement impossible',
        description:
          err instanceof ApiError ? err.message : "Impossible d'embarquer les colis.",
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
      toast({ title: 'Note ajoutee', description: 'La note de transit a ete enregistree.' });
      resetAction();
      await refreshAfterAction(updated);
    } catch (err) {
      toast({
        title: 'Note impossible',
        description:
          err instanceof ApiError ? err.message : "Impossible d'ajouter la note.",
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
            Rejeter
          </Button>
          <Button
            size="sm"
            className="w-full gap-1 bg-success text-success-foreground hover:bg-success/90 md:w-auto"
            onClick={() => void openDetail(request, 'approve')}
          >
            <Check className="h-4 w-4" />
            Approuver
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
          Embarquer
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full gap-2 md:h-8 md:w-8 md:p-0"
        onClick={() => void openDetail(request)}
        aria-label={`Voir la demande ${request.requestId}`}
      >
        <Eye className="h-4 w-4" />
        <span className="md:sr-only">Voir</span>
      </Button>
    );
  };

  if (!canUseScreen) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center">
          <p className="font-medium text-foreground">Section reservee aux collecteurs et transporteurs.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Les endpoints de transmission rejettent les roles administratifs sur les listes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Demandes de Prise en Charge</h2>
          <p className="text-muted-foreground">
            {currentRole === 'COLLECTOR'
              ? 'Validez les demandes de transmission creees par les transporteurs.'
              : 'Suivez vos demandes et confirmez les colis reellement embarques.'}
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
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <RequestMetric icon={Clock} label="En attente" value={counters.pending} className="bg-warning/15 text-warning" />
        <RequestMetric icon={Check} label="Approuvees" value={counters.approved} className="bg-primary/15 text-primary" />
        <RequestMetric icon={PackageCheck} label="Embarquees" value={counters.dispatched} className="bg-success/15 text-success" />
        <RequestMetric icon={X} label="Rejetees" value={counters.rejected} className="bg-destructive/15 text-destructive" />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void loadRequests()}>
                Reessayer
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
                    title="Aucune demande"
                    description="Les demandes creees via le backend apparaitront ici."
                  />
                ) : (
                  requests.map((request) => (
                    <MobileTransmissionRequestCard
                      key={request.requestId}
                      request={request}
                      actions={renderActions(request)}
                    />
                  ))
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Demande</TableHead>
                      <TableHead className="text-muted-foreground">Point origine</TableHead>
                      <TableHead className="text-muted-foreground">Intervenants</TableHead>
                      <TableHead className="text-muted-foreground">Colis</TableHead>
                      <TableHead className="text-muted-foreground">Statut</TableHead>
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.requestId} className="border-border">
                        <TableCell className="font-mono text-foreground">#{request.requestId}</TableCell>
                        <TableCell className="text-foreground">
                          {request.originCollectionPointName ?? 'Point non renseigne'}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">
                            Transporteur: {request.transporterUsername ?? 'Non renseigne'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Collecteur: {request.collectorUsername ?? 'Non renseigne'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">
                            {request.embarkedShipmentCount ?? 0}/{request.requestedShipmentCount ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.pendingShipmentCount ?? 0} restant(s)
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border-0', getShipmentTransmissionStatusClassName(request.status))}>
                            {SHIPMENT_TRANSMISSION_STATUS_LABELS[request.status]}
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
                            <p className="font-medium text-foreground">Aucune demande</p>
                            <p className="text-sm text-muted-foreground">
                              Les demandes creees via le backend apparaitront ici.
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
              Demande #{selectedRequest?.requestId}
            </DialogTitle>
            <DialogDescription>
              Detail des colis, actions et notes rattachees a la transmission.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <RequestDetail
              request={selectedRequest}
              canAddNote={currentRole === 'TRANSPORTER'}
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
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionMode)} onOpenChange={(open) => !open && resetAction()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{getActionTitle(actionMode)}</DialogTitle>
            <DialogDescription>{getActionDescription(actionMode)}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      Demande #{selectedRequest.requestId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.originCollectionPointName ?? 'Point origine non renseigne'}
                    </p>
                  </div>
                  <Badge className={cn('border-0', getShipmentTransmissionStatusClassName(selectedRequest.status))}>
                    {SHIPMENT_TRANSMISSION_STATUS_LABELS[selectedRequest.status]}
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
                          aria-label={`Selectionner ${item.reference ?? item.shipmentId}`}
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
                            {item.senderFullName ?? 'Expediteur'} vers {item.receiverFullName ?? 'destinataire'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.shipmentStatus && (
                              <Badge className={cn('border-0', getShipmentStatusClassName(item.shipmentStatus))}>
                                {getShipmentStatusLabel(item.shipmentStatus)}
                              </Badge>
                            )}
                            {item.embarked && <Badge variant="outline">Deja embarque</Badge>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {actionMode === 'reject' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Motif du rejet</label>
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
                    {actionMode === 'note' ? 'Note de transit' : 'Note'}
                  </label>
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Commentaire optionnel"
                    className="min-h-[100px] bg-secondary"
                    disabled={actionLoading}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetAction} disabled={actionLoading}>
              Annuler
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
              Confirmer
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
}: {
  request: ShipmentTransmissionRequestSummary;
  actions: ReactNode;
}) {
  return (
    <article className="space-y-3 overflow-hidden rounded-xl border border-border bg-background p-3.5 shadow-sm">
      <div className="flex flex-col items-start gap-2 min-[400px]:flex-row min-[400px]:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-foreground">#{request.requestId}</p>
          <p className="break-words text-sm text-muted-foreground">
            {request.originCollectionPointName ?? 'Point non renseigne'}
          </p>
        </div>
        <Badge className={cn('max-w-full shrink-0 whitespace-normal border-0 text-left text-[11px]', getShipmentTransmissionStatusClassName(request.status))}>
          {SHIPMENT_TRANSMISSION_STATUS_LABELS[request.status]}
        </Badge>
      </div>
      <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-sm">
        <MobileInfo label="Transporteur" value={request.transporterUsername} />
        <MobileInfo label="Collecteur" value={request.collectorUsername} />
        <MobileInfo
          label="Colis"
          value={`${request.embarkedShipmentCount ?? 0}/${request.requestedShipmentCount ?? 0} embarques`}
        />
        <MobileInfo label="Date" value={formatShipmentDate(request.createdAt)} />
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

function MobileInfo({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-right font-medium text-foreground">
        {value || 'Non renseigne'}
      </span>
    </div>
  );
}

function RequestDetail({
  request,
  canAddNote,
  onAddNote,
}: {
  request: ShipmentTransmissionRequest;
  canAddNote: boolean;
  onAddNote: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoBox label="Demandes" value={request.requestedShipmentCount ?? 0} />
        <InfoBox label="Embarques" value={request.embarkedShipmentCount ?? 0} />
        <InfoBox label="Restants" value={request.pendingShipmentCount ?? 0} />
      </div>

      {canAddNote && (request.items?.length ?? 0) > 0 && (
        <Button variant="outline" className="gap-2" onClick={onAddNote}>
          <StickyNote className="h-4 w-4" />
          Ajouter une note de transit
        </Button>
      )}

      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Colis</p>
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
                    {item.senderFullName ?? 'Expediteur'} vers {item.receiverFullName ?? 'destinataire'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Destination: {item.destinationCollectionPointName ?? 'Non renseignee'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.shipmentStatus && (
                    <Badge className={cn('border-0', getShipmentStatusClassName(item.shipmentStatus))}>
                      {getShipmentStatusLabel(item.shipmentStatus)}
                    </Badge>
                  )}
                  {item.embarked && <Badge variant="outline">Embarque</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(request.actions?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Historique</p>
          <div className="space-y-3">
            {request.actions?.map((action) => (
              <div key={action.actionId} className="rounded-lg bg-secondary px-3 py-2 text-sm">
                <p className="font-medium text-foreground">
                  {action.actionType} par {action.actorUsername ?? 'systeme'}
                </p>
                <p className="text-muted-foreground">
                  {action.note || action.rejectionReason || 'Aucune note'}
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

function getActionTitle(actionMode: ActionMode) {
  switch (actionMode) {
    case 'approve':
      return 'Approuver la demande';
    case 'reject':
      return 'Rejeter la demande';
    case 'embark':
      return 'Confirmer l\'embarquement';
    case 'note':
      return 'Ajouter une note de transit';
    default:
      return 'Action';
  }
}

function getActionDescription(actionMode: ActionMode) {
  switch (actionMode) {
    case 'approve':
      return 'Le transporteur pourra ensuite confirmer les colis embarques.';
    case 'reject':
      return 'Le motif sera renvoye au transporteur.';
    case 'embark':
      return 'Selectionnez les colis effectivement pris en charge.';
    case 'note':
      return 'La note sera rattachee aux colis selectionnes.';
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
