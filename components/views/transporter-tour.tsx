'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Layers3,
  MapPin,
  MessageSquarePlus,
  Package,
  PackagePlus,
  Play,
  StickyNote,
  Truck,
  Ungroup,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { getCollectionPointFullAddress } from '@/lib/collection-point-location';
import { getStatusLabel, getStatusColor, type Parcel, type ParcelGroup, type User } from '@/lib/mock-data';
import {
  getRecipientColumnLabel,
  getRecipientDisplayName,
  getSenderColumnLabel,
  getSenderDisplayName,
} from '@/lib/parcel-privacy';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface TransporterTourProps {
  currentUser: User;
}

interface NoteTarget {
  label: string;
  parcelIds: string[];
  targetId: string;
  targetType: 'PARCEL' | 'GROUP';
}

interface TourParcelGroup extends ParcelGroup {
  parcels: Parcel[];
}

export function TransporterTour({ currentUser }: TransporterTourProps) {
  const {
    parcels,
    parcelGroups,
    parcelNotes,
    vehicles,
    collectionPoints,
    countries,
    cities,
    zones,
    updateParcelStatus,
    removeParcelFromVehicle,
    createTourParcelGroup,
    deliverParcelGroup,
    dissolveParcelGroup,
    addParcelNote,
  } = useStore();
  const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);
  const [isDeliverGroupDialogOpen, setIsDeliverGroupDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<TourParcelGroup | null>(null);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);
  const [noteMessage, setNoteMessage] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'INTERNAL' | 'CLIENT'>('CLIENT');
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentVehicle = vehicles.find((vehicle) => vehicle.id === currentUser.assignedVehicleId);
  const tourParcels = parcels.filter(
    (parcel) => parcel.status === 'IN_TRANSIT' && parcel.currentVehicleId === currentVehicle?.id
  );

  const groupedParcels = useMemo(
    () =>
      parcelGroups
        .map((group) => ({
          ...group,
          parcels: tourParcels.filter((parcel) => parcel.groupId === group.id),
        }))
        .filter((group) => group.parcels.length > 0),
    [parcelGroups, tourParcels]
  );

  const ungroupedParcels = tourParcels.filter((parcel) => !parcel.groupId);
  const selectedUngroupedParcels = ungroupedParcels.filter((parcel) =>
    selectedParcelIds.includes(parcel.id)
  );

  const toggleParcelSelection = (parcelId: string) => {
    setSelectedParcelIds((current) =>
      current.includes(parcelId)
        ? current.filter((id) => id !== parcelId)
        : [...current, parcelId]
    );
  };

  const handleCreateTourGroup = () => {
    if (!currentVehicle) {
      setFeedback('Aucun vehicule assigne: impossible de creer un lot de tournee.');
      return;
    }

    const group = createTourParcelGroup(
      selectedParcelIds,
      currentVehicle.id,
      currentUser.id,
      currentUser.name
    );

    if (!group) {
      setFeedback('Selectionnez au moins deux colis individuels deja charges dans votre vehicule.');
      return;
    }

    setSelectedParcelIds([]);
    setFeedback(`Lot ${group.reference} cree dans votre tournee.`);
  };

  const handleDeliverToPoint = () => {
    if (!selectedParcel) {
      return;
    }

    const destinationPoint = collectionPoints.find((point) => point.id === selectedParcel.destinationPointId);

    updateParcelStatus(
      selectedParcel.id,
      'ARRIVED_AT_DESTINATION',
      currentUser.id,
      currentUser.name,
      destinationPoint?.name || 'Point de destination'
    );
    removeParcelFromVehicle(selectedParcel.id);
    setSelectedParcel(null);
    setIsDeliverDialogOpen(false);
  };

  const getGroupDeliveryLocation = (group: TourParcelGroup) => {
    const destinationPointIds = Array.from(new Set(group.parcels.map((parcel) => parcel.destinationPointId)));
    const destinationNames = destinationPointIds.map(
      (pointId) => collectionPoints.find((point) => point.id === pointId)?.name ?? 'Point de destination'
    );

    if (destinationNames.length === 1) {
      return destinationNames[0];
    }

    return `${destinationNames.length} points de destination`;
  };

  const handleDeliverGroupToPoint = () => {
    if (!selectedGroup) {
      return;
    }

    const deliveredCount = deliverParcelGroup(
      selectedGroup.id,
      currentUser.id,
      currentUser.name,
      getGroupDeliveryLocation(selectedGroup)
    );

    setFeedback(
      deliveredCount > 0
        ? `Lot ${selectedGroup.reference} livre: ${deliveredCount} colis arrives a destination.`
        : `Aucun colis en transit a livrer dans le lot ${selectedGroup.reference}.`
    );
    setSelectedGroup(null);
    setIsDeliverGroupDialogOpen(false);
  };

  const openDeliverDialog = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setIsDeliverDialogOpen(true);
  };

  const openDeliverGroupDialog = (group: TourParcelGroup) => {
    setSelectedGroup(group);
    setIsDeliverGroupDialogOpen(true);
  };

  const openNoteDialog = (target: NoteTarget) => {
    setNoteTarget(target);
    setNoteMessage('');
    setNoteVisibility('CLIENT');
  };

  const handleSaveNote = () => {
    if (!noteTarget || !noteMessage.trim()) {
      return;
    }

    addParcelNote({
      targetType: noteTarget.targetType,
      targetId: noteTarget.targetId,
      parcelIds: noteTarget.parcelIds,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      message: noteMessage.trim(),
      visibility: noteVisibility,
    });

    setNoteTarget(null);
    setNoteMessage('');
    setFeedback(`Note ajoutee sur ${noteTarget.label.toLowerCase()}.`);
  };

  const getNoteSummary = (targetType: 'PARCEL' | 'GROUP', targetId: string) => {
    const notes = parcelNotes.filter((note) => note.targetType === targetType && note.targetId === targetId);

    return {
      total: notes.length,
      latest: notes[0],
      clientVisible: notes.filter((note) => note.visibility === 'CLIENT').length,
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ma tournee</h2>
        <p className="text-muted-foreground">
          Creez vos lots de tournee, ajoutez des notes de suivi et gardez une trace exploitable par le backend.
        </p>
      </div>

      {feedback && (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      )}

      {currentVehicle && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
                  <Truck className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {currentVehicle.type} - {currentVehicle.plate}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Capacite: {currentVehicle.maxWeight} kg / {currentVehicle.maxVolume} m3
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary px-3 py-2 text-center">
                  <p className="text-2xl font-bold text-foreground">{tourParcels.length}</p>
                  <p className="text-xs text-muted-foreground">Colis</p>
                </div>
                <div className="rounded-lg bg-secondary px-3 py-2 text-center">
                  <p className="text-2xl font-bold text-foreground">{groupedParcels.length}</p>
                  <p className="text-xs text-muted-foreground">Lots</p>
                </div>
                <Button
                  className="gap-2"
                  onClick={handleCreateTourGroup}
                  disabled={selectedUngroupedParcels.length < 2}
                >
                  <PackagePlus className="h-4 w-4" />
                  Creer un lot
                </Button>
                <Button className="gap-2" variant="secondary" disabled={tourParcels.length === 0}>
                  <Play className="h-4 w-4" />
                  En transit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {groupedParcels.length > 0 && (
        <div className="space-y-4">
          {groupedParcels.map((group) => {
            const totalWeight = group.parcels.reduce((sum, parcel) => sum + parcel.weight, 0);
            const noteSummary = getNoteSummary('GROUP', group.id);

            return (
              <Card key={group.id} className="border-border bg-card">
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Lot en tournee</p>
                      <CardTitle>{group.reference}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {group.parcels.length} colis, {totalWeight.toFixed(1)} kg
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                        {group.scope === 'TRANSPORTER_TOUR' ? 'Cree en tournee' : 'Lot existant'}
                      </span>
                      {noteSummary.clientVisible > 0 && (
                        <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {noteSummary.clientVisible} note(s) client
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openDeliverGroupDialog(group)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Livrer le lot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          openNoteDialog({
                            targetType: 'GROUP',
                            targetId: group.id,
                            parcelIds: group.parcels.map((parcel) => parcel.id),
                            label: `lot ${group.reference}`,
                          })
                        }
                      >
                        <StickyNote className="h-4 w-4" />
                        Commenter le lot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          dissolveParcelGroup(group.id);
                          setFeedback(`Lot ${group.reference} dissous. Les colis restent dans votre tournee.`);
                        }}
                      >
                        <Ungroup className="h-4 w-4" />
                        Dissoudre
                      </Button>
                    </div>
                  </div>
                  {noteSummary.latest && (
                    <div className="rounded-lg bg-secondary p-3 text-sm">
                      <p className="font-medium text-foreground">{noteSummary.latest.authorName}</p>
                      <p className="text-muted-foreground">{noteSummary.latest.message}</p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                        <TableHead className="text-muted-foreground">
                          {getRecipientColumnLabel('TRANSPORTER')}
                        </TableHead>
                        <TableHead className="text-muted-foreground">Destination</TableHead>
                        <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.parcels.map((parcel) => {
                        const destination = collectionPoints.find((point) => point.id === parcel.destinationPointId);

                        return (
                          <TableRow key={parcel.id} className="border-border">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                <span className="font-mono font-medium text-foreground">{parcel.trackingNumber}</span>
                                <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground">
                              {getRecipientDisplayName(parcel.recipientName, 'TRANSPORTER')}
                            </TableCell>
                            <TableCell className="text-foreground">{destination?.name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() =>
                                    openNoteDialog({
                                      targetType: 'PARCEL',
                                      targetId: parcel.id,
                                      parcelIds: [parcel.id],
                                      label: `colis ${parcel.trackingNumber}`,
                                    })
                                  }
                                >
                                  <MessageSquarePlus className="h-4 w-4" />
                                  Note
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => openDeliverDialog(parcel)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Livrer
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Colis individuels</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selectionnez au moins deux colis deja charges pour creer un lot dans votre tournee.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedUngroupedParcels.length > 0 && (
                <span className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                  {selectedUngroupedParcels.length} selectionne(s)
                </span>
              )}
              <Button
                className="gap-2"
                onClick={handleCreateTourGroup}
                disabled={selectedUngroupedParcels.length < 2}
              >
                <PackagePlus className="h-4 w-4" />
                Creer un lot
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12" />
                <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                <TableHead className="text-muted-foreground">
                  {getSenderColumnLabel('TRANSPORTER')}
                </TableHead>
                <TableHead className="text-muted-foreground">
                  {getRecipientColumnLabel('TRANSPORTER')}
                </TableHead>
                <TableHead className="text-muted-foreground">Poids</TableHead>
                <TableHead className="text-muted-foreground">Destination</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
                <TableHead className="text-muted-foreground">Notes</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ungroupedParcels.map((parcel) => {
                const destination = collectionPoints.find((point) => point.id === parcel.destinationPointId);
                const noteSummary = getNoteSummary('PARCEL', parcel.id);

                return (
                  <TableRow key={parcel.id} className="border-border">
                    <TableCell>
                      <Checkbox
                        checked={selectedParcelIds.includes(parcel.id)}
                        onCheckedChange={() => toggleParcelSelection(parcel.id)}
                        aria-label={`Selectionner ${parcel.trackingNumber} pour creer un lot`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-mono font-medium text-foreground">{parcel.trackingNumber}</span>
                        <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {getSenderDisplayName(parcel.senderName, 'TRANSPORTER')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {getRecipientDisplayName(parcel.recipientName, 'TRANSPORTER')}
                    </TableCell>
                    <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{destination?.name}</span>
                      </div>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {noteSummary.total > 0 ? `${noteSummary.total} note(s)` : 'Aucune'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            openNoteDialog({
                              targetType: 'PARCEL',
                              targetId: parcel.id,
                              parcelIds: [parcel.id],
                              label: `colis ${parcel.trackingNumber}`,
                            })
                          }
                        >
                          <MessageSquarePlus className="h-4 w-4" />
                          Note
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openDeliverDialog(parcel)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Livrer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {ungroupedParcels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Layers3 className="h-8 w-8 text-muted-foreground" />
                      <p className="font-medium text-foreground">Tous les colis en transit sont rattaches a un lot</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(noteTarget)} onOpenChange={(open) => !open && setNoteTarget(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ajouter une note de tournee</DialogTitle>
            <DialogDescription>
              Utilisez une note interne pour l'equipe ou une note client pour partager l'etat du transport.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary p-3 text-sm text-foreground">
              Cible: {noteTarget?.label}
            </div>
            <Textarea
              value={noteMessage}
              onChange={(event) => setNoteMessage(event.target.value)}
              placeholder="Exemple: circulation fluide, arrivee estimee a 15h30"
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                variant={noteVisibility === 'INTERNAL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNoteVisibility('INTERNAL')}
              >
                Interne
              </Button>
              <Button
                variant={noteVisibility === 'CLIENT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNoteVisibility('CLIENT')}
              >
                Visible client
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveNote} disabled={!noteMessage.trim()}>
              Ajouter la note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeliverDialogOpen} onOpenChange={setIsDeliverDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Livrer au point de collecte</DialogTitle>
            <DialogDescription>
              Confirmez la livraison du colis {selectedParcel?.trackingNumber} au point de destination.
            </DialogDescription>
          </DialogHeader>
          {selectedParcel && (
            <div className="rounded-lg bg-secondary p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    {collectionPoints.find((point) => point.id === selectedParcel.destinationPointId)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const point = collectionPoints.find(
                        (collectionPoint) => collectionPoint.id === selectedParcel.destinationPointId
                      );

                      return point
                        ? getCollectionPointFullAddress(point, zones, cities, countries)
                        : '';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeliverDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleDeliverToPoint} className="gap-2 bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="h-4 w-4" />
              Confirmer la livraison
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeliverGroupDialogOpen} onOpenChange={setIsDeliverGroupDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Livrer tout le lot</DialogTitle>
            <DialogDescription>
              Confirmez l'arrivee de tous les colis du lot {selectedGroup?.reference} a destination.
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Colis concernes</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{selectedGroup.parcels.length}</p>
                </div>
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Poids total</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {selectedGroup.parcels.reduce((sum, parcel) => sum + parcel.weight, 0).toFixed(1)} kg
                  </p>
                </div>
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {getGroupDeliveryLocation(selectedGroup)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Colis du lot</p>
                <div className="space-y-2">
                  {selectedGroup.parcels.map((parcel) => {
                    const destination = collectionPoints.find((point) => point.id === parcel.destinationPointId);

                    return (
                      <div
                        key={parcel.id}
                        className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-mono text-sm font-medium text-foreground">
                            {parcel.trackingNumber}
                          </span>
                          <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{destination?.name ?? 'Point de destination'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeliverGroupDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleDeliverGroupToPoint}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmer la livraison du lot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
