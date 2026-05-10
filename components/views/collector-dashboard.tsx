'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Coins,
  ExternalLink,
  Eye,
  EyeOff,
  LocateFixed,
  MapPin,
  Package,
  Power,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  formatCollectionPointLoadRatio,
  getCollectionPointParcelCount,
  getCollectionPointSaturationRate,
} from '@/lib/collection-point-capacity';
import {
  formatOpeningHours,
  getCollectionPointStatusClassName,
  getCollectionPointStatusLabel,
} from '@/lib/collection-point-availability';
import {
  formatCollectionPointGeoLocation,
  getCollectionPointGeoLocationSourceLabel,
  getCollectionPointLocationLabel,
  getGoogleMapsUrl,
  hasCollectionPointGeoLocation,
} from '@/lib/collection-point-location';
import { formatMoney, getUserCommissionSummary } from '@/lib/commissions';
import { getKycVerificationStatusLabel, getStatusColor, getStatusLabel, type User } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface CollectorDashboardProps {
  currentUser: User;
}

export function CollectorDashboard({ currentUser }: CollectorDashboardProps) {
  const {
    users,
    parcels,
    collectionPoints,
    countries,
    cities,
    zones,
    transferRequests,
    commissions,
    setCollectionPointOpenStatus,
    setCollectionPointGeoLocation,
  } = useStore();
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const collector = users.find((user) => user.id === currentUser.id) ?? currentUser;
  const assignedPoint = collector.assignedPointId
    ? collectionPoints.find((point) => point.id === collector.assignedPointId) ?? null
    : null;

  const pendingReception = useMemo(
    () =>
      assignedPoint
        ? parcels.filter(
            (parcel) =>
              parcel.status === 'CREATED' && parcel.originPointId === assignedPoint.id
          )
        : [],
    [assignedPoint, parcels]
  );

  const localStockParcels = useMemo(
    () =>
      assignedPoint
        ? parcels.filter(
            (parcel) =>
              parcel.status === 'RECEIVED_AT_COLLECTION_POINT' &&
              (parcel.originPointId === assignedPoint.id ||
                parcel.destinationPointId === assignedPoint.id)
          )
        : [],
    [assignedPoint, parcels]
  );

  const pendingTransferRequests = useMemo(
    () =>
      assignedPoint
        ? transferRequests.filter(
            (request) =>
              request.collectionPointId === assignedPoint.id && request.status === 'PENDING'
          )
        : [],
    [assignedPoint, transferRequests]
  );

  const arrivalsAwaitingRelease = useMemo(
    () =>
      assignedPoint
        ? parcels.filter(
            (parcel) =>
              parcel.status === 'ARRIVED_AT_DESTINATION' &&
              parcel.destinationPointId === assignedPoint.id
          )
        : [],
    [assignedPoint, parcels]
  );

  const saturationRate = assignedPoint
    ? getCollectionPointSaturationRate(assignedPoint, parcels)
    : 0;
  const storedParcelsCount = assignedPoint
    ? getCollectionPointParcelCount(assignedPoint.id, parcels)
    : 0;
  const assignedPointMapsUrl = assignedPoint ? getGoogleMapsUrl(assignedPoint) : undefined;
  const commissionSummary = getUserCommissionSummary(commissions, collector.id);

  const recentOperations = useMemo(() => {
    if (!assignedPoint) {
      return [];
    }

    return parcels
      .flatMap((parcel) =>
        parcel.history
          .filter((entry) => entry.actorId === collector.id)
          .map((entry) => ({
            parcelId: parcel.id,
            trackingNumber: parcel.trackingNumber,
            status: entry.status,
            timestamp: entry.timestamp,
            location: entry.location,
          }))
      )
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, 5);
  }, [assignedPoint, collector.id, parcels]);

  const handleCapturePointLocation = () => {
    if (!assignedPoint || isCapturingLocation) {
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationMessage("La geolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }

    setIsCapturingLocation(true);
    setLocationMessage('Recherche de votre position GPS en cours...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCollectionPointGeoLocation(assignedPoint.id, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Math.round(position.coords.accuracy),
          source: 'GPS_CAPTURE',
          capturedByUserId: collector.id,
          capturedByName: collector.name,
          capturedAt: new Date(),
        });
        setIsCapturingLocation(false);
        setLocationMessage('Position du point enregistree pour la carte mobile.');
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Autorisez la localisation dans le navigateur pour enregistrer ce point.'
            : error.code === error.TIMEOUT
              ? 'La localisation a pris trop de temps. Restez dans le point et reessayez.'
              : "Impossible de recuperer une position fiable pour l'instant.";

        setIsCapturingLocation(false);
        setLocationMessage(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  };

  if (!assignedPoint) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-semibold text-foreground">Aucun point assigne</p>
            <p className="text-sm text-muted-foreground">
              Ce collecteur n&apos;a pas encore de point de collecte rattache.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tableau de bord collecteur</h2>
          <p className="text-muted-foreground">
            {assignedPoint.name} ·{' '}
            {getCollectionPointLocationLabel(assignedPoint, zones, cities, countries)}
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 lg:min-w-80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Disponibilite du point</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatOpeningHours(assignedPoint)}</p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
                getCollectionPointStatusClassName(assignedPoint)
              )}
            >
              {assignedPoint.isOpen ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {getCollectionPointStatusLabel(assignedPoint)}
            </span>
          </div>
          {!assignedPoint.isOpen && assignedPoint.closedReason && (
            <p className="text-xs text-muted-foreground">Motif: {assignedPoint.closedReason}</p>
          )}
          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Capacite</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCollectionPointLoadRatio(assignedPoint, parcels)}
              </p>
              <p className="text-xs text-muted-foreground">{storedParcelsCount} colis presents</p>
            </div>
            <Button
              variant={assignedPoint.isOpen ? 'outline' : 'default'}
              size="sm"
              className="gap-2"
              onClick={() =>
                setCollectionPointOpenStatus(
                  assignedPoint.id,
                  !assignedPoint.isOpen,
                  assignedPoint.isOpen ? 'Ferme par le collecteur' : undefined
                )
              }
            >
              <Power className="h-4 w-4" />
              {assignedPoint.isOpen ? 'Fermer le point' : 'Rouvrir'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingReception.length}</p>
              <p className="text-xs text-muted-foreground">Receptions a valider</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Warehouse className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{localStockParcels.length}</p>
              <p className="text-xs text-muted-foreground">Colis en stock local</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/20">
              <ArrowRightLeft className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingTransferRequests.length}</p>
              <p className="text-xs text-muted-foreground">Demandes de prise en attente</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{arrivalsAwaitingRelease.length}</p>
              <p className="text-xs text-muted-foreground">Colis arrives au point</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {assignedPoint.commissionRate !== undefined && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Coins className="h-5 w-5 text-primary" />
              Mes commissions
            </CardTitle>
            <CardDescription>
              Montants generes par les colis livres depuis votre point de collecte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Taux configure</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{assignedPoint.commissionRate}%</p>
              </div>
              <div className="rounded-xl border border-border bg-warning/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">A payer</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {formatMoney(commissionSummary.payableAmount)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-success/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Deja paye</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {formatMoney(commissionSummary.paidAmount)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Colis commissionnes</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{commissionSummary.parcelCount}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Derniere commission:{' '}
              {commissionSummary.latestCommission
                ? `${formatMoney(commissionSummary.latestCommission.commissionAmount)} le ${commissionSummary.latestCommission.earnedAt.toLocaleDateString('fr-FR')}`
                : 'aucune commission generee pour le moment.'}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-foreground">Position carte du point</CardTitle>
            <CardDescription>
              Coordonnees utilisees par l'application mobile pour afficher ce point et calculer les agences proches.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignedPointMapsUrl && (
              <Button variant="outline" className="gap-2" asChild>
                <a href={assignedPointMapsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir la carte
                </a>
              </Button>
            )}
            <Button className="gap-2" onClick={() => setIsLocationDialogOpen(true)}>
              <LocateFixed className="h-4 w-4" />
              Capturer ma position
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Coordonnees</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatCollectionPointGeoLocation(assignedPoint)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {getCollectionPointGeoLocationSourceLabel(assignedPoint)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Precision</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {assignedPoint.geoLocation?.accuracyMeters
                  ? `${assignedPoint.geoLocation.accuracyMeters} m`
                  : hasCollectionPointGeoLocation(assignedPoint)
                    ? 'Non communiquee'
                    : 'En attente'}
              </p>
            </div>
          </div>
          {assignedPoint.geoLocation?.capturedAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              Derniere mise a jour par {assignedPoint.geoLocation.capturedByName ?? 'un utilisateur'} le{' '}
              {assignedPoint.geoLocation.capturedAt.toLocaleString('fr-FR')}.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Priorites immediates</CardTitle>
            <CardDescription>Elements a traiter en premier sur votre point</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Controle KYC et reception</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingReception.length} colis client a confirmer
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{pendingReception.length}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="h-5 w-5 text-chart-1" />
                  <div>
                    <p className="font-medium text-foreground">Demandes transporteurs</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingTransferRequests.length} transfert(s) en attente de decision
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">
                  {pendingTransferRequests.length}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-foreground">Saturation du point</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCollectionPointLoadRatio(assignedPoint, parcels)}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{saturationRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Dernieres operations</CardTitle>
            <CardDescription>Vos traitements les plus recents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOperations.length > 0 ? (
              recentOperations.map((operation) => (
                <div
                  key={`${operation.parcelId}-${operation.timestamp.toISOString()}`}
                  className="rounded-xl border border-border bg-secondary/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {operation.trackingNumber}
                    </p>
                    <span
                      className={cn(
                        'rounded-lg px-2 py-1 text-xs font-medium',
                        getStatusColor(operation.status)
                      )}
                    >
                      {getStatusLabel(operation.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{operation.location}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{operation.timestamp.toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Aucune operation recente sur ce point.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Receptions en attente</CardTitle>
          <CardDescription>Colis clients a verifier en priorite</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Reference</TableHead>
                <TableHead className="text-muted-foreground">Expediteur</TableHead>
                <TableHead className="text-muted-foreground">KYC</TableHead>
                <TableHead className="text-muted-foreground">Destination</TableHead>
                <TableHead className="text-muted-foreground">Poids</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingReception.slice(0, 6).map((parcel) => (
                <TableRow key={parcel.id} className="border-border">
                  <TableCell className="font-mono text-foreground">{parcel.trackingNumber}</TableCell>
                  <TableCell className="text-foreground">{parcel.senderName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {getKycVerificationStatusLabel(parcel.senderKyc.verificationStatus)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {collectionPoints.find((point) => point.id === parcel.destinationPointId)?.name}
                  </TableCell>
                  <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                </TableRow>
              ))}
              {pendingReception.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    Aucun colis client en attente de validation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Enregistrer la position du point</DialogTitle>
            <DialogDescription>
              Placez-vous physiquement a l'interieur du point de collecte avant d'activer la localisation.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">Controle terrain obligatoire</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cette capture sera utilisee sur la carte mobile. Elle doit donc etre faite depuis
                  l'interieur de l'agence, pas depuis la rue, un parking ou un autre point.
                </p>
              </div>
            </div>
          </div>
          {locationMessage && <p className="text-sm text-muted-foreground">{locationMessage}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLocationDialogOpen(false)}>
              Fermer
            </Button>
            <Button
              className="gap-2"
              onClick={handleCapturePointLocation}
              disabled={isCapturingLocation}
            >
              <LocateFixed className="h-4 w-4" />
              {isCapturingLocation ? 'Capture en cours...' : 'Activer la localisation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
