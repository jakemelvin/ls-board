'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  CreditCard,
  Eye,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
  User,
  XCircle,
} from 'lucide-react';

import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataPagination } from '@/components/ui/data-pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import {
  formatShipmentDate,
  getShipmentDestinationLabel,
  getShipmentOriginLabel,
  getShipmentStatusClassName,
} from '@/lib/shipments/presentation';
import { useCurrency } from '@/lib/currency';
import type { Shipment, ShipmentStatus } from '@/lib/shipments/types';
import {
  getSuperAdminShipment,
  getSuperAdminShipments,
  type SuperAdminShipmentCompanyOption,
  type SuperAdminShipmentStatusFilter,
} from '@/lib/super-admin-shipments/api';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: SuperAdminShipmentStatusFilter[] = [
  'ALL',
  'CREATED',
  'PAID',
  'AWAITING_DROP_OFF',
  'RECEIVED_AT_COLLECTION_POINT',
  'READY_FOR_TRANSPORT',
  'IN_TRANSIT',
  'ARRIVED_DESTINATION_POINT',
  'READY_FOR_PICKUP',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
];

const LIFECYCLE_STATUSES: ShipmentStatus[] = [
  'CREATED',
  'PAID',
  'AWAITING_DROP_OFF',
  'RECEIVED_AT_COLLECTION_POINT',
  'READY_FOR_TRANSPORT',
  'IN_TRANSIT',
  'ARRIVED_DESTINATION_POINT',
  'READY_FOR_PICKUP',
  'DELIVERED',
];

type Translate = ReturnType<typeof useTranslation>['t'];

export function SuperAdminShipmentsView() {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [companies, setCompanies] = useState<SuperAdminShipmentCompanyOption[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SuperAdminShipmentStatusFilter>('ALL');
  const [companyId, setCompanyId] = useState<number | 'ALL'>('ALL');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadShipments = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getSuperAdminShipments(token, {
        page,
        size: pageSize,
        query,
        status,
        companyId,
        createdFrom,
        createdTo,
      });

      setShipments(response.content);
      setCompanies(response.companies);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('superAdminShipments.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [companyId, createdFrom, createdTo, page, pageSize, query, status, t, token]);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  const loadShipmentDetail = useCallback(
    async (shipmentId: number) => {
      if (!token) return;

      setSelectedShipmentId(shipmentId);
      setSelectedShipment(null);
      setDetailLoading(true);
      setDetailError(null);

      try {
        const shipment = await getSuperAdminShipment(token, shipmentId);
        setSelectedShipment(shipment);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : t('superAdminShipments.errors.detail'));
      } finally {
        setDetailLoading(false);
      }
    },
    [t, token],
  );

  const metrics = useMemo(
    () => [
      {
        key: 'total',
        label: t('superAdminShipments.metrics.total'),
        value: totalElements,
        icon: Package,
      },
      {
        key: 'transit',
        label: t('superAdminShipments.metrics.inTransit'),
        value: shipments.filter((shipment) => shipment.status === 'IN_TRANSIT').length,
        icon: Truck,
      },
      {
        key: 'delivered',
        label: t('superAdminShipments.metrics.delivered'),
        value: shipments.filter((shipment) => shipment.status === 'DELIVERED').length,
        icon: CheckCircle2,
      },
      {
        key: 'exceptions',
        label: t('superAdminShipments.metrics.exceptions'),
        value: shipments.filter((shipment) => ['CANCELLED', 'RETURNED'].includes(shipment.status)).length,
        icon: XCircle,
      },
    ],
    [shipments, t, totalElements],
  );

  const resetFilters = () => {
    setQuery('');
    setStatus('ALL');
    setCompanyId('ALL');
    setCreatedFrom('');
    setCreatedTo('');
    setPage(0);
  };

  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <XCircle className="h-8 w-8" />
        </div>
        <p className="text-lg font-semibold text-foreground">{t('superAdmin.restricted.title')}</p>
        <p className="text-center text-sm text-muted-foreground">
          {t('superAdmin.restricted.description')}
        </p>
      </div>
    );
  }

  if (selectedShipmentId !== null) {
    return (
      <SuperAdminShipmentDetail
        shipmentId={selectedShipmentId}
        shipment={selectedShipment}
        loading={detailLoading}
        error={detailError}
        onBack={() => {
          setSelectedShipmentId(null);
          setSelectedShipment(null);
          setDetailError(null);
        }}
        onRetry={() => void loadShipmentDetail(selectedShipmentId)}
      />
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {t('superAdminShipments.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('superAdminShipments.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadShipments()}
          disabled={loading}
          className="w-full shrink-0 gap-2 sm:w-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('common.refresh')}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_repeat(4,minmax(140px,1fr))_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="shipment-search">{t('superAdminShipments.filters.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="shipment-search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder={t('superAdminShipments.filters.searchPlaceholder')}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('superAdminShipments.filters.status')}</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as SuperAdminShipmentStatusFilter);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === 'ALL'
                        ? t('superAdminShipments.filters.allStatuses')
                        : getStatusLabel(t, item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('superAdminShipments.filters.company')}</Label>
              <Select
                value={String(companyId)}
                onValueChange={(value) => {
                  setCompanyId(value === 'ALL' ? 'ALL' : Number(value));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t('superAdminShipments.filters.allCompanies')}
                  </SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="created-from">{t('superAdminShipments.filters.from')}</Label>
              <Input
                id="created-from"
                type="date"
                value={createdFrom}
                onChange={(event) => {
                  setCreatedFrom(event.target.value);
                  setPage(0);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="created-to">{t('superAdminShipments.filters.to')}</Label>
              <Input
                id="created-to"
                type="date"
                value={createdTo}
                onChange={(event) => {
                  setCreatedTo(event.target.value);
                  setPage(0);
                }}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={resetFilters}
            >
              <RotateCcw className="h-4 w-4" />
              {t('superAdminShipments.filters.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-2 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg">
            {t('superAdminShipments.list.count', { values: { count: totalElements } })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('superAdminShipments.list.page', {
              values: { page: page + 1, total: Math.max(totalPages, 1) },
            })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="space-y-4 px-6 py-16 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void loadShipments()}>
                {t('common.retry')}
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border md:hidden">
                {shipments.map((shipment) => (
                  <ShipmentMobileCard
                    key={shipment.id}
                    shipment={shipment}
                    onOpen={() => void loadShipmentDetail(shipment.id)}
                  />
                ))}

                {shipments.length === 0 && (
                  <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {t('superAdminShipments.list.empty')}
                  </div>
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>{t('superAdminShipments.list.columns.reference')}</TableHead>
                      <TableHead>{t('superAdminShipments.list.columns.company')}</TableHead>
                      <TableHead>{t('superAdminShipments.list.columns.route')}</TableHead>
                      <TableHead>{t('superAdminShipments.list.columns.parties')}</TableHead>
                      <TableHead>{t('superAdminShipments.list.columns.status')}</TableHead>
                      <TableHead>{t('superAdminShipments.list.columns.createdAt')}</TableHead>
                      <TableHead className="text-right">
                        {t('superAdminShipments.list.columns.actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow
                        key={shipment.id}
                        className="cursor-pointer border-border hover:bg-muted/30"
                        onClick={() => void loadShipmentDetail(shipment.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-foreground">
                                  {shipment.reference}
                                </span>
                                <CopyTrackingNumberButton trackingNumber={shipment.reference} />
                              </div>
                              <p className="text-xs text-muted-foreground">{shipment.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{shipment.companyName}</p>
                          <p className="text-xs text-muted-foreground">#{shipment.companyId}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">{getShipmentOriginLabel(shipment)}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('superAdminShipments.list.to')} {getShipmentDestinationLabel(shipment)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">{shipment.sender?.fullName}</p>
                          <p className="text-xs text-muted-foreground">{shipment.receiver?.fullName}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
                            {getStatusLabel(t, shipment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatShipmentDate(shipment.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => {
                              event.stopPropagation();
                              void loadShipmentDetail(shipment.id);
                            }}
                            aria-label={t('superAdminShipments.list.openDetail', {
                              values: { reference: shipment.reference },
                            })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {shipments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          {t('superAdminShipments.list.empty')}
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

      <DataPagination
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalElements={totalElements}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

function SuperAdminShipmentDetail({
  shipmentId,
  shipment,
  loading,
  error,
  onBack,
  onRetry,
}: {
  shipmentId: number;
  shipment: Shipment | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              {t('superAdminShipments.detail.eyebrow')}
            </p>
            <h1 className="break-all text-xl font-bold text-foreground sm:text-2xl">
              {shipment?.reference ?? t('superAdminShipments.detail.fallbackTitle', { values: { id: shipmentId } })}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('superAdminShipments.detail.subtitle')}
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={onRetry} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          {t('common.refresh')}
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
                {t('superAdminShipments.detail.back')}
              </Button>
              <Button onClick={onRetry}>{t('common.retry')}</Button>
            </div>
          </CardContent>
        </Card>
      ) : shipment ? (
        <>
          <Card className="border-border bg-card">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Package className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-all font-mono text-lg font-semibold text-foreground sm:text-xl">
                          {shipment.reference}
                        </p>
                        <CopyTrackingNumberButton trackingNumber={shipment.reference} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{shipment.code}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn('border-0', getShipmentStatusClassName(shipment.status))}>
                      {getStatusLabel(t, shipment.status)}
                    </Badge>
                    <Badge variant="outline">
                      {t(`superAdminShipments.priorities.${shipment.priority}`)}
                    </Badge>
                    {shipment.paymentStatus && (
                      <Badge variant="outline">
                        {t(`superAdminShipments.paymentStatuses.${shipment.paymentStatus}`)}
                      </Badge>
                    )}
                  </div>

                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    {shipment.description}
                  </p>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-md">
                  <HighlightPanel
                    label={t('superAdminShipments.detail.company')}
                    value={shipment.companyName}
                    icon={Building2}
                  />
                  <HighlightPanel
                    label={t('superAdminShipments.detail.updatedAt')}
                    value={formatShipmentDate(shipment.updatedAt)}
                    icon={Clock3}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailMetric
                  label={t('superAdminShipments.detail.origin')}
                  value={getShipmentOriginLabel(shipment)}
                  description={joinParts([shipment.originCityName, shipment.originCountryName])}
                  icon={MapPin}
                />
                <DetailMetric
                  label={t('superAdminShipments.detail.destination')}
                  value={getShipmentDestinationLabel(shipment)}
                  description={joinParts([shipment.destinationCityName, shipment.destinationCountryName])}
                  icon={Truck}
                />
                <DetailMetric
                  label={t('superAdminShipments.detail.createdAt')}
                  value={formatShipmentDate(shipment.createdAt)}
                  description={shipment.createdBy}
                  icon={CalendarClock}
                />
                <DetailMetric
                  label={t('superAdminShipments.detail.price')}
                  value={formatMoney(shipment.price, { fallback: t('superAdminShipments.detail.notProvided') })}
                  description={
                    shipment.paymentCollectionMode
                      ? t(`superAdminShipments.collectionModes.${shipment.paymentCollectionMode}`)
                      : undefined
                  }
                  icon={CreditCard}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <PartyCard
              title={t('superAdminShipments.detail.sender')}
              name={shipment.sender?.fullName}
              phone={shipment.sender?.whatsappNumber}
              location={joinParts([shipment.sender?.cityName, shipment.sender?.countryName])}
            />
            <PartyCard
              title={t('superAdminShipments.detail.receiver')}
              name={shipment.receiver?.fullName}
              phone={shipment.receiver?.whatsappNumber}
              location={joinParts([shipment.receiver?.cityName, shipment.receiver?.countryName])}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  {t('superAdminShipments.lifecycle.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('superAdminShipments.lifecycle.subtitle')}
                </p>
              </CardHeader>
              <CardContent>
                <LifecycleTimeline shipment={shipment} />
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  {t('superAdminShipments.detail.characteristics')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <InfoTile label={t('superAdminShipments.detail.parcelType')} value={shipment.parcelTypeName} />
                <InfoTile label={t('superAdminShipments.detail.transportMode')} value={shipment.transportModeName} />
                <InfoTile
                  label={t('superAdminShipments.detail.weight')}
                  value={shipment.weightKg != null ? `${shipment.weightKg} kg` : undefined}
                />
                <InfoTile
                  label={t('superAdminShipments.detail.volume')}
                  value={shipment.volumeM3 != null ? `${shipment.volumeM3} m3` : undefined}
                />
                <InfoTile label={t('superAdminShipments.detail.companyPrice')} value={formatMoney(shipment.companyPrice, { fallback: t('superAdminShipments.detail.notProvided') })} />
                <InfoTile label={t('superAdminShipments.detail.fee')} value={formatMoney(shipment.feeAmount, { fallback: t('superAdminShipments.detail.notProvided') })} />
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                {t('superAdminShipments.history.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('superAdminShipments.history.subtitle')}
              </p>
            </CardHeader>
            <CardContent>
              {shipment.statusHistory && shipment.statusHistory.length > 0 ? (
                <div className="space-y-4">
                  {shipment.statusHistory.map((entry, index) => (
                    <HistoryEntry
                      key={entry.id}
                      entry={entry}
                      isLast={index === shipment.statusHistory!.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('superAdminShipments.history.empty')}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ElementType;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ShipmentMobileCard({
  shipment,
  onOpen,
}: {
  shipment: Shipment;
  onOpen: () => void;
}) {
  const { t } = useTranslation('dashboard');

  return (
    <button type="button" className="w-full px-4 py-5 text-left" onClick={onOpen}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-foreground">
              {shipment.reference}
            </p>
            <p className="truncate text-xs text-muted-foreground">{shipment.companyName}</p>
          </div>
          <Badge className={cn('shrink-0 border-0', getShipmentStatusClassName(shipment.status))}>
            {getStatusLabel(t, shipment.status)}
          </Badge>
        </div>

        <div className="grid gap-3 rounded-lg bg-secondary/40 p-3">
          <CompactInfo label={t('superAdminShipments.detail.origin')} value={getShipmentOriginLabel(shipment)} />
          <CompactInfo label={t('superAdminShipments.detail.destination')} value={getShipmentDestinationLabel(shipment)} />
          <CompactInfo
            label={t('superAdminShipments.list.columns.parties')}
            value={joinParts([shipment.sender?.fullName, shipment.receiver?.fullName]) ?? ''}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{formatShipmentDate(shipment.createdAt)}</p>
          <span className="text-sm font-medium text-primary">
            {t('superAdminShipments.list.view')}
          </span>
        </div>
      </div>
    </button>
  );
}

function LifecycleTimeline({ shipment }: { shipment: Shipment }) {
  const { t } = useTranslation('dashboard');
  const terminalStatuses: ShipmentStatus[] = ['CANCELLED', 'RETURNED'];
  const historyStatuses = new Set(shipment.statusHistory?.map((entry) => entry.toStatus) ?? []);
  const currentIndex = LIFECYCLE_STATUSES.indexOf(shipment.status);
  const effectiveCurrentIndex =
    currentIndex >= 0
      ? currentIndex
      : Math.max(...LIFECYCLE_STATUSES.map((status, index) => (historyStatuses.has(status) ? index : -1)));
  const steps = LIFECYCLE_STATUSES.map((status, index) => ({
    status,
    state:
      shipment.status === status
        ? 'current'
        : index <= effectiveCurrentIndex || historyStatuses.has(status)
          ? 'completed'
          : 'pending',
  }));

  if (terminalStatuses.includes(shipment.status)) {
    steps.push({ status: shipment.status, state: 'current' });
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={`${step.status}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <LifecycleIcon state={step.state} />
            {index < steps.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-border" />}
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-foreground">{getStatusLabel(t, step.status)}</p>
              <Badge variant={step.state === 'pending' ? 'outline' : 'secondary'} className="w-fit">
                {t(`superAdminShipments.lifecycle.states.${step.state}`)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`superAdminShipments.lifecycle.descriptions.${step.status}`)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LifecycleIcon({ state }: { state: string }) {
  if (state === 'completed') {
    return (
      <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  }

  if (state === 'current') {
    return (
      <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Clock3 className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Circle className="h-3 w-3" />
    </div>
  );
}

function HistoryEntry({
  entry,
  isLast,
}: {
  entry: NonNullable<Shipment['statusHistory']>[number];
  isLast: boolean;
}) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="mt-1 h-3 w-3 rounded-full bg-primary" />
        {!isLast && <div className="mt-2 h-full min-h-10 w-px bg-border" />}
      </div>

      <div className="min-w-0 flex-1 rounded-lg border border-border bg-secondary/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-foreground">
              {entry.fromStatus
                ? t('superAdminShipments.history.transition', {
                    values: {
                      from: getStatusLabel(t, entry.fromStatus),
                      to: getStatusLabel(t, entry.toStatus),
                    },
                  })
                : getStatusLabel(t, entry.toStatus)}
            </p>
            {entry.note && (
              <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{entry.note}</p>
            )}
          </div>
          <Badge variant="outline" className="w-fit shrink-0">
            {formatShipmentDate(entry.changedAt)}
          </Badge>
        </div>

        {entry.changedByUsername && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t('superAdminShipments.history.actor', {
              values: { actor: entry.changedByUsername },
            })}
          </p>
        )}
      </div>
    </div>
  );
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
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-sm font-medium text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
    <div className="rounded-lg border border-border bg-card p-4">
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PartyCard({
  title,
  name,
  phone,
  location,
}: {
  title: string;
  name?: string;
  phone?: string;
  location?: string;
}) {
  const { t } = useTranslation('dashboard');

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <InfoTile label={t('superAdminShipments.detail.name')} value={name} />
        <InfoTile label={t('superAdminShipments.detail.phone')} value={phone} />
        <InfoTile label={t('superAdminShipments.detail.location')} value={location} />
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value?: string }) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-foreground">
        {value || t('superAdminShipments.detail.notProvided')}
      </p>
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

function getStatusLabel(t: Translate, status: ShipmentStatus) {
  return t(`superAdminShipments.statuses.${status}`, { defaultValue: status });
}

function joinParts(parts: Array<string | undefined>) {
  const value = parts.filter(Boolean).join(' - ');
  return value || undefined;
}
