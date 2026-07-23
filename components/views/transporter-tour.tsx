'use client';

import { useCallback, useMemo, useState, type ElementType } from 'react';
import {
  CheckCircle2,
  Layers3,
  MapPin,
  Package,
  PackagePlus,
  RefreshCw,
  StickyNote,
  Truck,
  Ungroup,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import {
  addTransportGroupNote,
  createDestinationDepositRequest,
  createTransportGroup,
  dissolveTransportGroup,
  getTransportGroups,
  getTransporterDestinationDepositRequests,
  getTransporterInTransitShipments,
} from '@/lib/shipments/api';
import {
  formatShipmentDate,
  getShipmentDestinationDepositStatusClassName,
  getShipmentStatusClassName,
  getShipmentStatusLabel,
  SHIPMENT_DESTINATION_DEPOSIT_STATUS_LABELS,
  SHIPMENT_PRIORITY_LABELS,
} from '@/lib/shipments/presentation';
import type {
  ShipmentDestinationDepositRequestSummary,
  ShipmentTransportGroupSummary,
  TransporterReadyShipment,
} from '@/lib/shipments/types';
import { cn } from '@/lib/utils';

type GroupAction = 'note' | 'dissolve' | null;

export function TransporterTour() {
  const token = useAuthStore((state) => state.token);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [note, setNote] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<ShipmentTransportGroupSummary | null>(null);
  const [groupAction, setGroupAction] = useState<GroupAction>(null);

  const shipmentQuery = useCallback(
    (page: number, pageSize: number) =>
      getTransporterInTransitShipments(token, { page, size: pageSize }),
    [token],
  );
  const groupQuery = useCallback(
    (page: number, pageSize: number) =>
      getTransportGroups(token, { page, size: pageSize }),
    [token],
  );
  const depositQuery = useCallback(
    (page: number, pageSize: number) =>
      getTransporterDestinationDepositRequests(token, { page, size: pageSize }),
    [token],
  );
  const shipmentPagination = usePaginatedQuery({
    query: shipmentQuery,
    enabled: Boolean(token),
    initialPageSize: 50,
    errorMessage: 'Impossible de charger les colis en transit.',
  });
  const groupPagination = usePaginatedQuery({
    query: groupQuery,
    enabled: Boolean(token),
    initialPageSize: 50,
    errorMessage: 'Impossible de charger les groupes de transport.',
  });
  const depositPagination = usePaginatedQuery({
    query: depositQuery,
    enabled: Boolean(token),
    initialPageSize: 50,
    errorMessage: 'Impossible de charger les depots destination.',
  });
  const shipments = shipmentPagination.items;
  const groups = groupPagination.items;
  const depositRequests = depositPagination.items;
  const loading =
    shipmentPagination.loading || groupPagination.loading || depositPagination.loading;
  const error =
    shipmentPagination.error || groupPagination.error || depositPagination.error;
  const loadTour = useCallback(
    async () => {
      await Promise.all([
        shipmentPagination.reload(),
        groupPagination.reload(),
        depositPagination.reload(),
      ]);
    },
    [depositPagination, groupPagination, shipmentPagination],
  );

  const activeGroups = groups.filter((group) => group.active !== false);
  const selectedShipments = shipments.filter((shipment) =>
    selectedShipmentIds.includes(shipment.shipmentId),
  );
  const selectedGroups = activeGroups.filter((group) => selectedGroupIds.includes(group.groupId));

  const shipmentsByDestination = useMemo(() => {
    const map = new Map<number, TransporterReadyShipment[]>();

    shipments.forEach((shipment) => {
      const destinationId = shipment.destinationCollectionPointId ?? 0;
      map.set(destinationId, [...(map.get(destinationId) ?? []), shipment]);
    });

    return Array.from(map.entries()).map(([destinationId, items]) => ({
      destinationId,
      destinationName: items[0]?.destinationCollectionPointName ?? 'Destination non renseignee',
      items,
    }));
  }, [shipments]);

  const toggleShipment = (shipmentId: number) => {
    setSelectedShipmentIds((current) =>
      current.includes(shipmentId)
        ? current.filter((id) => id !== shipmentId)
        : [...current, shipmentId],
    );
  };

  const toggleGroup = (groupId: number) => {
    setSelectedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  };

  const resetSelection = () => {
    setSelectedShipmentIds([]);
    setSelectedGroupIds([]);
    setGroupName('');
    setNote('');
  };

  const handleCreateGroup = async () => {
    if (!token || selectedShipmentIds.length === 0) return;

    setActionLoading(true);

    try {
      await createTransportGroup(token, {
        name: groupName.trim() || undefined,
        shipmentIds: selectedShipmentIds,
      });
      toast({
        title: 'Groupe cree',
        description: `${selectedShipmentIds.length} colis rattaches au groupe.`,
      });
      setIsGroupDialogOpen(false);
      resetSelection();
      await loadTour();
    } catch (err) {
      toast({
        title: 'Creation impossible',
        description:
          err instanceof ApiError ? err.message : 'Impossible de creer le groupe.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDeposit = async () => {
    if (!token || (selectedShipmentIds.length === 0 && selectedGroupIds.length === 0)) return;

    setActionLoading(true);

    try {
      await createDestinationDepositRequest(token, {
        shipmentIds: selectedShipmentIds,
        groupIds: selectedGroupIds,
        note: note.trim() || undefined,
      });
      toast({
        title: 'Depot destination cree',
        description: 'Le collecteur destination peut maintenant controler la demande.',
      });
      setIsDepositDialogOpen(false);
      resetSelection();
      await loadTour();
    } catch (err) {
      toast({
        title: 'Depot impossible',
        description:
          err instanceof ApiError ? err.message : 'Impossible de creer le depot destination.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openGroupAction = (group: ShipmentTransportGroupSummary, action: GroupAction) => {
    setSelectedGroup(group);
    setGroupAction(action);
    setNote('');
  };

  const resetGroupAction = () => {
    setSelectedGroup(null);
    setGroupAction(null);
    setNote('');
  };

  const handleGroupAction = async () => {
    if (!token || !selectedGroup || !groupAction) return;

    setActionLoading(true);

    try {
      if (groupAction === 'note') {
        await addTransportGroupNote(token, selectedGroup.groupId, {
          description: note.trim(),
        });
        toast({ title: 'Note ajoutee', description: 'La note du groupe a ete enregistree.' });
      } else {
        await dissolveTransportGroup(token, selectedGroup.groupId);
        toast({ title: 'Groupe dissous', description: 'Le groupe de transport a ete dissous.' });
      }

      resetGroupAction();
      await loadTour();
    } catch (err) {
      toast({
        title: 'Action impossible',
        description:
          err instanceof ApiError ? err.message : 'Impossible de mettre a jour le groupe.',
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
          <h2 className="text-2xl font-bold text-foreground">Ma tournee</h2>
          <p className="text-muted-foreground">
            Suivez les colis en transit, creez des groupes et deposez-les au point destination.
          </p>
        </div>
        <Button variant="outline" className="w-fit gap-2" onClick={() => void loadTour()}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <TourMetric icon={Truck} label="Colis en transit" value={shipments.length} className="bg-primary/15 text-primary" />
        <TourMetric icon={Layers3} label="Groupes actifs" value={activeGroups.length} className="bg-chart-2/15 text-chart-2" />
        <TourMetric icon={CheckCircle2} label="Depots destination" value={depositRequests.length} className="bg-success/15 text-success" />
      </div>

      {(selectedShipmentIds.length > 0 || selectedGroupIds.length > 0) && (
        <Card className="border-primary bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {selectedShipmentIds.length} colis et {selectedGroupIds.length} groupe(s) selectionne(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  Creez un groupe avec les colis seuls ou une demande de depot avec colis/groupes.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={resetSelection} disabled={actionLoading}>
                  Reinitialiser
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setIsGroupDialogOpen(true)}
                  disabled={selectedShipmentIds.length === 0}
                >
                  <PackagePlus className="h-4 w-4" />
                  Creer un groupe
                </Button>
                <Button className="gap-2" onClick={() => setIsDepositDialogOpen(true)}>
                  <MapPin className="h-4 w-4" />
                  Deposer a destination
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
            <Button variant="outline" onClick={() => void loadTour()}>Reessayer</Button>
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
              <CardTitle>Colis en transit</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selectionnez les colis a regrouper ou a deposer au point destination.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 p-0">
              {shipmentsByDestination.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Aucun colis en transit"
                  description="Les colis embarques via les demandes de prise apparaitront ici."
                />
              ) : (
                shipmentsByDestination.map((group) => (
                  <div key={group.destinationId} className="border-t border-border first:border-t-0">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{group.destinationName}</p>
                        <p className="text-xs text-muted-foreground">{group.items.length} colis</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="w-12" />
                            <TableHead className="text-muted-foreground">Reference</TableHead>
                            <TableHead className="text-muted-foreground">Client</TableHead>
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
                                className={cn('cursor-pointer border-border', isSelected && 'bg-primary/10')}
                                onClick={() => toggleShipment(shipment.shipmentId)}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleShipment(shipment.shipmentId)}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Selectionner ${shipment.reference}`}
                                  />
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
                                  <p className="text-sm text-foreground">{shipment.senderFullName ?? 'Expediteur'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    vers {shipment.receiverFullName ?? 'destinataire'}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    {shipment.status && (
                                      <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
                                        {getShipmentStatusLabel(shipment.status)}
                                      </Badge>
                                    )}
                                    {shipment.priority && (
                                      <Badge variant="outline">{SHIPMENT_PRIORITY_LABELS[shipment.priority]}</Badge>
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
                  </div>
                ))
              )}
            </CardContent>
            {shipmentPagination.totalElements > 0 && (
              <DataPagination
                page={shipmentPagination.page}
                pageSize={shipmentPagination.pageSize}
                totalPages={shipmentPagination.totalPages}
                totalElements={shipmentPagination.totalElements}
                onPageChange={(nextPage) => {
                  setSelectedShipmentIds([]);
                  shipmentPagination.setPage(nextPage);
                }}
                onPageSizeChange={(nextPageSize) => {
                  setSelectedShipmentIds([]);
                  shipmentPagination.setPageSize(nextPageSize);
                }}
                loading={shipmentPagination.loading}
                className="mx-4 mb-4"
              />
            )}
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Groupes de transport</CardTitle>
              <p className="text-sm text-muted-foreground">
                Les groupes peuvent recevoir des notes, etre dissous ou etre inclus dans un depot.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {activeGroups.length === 0 ? (
                <EmptyState
                  icon={Layers3}
                  title="Aucun groupe actif"
                  description="Creez un groupe depuis les colis en transit selectionnes."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-12" />
                        <TableHead className="text-muted-foreground">Groupe</TableHead>
                        <TableHead className="text-muted-foreground">Colis</TableHead>
                        <TableHead className="text-muted-foreground">Cree le</TableHead>
                        <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeGroups.map((group) => {
                        const isSelected = selectedGroupIds.includes(group.groupId);

                        return (
                          <TableRow key={group.groupId} className="border-border">
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleGroup(group.groupId)}
                                aria-label={`Selectionner ${group.reference ?? group.groupId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="font-mono text-sm font-medium text-foreground">
                                {group.reference ?? `#${group.groupId}`}
                              </p>
                              <p className="text-xs text-muted-foreground">{group.name ?? 'Sans nom'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">
                                {group.activeShipmentCount ?? 0}/{group.totalShipmentCount ?? 0}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatShipmentDate(group.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => openGroupAction(group, 'note')}
                                >
                                  <StickyNote className="h-4 w-4" />
                                  Note
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => openGroupAction(group, 'dissolve')}
                                >
                                  <Ungroup className="h-4 w-4" />
                                  Dissoudre
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {groupPagination.totalElements > 0 && (
              <DataPagination
                page={groupPagination.page}
                pageSize={groupPagination.pageSize}
                totalPages={groupPagination.totalPages}
                totalElements={groupPagination.totalElements}
                onPageChange={(nextPage) => {
                  setSelectedGroupIds([]);
                  groupPagination.setPage(nextPage);
                }}
                onPageSizeChange={(nextPageSize) => {
                  setSelectedGroupIds([]);
                  groupPagination.setPageSize(nextPageSize);
                }}
                loading={groupPagination.loading}
                className="mx-4 mb-4"
              />
            )}
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Demandes de depot destination</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {depositRequests.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Aucun depot cree"
                  description="Les demandes envoyees aux collecteurs destination apparaitront ici."
                />
              ) : (
                <>
                <div className="space-y-3 p-4 md:hidden">
                  {depositRequests.map((request) => (
                    <MobileTransporterDepositCard key={request.requestId} request={request} />
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Demande</TableHead>
                        <TableHead className="text-muted-foreground">Destination</TableHead>
                        <TableHead className="text-muted-foreground">Collecteur</TableHead>
                        <TableHead className="text-muted-foreground">Colis</TableHead>
                        <TableHead className="text-muted-foreground">Statut</TableHead>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depositRequests.map((request) => (
                        <TableRow key={request.requestId} className="border-border">
                          <TableCell className="font-mono text-foreground">#{request.requestId}</TableCell>
                          <TableCell className="text-foreground">
                            {request.destinationCollectionPointName ?? 'Destination non renseignee'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.collectorUsername ?? 'Non assigne'}
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
                          <TableCell className="text-sm text-muted-foreground">
                            {formatShipmentDate(request.createdAt)}
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
        </>
      )}

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Creer un groupe de transport</DialogTitle>
            <DialogDescription>
              Le groupe sera cree avec les colis en transit selectionnes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nom du groupe</label>
              <Input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Ex: Tournee matin Akwa"
                className="bg-secondary"
              />
            </div>
            <SelectionSummary shipments={selectedShipments} groups={[]} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)} disabled={actionLoading}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreateGroup()} disabled={actionLoading || selectedShipmentIds.length === 0} className="gap-2">
              {actionLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Deposer a destination</DialogTitle>
            <DialogDescription>
              Le collecteur destination devra accepter ou rejeter chaque colis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <SelectionSummary shipments={selectedShipments} groups={selectedGroups} />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Note au collecteur destination</label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Exemple: depot au comptoir principal"
                className="min-h-[100px] bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepositDialogOpen(false)} disabled={actionLoading}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreateDeposit()} disabled={actionLoading || (selectedShipmentIds.length === 0 && selectedGroupIds.length === 0)} className="gap-2">
              {actionLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Envoyer le depot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(groupAction)} onOpenChange={(open) => !open && resetGroupAction()}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {groupAction === 'note' ? 'Ajouter une note' : 'Dissoudre le groupe'}
            </DialogTitle>
            <DialogDescription>
              Groupe {selectedGroup?.reference ?? selectedGroup?.groupId}
            </DialogDescription>
          </DialogHeader>
          {groupAction === 'note' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Note</label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-[100px] bg-secondary"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Les colis restent dans votre scope transporteur, mais le groupe ne sera plus actif.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetGroupAction} disabled={actionLoading}>
              Annuler
            </Button>
            <Button
              onClick={() => void handleGroupAction()}
              disabled={actionLoading || (groupAction === 'note' && !note.trim())}
              variant={groupAction === 'dissolve' ? 'destructive' : 'default'}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TourMetric({
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

function MobileTransporterDepositCard({
  request,
}: {
  request: ShipmentDestinationDepositRequestSummary;
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
        <MobileInfo label="Collecteur" value={request.collectorUsername} />
        <MobileInfo
          label="Acceptes"
          value={`${request.acceptedShipmentCount ?? 0}/${request.totalShipmentCount ?? 0}`}
        />
        <MobileInfo label="Rejetes" value={request.rejectedShipmentCount ?? 0} />
        <MobileInfo label="Date" value={formatShipmentDate(request.createdAt)} />
      </div>
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

function SelectionSummary({
  shipments,
  groups,
}: {
  shipments: TransporterReadyShipment[];
  groups: ShipmentTransportGroupSummary[];
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold text-foreground">Selection</p>
      {shipments.length === 0 && groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun element selectionne.</p>
      ) : (
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {shipments.map((shipment) => (
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
          {groups.map((group) => (
            <div
              key={group.groupId}
              className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2"
            >
              <span className="font-mono text-sm text-foreground">
                {group.reference ?? `#${group.groupId}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {group.activeShipmentCount ?? 0} colis
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
