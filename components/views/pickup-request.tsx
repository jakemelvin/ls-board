'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, MapPin, Package, RefreshCw, Send, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  createTransmissionRequest,
  getTransporterReadyShipments,
} from '@/lib/shipments/api';
import {
  formatShipmentDate,
  getShipmentStatusClassName,
  getShipmentStatusLabel,
  SHIPMENT_PRIORITY_LABELS,
} from '@/lib/shipments/presentation';
import type { TransporterReadyShipment } from '@/lib/shipments/types';
import { cn } from '@/lib/utils';

export function PickupRequest() {
  const token = useAuthStore((state) => state.token);
  const [shipments, setShipments] = useState<TransporterReadyShipment[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<number[]>([]);
  const [selectedOriginId, setSelectedOriginId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const loadShipments = useCallback(async () => {
    if (!token) {
      setError('Session expiree');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getTransporterReadyShipments(token, {
        page,
        size: pageSize,
      });

      setShipments(response.content ?? []);
      setTotalPages(response.totalPages ?? 0);
      setTotalElements(response.totalElements ?? 0);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Impossible de charger les colis disponibles.',
      );
      setShipments([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, token]);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  const shipmentsByOrigin = useMemo(() => {
    const groups = new Map<number, TransporterReadyShipment[]>();

    shipments.forEach((shipment) => {
      const originId = shipment.originCollectionPointId ?? 0;
      groups.set(originId, [...(groups.get(originId) ?? []), shipment]);
    });

    return Array.from(groups.entries()).map(([originId, items]) => ({
      originId,
      originName: items[0]?.originCollectionPointName ?? 'Point non renseigne',
      items,
    }));
  }, [shipments]);

  const selectedShipments = shipments.filter((shipment) =>
    selectedShipmentIds.includes(shipment.shipmentId),
  );

  const selectedOriginName =
    shipmentsByOrigin.find((group) => group.originId === selectedOriginId)?.originName ??
    'Point non selectionne';

  const toggleShipment = (shipment: TransporterReadyShipment) => {
    const originId = shipment.originCollectionPointId ?? 0;

    setSelectedShipmentIds((current) => {
      const isChangingOrigin = selectedOriginId != null && selectedOriginId !== originId;
      const base = isChangingOrigin ? [] : current;

      const next = base.includes(shipment.shipmentId)
        ? base.filter((id) => id !== shipment.shipmentId)
        : [...base, shipment.shipmentId];

      setSelectedOriginId(next.length > 0 ? originId : null);
      return next;
    });
  };

  const resetSelection = () => {
    setSelectedShipmentIds([]);
    setSelectedOriginId(null);
    setNote('');
  };

  const handleCreateRequest = async () => {
    if (!token || selectedShipmentIds.length === 0) return;

    setSubmitting(true);

    try {
      await createTransmissionRequest(token, {
        shipmentIds: selectedShipmentIds,
        note: note.trim() || undefined,
      });

      toast({
        title: 'Demande envoyee',
        description: `${selectedShipmentIds.length} colis transmis au collecteur pour validation.`,
      });
      setIsConfirmOpen(false);
      resetSelection();
      await loadShipments();
    } catch (err) {
      toast({
        title: 'Demande refusee',
        description:
          err instanceof ApiError ? err.message : "Impossible d'envoyer la demande.",
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Nouvelle demande de prise</h2>
          <p className="text-muted-foreground">
            Selectionnez les colis prets au transport et envoyez une demande au collecteur.
          </p>
        </div>
        <Button variant="outline" className="w-fit gap-2" onClick={() => void loadShipments()}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {selectedShipmentIds.length > 0 && (
        <Card className="border-primary bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {selectedShipmentIds.length} colis selectionne(s)
                </p>
                <p className="text-sm text-muted-foreground">{selectedOriginName}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={resetSelection} disabled={submitting}>
                  Reinitialiser
                </Button>
                <Button className="gap-2" onClick={() => setIsConfirmOpen(true)}>
                  <Send className="h-4 w-4" />
                  Envoyer la demande
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="border-destructive/30 bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void loadShipments()}>
              Reessayer
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : shipmentsByOrigin.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium text-foreground">Aucun colis disponible</p>
            <p className="text-sm text-muted-foreground">
              Les colis prets au transport apparaitront ici apres validation par le collecteur.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {shipmentsByOrigin.map((group) => {
            const selectedInGroup = group.items.filter((shipment) =>
              selectedShipmentIds.includes(shipment.shipmentId),
            ).length;
            const isLockedByOtherOrigin =
              selectedOriginId != null && selectedOriginId !== group.originId;

            return (
              <Card
                key={group.originId}
                className={cn(
                  'border-border bg-card',
                  selectedInGroup > 0 && 'border-primary',
                  isLockedByOtherOrigin && 'opacity-60',
                )}
              >
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{group.originName}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {group.items.length} colis disponible(s)
                          {selectedInGroup > 0 ? `, ${selectedInGroup} selectionne(s)` : ''}
                        </p>
                      </div>
                    </div>
                    {isLockedByOtherOrigin && (
                      <Badge variant="outline">Selection active sur un autre point</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="w-12" />
                          <TableHead className="text-muted-foreground">Reference</TableHead>
                          <TableHead className="text-muted-foreground">Client</TableHead>
                          <TableHead className="text-muted-foreground">Destination</TableHead>
                          <TableHead className="text-muted-foreground">Statut</TableHead>
                          <TableHead className="text-muted-foreground">Cree le</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((shipment) => {
                          const isSelected = selectedShipmentIds.includes(shipment.shipmentId);

                          return (
                            <TableRow
                              key={shipment.shipmentId}
                              className={cn(
                                'cursor-pointer border-border',
                                isSelected && 'bg-primary/10',
                              )}
                              onClick={() => toggleShipment(shipment)}
                            >
                              <TableCell>
                                <span
                                  className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded border',
                                    isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border',
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-primary" />
                                  <span className="font-mono text-sm font-medium text-foreground">
                                    {shipment.reference}
                                  </span>
                                  <CopyTrackingNumberButton trackingNumber={shipment.reference} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {shipment.parcelTypeName ?? 'Type non renseigne'}
                                  {shipment.transportModeName ? ` - ${shipment.transportModeName}` : ''}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-medium text-foreground">
                                  {shipment.senderFullName ?? 'Expediteur non renseigne'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  vers {shipment.receiverFullName ?? 'destinataire non renseigne'}
                                </p>
                              </TableCell>
                              <TableCell className="text-sm text-foreground">
                                {shipment.destinationCollectionPointName ?? 'Destination non renseignee'}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  {shipment.status && (
                                    <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
                                      {getShipmentStatusLabel(shipment.status)}
                                    </Badge>
                                  )}
                                  {shipment.priority && (
                                    <Badge variant="outline">
                                      {SHIPMENT_PRIORITY_LABELS[shipment.priority]}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatShipmentDate(shipment.createdAt)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !error && totalElements > 0 && (
        <DataPagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={(nextPage) => {
            resetSelection();
            setPage(nextPage);
          }}
          onPageSizeChange={(nextPageSize) => {
            resetSelection();
            setPageSize(nextPageSize);
          }}
          loading={loading}
        />
      )}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmer la demande</DialogTitle>
            <DialogDescription>
              Le collecteur du point devra approuver cette demande avant embarquement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Point origine</span>
                <span className="text-right text-sm font-medium text-foreground">
                  {selectedOriginName}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Colis</span>
                <span className="text-sm font-medium text-foreground">
                  {selectedShipmentIds.length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Note au collecteur</label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Exemple: passage prevu a 15h30"
                className="min-h-[100px] bg-secondary"
                disabled={submitting}
              />
            </div>
            <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {selectedShipments.map((shipment) => (
                <div
                  key={shipment.shipmentId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2"
                >
                  <span className="font-mono text-sm text-foreground">{shipment.reference}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {shipment.destinationCollectionPointName}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreateRequest()} disabled={submitting} className="gap-2">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              {submitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
