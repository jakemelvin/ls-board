'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import {
  Check,
  ClipboardCheck,
  Package,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLatestRequest } from '@/hooks/use-latest-request';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
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

const PAGE_SIZE = 50;

export function LocalStock() {
  const token = useAuthStore((state) => state.token);
  const [depositRequests, setDepositRequests] = useState<ShipmentDestinationDepositRequestSummary[]>([]);
  const [incomingShipments, setIncomingShipments] = useState<ShipmentDestinationIncomingShipment[]>([]);
  const [incomingGroups, setIncomingGroups] = useState<ShipmentTransportGroupSummary[]>([]);
  const [pickupShipments, setPickupShipments] = useState<CollectorPickupShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadStock = useCallback(async () => {
    if (!token) {
      setError('Session expiree');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [deposits, incoming, groups, pickups] = await Promise.all([
        getCollectorDestinationDepositRequests(token, { page: 0, size: PAGE_SIZE }),
        getDestinationIncomingShipments(token, { page: 0, size: PAGE_SIZE }),
        getDestinationIncomingGroups(token, { page: 0, size: PAGE_SIZE }),
        getReadyForPickupShipments(token, { page: 0, size: PAGE_SIZE }),
      ]);

      setDepositRequests(deposits.content ?? []);
      setIncomingShipments(incoming.content ?? []);
      setIncomingGroups(groups.content ?? []);
      setPickupShipments(pickups.content ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger le stock local.');
      setDepositRequests([]);
      setIncomingShipments([]);
      setIncomingGroups([]);
      setPickupShipments([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

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
        title: 'Motif requis',
        description: 'Chaque colis rejete doit avoir un motif.',
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
        title: 'Depot controle',
        description: `${acceptedIds.length} colis accepte(s), ${rejectedItems.length} rejete(s).`,
      });
      setIsReviewOpen(false);
      setSelectedDeposit(null);
      await loadStock();
    } catch (err) {
      toast({
        title: 'Controle impossible',
        description:
          err instanceof ApiError ? err.message : 'Impossible de controler le depot.',
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
        title: 'Colis livre',
        description: `Le colis ${shipmentReference.trim()} a ete remis au destinataire.`,
      });
      setIsDeliverOpen(false);
      setSelectedPickup(null);
      await loadStock();
    } catch (err) {
      toast({
        title: 'Livraison impossible',
        description:
          err instanceof ApiError ? err.message : 'Impossible de livrer le colis.',
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
          <h2 className="text-2xl font-bold text-foreground">Stock Local</h2>
          <p className="text-muted-foreground">
            Controlez les depots destination et livrez les colis prets au retrait.
          </p>
        </div>
        <Button variant="outline" className="w-fit gap-2" onClick={() => void loadStock()}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StockMetric icon={ClipboardCheck} label="Depots a controler" value={counters.deposits} className="bg-warning/15 text-warning" />
        <StockMetric icon={Truck} label="Entrants declares" value={counters.incoming} className="bg-primary/15 text-primary" />
        <StockMetric icon={PackageCheck} label="Prets au retrait" value={counters.pickup} className="bg-success/15 text-success" />
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void loadStock()}>Reessayer</Button>
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
              <CardTitle>Depots destination</CardTitle>
              <p className="text-sm text-muted-foreground">
                Acceptez ou rejetez les colis deposes par les transporteurs.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {depositRequests.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="Aucune demande de depot"
                  description="Les depots crees par les transporteurs apparaitront ici."
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
                        <TableHead className="text-muted-foreground">Demande</TableHead>
                        <TableHead className="text-muted-foreground">Transporteur</TableHead>
                        <TableHead className="text-muted-foreground">Destination</TableHead>
                        <TableHead className="text-muted-foreground">Colis</TableHead>
                        <TableHead className="text-muted-foreground">Statut</TableHead>
                        <TableHead className="text-right text-muted-foreground">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depositRequests.map((request) => (
                        <TableRow key={request.requestId} className="border-border">
                          <TableCell className="font-mono text-foreground">#{request.requestId}</TableCell>
                          <TableCell className="text-foreground">
                            {request.transporterUsername ?? 'Transporteur non renseigne'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.destinationCollectionPointName ?? 'Destination non renseignee'}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-foreground">
                              {request.acceptedShipmentCount ?? 0}/{request.totalShipmentCount ?? 0} acceptes
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.rejectedShipmentCount ?? 0} rejetes
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
                              {request.status === 'PENDING_COLLECTOR_REVIEW' ? 'Controler' : 'Voir'}
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
          </Card>

          <div className="grid gap-6 2xl:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Entrants declares</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Apercu des colis/groupes qui peuvent arriver au point destination.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {incomingShipments.length === 0 && incomingGroups.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title="Aucun entrant"
                    description="Les colis en cours de depot destination seront listes ici."
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
                            <p className="text-xs text-muted-foreground">{group.name ?? 'Groupe transport'}</p>
                          </div>
                          <Badge variant="outline">{group.activeShipmentCount ?? 0} colis</Badge>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Colis prets au retrait</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Remettez le colis au destinataire apres verification du code.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {pickupShipments.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Aucun colis pret"
                    description="Les colis acceptes a destination et prets au retrait apparaitront ici."
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
                          <TableHead className="text-muted-foreground">Reference</TableHead>
                          <TableHead className="text-muted-foreground">Client</TableHead>
                          <TableHead className="text-muted-foreground">Type</TableHead>
                          <TableHead className="text-muted-foreground">Maj</TableHead>
                          <TableHead className="text-right text-muted-foreground">Action</TableHead>
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
                                {shipment.senderFullName ?? 'Expediteur'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                vers {shipment.receiverFullName ?? 'destinataire'}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {shipment.parcelTypeName ?? 'Type non renseigne'}
                              {shipment.transportModeName ? ` - ${shipment.transportModeName}` : ''}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatShipmentDate(shipment.updatedAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" className="gap-2" onClick={() => openDeliver(shipment)}>
                                <PackageCheck className="h-4 w-4" />
                                Livrer
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
            </Card>
          </div>
        </>
      )}

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Controle depot #{selectedDeposit?.requestId}
            </DialogTitle>
            <DialogDescription>
              Decochez un colis pour le rejeter et renseignez son motif.
            </DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary p-4">
                <p className="font-medium text-foreground">
                  {selectedDeposit.destinationCollectionPointName ?? 'Destination non renseignee'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Transporteur: {selectedDeposit.transporterUsername ?? 'Non renseigne'}
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
                  <label className="text-sm font-medium text-foreground">Note globale</label>
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
              Fermer
            </Button>
            {selectedDeposit?.status === 'PENDING_COLLECTOR_REVIEW' && (
              <Button onClick={() => void handleReview()} disabled={actionLoading} className="gap-2">
                {actionLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Confirmer le controle
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeliverOpen} onOpenChange={setIsDeliverOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Livrer au destinataire</DialogTitle>
            <DialogDescription>
              Verifiez la reference et saisissez le code fourni au destinataire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reference shipment</label>
              <Input
                value={shipmentReference}
                onChange={(event) => setShipmentReference(event.target.value)}
                className="bg-secondary"
                disabled={actionLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Code de retrait</label>
              <Input
                value={shipmentCode}
                onChange={(event) => setShipmentCode(event.target.value)}
                placeholder="Code remis au destinataire"
                className="bg-secondary"
                disabled={actionLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Note</label>
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
              Annuler
            </Button>
            <Button
              onClick={() => void handleDeliver()}
              disabled={actionLoading || !shipmentReference.trim() || !shipmentCode.trim()}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Livrer
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
            {shipment.senderFullName ?? 'Expediteur'} vers {shipment.receiverFullName ?? 'destinataire'}
          </p>
        </div>
        <div className="text-sm text-muted-foreground sm:text-right">
          <p>{shipment.transporterUsername ?? 'Transporteur non renseigne'}</p>
          <p>{shipment.sourceGroupReference ?? 'Sans groupe'}</p>
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
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-foreground">#{request.requestId}</p>
          <p className="truncate text-sm text-muted-foreground">
            {request.destinationCollectionPointName ?? 'Destination non renseignee'}
          </p>
        </div>
        <Badge className={cn('shrink-0 border-0', getShipmentDestinationDepositStatusClassName(request.status))}>
          {SHIPMENT_DESTINATION_DEPOSIT_STATUS_LABELS[request.status]}
        </Badge>
      </div>
      <div className="grid gap-2 text-sm">
        <MobileInfo label="Transporteur" value={request.transporterUsername} />
        <MobileInfo
          label="Colis acceptes"
          value={`${request.acceptedShipmentCount ?? 0}/${request.totalShipmentCount ?? 0}`}
        />
        <MobileInfo label="Rejetes" value={request.rejectedShipmentCount ?? 0} />
      </div>
      <Button
        size="sm"
        variant={request.status === 'PENDING_COLLECTOR_REVIEW' ? 'default' : 'outline'}
        className="w-full gap-2"
        onClick={onOpen}
      >
        <ShieldCheck className="h-4 w-4" />
        {request.status === 'PENDING_COLLECTOR_REVIEW' ? 'Controler' : 'Voir'}
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
          {shipment.senderFullName ?? 'Expediteur'} vers {shipment.receiverFullName ?? 'destinataire'}
        </p>
      </div>
      <div className="grid gap-2 text-sm">
        <MobileInfo
          label="Type"
          value={`${shipment.parcelTypeName ?? 'Non renseigne'}${shipment.transportModeName ? ` - ${shipment.transportModeName}` : ''}`}
        />
        <MobileInfo label="Maj" value={formatShipmentDate(shipment.updatedAt)} />
      </div>
      <Button size="sm" className="w-full gap-2" onClick={onDeliver}>
        <PackageCheck className="h-4 w-4" />
        Livrer
      </Button>
    </div>
  );
}

function MobileInfo({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium text-foreground">
        {value || 'Non renseigne'}
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
          aria-label={`Accepter ${item.shipmentReference ?? item.shipmentId}`}
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
                {item.senderFullName ?? 'Expediteur'} vers {item.receiverFullName ?? 'destinataire'}
              </p>
              {item.sourceGroupReference && (
                <p className="text-xs text-muted-foreground">Groupe: {item.sourceGroupReference}</p>
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
              <label className="text-xs font-medium text-foreground">Motif de rejet</label>
              <Input
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder="Colis absent, endommage..."
                className="bg-secondary"
              />
            </div>
          )}
          {item.rejectionReason && (
            <p className="mt-2 text-sm text-destructive">Motif: {item.rejectionReason}</p>
          )}
        </div>
      </div>
    </div>
  );
}
