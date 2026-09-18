'use client';

import { type ElementType, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Route,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import type { TranslateOptions } from '@/lib/i18n/client';
import {
  deleteCompanyDeliveryEstimate,
  getCompanyDeliveryEstimates,
  getCompanyTransportModes,
  getDeliveryEstimateRequirements,
  upsertCompanyDeliveryEstimate,
} from '@/lib/company/api';
import type {
  CompanyDeliveryEstimateRequest,
  CompanyDeliveryEstimateRequirementsResponse,
  CompanyDeliveryEstimateResponse,
  CompanyPricingRouteResponse,
  DeliveryEstimateUnit,
  ParcelTypeResponse,
  TransportModeResponse,
} from '@/lib/company/types';
import { cn } from '@/lib/utils';
import {
  Badge,
  CompanyGuard,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';

type Translate = (key: string, options?: Omit<TranslateOptions, 'ns'>) => string;

type EstimateFormState = {
  transportModeId: string;
  originCollectionPointId: string;
  destinationCollectionPointId: string;
  parcelTypeId: string;
  durationValue: string;
  durationUnit: DeliveryEstimateUnit;
};

type EstimateSelection = Pick<
  EstimateFormState,
  'transportModeId' | 'originCollectionPointId' | 'destinationCollectionPointId' | 'parcelTypeId'
>;

function createDefaultForm(transportModeId = ''): EstimateFormState {
  return {
    transportModeId,
    originCollectionPointId: '',
    destinationCollectionPointId: '',
    parcelTypeId: '',
    durationValue: '',
    durationUnit: 'DAYS',
  };
}

function buildFormFromEstimate(estimate: CompanyDeliveryEstimateResponse): EstimateFormState {
  return {
    transportModeId: String(estimate.transportModeId),
    originCollectionPointId: String(estimate.originCollectionPointId),
    destinationCollectionPointId: String(estimate.destinationCollectionPointId),
    parcelTypeId: String(estimate.parcelTypeId),
    durationValue: String(estimate.durationValue),
    durationUnit: estimate.durationUnit,
  };
}

function buildRouteKey(originId: number, destinationId: number) {
  return `${originId}->${destinationId}`;
}

function buildEstimateKey(
  estimate: Pick<
    CompanyDeliveryEstimateResponse,
    'originCollectionPointId' | 'destinationCollectionPointId' | 'parcelTypeId'
  >,
) {
  return `${estimate.originCollectionPointId}->${estimate.destinationCollectionPointId}|${estimate.parcelTypeId}`;
}

function hasCompleteSelection(selection: EstimateSelection) {
  return (
    Boolean(selection.transportModeId) &&
    Boolean(selection.originCollectionPointId) &&
    Boolean(selection.destinationCollectionPointId) &&
    Boolean(selection.parcelTypeId)
  );
}

function estimateMatchesSelection(
  estimate: CompanyDeliveryEstimateResponse,
  selection: EstimateSelection,
) {
  return (
    String(estimate.transportModeId) === selection.transportModeId &&
    String(estimate.originCollectionPointId) === selection.originCollectionPointId &&
    String(estimate.destinationCollectionPointId) === selection.destinationCollectionPointId &&
    String(estimate.parcelTypeId) === selection.parcelTypeId
  );
}

function validateForm(form: EstimateFormState, t: Translate): {
  errors: string[];
  payload?: CompanyDeliveryEstimateRequest;
} {
  const errors: string[] = [];
  const durationValue = Number(form.durationValue);

  if (!form.transportModeId) errors.push(t('validation.selectMode'));
  if (!form.originCollectionPointId || !form.destinationCollectionPointId) {
    errors.push(t('validation.selectRoute'));
  }
  if (!form.parcelTypeId) errors.push(t('validation.selectParcel'));
  if (!Number.isInteger(durationValue) || durationValue < 1) {
    errors.push(t('validation.durationInvalid'));
  }

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    payload: {
      originCollectionPointId: Number(form.originCollectionPointId),
      destinationCollectionPointId: Number(form.destinationCollectionPointId),
      parcelTypeId: Number(form.parcelTypeId),
      durationValue,
      durationUnit: form.durationUnit,
    },
  };
}

function formatDate(value: string | undefined, neverLabel: string) {
  if (!value) return neverLabel;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDuration(t: Translate, value?: number, unit?: DeliveryEstimateUnit) {
  if (!value || !unit) return '-';
  if (unit === 'HOURS') return t('list.hoursShort', { values: { count: value } });
  return t('list.days', { values: { count: value } });
}

export function DeliveryEstimatesView() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <DeliveryEstimatesInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}

function DeliveryEstimatesInner({
  companyId,
  companyName,
}: {
  companyId: number;
  companyName: string;
}) {
  const { t } = useTranslation('delivery-estimates');
  const token = useAuthStore((state) => state.token);
  const { toast, success, error: showError } = useToastSimple();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transportModes, setTransportModes] = useState<TransportModeResponse[]>([]);
  const [estimates, setEstimates] = useState<CompanyDeliveryEstimateResponse[]>([]);
  const [requirements, setRequirements] =
    useState<CompanyDeliveryEstimateRequirementsResponse | null>(null);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null);
  const [form, setForm] = useState<EstimateFormState>(createDefaultForm());
  const [search, setSearch] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const selectedMode = useMemo(
    () => transportModes.find((mode) => String(mode.id) === form.transportModeId) ?? null,
    [form.transportModeId, transportModes],
  );

  const selectedModeEstimates = useMemo(
    () => estimates.filter((item) => String(item.transportModeId) === form.transportModeId),
    [estimates, form.transportModeId],
  );

  const configuredKeys = useMemo(
    () => new Set(selectedModeEstimates.map((item) => buildEstimateKey(item))),
    [selectedModeEstimates],
  );

  const configuredModeCount = useMemo(
    () => new Set(estimates.map((item) => item.transportModeId)).size,
    [estimates],
  );

  const selectedEstimate = useMemo(
    () => estimates.find((item) => item.id === selectedEstimateId) ?? null,
    [estimates, selectedEstimateId],
  );

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setLoadError(null);

    try {
      const [modeResponse, estimateResponse] = await Promise.all([
        getCompanyTransportModes(token, companyId),
        getCompanyDeliveryEstimates(token, companyId),
      ]);

      const nextModes = modeResponse.transportModes;
      const firstEstimate = estimateResponse[0];
      const firstModeId = firstEstimate?.transportModeId ?? nextModes[0]?.id;

      setTransportModes(nextModes);
      setEstimates(estimateResponse);

      if (firstEstimate) {
        setSelectedEstimateId(firstEstimate.id);
        setForm(buildFormFromEstimate(firstEstimate));
      } else {
        setSelectedEstimateId(null);
        setForm(createDefaultForm(firstModeId ? String(firstModeId) : ''));
      }
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [companyId, token, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const transportModeId = Number(form.transportModeId);
    if (!token || !transportModeId) {
      setRequirements(null);
      return;
    }

    let cancelled = false;
    setRequirementsLoading(true);
    setRequirementsError(null);

    getDeliveryEstimateRequirements(token, companyId, transportModeId)
      .then((response) => {
        if (cancelled) return;
        setRequirements(response);

        setForm((current) => {
          if (current.transportModeId !== String(response.transportModeId)) return current;

          const firstRoute = response.availableRoutes[0];
          const firstParcel = response.availableParcelTypes[0];
          const routeExists = response.availableRoutes.some(
            (route) =>
              String(route.originCollectionPointId) === current.originCollectionPointId &&
              String(route.destinationCollectionPointId) === current.destinationCollectionPointId,
          );
          const parcelExists = response.availableParcelTypes.some(
            (parcel) => String(parcel.id) === current.parcelTypeId,
          );
          const nextOrigin = routeExists
            ? current.originCollectionPointId
            : firstRoute
              ? String(firstRoute.originCollectionPointId)
              : '';
          const nextDestination = routeExists
            ? current.destinationCollectionPointId
            : firstRoute
              ? String(firstRoute.destinationCollectionPointId)
              : '';
          const nextParcel = parcelExists
            ? current.parcelTypeId
            : firstParcel
              ? String(firstParcel.id)
              : '';

          if (
            current.originCollectionPointId === nextOrigin &&
            current.destinationCollectionPointId === nextDestination &&
            current.parcelTypeId === nextParcel
          ) {
            return current;
          }

          return {
            ...current,
            originCollectionPointId: nextOrigin,
            destinationCollectionPointId: nextDestination,
            parcelTypeId: nextParcel,
          };
        });
      })
      .catch((cause) => {
        if (!cancelled) {
          setRequirementsError(
            cause instanceof ApiError ? cause.message : t('messages.requirementsError'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRequirementsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, form.transportModeId, token, t]);

  const findEstimateForSelection = (selection: EstimateSelection) => {
    if (!hasCompleteSelection(selection)) return null;
    return estimates.find((estimate) => estimateMatchesSelection(estimate, selection)) ?? null;
  };

  const selectEstimate = (estimate: CompanyDeliveryEstimateResponse) => {
    setSelectedEstimateId(estimate.id);
    setValidationErrors([]);
    setForm(buildFormFromEstimate(estimate));
  };

  const startNewEstimate = () => {
    const firstRoute = requirements?.availableRoutes[0];
    const firstParcel = requirements?.availableParcelTypes[0];

    setSelectedEstimateId(null);
    setValidationErrors([]);
    setForm({
      ...createDefaultForm(form.transportModeId || (transportModes[0] ? String(transportModes[0].id) : '')),
      originCollectionPointId: firstRoute ? String(firstRoute.originCollectionPointId) : '',
      destinationCollectionPointId: firstRoute ? String(firstRoute.destinationCollectionPointId) : '',
      parcelTypeId: firstParcel ? String(firstParcel.id) : '',
    });
  };

  const handleModeChange = (transportModeId: string) => {
    const candidate = estimates.find((item) => String(item.transportModeId) === transportModeId);
    setValidationErrors([]);
    if (candidate) {
      selectEstimate(candidate);
      return;
    }
    setSelectedEstimateId(null);
    setForm(createDefaultForm(transportModeId));
  };

  const handleRouteChange = (routeKey: string) => {
    const route = requirements?.availableRoutes.find(
      (item) =>
        buildRouteKey(item.originCollectionPointId, item.destinationCollectionPointId) === routeKey,
    );
    if (!route) return;

    const nextSelection = {
      ...form,
      originCollectionPointId: String(route.originCollectionPointId),
      destinationCollectionPointId: String(route.destinationCollectionPointId),
    };
    const matching = findEstimateForSelection(nextSelection);

    if (matching) {
      selectEstimate(matching);
      return;
    }

    setSelectedEstimateId(null);
    setValidationErrors([]);
    setForm((current) => ({
      ...current,
      originCollectionPointId: String(route.originCollectionPointId),
      destinationCollectionPointId: String(route.destinationCollectionPointId),
    }));
  };

  const handleParcelChange = (parcelTypeId: string) => {
    const nextSelection = { ...form, parcelTypeId };
    const matching = findEstimateForSelection(nextSelection);

    if (matching) {
      selectEstimate(matching);
      return;
    }

    setSelectedEstimateId(null);
    setValidationErrors([]);
    setForm((current) => ({ ...current, parcelTypeId }));
  };

  const pickMissingCombination = (
    route: CompanyPricingRouteResponse,
    parcel: ParcelTypeResponse,
  ) => {
    setSelectedEstimateId(null);
    setValidationErrors([]);
    setForm((current) => ({
      ...current,
      originCollectionPointId: String(route.originCollectionPointId),
      destinationCollectionPointId: String(route.destinationCollectionPointId),
      parcelTypeId: String(parcel.id),
      durationValue: '',
      durationUnit: 'DAYS',
    }));
  };

  const saveEstimate = async () => {
    if (!token) return;

    const result = validateForm(form, t);
    setValidationErrors(result.errors);
    if (!result.payload) return;

    setSaving(true);
    try {
      const saved = await upsertCompanyDeliveryEstimate(
        token,
        companyId,
        Number(form.transportModeId),
        result.payload,
      );

      setEstimates((current) => {
        const withoutCurrent = current.filter(
          (item) =>
            item.id !== saved.id &&
            !(
              item.transportModeId === saved.transportModeId &&
              item.originCollectionPointId === saved.originCollectionPointId &&
              item.destinationCollectionPointId === saved.destinationCollectionPointId &&
              item.parcelTypeId === saved.parcelTypeId
            ),
        );
        return [saved, ...withoutCurrent].sort((left, right) =>
          left.transportModeName.localeCompare(right.transportModeName),
        );
      });
      setSelectedEstimateId(saved.id);
      setForm(buildFormFromEstimate(saved));
      success(t('messages.saveSuccess'));
    } catch (cause) {
      showError(cause instanceof ApiError ? cause.message : t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const deleteEstimate = async () => {
    if (!token || !selectedEstimate) return;

    setDeleting(true);
    try {
      await deleteCompanyDeliveryEstimate(
        token,
        companyId,
        selectedEstimate.transportModeId,
        selectedEstimate.originCollectionPointId,
        selectedEstimate.destinationCollectionPointId,
        selectedEstimate.parcelTypeId,
      );
      setEstimates((current) => current.filter((item) => item.id !== selectedEstimate.id));
      setSelectedEstimateId(null);
      startNewEstimate();
      setConfirmDeleteOpen(false);
      success(t('messages.deleteSuccess'));
    } catch (cause) {
      showError(cause instanceof ApiError ? cause.message : t('messages.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const routeValue =
    form.originCollectionPointId && form.destinationCollectionPointId
      ? buildRouteKey(Number(form.originCollectionPointId), Number(form.destinationCollectionPointId))
      : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <StatusState
        icon={AlertTriangle}
        tone="destructive"
        title={t('errors.loadTitle')}
        description={loadError}
        action={
          <Button variant="outline" onClick={() => void load()}>
            {t('actions.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <ToastBar toast={toast} />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description')}
        confirmLabel={t('deleteDialog.confirm')}
        destructive
        loading={deleting}
        onConfirm={() => void deleteEstimate()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <SectionHeader
        title={t('title')}
        subtitle={t('subtitle', { values: { company: companyName } })}
        action={
          <Button className="w-full gap-2 sm:w-auto" onClick={startNewEstimate}>
            <Plus className="h-4 w-4" />
            {t('actions.newEstimate')}
          </Button>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        <MetricCard
          icon={Clock3}
          label={t('metrics.estimates')}
          value={estimates.length}
          helper={t('metrics.estimatesHelper')}
        />
        <MetricCard
          icon={Route}
          label={t('metrics.modes')}
          value={`${configuredModeCount}/${transportModes.length}`}
          helper={t('metrics.modesHelper')}
        />
        <MetricCard
          icon={CheckCircle2}
          label={t('metrics.currentMode')}
          value={selectedMode?.name ?? t('metrics.noMode')}
          helper={requirements?.instruction ?? t('metrics.selectMode')}
        />
      </div>

      {transportModes.length === 0 ? (
        <StatusState
          icon={AlertTriangle}
          tone="warning"
          title={t('errors.noActiveModes')}
          description={t('errors.noActiveModesDescription')}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
          <div className="min-w-0 space-y-6">
            <EstimatesList
              estimates={estimates}
              selectedId={selectedEstimateId}
              search={search}
              onSearchChange={setSearch}
              onSelect={selectEstimate}
            />
            <CoveragePanel
              requirements={requirements}
              configuredKeys={configuredKeys}
              loading={requirementsLoading}
              error={requirementsError}
              onPickMissing={pickMissingCombination}
            />
          </div>

          <Card className="min-w-0 border-border bg-card">
            <CardHeader className="space-y-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-lg">
                    {selectedEstimateId ? t('actions.editTitle') : t('actions.newTitle')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('actions.description')}
                  </p>
                </div>
                {selectedEstimateId && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground sm:w-auto"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('actions.delete')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {validationErrors.length > 0 && (
                <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {validationErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                <Field label={t('form.mode')}>
                  <select
                    value={form.transportModeId}
                    onChange={(event) => handleModeChange(event.target.value)}
                    className="h-10 w-full min-w-0 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                  >
                    {transportModes.map((mode) => (
                      <option key={mode.id} value={String(mode.id)}>
                        {mode.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t('form.route')}>
                  <select
                    value={routeValue}
                    onChange={(event) => handleRouteChange(event.target.value)}
                    className="h-10 w-full min-w-0 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                    disabled={!requirements || requirements.availableRoutes.length === 0}
                  >
                    {(requirements?.availableRoutes ?? []).map((route) => (
                      <option
                        key={buildRouteKey(
                          route.originCollectionPointId,
                          route.destinationCollectionPointId,
                        )}
                        value={buildRouteKey(
                          route.originCollectionPointId,
                          route.destinationCollectionPointId,
                        )}
                      >
                        {route.originCollectionPointName} - {route.destinationCollectionPointName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t('form.parcelType')}>
                  <select
                    value={form.parcelTypeId}
                    onChange={(event) => handleParcelChange(event.target.value)}
                    className="h-10 w-full min-w-0 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                    disabled={!requirements || requirements.availableParcelTypes.length === 0}
                  >
                    {(requirements?.availableParcelTypes ?? []).map((parcel) => (
                      <option key={parcel.id} value={String(parcel.id)}>
                        {parcel.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t('form.unit')}>
                  <select
                    value={form.durationUnit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        durationUnit: event.target.value as DeliveryEstimateUnit,
                      }))
                    }
                    className="h-10 w-full min-w-0 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                  >
                    <option value="HOURS">{t('form.units.HOURS')}</option>
                    <option value="DAYS">{t('form.units.DAYS')}</option>
                  </select>
                </Field>

                <Field label={t('form.duration')}>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.durationValue}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, durationValue: event.target.value }))
                    }
                    placeholder={t('form.durationPlaceholder')}
                    className="bg-secondary"
                  />
                </Field>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-sm font-medium text-foreground">{t('form.preview')}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {formatDuration(t, Number(form.durationValue), form.durationUnit)}
                </p>
                <p className="break-words text-sm text-muted-foreground">
                  {selectedEstimate?.label ?? t('form.previewFallback')}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={startNewEstimate}>
                  {t('actions.reset')}
                </Button>
                <Button onClick={() => void saveEstimate()} disabled={saving} className="gap-2">
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? t('actions.saving') : t('actions.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <Card className="min-w-0 border-border bg-card">
      <CardContent className="flex min-w-0 items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold text-foreground">{value}</p>
          {helper && <p className="truncate text-xs text-muted-foreground">{helper}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function EstimatesList({
  estimates,
  selectedId,
  search,
  onSearchChange,
  onSelect,
}: {
  estimates: CompanyDeliveryEstimateResponse[];
  selectedId: number | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (estimate: CompanyDeliveryEstimateResponse) => void;
}) {
  const { t } = useTranslation('delivery-estimates');
  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return estimates;
    return estimates.filter((item) =>
      [
        item.transportModeName,
        item.originCollectionPointName,
        item.destinationCollectionPointName,
        item.parcelTypeName,
        item.label,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [estimates, search]);

  return (
    <Card className="min-w-0 border-border bg-card">
      <CardHeader className="space-y-3 px-4 sm:px-6">
        <CardTitle className="text-base">{t('list.title')}</CardTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('list.searchPlaceholder')}
            className="bg-secondary pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="max-h-[520px] space-y-2 overflow-y-auto px-4 sm:px-6">
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t('list.empty')}
          </p>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors',
                selectedId === item.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-secondary/60',
              )}
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.originCollectionPointName} - {item.destinationCollectionPointName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.transportModeName} - {item.parcelTypeName}
                  </p>
                </div>
                <Badge className="max-w-full self-start truncate bg-success/15 text-success">
                  {item.label ?? formatDuration(t, item.durationValue, item.durationUnit)}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('list.updated', {
                  values: { date: formatDate(item.updatedAt ?? item.createdAt, t('list.never')) },
                })}
              </p>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CoveragePanel({
  requirements,
  configuredKeys,
  loading,
  error,
  onPickMissing,
}: {
  requirements: CompanyDeliveryEstimateRequirementsResponse | null;
  configuredKeys: Set<string>;
  loading: boolean;
  error: string | null;
  onPickMissing: (route: CompanyPricingRouteResponse, parcel: ParcelTypeResponse) => void;
}) {
  const { t } = useTranslation('delivery-estimates');
  const routes = requirements?.availableRoutes ?? [];
  const parcels = requirements?.availableParcelTypes ?? [];
  const combos = routes.flatMap((route) => parcels.map((parcel) => ({ route, parcel })));
  const missing = combos.filter(
    ({ route, parcel }) =>
      !configuredKeys.has(
        `${route.originCollectionPointId}->${route.destinationCollectionPointId}|${parcel.id}`,
      ),
  );
  const configuredCount = combos.length - missing.length;

  return (
    <Card className="min-w-0 border-border bg-card">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <CardTitle className="text-base">{t('coverage.title')}</CardTitle>
          <Badge
            className={cn(
              'shrink-0',
              missing.length === 0 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
            )}
          >
            {configuredCount}/{combos.length || 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t('coverage.loading')}
          </div>
        ) : error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : !requirements ? (
          <p className="text-sm text-muted-foreground">
            {t('coverage.noRequirements')}
          </p>
        ) : combos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('coverage.noCombos')}
          </p>
        ) : missing.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {t('coverage.allComplete')}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('coverage.missingCount', { values: { count: missing.length } })}
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {missing.slice(0, 8).map(({ route, parcel }) => (
                <button
                  key={`${buildRouteKey(route.originCollectionPointId, route.destinationCollectionPointId)}|${parcel.id}`}
                  type="button"
                  onClick={() => onPickMissing(route, parcel)}
                  className="w-full rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-secondary/70"
                >
                  <span className="block truncate font-medium text-foreground">
                    {route.originCollectionPointName} - {route.destinationCollectionPointName}
                  </span>
                  <span className="block truncate text-muted-foreground">{parcel.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
