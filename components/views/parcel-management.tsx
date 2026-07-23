'use client';

import Image from 'next/image';
import { type ElementType, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock3,
  CreditCard,
  Eye,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Plus,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { useLatestRequest } from '@/hooks/use-latest-request';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ShipmentCreateView } from '@/components/views/shipment-create';
import { ShipmentPaymentDialog } from '@/components/payments/shipment-payment-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import {
  getRecipientColumnLabel,
  getRecipientDisplayName,
  getSenderColumnLabel,
  getSenderDisplayName,
} from '@/lib/parcel-privacy';
import {
  formatShipmentDate,
  getShipmentDestinationLabel,
  getShipmentOriginLabel,
  getShipmentReceiverName,
  getShipmentSenderName,
  getShipmentStatusClassName,
  getShipmentStatusLabel,
  getShipmentTransactionStatusClassName,
  SHIPMENT_COLLECTION_MODE_LABELS,
  SHIPMENT_PAYMENT_STATUS_LABELS,
  SHIPMENT_PRIORITY_LABELS,
  SHIPMENT_TRANSACTION_STATUS_LABELS,
} from '@/lib/shipments/presentation';
import { useCurrency } from '@/lib/currency';
import { getShipment, getShipments } from '@/lib/shipments/api';
import type {
  Shipment,
  ShipmentParty,
  ShipmentStatus,
  ShipmentStatusHistory,
} from '@/lib/shipments/types';
import type { User, UserRole } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const COLLECTOR_REFERENCE_VISIBLE_STATUSES = new Set<ShipmentStatus>([
  'RECEIVED_AT_COLLECTION_POINT',
  'READY_FOR_TRANSPORT',
  'IN_TRANSIT',
  'ARRIVED_DESTINATION_POINT',
  'READY_FOR_PICKUP',
  'DELIVERED',
  'RETURNED',
]);

const STATUS_FILTERS: Array<{ value: ShipmentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tous' },
  { value: 'CREATED', label: 'Cree' },
  { value: 'PAID', label: 'Paye' },
  { value: 'AWAITING_DROP_OFF', label: 'En attente de depot' },
  { value: 'RECEIVED_AT_COLLECTION_POINT', label: 'Recu au point' },
  { value: 'READY_FOR_TRANSPORT', label: 'Pret au transport' },
  { value: 'IN_TRANSIT', label: 'En transit' },
  { value: 'ARRIVED_DESTINATION_POINT', label: 'Arrive au point' },
  { value: 'READY_FOR_PICKUP', label: 'Pret au retrait' },
  { value: 'DELIVERED', label: 'Livre' },
  { value: 'CANCELLED', label: 'Annule' },
  { value: 'RETURNED', label: 'Retourne' },
];

interface ParcelManagementProps {
  currentRole: UserRole;
  currentUser: User;
}

export function ParcelManagement({ currentRole }: ParcelManagementProps) {
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('dashboard');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'ALL'>(
    currentRole === 'TRANSPORTER' ? 'IN_TRANSIT' : 'ALL',
  );
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { beginRequest: beginListRequest, isLatestRequest: isLatestListRequest } =
    useLatestRequest();
  const { beginRequest: beginDetailRequest, isLatestRequest: isLatestDetailRequest } =
    useLatestRequest();

  useEffect(() => {
    setStatusFilter(currentRole === 'TRANSPORTER' ? 'IN_TRANSIT' : 'ALL');
    setSearchTerm('');
    setPage(0);
    setIsCreateViewOpen(false);
    setSelectedShipmentId(null);
    setSelectedShipment(null);
    setDetailError(null);
    setPaymentDialogOpen(false);
  }, [currentRole]);

  const loadShipments = useCallback(async () => {
    if (!token) {
      setError('Session expiree');
      setLoading(false);
      return;
    }

    const requestId = beginListRequest();

    setLoading(true);
    setError(null);

    try {
      const response = await getShipments(token, {
        page,
        size: PAGE_SIZE,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });

      if (isLatestListRequest(requestId)) {
        setShipments(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      }
    } catch (err) {
      if (isLatestListRequest(requestId)) {
        setError(err instanceof ApiError ? err.message : 'Impossible de charger les shipments.');
      }
    } finally {
      if (isLatestListRequest(requestId)) setLoading(false);
    }
  }, [beginListRequest, isLatestListRequest, page, statusFilter, token]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const loadShipmentDetail = useCallback(
    async (shipmentId: number) => {
      if (!token) {
        setDetailError('Session expiree');
        return;
      }

      const requestId = beginDetailRequest();

      setSelectedShipmentId(shipmentId);
      setSelectedShipment(null);
      setDetailLoading(true);
      setDetailError(null);

      try {
        const shipment = await getShipment(token, shipmentId);
        if (isLatestDetailRequest(requestId)) setSelectedShipment(shipment);
      } catch (err) {
        if (isLatestDetailRequest(requestId)) {
          setDetailError(
            err instanceof ApiError ? err.message : 'Impossible de charger le detail du shipment.',
          );
        }
      } finally {
        if (isLatestDetailRequest(requestId)) setDetailLoading(false);
      }
    },
    [beginDetailRequest, isLatestDetailRequest, token],
  );

  const closeShipmentDetail = useCallback(() => {
    setSelectedShipmentId(null);
    setSelectedShipment(null);
    setDetailError(null);
    setDetailLoading(false);
    setPaymentDialogOpen(false);
  }, []);

  const handleShipmentCreated = useCallback(
    (shipment: Shipment, options: { payPlatformFeeNow: boolean }) => {
      setIsCreateViewOpen(false);
      setSelectedShipmentId(shipment.id);
      setSelectedShipment(shipment);
      setPaymentDialogOpen(options.payPlatformFeeNow);
      setDetailError(null);
      setDetailLoading(false);
      const filtersWillChange = statusFilter !== 'ALL' || page !== 0;
      setStatusFilter('ALL');
      setPage(0);
      if (!filtersWillChange) void loadShipments();
    },
    [loadShipments, page, statusFilter],
  );

  const filteredShipments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return shipments;
    }

    return shipments.filter((shipment) => {
      const canSearchReference = canShowShipmentReference(shipment, currentRole);
      const referenceMatches =
        canSearchReference &&
        (shipment.reference.toLowerCase().includes(query) ||
          (shipment.code ?? '').toLowerCase().includes(query));

      if (currentRole === 'TRANSPORTER') {
        return referenceMatches;
      }

      return (
        referenceMatches ||
        getShipmentSenderName(shipment).toLowerCase().includes(query) ||
        getShipmentReceiverName(shipment).toLowerCase().includes(query)
      );
    });
  }, [currentRole, searchTerm, shipments]);

  const statusCards = useMemo(
    () => [
      {
        key: 'IN_TRANSIT',
        label: 'En transit',
        value: shipments.filter((item) => item.status === 'IN_TRANSIT').length,
        icon: Truck,
      },
      {
        key: 'DELIVERED',
        label: 'Livres',
        value: shipments.filter((item) => item.status === 'DELIVERED').length,
        icon: ShieldCheck,
      },
      {
        key: 'READY_FOR_PICKUP',
        label: 'Pret retrait',
        value: shipments.filter((item) => item.status === 'READY_FOR_PICKUP').length,
        icon: Package,
      },
      {
        key: 'RECEIVED_AT_COLLECTION_POINT',
        label: 'Recus au point',
        value: shipments.filter((item) => item.status === 'RECEIVED_AT_COLLECTION_POINT').length,
        icon: MapPin,
      },
    ],
    [shipments],
  );

  const roleDescription =
    currentRole === 'TRANSPORTER'
      ? 'Shipments qui vous concernent, scopes automatiquement par le backend.'
      : currentRole === 'COLLECTOR'
        ? 'Shipments visibles depuis votre perimetre de collecte et de depot.'
        : "Liste des shipments de l'entreprise courante, scopes automatiquement par le backend.";

  if (isCreateViewOpen) {
    return (
      <ShipmentCreateView
        onBack={() => setIsCreateViewOpen(false)}
        onCreated={handleShipmentCreated}
      />
    );
  }

  if (selectedShipmentId !== null) {
    return (
      <ShipmentDetailView
        currentRole={currentRole}
        shipmentId={selectedShipmentId}
        shipment={selectedShipment}
        loading={detailLoading}
        error={detailError}
        onBack={closeShipmentDetail}
        onRetry={() => loadShipmentDetail(selectedShipmentId)}
        paymentDialogOpen={paymentDialogOpen}
        onPaymentDialogOpenChange={setPaymentDialogOpen}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion des shipments</h2>
          <p className="text-muted-foreground">{roleDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          {currentRole === 'COLLECTOR' && (
            <Button className="gap-2" onClick={() => setIsCreateViewOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouveau shipment
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={loadShipments} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              currentRole === 'TRANSPORTER'
                ? 'Rechercher par reference ou code...'
                : currentRole === 'COLLECTOR'
                  ? t('parcelManagement.search.collectorPlaceholder')
                  : 'Rechercher par reference, expediteur ou destinataire...'
            }
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="bg-secondary pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(filter.value);
                  setPage(0);
                }}
              >
                {filter.label}
              </Button>
            ))}
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-2 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">
            {totalElements} shipment{totalElements > 1 ? 's' : ''}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Page {page + 1} / {Math.max(totalPages, 1)}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadShipments}>
                Reessayer
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border md:hidden">
                {filteredShipments.map((shipment) => (
                  <ShipmentMobileCard
                    key={shipment.id}
                    shipment={shipment}
                    currentRole={currentRole}
                    onOpen={() => loadShipmentDetail(shipment.id)}
                  />
                ))}

                {filteredShipments.length === 0 && (
                  <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Aucun shipment trouve sur cette page.
                  </div>
                )}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead
                        className={cn(
                          'text-muted-foreground',
                          currentRole === 'COLLECTOR' &&
                            'sticky left-0 z-20 min-w-48 border-r border-border bg-card shadow-[4px_0_10px_-8px_currentColor]',
                        )}
                      >
                        Reference
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        {getSenderColumnLabel(currentRole)}
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        {getRecipientColumnLabel(currentRole)}
                      </TableHead>
                      <TableHead className="text-muted-foreground">Origine</TableHead>
                      <TableHead className="text-muted-foreground">Destination</TableHead>
                      <TableHead className="text-muted-foreground">Statut</TableHead>
                      <TableHead className="text-muted-foreground">Maj</TableHead>
                      <TableHead
                        className={cn(
                          'text-right text-muted-foreground',
                          currentRole === 'COLLECTOR' &&
                            'sticky right-0 z-20 w-16 border-l border-border bg-card shadow-[-4px_0_10px_-8px_currentColor]',
                        )}
                      >
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment) => (
                      <TableRow key={shipment.id} className="group border-border">
                        <TableCell
                          className={cn(
                            currentRole === 'COLLECTOR' &&
                              'sticky left-0 z-10 min-w-48 border-r border-border bg-card shadow-[4px_0_10px_-8px_currentColor] group-hover:bg-muted/50',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <ShipmentReferenceBlock shipment={shipment} currentRole={currentRole} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {getSenderDisplayName(getShipmentSenderName(shipment), currentRole)}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {getRecipientDisplayName(getShipmentReceiverName(shipment), currentRole)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getShipmentOriginLabel(shipment)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getShipmentDestinationLabel(shipment)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
                            {getShipmentStatusLabel(shipment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatShipmentDate(shipment.updatedAt)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right',
                            currentRole === 'COLLECTOR' &&
                              'sticky right-0 z-10 w-16 border-l border-border bg-card shadow-[-4px_0_10px_-8px_currentColor] group-hover:bg-muted/50',
                          )}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => loadShipmentDetail(shipment.id)}
                            aria-label={getOpenShipmentDetailLabel(shipment, currentRole, t)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filteredShipments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          Aucun shipment trouve sur cette page.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Les filtres de recherche s&apos;appliquent a la page actuellement chargee.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
            disabled={loading || page === 0}
          >
            Precedent
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={loading || page + 1 >= totalPages}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShipmentMobileCard({
  shipment,
  currentRole,
  onOpen,
}: {
  shipment: Shipment;
  currentRole: UserRole;
  onOpen: () => void;
}) {
  const canShowReference = canShowShipmentReference(shipment, currentRole);

  return (
    <div className="space-y-4 px-4 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <ShipmentReferenceBlock
                shipment={shipment}
                currentRole={currentRole}
                compact
                showCopyButton={false}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
              {getShipmentStatusLabel(shipment.status)}
            </Badge>
            <Badge variant="outline">{SHIPMENT_PRIORITY_LABELS[shipment.priority]}</Badge>
          </div>
        </div>

        {canShowReference && (
          <CopyTrackingNumberButton trackingNumber={shipment.reference} className="shrink-0" />
        )}
      </div>

      <div className="grid gap-3 rounded-2xl bg-secondary/40 p-4 sm:grid-cols-2">
        <CompactInfo label={getSenderColumnLabel(currentRole)} value={getSenderDisplayName(getShipmentSenderName(shipment), currentRole)} />
        <CompactInfo label={getRecipientColumnLabel(currentRole)} value={getRecipientDisplayName(getShipmentReceiverName(shipment), currentRole)} />
        <CompactInfo label="Origine" value={getShipmentOriginLabel(shipment)} />
        <CompactInfo label="Destination" value={getShipmentDestinationLabel(shipment)} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Mise a jour {formatShipmentDate(shipment.updatedAt)}</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onOpen}>
          <Eye className="h-4 w-4" />
          Voir details
        </Button>
      </div>
    </div>
  );
}

function ShipmentReferenceBlock({
  shipment,
  currentRole,
  compact = false,
  showCopyButton = true,
}: {
  shipment: Shipment;
  currentRole: UserRole;
  compact?: boolean;
  showCopyButton?: boolean;
}) {
  const { t } = useTranslation('dashboard');
  const canShowReference = canShowShipmentReference(shipment, currentRole);

  if (!canShowReference) {
    return (
      <div className="min-w-0">
        <p
          className={cn(
            'truncate font-mono font-medium text-foreground',
            compact ? 'text-sm font-semibold' : undefined,
          )}
        >
          {getShipmentReferenceDisplay(shipment, currentRole, t)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {t('parcelManagement.reference.hiddenHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'truncate font-mono font-medium text-foreground',
            compact ? 'text-sm font-semibold' : undefined,
          )}
        >
          {shipment.reference}
        </span>
        {showCopyButton && <CopyTrackingNumberButton trackingNumber={shipment.reference} />}
      </div>
      {shipment.code && <p className="truncate text-xs text-muted-foreground">{shipment.code}</p>}
    </div>
  );
}

function ShipmentDetailView({
  currentRole,
  shipmentId,
  shipment,
  loading,
  error,
  onBack,
  onRetry,
  paymentDialogOpen,
  onPaymentDialogOpenChange,
}: {
  currentRole: UserRole;
  shipmentId: number;
  shipment: Shipment | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
  paymentDialogOpen: boolean;
  onPaymentDialogOpenChange: (open: boolean) => void;
}) {
  const statusHistory = shipment?.statusHistory ?? [];
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const canShowReference = shipment
    ? canShowShipmentReference(shipment, currentRole)
    : false;
  const shipmentDisplayName = shipment
    ? getShipmentReferenceDisplay(shipment, currentRole, t)
    : `Shipment #${shipmentId}`;
  const platformFeeIsSettled = shipment
    ? shipment.paymentStatus === 'PAID' ||
      shipment.transactionStatus === 'PLATFORM_FEE_PAID' ||
      shipment.transactionStatus === 'COMPLETED'
    : false;
  const shipmentPaymentIsClosed = shipment
    ? shipment.transactionStatus === 'CANCELLED' ||
      shipment.status === 'CANCELLED' ||
      shipment.status === 'DELIVERED' ||
      shipment.status === 'RETURNED'
    : true;
  const platformFeeIsDue = Boolean(
    shipment && !platformFeeIsSettled && !shipmentPaymentIsClosed,
  );
  const canCollectorPay =
    currentRole === 'COLLECTOR' && platformFeeIsDue;
  const shouldMountPaymentDialog = canCollectorPay && paymentDialogOpen;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="w-fit gap-2 px-0 text-muted-foreground hover:text-foreground" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Retour a la liste
          </Button>
          <div>
            <p className="text-sm font-medium text-primary">Detail shipment</p>
            <h2 className="text-2xl font-bold text-foreground">
              {shipmentDisplayName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vue detaillee, optimisee pour mobile et alimentee par l&apos;API backend.
            </p>
          </div>
        </div>

        <Button variant="outline" className="gap-2 self-start" onClick={onRetry} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-center py-24">
            <RefreshCw className="h-9 w-9 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-border bg-card">
          <CardContent className="space-y-4 px-6 py-16 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onBack}>
                Retour
              </Button>
              <Button onClick={onRetry}>Reessayer</Button>
            </div>
          </CardContent>
        </Card>
      ) : shipment ? (
        <div className="space-y-6">
          {currentRole === 'COLLECTOR' && platformFeeIsDue && (
            <Card className="overflow-hidden border-primary/35 bg-primary/5">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {t('shipmentPayment.ownerDueTitle')}
                    </p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {t('shipmentPayment.ownerDueDescription')}
                    </p>
                  </div>
                </div>
                <Button className="shrink-0 gap-2" onClick={() => onPaymentDialogOpenChange(true)}>
                  <CreditCard className="h-4 w-4" />
                  {t('shipmentPayment.payPlatformFee')}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden border-border bg-card">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Package className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-all font-mono text-lg font-semibold text-foreground sm:text-xl">
                          {shipmentDisplayName}
                        </p>
                        {canShowReference && (
                          <CopyTrackingNumberButton trackingNumber={shipment.reference} className="shrink-0" />
                        )}
                      </div>
                      {canShowReference && shipment.code && (
                        <p className="mt-1 break-all text-sm text-muted-foreground">{shipment.code}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
                      {getShipmentStatusLabel(shipment.status)}
                    </Badge>
                    <Badge variant="outline">{SHIPMENT_PRIORITY_LABELS[shipment.priority]}</Badge>
                    {shipment.paymentStatus && (
                      <Badge variant="outline">
                        {SHIPMENT_PAYMENT_STATUS_LABELS[shipment.paymentStatus]}
                      </Badge>
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
                  </div>

                  {shipment.description && (
                    <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">
                      {shipment.description}
                    </p>
                  )}
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-sm lg:grid-cols-1">
                  <HighlightPanel
                    label="Entreprise"
                    value={shipment.companyName}
                    icon={Building2}
                  />
                  <HighlightPanel
                    label="Derniere mise a jour"
                    value={formatShipmentDate(shipment.updatedAt)}
                    icon={Clock3}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailMetric
                  label="Origine"
                  value={getShipmentOriginLabel(shipment)}
                  description={joinParts([
                    shipment.originCityName,
                    shipment.originCountryName,
                    shipment.originCollectionPoint?.address,
                  ])}
                  icon={MapPin}
                />
                <DetailMetric
                  label="Destination"
                  value={getShipmentDestinationLabel(shipment)}
                  description={joinParts([
                    shipment.destinationCityName,
                    shipment.destinationCountryName,
                    shipment.destinationCollectionPoint?.address,
                  ])}
                  icon={Truck}
                />
                <DetailMetric
                  label="Creation"
                  value={formatShipmentDate(shipment.createdAt)}
                  description={shipment.createdBy || 'Non renseigne'}
                  icon={CalendarClock}
                />
                <DetailMetric
                  label="Tarif final"
                  value={formatMoney(shipment.price, { fallback: 'Non renseigne' })}
                  description={
                    shipment.paymentCollectionMode
                      ? SHIPMENT_COLLECTION_MODE_LABELS[shipment.paymentCollectionMode]
                      : 'Mode de collecte non renseigne'
                  }
                  icon={CreditCard}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <PersonCard
              title={getSenderColumnLabel(currentRole)}
              displayName={getSenderDisplayName(getShipmentSenderName(shipment), currentRole)}
              party={shipment.sender}
            />
            <PersonCard
              title={getRecipientColumnLabel(currentRole)}
              displayName={getRecipientDisplayName(getShipmentReceiverName(shipment), currentRole)}
              party={shipment.receiver}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Caracteristiques"
              icon={Package}
              items={[
                { label: 'Type de colis', value: shipment.parcelTypeName },
                { label: 'Mode de transport', value: shipment.transportModeName },
                {
                  label: 'Poids',
                  value: shipment.weightKg != null ? `${shipment.weightKg} kg` : undefined,
                },
                {
                  label: 'Volume',
                  value: shipment.volumeM3 != null ? `${shipment.volumeM3} m3` : undefined,
                },
                { label: 'Description', value: shipment.description },
              ]}
            />

            <SectionCard
              title="Tarification"
              icon={ShieldCheck}
              items={[
                { label: 'Prix entreprise', value: formatMoney(shipment.companyPrice, { fallback: 'Non renseigne' }) },
                { label: 'Frais', value: formatMoney(shipment.feeAmount, { fallback: 'Non renseigne' }) },
                {
                  label: t('parcelManagement.finance.expressSurcharge'),
                  value: formatMoney(shipment.expressSurchargeAmount, { fallback: 'Non renseigne' }),
                },
                {
                  label: t('parcelManagement.finance.insurance'),
                  value: formatMoney(shipment.insuranceAmount, { fallback: 'Non renseigne' }),
                },
                { label: 'Remise', value: formatMoney(shipment.discountAmount, { fallback: 'Non renseigne' }) },
                { label: 'Prix final', value: formatMoney(shipment.price, { fallback: 'Non renseigne' }) },
                {
                  label: 'Statut paiement',
                  value: shipment.paymentStatus
                    ? SHIPMENT_PAYMENT_STATUS_LABELS[shipment.paymentStatus]
                    : undefined,
                },
                {
                  label: t('parcelManagement.finance.transactionStatus'),
                  value: shipment.transactionStatus
                    ? SHIPMENT_TRANSACTION_STATUS_LABELS[shipment.transactionStatus]
                    : undefined,
                },
                {
                  label: 'Mode de collecte',
                  value: shipment.paymentCollectionMode
                    ? SHIPMENT_COLLECTION_MODE_LABELS[shipment.paymentCollectionMode]
                    : undefined,
                },
              ]}
            />
          </div>

          {canShowReference && (
            <ShipmentQrCodeCard qrCodeUrl={shipment.qrCodeUrl} reference={shipment.reference} />
          )}

          <SectionCard
            title="Photos du shipment"
            icon={FileText}
            emptyMessage="Aucune photo disponible."
            items={[]}
          >
            {shipment.photos && shipment.photos.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {shipment.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-border bg-secondary/30"
                  >
                    <div className="relative aspect-[4/3] w-full bg-muted">
                      <Image
                        src={photo.photoUrl}
                        alt={`Photo ${photo.id} du shipment ${shipmentDisplayName}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="space-y-2 p-4">
                      <p className="text-sm font-medium text-foreground">Photo #{photo.id}</p>
                      {photo.uploadedAt && (
                        <p className="text-xs text-muted-foreground">
                          Ajoutee le {formatShipmentDate(photo.uploadedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune photo disponible.</p>
            )}
          </SectionCard>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Historique des statuts</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Chronologie detaillee du shipment.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {shipment.statusHistory && shipment.statusHistory.length > 0 ? (
                <div className="space-y-4">
                  {statusHistory.map((entry, index) => (
                    <StatusTimelineEntry
                      key={entry.id}
                      entry={entry}
                      isLast={index === statusHistory.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun historique de statut disponible.</p>
              )}
            </CardContent>
          </Card>

          {shouldMountPaymentDialog && (
            <ShipmentPaymentDialog
              open={paymentDialogOpen}
              shipment={shipment}
              onOpenChange={onPaymentDialogOpenChange}
              onPaymentSucceeded={async () => {
                await onRetry();
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function canShowShipmentReference(shipment: Shipment, currentRole: UserRole) {
  return (
    currentRole !== 'COLLECTOR' ||
    COLLECTOR_REFERENCE_VISIBLE_STATUSES.has(shipment.status)
  );
}

function getShipmentReferenceDisplay(
  shipment: Shipment,
  currentRole: UserRole,
  t: ReturnType<typeof useTranslation>['t'],
) {
  if (canShowShipmentReference(shipment, currentRole)) {
    return shipment.reference;
  }

  return t('parcelManagement.reference.hiddenLabel', {
    values: { id: shipment.id },
  });
}

function getOpenShipmentDetailLabel(
  shipment: Shipment,
  currentRole: UserRole,
  t: ReturnType<typeof useTranslation>['t'],
) {
  if (canShowShipmentReference(shipment, currentRole)) {
    return t('parcelManagement.list.openDetailWithReference', {
      values: { reference: shipment.reference },
    });
  }

  return t('parcelManagement.list.openDetailWithId', {
    values: { id: shipment.id },
  });
}

function HighlightPanel({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-sm font-medium text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description?: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-sm font-semibold text-foreground">{value}</p>
          {description && (
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PersonCard({
  title,
  displayName,
  party,
}: {
  title: string;
  displayName: string;
  party?: ShipmentParty;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserIcon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">Informations de contact et d&apos;identification.</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Nom" value={displayName} icon={UserIcon} />
        <InfoTile label="Telephone" value={party?.whatsappNumber} icon={Phone} />
        <InfoTile label="Adresse" value={party?.address} icon={MapPin} />
        <InfoTile
          label="Ville / pays"
          value={joinParts([party?.cityName, party?.countryName])}
          icon={Building2}
        />
        <InfoTile label="Piece d'identite" value={party?.idCardNumber} icon={FileText} />
        <InfoTile
          label="Profil rattache"
          value={party?.usesRegisteredProfile ? 'Oui' : party?.usesRegisteredProfile === false ? 'Non' : undefined}
          icon={ShieldCheck}
        />
      </CardContent>
    </Card>
  );
}

function ShipmentQrCodeCard({
  qrCodeUrl,
  reference,
}: {
  qrCodeUrl?: string;
  reference: string;
}) {
  const imageUrl = resolveShipmentAssetUrl(qrCodeUrl);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg">QR code du shipment</CardTitle>
          <p className="text-sm text-muted-foreground">Code a scanner pour identifier ce shipment.</p>
        </div>
      </CardHeader>
      <CardContent>
        {imageUrl ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex w-full justify-center rounded-lg border border-border bg-white p-4 sm:w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`QR code du shipment ${reference}`}
                className="h-56 w-56 object-contain"
                loading="lazy"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <InfoTile label="Reference" value={reference} icon={Package} />
              <Button variant="outline" asChild className="w-full gap-2 sm:w-fit">
                <a href={imageUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir l&apos;image
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun QR code disponible pour ce shipment.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  icon: Icon,
  items,
  children,
  emptyMessage,
}: {
  title: string;
  icon: ElementType;
  items: Array<{ label: string; value?: string }>;
  children?: ReactNode;
  emptyMessage?: string;
}) {
  const visibleItems = items.filter((item) => item.value);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleItems.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleItems.map((item) => (
              <InfoTile key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        ) : !children ? (
          <p className="text-sm text-muted-foreground">{emptyMessage ?? 'Aucune information disponible.'}</p>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string;
  icon?: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/20 p-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm leading-6 text-foreground">
            {value || 'Non renseigne'}
          </p>
        </div>
      </div>
    </div>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusTimelineEntry({
  entry,
  isLast,
}: {
  entry: ShipmentStatusHistory;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="mt-1 h-3 w-3 rounded-full bg-primary" />
        {!isLast && <div className="mt-2 h-full w-px min-h-10 bg-border" />}
      </div>

      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-secondary/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-foreground">
              {entry.fromStatus
                ? `${getShipmentStatusLabel(entry.fromStatus)} -> ${getShipmentStatusLabel(entry.toStatus)}`
                : getShipmentStatusLabel(entry.toStatus)}
            </p>
            {entry.note && (
              <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                {entry.note}
              </p>
            )}
          </div>
          <Badge variant="outline" className="w-fit shrink-0">
            {formatShipmentDate(entry.changedAt)}
          </Badge>
        </div>

        {entry.changedByUsername && (
          <p className="mt-3 text-xs text-muted-foreground">Modifie par {entry.changedByUsername}</p>
        )}
      </div>
    </div>
  );
}

function joinParts(parts: Array<string | undefined>) {
  const value = parts.filter(Boolean).join(', ');
  return value || undefined;
}

function resolveShipmentAssetUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    const protocol = typeof window === 'undefined' ? 'https:' : window.location.protocol;
    return `${protocol}${trimmed}`;
  }

  if (!API_BASE_URL) {
    return trimmed;
  }

  try {
    return new URL(trimmed, API_BASE_URL).toString();
  } catch {
    return trimmed;
  }
}
