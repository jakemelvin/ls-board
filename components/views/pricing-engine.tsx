'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Package,
  Plus,
  RefreshCw,
  Route,
  Save,
  Search,
  Sparkles,
  Weight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import type { TranslateOptions } from '@/lib/i18n/client';
import {
  getCollectionPoints,
  getCompanyParcelTypes,
  getCompanyPricing,
  getCompanyPricingBySelection,
  getCompanyTransportModes,
  getPricingRequirements,
  upsertCompanyPricing,
} from '@/lib/company/api';
import type {
  CollectionPointResponse,
  CompanyPricingRangeRuleRequest,
  CompanyPricingRequest,
  CompanyPricingRequirementsResponse,
  CompanyPricingResponse,
  CompanyPricingRouteResponse,
  ParcelTypeResponse,
  PricingApplicationMode,
  PricingCriterion,
  TransportModeResponse,
} from '@/lib/company/types';
import {
  Badge,
  CompanyGuard,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';

type Translate = (key: string, options?: Omit<TranslateOptions, 'ns'>) => string;

const CRITERIA: {
  id: PricingCriterion;
  icon: ElementType;
}[] = [
  { id: 'FIXED', icon: Calculator },
  { id: 'WEIGHT', icon: Weight },
  { id: 'VOLUME', icon: Package },
];

const APPLICATION_MODES: { value: PricingApplicationMode }[] = [
  { value: 'PROPORTIONAL' },
  { value: 'ROUND_UP_UNIT' },
];

type RangeRuleDraft = {
  id: string;
  minValue: string;
  maxValue: string;
  amount: string;
};

type PricingFormState = {
  transportModeId: string;
  originCollectionPointId: string;
  destinationCollectionPointId: string;
  parcelTypeId: string;
  selectedCriteria: PricingCriterion[];
  fixedPrice: string;
  expressSurcharge: string;
  weightApplicationMode: PricingApplicationMode;
  volumeApplicationMode: PricingApplicationMode;
  weightRules: RangeRuleDraft[];
  volumeRules: RangeRuleDraft[];
};

type ValidationResult = {
  errors: string[];
  payload?: CompanyPricingRequest;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyRangeRule(): RangeRuleDraft {
  return { id: createId(), minValue: '', maxValue: '', amount: '' };
}

function normalizeCriteria(criteria: PricingCriterion[]) {
  return CRITERIA.map((item) => item.id).filter((criterion) => criteria.includes(criterion));
}

function createDefaultForm(transportModeId = ''): PricingFormState {
  return {
    transportModeId,
    originCollectionPointId: '',
    destinationCollectionPointId: '',
    parcelTypeId: '',
    selectedCriteria: ['FIXED'],
    fixedPrice: '',
    expressSurcharge: '0',
    weightApplicationMode: 'PROPORTIONAL',
    volumeApplicationMode: 'PROPORTIONAL',
    weightRules: [createEmptyRangeRule()],
    volumeRules: [createEmptyRangeRule()],
  };
}

function buildFormFromPricing(pricing: CompanyPricingResponse): PricingFormState {
  return {
    transportModeId: String(pricing.transportModeId),
    originCollectionPointId: String(pricing.originCollectionPointId),
    destinationCollectionPointId: String(pricing.destinationCollectionPointId),
    parcelTypeId: String(pricing.parcelTypeId),
    selectedCriteria: normalizeCriteria(pricing.selectedCriteria),
    fixedPrice: pricing.fixedPrice != null ? String(pricing.fixedPrice) : '',
    expressSurcharge: pricing.expressSurcharge != null ? String(pricing.expressSurcharge) : '0',
    weightApplicationMode: pricing.weightApplicationMode ?? 'PROPORTIONAL',
    volumeApplicationMode: pricing.volumeApplicationMode ?? 'PROPORTIONAL',
    weightRules:
      pricing.weightRules.length > 0
        ? pricing.weightRules.map((rule) => ({
            id: String(rule.id),
            minValue: String(rule.minValue),
            maxValue: rule.maxValue != null ? String(rule.maxValue) : '',
            amount: String(rule.amount),
          }))
        : [createEmptyRangeRule()],
    volumeRules:
      pricing.volumeRules.length > 0
        ? pricing.volumeRules.map((rule) => ({
            id: String(rule.id),
            minValue: String(rule.minValue),
            maxValue: rule.maxValue != null ? String(rule.maxValue) : '',
            amount: String(rule.amount),
          }))
        : [createEmptyRangeRule()],
  };
}

function parseNumber(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatDate(value?: string, neverLabel = 'Jamais') {
  if (!value) return neverLabel;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildRouteKey(originId: number, destinationId: number) {
  return `${originId}->${destinationId}`;
}

function buildPricingKey(pricing: Pick<CompanyPricingResponse, 'originCollectionPointId' | 'destinationCollectionPointId' | 'parcelTypeId'>) {
  return `${pricing.originCollectionPointId}->${pricing.destinationCollectionPointId}|${pricing.parcelTypeId}`;
}

type PricingSelection = {
  transportModeId: string;
  originCollectionPointId: string;
  destinationCollectionPointId: string;
  parcelTypeId: string;
};

function hasCompletePricingSelection(selection: PricingSelection) {
  return (
    Boolean(selection.transportModeId) &&
    Boolean(selection.originCollectionPointId) &&
    Boolean(selection.destinationCollectionPointId) &&
    Boolean(selection.parcelTypeId)
  );
}

function pricingMatchesSelection(
  pricing: CompanyPricingResponse,
  selection: PricingSelection,
) {
  return (
    String(pricing.transportModeId) === selection.transportModeId &&
    String(pricing.originCollectionPointId) === selection.originCollectionPointId &&
    String(pricing.destinationCollectionPointId) === selection.destinationCollectionPointId &&
    String(pricing.parcelTypeId) === selection.parcelTypeId
  );
}

function isEnvelopeParcel(parcel?: ParcelTypeResponse | null) {
  const normalized = parcel?.name.trim().toLowerCase() ?? '';
  return normalized.includes('envelope') || normalized.includes('enveloppe');
}

function validateMoneyField(t: Translate, label: string, value: string, required: boolean) {
  const parsed = parseNumber(value);
  if (parsed === null) {
    return required
      ? { error: t('validation.fieldRequired', { values: { field: label } }) }
      : { value: undefined };
  }
  if (Number.isNaN(parsed) || parsed < 0) {
    return { error: t('validation.fieldPositive', { values: { field: label } }) };
  }
  return { value: parsed };
}

function validateRangeRules(
  t: Translate,
  label: string,
  unit: string,
  drafts: RangeRuleDraft[],
): { errors: string[]; rules: CompanyPricingRangeRuleRequest[] } {
  const errors: string[] = [];
  const filled = drafts.filter(
    (rule) => rule.minValue.trim() !== '' || rule.maxValue.trim() !== '' || rule.amount.trim() !== '',
  );

  if (filled.length === 0) {
    return {
      errors: [t('validation.rangeRequired', { values: { label } })],
      rules: [],
    };
  }

  const parsed = filled.map((rule, index) => {
    const minValue = parseNumber(rule.minValue);
    const maxValue = parseNumber(rule.maxValue);
    const amount = parseNumber(rule.amount);

    if (minValue === null || Number.isNaN(minValue) || minValue < 0) {
      errors.push(
        t('validation.rangeMinInvalid', { values: { index: index + 1, label, unit } }),
      );
    }
    if (maxValue !== null && (Number.isNaN(maxValue) || maxValue <= (minValue ?? 0))) {
      errors.push(
        t('validation.rangeMaxInvalid', { values: { index: index + 1, label, unit } }),
      );
    }
    if (amount === null || Number.isNaN(amount) || amount < 0) {
      errors.push(
        t('validation.rangeAmountInvalid', { values: { index: index + 1, label } }),
      );
    }

    return {
      minValue: minValue ?? 0,
      maxValue: maxValue === null || Number.isNaN(maxValue) ? undefined : maxValue,
      amount: amount ?? 0,
    };
  });

  const sorted = [...parsed].sort((left, right) => left.minValue - right.minValue);

  if (sorted[0]?.minValue !== 0) {
    errors.push(t('validation.rangeStartZero', { values: { label, unit } }));
  }

  sorted.forEach((rule, index) => {
    const next = sorted[index + 1];
    if (!next) return;
    if (rule.maxValue == null) {
      errors.push(t('validation.rangeLastMaxEmpty'));
      return;
    }
    if (Math.abs(next.minValue - rule.maxValue) > 0.000001) {
      errors.push(t('validation.rangeContiguous'));
    }
  });

  return { errors, rules: sorted };
}

function validateForm(form: PricingFormState, parcel: ParcelTypeResponse | null | undefined, t: Translate): ValidationResult {
  const errors: string[] = [];
  const selectedCriteria = normalizeCriteria(form.selectedCriteria);
  const envelope = isEnvelopeParcel(parcel);

  if (!form.transportModeId) errors.push(t('validation.selectMode'));
  if (!form.originCollectionPointId || !form.destinationCollectionPointId) {
    errors.push(t('validation.selectRoute'));
  }
  if (!form.parcelTypeId) errors.push(t('validation.selectParcel'));
  if (selectedCriteria.length === 0) errors.push(t('validation.selectCriteria'));
  if (envelope && selectedCriteria.some((criterion) => criterion !== 'FIXED')) {
    errors.push(t('validation.envelopeFixedOnly'));
  }

  const fixedPrice = validateMoneyField(
    t,
    t('form.fixedPrice'),
    form.fixedPrice,
    selectedCriteria.includes('FIXED'),
  );
  if (fixedPrice.error) errors.push(fixedPrice.error);

  const expressSurcharge = validateMoneyField(
    t,
    t('form.expressSurcharge'),
    form.expressSurcharge,
    true,
  );
  if (expressSurcharge.error) errors.push(expressSurcharge.error);

  let weightRules: CompanyPricingRangeRuleRequest[] | undefined;
  let volumeRules: CompanyPricingRangeRuleRequest[] | undefined;

  if (selectedCriteria.includes('WEIGHT')) {
    const result = validateRangeRules(t, t('criteria.WEIGHT.label'), 'kg', form.weightRules);
    errors.push(...result.errors);
    weightRules = result.rules;
  }

  if (selectedCriteria.includes('VOLUME')) {
    const result = validateRangeRules(t, t('criteria.VOLUME.label'), 'm3', form.volumeRules);
    errors.push(...result.errors);
    volumeRules = result.rules;
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    payload: {
      originCollectionPointId: Number(form.originCollectionPointId),
      destinationCollectionPointId: Number(form.destinationCollectionPointId),
      parcelTypeId: Number(form.parcelTypeId),
      selectedCriteria,
      fixedPrice: selectedCriteria.includes('FIXED') ? fixedPrice.value : undefined,
      expressSurcharge: expressSurcharge.value,
      weightApplicationMode: selectedCriteria.includes('WEIGHT')
        ? form.weightApplicationMode
        : undefined,
      volumeApplicationMode: selectedCriteria.includes('VOLUME')
        ? form.volumeApplicationMode
        : undefined,
      weightRules,
      volumeRules,
    },
  };
}

function CriteriaBadges({ criteria }: { criteria: PricingCriterion[] }) {
  const { t } = useTranslation('pricing');

  return (
    <div className="flex flex-wrap gap-1.5">
      {normalizeCriteria(criteria).map((criterion) => (
        <Badge key={criterion} className="bg-primary/10 text-primary">
          {t(`criteria.${criterion}.label`, { defaultValue: criterion })}
        </Badge>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: ElementType;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
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

function RangeRulesEditor({
  title,
  unit,
  instruction,
  value,
  onChange,
}: {
  title: string;
  unit: string;
  instruction?: string;
  value: RangeRuleDraft[];
  onChange: (value: RangeRuleDraft[]) => void;
}) {
  const { t } = useTranslation('pricing');

  const updateRule = (id: string, patch: Partial<RangeRuleDraft>) =>
    onChange(value.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

  const removeRule = (id: string) =>
    onChange(
      value.length === 1 ? [createEmptyRangeRule()] : value.filter((rule) => rule.id !== id),
    );

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{t('ranges.hint')}</p>
          {instruction && <p className="mt-1 text-xs text-muted-foreground">{instruction}</p>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, createEmptyRangeRule()])}
          className="shrink-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('ranges.add')}
        </Button>
      </div>

      <div className="space-y-2">
        {value.map((rule) => (
          <div key={rule.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rule.minValue}
              onChange={(event) => updateRule(rule.id, { minValue: event.target.value })}
              placeholder={t('ranges.min', { values: { unit } })}
              className="bg-secondary"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rule.maxValue}
              onChange={(event) => updateRule(rule.id, { maxValue: event.target.value })}
              placeholder={t('ranges.max', { values: { unit } })}
              className="bg-secondary"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rule.amount}
              onChange={(event) => updateRule(rule.id, { amount: event.target.value })}
              placeholder={t('ranges.amount')}
              className="bg-secondary"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRule(rule.id)}
              title={t('ranges.remove')}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingList({
  pricing,
  selectedId,
  search,
  onSearchChange,
  onSelect,
}: {
  pricing: CompanyPricingResponse[];
  selectedId: number | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (pricing: CompanyPricingResponse) => void;
}) {
  const { formatMoney } = useCurrency();
  const { t } = useTranslation('pricing');
  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return pricing;
    return pricing.filter((item) =>
      [
        item.transportModeName,
        item.originCollectionPointName,
        item.destinationCollectionPointName,
        item.parcelTypeName,
        ...item.selectedCriteria,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [pricing, search]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-3">
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
      <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.originCollectionPointName}
                    {' -> '}
                    {item.destinationCollectionPointName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.parcelTypeName} - {formatDate(item.updatedAt ?? item.createdAt, t('list.never'))}
                  </p>
                </div>
                <Badge className="bg-success/15 text-success">{formatMoney(item.fixedPrice)}</Badge>
              </div>
              <div className="mt-3">
                <CriteriaBadges criteria={item.selectedCriteria} />
              </div>
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
  onPickMissing,
}: {
  requirements: CompanyPricingRequirementsResponse | null;
  configuredKeys: Set<string>;
  onPickMissing: (route: CompanyPricingRouteResponse, parcel: ParcelTypeResponse) => void;
}) {
  const { t } = useTranslation('pricing');
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
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{t('coverage.title')}</CardTitle>
          <Badge
            className={cn(
              missing.length === 0 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
            )}
          >
            {configuredCount}/{combos.length || 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!requirements ? (
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
                  <span className="font-medium text-foreground">
                    {route.originCollectionPointName}
                    {' -> '}
                    {route.destinationCollectionPointName}
                  </span>
                  <span className="block text-muted-foreground">{parcel.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompanyPricingInner({
  companyId,
  companyName,
}: {
  companyId: number;
  companyName: string;
}) {
  const { formatMoney } = useCurrency();
  const { t } = useTranslation('pricing');
  const token = useAuthStore((state) => state.token);
  const { toast, success, error: showError } = useToastSimple();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [transportModes, setTransportModes] = useState<TransportModeResponse[]>([]);
  const [parcelTypes, setParcelTypes] = useState<ParcelTypeResponse[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointResponse[]>([]);
  const [pricingList, setPricingList] = useState<CompanyPricingResponse[]>([]);
  const [requirements, setRequirements] =
    useState<CompanyPricingRequirementsResponse | null>(null);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [selectedPricingId, setSelectedPricingId] = useState<number | null>(null);
  const [form, setForm] = useState<PricingFormState>(createDefaultForm());
  const [search, setSearch] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const selectedMode = useMemo(
    () => transportModes.find((mode) => String(mode.id) === form.transportModeId) ?? null,
    [form.transportModeId, transportModes],
  );

  const availableParcelTypes = requirements?.availableParcelTypes ?? parcelTypes;
  const selectedParcel = useMemo(
    () => availableParcelTypes.find((parcel) => String(parcel.id) === form.parcelTypeId) ?? null,
    [availableParcelTypes, form.parcelTypeId],
  );

  const selectedModePricing = useMemo(
    () => pricingList.filter((item) => String(item.transportModeId) === form.transportModeId),
    [form.transportModeId, pricingList],
  );

  const configuredKeys = useMemo(
    () => new Set(selectedModePricing.map((item) => buildPricingKey(item))),
    [selectedModePricing],
  );

  const criteriaKey = useMemo(
    () => normalizeCriteria(form.selectedCriteria).join('|'),
    [form.selectedCriteria],
  );

  const selectedCriteriaForRequirements = useMemo(
    () => criteriaKey.split('|').filter(Boolean) as PricingCriterion[],
    [criteriaKey],
  );

  const configuredModeCount = useMemo(
    () => new Set(pricingList.map((item) => item.transportModeId)).size,
    [pricingList],
  );

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setLoadError(null);

    try {
      const [modeResponse, parcelTypeResponse, pointsResponse, pricingResponse] =
        await Promise.all([
          getCompanyTransportModes(token, companyId),
          getCompanyParcelTypes(token, companyId),
          getCollectionPoints(token, companyId),
          getCompanyPricing(token, companyId),
        ]);

      const nextModes = modeResponse.transportModes;
      const firstPricing = pricingResponse[0];
      const firstModeId = firstPricing?.transportModeId ?? nextModes[0]?.id;

      setTransportModes(nextModes);
      setParcelTypes(parcelTypeResponse.parcelTypes);
      setCollectionPoints(pointsResponse);
      setPricingList(pricingResponse);

      if (firstPricing) {
        setSelectedPricingId(firstPricing.id);
        setForm(buildFormFromPricing(firstPricing));
      } else {
        setSelectedPricingId(null);
        setForm(createDefaultForm(firstModeId ? String(firstModeId) : ''));
      }
    } catch (cause) {
      setLoadError(
        cause instanceof ApiError ? cause.message : t('messages.loadError'),
      );
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

    getPricingRequirements(token, companyId, transportModeId, {
      selectedCriteria: selectedCriteriaForRequirements,
      originCollectionPointId: form.originCollectionPointId
        ? Number(form.originCollectionPointId)
        : undefined,
      destinationCollectionPointId: form.destinationCollectionPointId
        ? Number(form.destinationCollectionPointId)
        : undefined,
      parcelTypeId: form.parcelTypeId ? Number(form.parcelTypeId) : undefined,
    })
      .then((response) => {
        if (cancelled) return;
        setRequirements(response);

        setForm((current) => {
          if (current.transportModeId !== String(response.transportModeId)) return current;

          const firstRoute = response.availableRoutes[0];
          const firstParcel = response.availableParcelTypes[0];
          const currentParcel =
            response.availableParcelTypes.find((parcel) => String(parcel.id) === current.parcelTypeId) ??
            null;
          const nextParcelId = currentParcel
            ? current.parcelTypeId
            : firstParcel
              ? String(firstParcel.id)
              : '';
          const nextParcel =
            response.availableParcelTypes.find((parcel) => String(parcel.id) === nextParcelId) ??
            null;
          const envelope = isEnvelopeParcel(nextParcel);
          const nextOriginCollectionPointId =
            current.originCollectionPointId ||
            (firstRoute ? String(firstRoute.originCollectionPointId) : '');
          const nextDestinationCollectionPointId =
            current.destinationCollectionPointId ||
            (firstRoute ? String(firstRoute.destinationCollectionPointId) : '');
          const normalizedCriteria = normalizeCriteria(current.selectedCriteria);
          const nextCriteria: PricingCriterion[] = envelope ? ['FIXED'] : normalizedCriteria;
          const currentCriteriaKey = normalizedCriteria.join('|');
          const nextCriteriaKey = nextCriteria.join('|');

          if (
            current.originCollectionPointId === nextOriginCollectionPointId &&
            current.destinationCollectionPointId === nextDestinationCollectionPointId &&
            current.parcelTypeId === nextParcelId &&
            currentCriteriaKey === nextCriteriaKey
          ) {
            return current;
          }

          return {
            ...current,
            originCollectionPointId: nextOriginCollectionPointId,
            destinationCollectionPointId: nextDestinationCollectionPointId,
            parcelTypeId: nextParcelId,
            selectedCriteria:
              currentCriteriaKey === nextCriteriaKey ? current.selectedCriteria : nextCriteria,
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
  }, [
    companyId,
    criteriaKey,
    form.destinationCollectionPointId,
    form.originCollectionPointId,
    form.parcelTypeId,
    form.transportModeId,
    selectedCriteriaForRequirements,
    token,
    t,
  ]);

  const selectPricing = (pricing: CompanyPricingResponse) => {
    setSelectedPricingId(pricing.id);
    setValidationErrors([]);
    setForm(buildFormFromPricing(pricing));
  };

  const findPricingForSelection = (selection: PricingSelection) => {
    if (!hasCompletePricingSelection(selection)) return null;
    return pricingList.find((pricing) => pricingMatchesSelection(pricing, selection)) ?? null;
  };

  const startNewPricing = () => {
    const firstRoute = requirements?.availableRoutes[0];
    const firstParcel = requirements?.availableParcelTypes[0];

    setSelectedPricingId(null);
    setValidationErrors([]);
    setForm({
      ...createDefaultForm(form.transportModeId || (transportModes[0] ? String(transportModes[0].id) : '')),
      originCollectionPointId: firstRoute ? String(firstRoute.originCollectionPointId) : '',
      destinationCollectionPointId: firstRoute ? String(firstRoute.destinationCollectionPointId) : '',
      parcelTypeId: firstParcel ? String(firstParcel.id) : '',
      selectedCriteria: isEnvelopeParcel(firstParcel) ? ['FIXED'] : ['FIXED'],
    });
  };

  const duplicateCurrent = () => {
    setSelectedPricingId(null);
    setValidationErrors([]);
    setForm((current) => ({ ...current }));
    success(t('messages.duplicateSuccess'));
  };

  const handleModeChange = (transportModeId: string) => {
    const candidate = pricingList.find((item) => String(item.transportModeId) === transportModeId);
    setValidationErrors([]);
    if (candidate) {
      selectPricing(candidate);
      return;
    }
    setSelectedPricingId(null);
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
    const matchingPricing = findPricingForSelection(nextSelection);

    if (matchingPricing) {
      selectPricing(matchingPricing);
      return;
    }

    setSelectedPricingId(null);
    setValidationErrors([]);
    setForm((current) => ({
      ...current,
      originCollectionPointId: String(route.originCollectionPointId),
      destinationCollectionPointId: String(route.destinationCollectionPointId),
    }));
  };

  const handleParcelChange = (parcelTypeId: string) => {
    const parcel =
      availableParcelTypes.find((item) => String(item.id) === parcelTypeId) ?? null;
    const nextSelection = { ...form, parcelTypeId };
    const matchingPricing = findPricingForSelection(nextSelection);

    if (matchingPricing) {
      selectPricing(matchingPricing);
      return;
    }

    setSelectedPricingId(null);
    setValidationErrors([]);
    setForm((current) => ({
      ...current,
      parcelTypeId,
      selectedCriteria: isEnvelopeParcel(parcel) ? ['FIXED'] : current.selectedCriteria,
      weightRules: isEnvelopeParcel(parcel) ? [createEmptyRangeRule()] : current.weightRules,
      volumeRules: isEnvelopeParcel(parcel) ? [createEmptyRangeRule()] : current.volumeRules,
    }));
  };

  const toggleCriterion = (criterion: PricingCriterion) => {
    if (isEnvelopeParcel(selectedParcel) && criterion !== 'FIXED') return;
    setSelectedPricingId(null);
    setForm((current) => {
      const exists = current.selectedCriteria.includes(criterion);
      const next = exists
        ? current.selectedCriteria.filter((item) => item !== criterion)
        : [...current.selectedCriteria, criterion];

      return {
        ...current,
        selectedCriteria: next.length > 0 ? normalizeCriteria(next) : [criterion],
      };
    });
  };

  const pickMissingCombination = (
    route: CompanyPricingRouteResponse,
    parcel: ParcelTypeResponse,
  ) => {
    setSelectedPricingId(null);
    setValidationErrors([]);
    setForm((current) => ({
      ...createDefaultForm(current.transportModeId),
      originCollectionPointId: String(route.originCollectionPointId),
      destinationCollectionPointId: String(route.destinationCollectionPointId),
      parcelTypeId: String(parcel.id),
      selectedCriteria: isEnvelopeParcel(parcel) ? ['FIXED'] : ['FIXED'],
    }));
  };

  const handleCheckSelection = async () => {
    if (!token || !form.transportModeId || !form.originCollectionPointId || !form.destinationCollectionPointId || !form.parcelTypeId) {
      setValidationErrors([t('messages.selectBeforeVerify')]);
      return;
    }

    setChecking(true);
    try {
      const pricing = await getCompanyPricingBySelection(
        token,
        companyId,
        Number(form.transportModeId),
        Number(form.originCollectionPointId),
        Number(form.destinationCollectionPointId),
        Number(form.parcelTypeId),
      );
      setPricingList((current) => {
        const exists = current.some((item) => item.id === pricing.id);
        return exists ? current.map((item) => (item.id === pricing.id ? pricing : item)) : [pricing, ...current];
      });
      selectPricing(pricing);
      success(t('messages.checkSuccess'));
    } catch (cause) {
      showError(cause instanceof ApiError ? cause.message : t('messages.checkError'));
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;

    const result = validateForm(form, selectedParcel, t);
    setValidationErrors(result.errors);
    if (!result.payload) return;

    setSaving(true);
    try {
      const saved = await upsertCompanyPricing(
        token,
        companyId,
        Number(form.transportModeId),
        result.payload,
      );

      setPricingList((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current];
      });
      setSelectedPricingId(saved.id);
      setForm(buildFormFromPricing(saved));
      setValidationErrors([]);
      success(t('messages.saveSuccess'));
    } catch (cause) {
      showError(cause instanceof ApiError ? cause.message : t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <StatusState
        icon={Calculator}
        tone="destructive"
        title={t('errors.loadTitle')}
        description={loadError}
        action={
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('actions.retry')}
          </Button>
        }
      />
    );
  }

  if (transportModes.length === 0) {
    return (
      <StatusState
        icon={Route}
        title={t('errors.noActiveModes')}
        description={t('errors.noActiveModesDescription')}
      />
    );
  }

  const routeValue =
    form.originCollectionPointId && form.destinationCollectionPointId
      ? buildRouteKey(Number(form.originCollectionPointId), Number(form.destinationCollectionPointId))
      : '';
  const selectedPricing = pricingList.find((item) => item.id === selectedPricingId) ?? null;
  const activeEnvelope = isEnvelopeParcel(selectedParcel);

  return (
    <div className="space-y-6">
      <ToastBar toast={toast} />

      <SectionHeader
        title={t('title')}
        subtitle={t('subtitle', { values: { company: companyName } })}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => void load()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('actions.refresh')}
            </Button>
            <Button onClick={startNewPricing} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('actions.newGrid')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ClipboardCheck}
          label={t('metrics.grids')}
          value={pricingList.length}
          helper={t('metrics.gridsHelper')}
        />
        <MetricCard
          icon={Route}
          label={t('metrics.modes')}
          value={`${configuredModeCount}/${transportModes.length}`}
          helper={selectedMode?.name ?? t('metrics.noMode')}
        />
        <MetricCard
          icon={Package}
          label={t('metrics.types')}
          value={availableParcelTypes.length}
          helper={t('metrics.pointsCount', { values: { count: collectionPoints.length } })}
        />
        <MetricCard
          icon={Sparkles}
          label={t('metrics.insurance')}
          value={formatMoney(selectedPricing?.insurancePrice ?? requirements?.defaultInsurancePrice)}
          helper={t('metrics.insuranceHelper')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">{t('modeCard.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={form.transportModeId} onValueChange={handleModeChange}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder={t('modeCard.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {transportModes.map((mode) => (
                    <SelectItem key={mode.id} value={String(mode.id)}>
                      {mode.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {requirementsLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  {t('modeCard.loadingRequirements')}
                </div>
              )}

              {requirementsError && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                  {requirementsError}
                </div>
              )}
            </CardContent>
          </Card>

          <CoveragePanel
            requirements={requirements}
            configuredKeys={configuredKeys}
            onPickMissing={pickMissingCombination}
          />

          <PricingList
            pricing={selectedModePricing}
            selectedId={selectedPricingId}
            search={search}
            onSearchChange={setSearch}
            onSelect={selectPricing}
          />
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {selectedPricingId ? t('form.editTitle') : t('form.newTitle')}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('form.description')}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={duplicateCurrent}
                  disabled={!selectedPricingId}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {t('actions.duplicate')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCheckSelection()}
                  disabled={checking}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {checking ? t('actions.verifying') : t('actions.verify')}
                </Button>
                <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? t('actions.saving') : t('actions.save')}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {validationErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    {validationErrors.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('form.route')}</Label>
                <Select value={routeValue} onValueChange={handleRouteChange}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder={t('form.routePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(requirements?.availableRoutes ?? []).map((route) => (
                      <SelectItem
                        key={buildRouteKey(route.originCollectionPointId, route.destinationCollectionPointId)}
                        value={buildRouteKey(route.originCollectionPointId, route.destinationCollectionPointId)}
                      >
                        {route.originCollectionPointName}
                        {' -> '}
                        {route.destinationCollectionPointName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('form.parcelType')}</Label>
                <Select value={form.parcelTypeId} onValueChange={handleParcelChange}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder={t('form.parcelPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParcelTypes.map((parcel) => (
                      <SelectItem key={parcel.id} value={String(parcel.id)}>
                        {parcel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('form.expressSurcharge')}</Label>
                <div className="relative">
                  <Zap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.expressSurcharge}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, expressSurcharge: event.target.value }))
                    }
                    className="bg-secondary pl-9"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>{t('form.criteria')}</Label>
                {activeEnvelope && (
                  <Badge className="bg-warning/15 text-warning">{t('form.envelopeBadge')}</Badge>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {CRITERIA.map((criterion) => {
                  const Icon = criterion.icon;
                  const active = form.selectedCriteria.includes(criterion.id);
                  const disabled = activeEnvelope && criterion.id !== 'FIXED';

                  return (
                    <button
                      key={criterion.id}
                      type="button"
                      onClick={() => toggleCriterion(criterion.id)}
                      disabled={disabled}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/70',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <p className="font-medium text-foreground">
                          {t(`criteria.${criterion.id}.label`)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t(`criteria.${criterion.id}.hint`)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {requirements && (
              <div className="grid gap-3 rounded-lg border border-border bg-secondary/40 p-4 text-sm md:grid-cols-2">
                <div>
                  <p className="font-medium text-foreground">{t('form.requirementsTitle')}</p>
                  <p className="mt-1 text-muted-foreground">
                    {t('form.fixedPrice')} :{' '}
                    {requirements.fixedPriceRequired ? t('form.required') : t('form.optional')} -{' '}
                    {t('criteria.WEIGHT.label')} :{' '}
                    {requirements.weightRulesRequired ? t('form.required') : t('form.notRequired')} -{' '}
                    {t('criteria.VOLUME.label')} :{' '}
                    {requirements.volumeRulesRequired ? t('form.required') : t('form.notRequired')}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('form.selectionTitle')}</p>
                  <p className="mt-1 text-muted-foreground">
                    {selectedMode?.name ?? t('form.selectionModeFallback')} -{' '}
                    {selectedParcel?.name ?? t('form.selectionParcelFallback')} -{' '}
                    {t('form.insuranceWord')} {formatMoney(requirements.defaultInsurancePrice)}
                  </p>
                </div>
              </div>
            )}

            {form.selectedCriteria.includes('FIXED') && (
              <div className="space-y-2">
                <Label>{t('form.fixedPrice')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fixedPrice}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fixedPrice: event.target.value }))
                  }
                  className="max-w-sm bg-secondary"
                  placeholder="0"
                />
              </div>
            )}

            {form.selectedCriteria.includes('WEIGHT') && (
              <div className="space-y-4">
                <div className="max-w-sm space-y-2">
                  <Label>{t('form.weightApplication')}</Label>
                  <Select
                    value={form.weightApplicationMode}
                    onValueChange={(value: PricingApplicationMode) =>
                      setForm((current) => ({ ...current, weightApplicationMode: value }))
                    }
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {t(`applicationModes.${mode.value}.label`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <RangeRulesEditor
                  title={t('form.weightRanges')}
                  unit="kg"
                  instruction={requirements?.weightRulesInstruction}
                  value={form.weightRules}
                  onChange={(weightRules) =>
                    setForm((current) => ({ ...current, weightRules }))
                  }
                />
              </div>
            )}

            {form.selectedCriteria.includes('VOLUME') && (
              <div className="space-y-4">
                <div className="max-w-sm space-y-2">
                  <Label>{t('form.volumeApplication')}</Label>
                  <Select
                    value={form.volumeApplicationMode}
                    onValueChange={(value: PricingApplicationMode) =>
                      setForm((current) => ({ ...current, volumeApplicationMode: value }))
                    }
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {t(`applicationModes.${mode.value}.label`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <RangeRulesEditor
                  title={t('form.volumeRanges')}
                  unit="m3"
                  instruction={requirements?.volumeRulesInstruction}
                  value={form.volumeRules}
                  onChange={(volumeRules) =>
                    setForm((current) => ({ ...current, volumeRules }))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PricingEngine() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CompanyPricingInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}
