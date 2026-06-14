'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import {
  AlertCircle,
  Bike,
  Calendar,
  CalendarCheck,
  Check,
  Megaphone,
  Package,
  Pencil,
  Plane,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Ship,
  Train,
  Trash2,
  Truck,
  X,
  type LucideProps,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Badge,
  CompanyGuard,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import {
  activateAnnouncement,
  createAnnouncement,
  deactivateAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  getCompanyCollectionPoints,
  getCompanyParcelTypes,
  getCompanyTransportModes,
  renewAnnouncement,
  updateAnnouncement,
} from '@/lib/announcements/api';
import type {
  AnnouncementCollectionPoint,
  AnnouncementOption,
  AnnouncementRenewRequest,
  AnnouncementRequest,
  AnnouncementResponse,
  CollectionPointOption,
  ParcelTypeOption,
  TransportModeOption,
} from '@/lib/announcements/types';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type FormState = {
  collectionPointIds: string[];
  transportModeIds: string[];
  parcelTypeIds: string[];
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  parcelReceptionDeadline: string;
  shipmentDate: string;
  active: boolean;
  renewable: boolean;
};

type FormErrors = Partial<Record<keyof FormState | 'form', string>>;

type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type TFunction = ReturnType<typeof useTranslation>['t'];

const emptyForm = (): FormState => ({
  collectionPointIds: [],
  transportModeIds: [],
  parcelTypeIds: [],
  title: '',
  content: '',
  startDate: '',
  endDate: '',
  parcelReceptionDeadline: '',
  shipmentDate: '',
  active: true,
  renewable: false,
});

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(toDate(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function normalizeTransportName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getTransportIcon(names: string[]): ElementType<LucideProps> {
  const value = normalizeTransportName(names.join(' '));
  if (/avion|air|aerien|plane|vol/.test(value)) return Plane;
  if (/bateau|ship|maritime|mer|marin|naval|boat/.test(value)) return Ship;
  if (/moto|bike|velo|deux.roue/.test(value)) return Bike;
  if (/train|rail|ferroviaire/.test(value)) return Train;
  return Truck;
}

function idsFromResponse(
  items: AnnouncementOption[] | AnnouncementCollectionPoint[] | null | undefined,
  legacyId?: number,
) {
  if (items && items.length > 0) {
    return items.map((item) => String(item.id));
  }

  return legacyId ? [String(legacyId)] : [];
}

function toFormState(announcement: AnnouncementResponse): FormState {
  return {
    collectionPointIds: idsFromResponse(
      announcement.collectionPoints,
      announcement.collectionPointId,
    ),
    transportModeIds: idsFromResponse(announcement.transportModes, announcement.transportModeId),
    parcelTypeIds: idsFromResponse(announcement.parcelTypes, announcement.parcelTypeId),
    title: announcement.title,
    content: announcement.content,
    startDate: announcement.startDate,
    endDate: announcement.endDate,
    parcelReceptionDeadline: announcement.parcelReceptionDeadline ?? '',
    shipmentDate: announcement.shipmentDate ?? '',
    active: announcement.active,
    renewable: announcement.renewable,
  };
}

function selectedNumbers(values: string[]) {
  return values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
}

function validateForm(form: FormState, t: TFunction): FormErrors {
  const errors: FormErrors = {};

  if (!form.title.trim()) errors.title = t('announcements.validation.required');
  if (!form.content.trim()) errors.content = t('announcements.validation.required');
  if (!form.startDate) errors.startDate = t('announcements.validation.required');
  if (!form.endDate) errors.endDate = t('announcements.validation.required');

  if (form.startDate && form.endDate && toDate(form.endDate) <= toDate(form.startDate)) {
    errors.endDate = t('announcements.validation.validityOrder');
  }

  const hasDeadline = Boolean(form.parcelReceptionDeadline);
  const hasShipmentDate = Boolean(form.shipmentDate);

  if (hasDeadline !== hasShipmentDate) {
    const message = t('announcements.validation.operationalDatesPair');
    if (!hasDeadline) errors.parcelReceptionDeadline = message;
    if (!hasShipmentDate) errors.shipmentDate = message;
  }

  if (
    hasDeadline &&
    hasShipmentDate &&
    toDate(form.shipmentDate) <= toDate(form.parcelReceptionDeadline)
  ) {
    errors.shipmentDate = t('announcements.validation.operationalDatesOrder');
  }

  return errors;
}

function buildRequest(form: FormState): AnnouncementRequest {
  return {
    collectionPointIds: selectedNumbers(form.collectionPointIds),
    transportModeIds: selectedNumbers(form.transportModeIds),
    parcelTypeIds: selectedNumbers(form.parcelTypeIds),
    title: form.title.trim(),
    content: form.content.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    parcelReceptionDeadline: form.parcelReceptionDeadline || undefined,
    shipmentDate: form.shipmentDate || undefined,
    active: form.active,
    renewable: form.renewable,
  };
}

function buildRenewRequest(form: RenewFormState): AnnouncementRenewRequest {
  return {
    startDate: form.startDate,
    endDate: form.endDate,
    parcelReceptionDeadline: form.parcelReceptionDeadline || undefined,
    shipmentDate: form.shipmentDate || undefined,
  };
}

function legacyOption(name: string | undefined, id: number | undefined): AnnouncementOption[] {
  return name && id ? [{ id, name }] : [];
}

function getCollectionPoints(announcement: AnnouncementResponse): AnnouncementCollectionPoint[] {
  if (announcement.collectionPoints && announcement.collectionPoints.length > 0) {
    return announcement.collectionPoints;
  }

  return announcement.collectionPointName && announcement.collectionPointId
    ? [
        {
          id: announcement.collectionPointId,
          name: announcement.collectionPointName,
          countryId: announcement.countryId,
          countryName: announcement.countryName,
          cityId: announcement.cityId,
          cityName: announcement.cityName,
        },
      ]
    : [];
}

function getTransportModes(announcement: AnnouncementResponse): AnnouncementOption[] {
  return announcement.transportModes && announcement.transportModes.length > 0
    ? announcement.transportModes
    : legacyOption(announcement.transportModeName, announcement.transportModeId);
}

function getParcelTypes(announcement: AnnouncementResponse): AnnouncementOption[] {
  return announcement.parcelTypes && announcement.parcelTypes.length > 0
    ? announcement.parcelTypes
    : legacyOption(announcement.parcelTypeName, announcement.parcelTypeId);
}

function listNames(items: { name: string }[]) {
  return items.map((item) => item.name);
}

function formatListSummary(names: string[], t: TFunction) {
  if (names.length === 0) return t('announcements.general');
  if (names.length <= 3) return names.join(', ');

  return t('announcements.moreItems', {
    values: { names: names.slice(0, 3).join(', '), count: names.length - 3 },
  });
}

function formatCollectionPointOption(point: CollectionPointOption) {
  const parts = [
    point.reference ? `${point.name} (${point.reference})` : point.name,
    point.cityName,
    point.countryName,
  ].filter(Boolean);

  return parts.join(' - ');
}

function MultiSelectField({
  label,
  emptyLabel,
  options,
  value,
  error,
  disabled,
  description,
  onChange,
}: {
  label: string;
  emptyLabel: string;
  options: SelectOption[];
  value: string[];
  error?: string;
  disabled?: boolean;
  description?: string;
  onChange: (value: string[]) => void;
}) {
  const selected = options.filter((option) => value.includes(option.value));
  const selectedSummary =
    selected.length === 0 ? emptyLabel : selected.map((option) => option.label).join(', ');

  const toggle = (option: SelectOption) => {
    if (disabled || option.disabled) return;

    onChange(
      value.includes(option.value)
        ? value.filter((current) => current !== option.value)
        : [...value, option.value],
    );
  };

  return (
    <div className="min-w-0 space-y-2">
      <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
        <div className="min-w-0">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          {description && <p className="text-xs text-muted-foreground/80">{description}</p>}
        </div>
        <span className="min-w-0 truncate text-xs text-muted-foreground sm:max-w-44 sm:text-right">
          {selectedSummary}
        </span>
      </div>
      <div
        className={cn(
          'max-h-44 min-w-0 space-y-1 overflow-y-auto overflow-x-hidden rounded-xl border bg-input p-2',
          error ? 'border-destructive' : 'border-border',
          disabled && 'opacity-60',
        )}
      >
        {options.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          options.map((option) => {
            const checked = value.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled || option.disabled}
                onClick={() => toggle(option)}
                className={cn(
                  'flex w-full min-w-0 items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                  checked
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  (disabled || option.disabled) && 'cursor-not-allowed opacity-50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate">{option.label}</span>
                  {option.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
      {value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 max-w-full justify-start px-2 text-xs"
          disabled={disabled}
          onClick={() => onChange([])}
        >
          <X className="h-3.5 w-3.5" />
          {emptyLabel}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TextField({
  label,
  value,
  error,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'w-full rounded-xl border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
          error ? 'border-destructive focus:ring-destructive' : 'border-border',
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function DateField({
  label,
  value,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'w-full rounded-xl border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
          error ? 'border-destructive focus:ring-destructive' : 'border-border',
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AnnouncementFormDialog({
  open,
  announcement,
  collectionPoints,
  transportModes,
  parcelTypes,
  loading,
  onSave,
  onClose,
}: {
  open: boolean;
  announcement: AnnouncementResponse | null;
  collectionPoints: CollectionPointOption[];
  transportModes: TransportModeOption[];
  parcelTypes: ParcelTypeOption[];
  loading: boolean;
  onSave: (data: AnnouncementRequest) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(announcement ? toFormState(announcement) : emptyForm());
    setErrors({});
  }, [announcement, open]);

  const setField =
    <K extends keyof FormState>(field: K) =>
    (value: FormState[K]) => {
      setForm((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    };

  const collectionPointOptions = useMemo<SelectOption[]>(
    () =>
      collectionPoints.map((point) => ({
        value: String(point.id),
        label: formatCollectionPointOption(point),
        disabled: point.active === false || point.manuallyClosed === true,
        description:
          point.active === false || point.manuallyClosed === true
            ? t('announcements.form.collectionPointUnavailable')
            : undefined,
      })),
    [collectionPoints, t],
  );

  const transportModeOptions = useMemo<SelectOption[]>(
    () => transportModes.map((mode) => ({ value: String(mode.id), label: mode.name })),
    [transportModes],
  );

  const parcelTypeOptions = useMemo<SelectOption[]>(
    () => parcelTypes.map((type) => ({ value: String(type.id), label: type.name })),
    [parcelTypes],
  );

  const handleSubmit = async () => {
    const nextErrors = validateForm(form, t);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSave(buildRequest(form));
      onClose();
    } catch (error) {
      setErrors({
        form: getErrorMessage(error, t('announcements.errors.save')),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const isEdit = Boolean(announcement);
  const busy = loading || submitting;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-0 backdrop-blur-sm sm:items-start sm:justify-center sm:overflow-y-auto sm:p-4 sm:py-8">
      <div className="max-h-[92dvh] w-full max-w-[100vw] overflow-y-auto overflow-x-hidden rounded-t-2xl border-t border-border bg-card shadow-xl sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl sm:border">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <h2 className="min-w-0 truncate text-base font-semibold text-foreground">
            {isEdit
              ? t('announcements.form.editTitle')
              : t('announcements.form.createTitle')}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} disabled={busy}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-w-0 space-y-5 px-4 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : (
            <>
              {errors.form && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errors.form}
                </div>
              )}

              <TextField
                label={t('announcements.form.title')}
                value={form.title}
                error={errors.title}
                placeholder={t('announcements.form.titlePlaceholder')}
                disabled={submitting}
                onChange={setField('title')}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('announcements.form.content')}
                </label>
                <textarea
                  rows={3}
                  value={form.content}
                  disabled={submitting}
                  placeholder={t('announcements.form.contentPlaceholder')}
                  onChange={(event) => setField('content')(event.target.value)}
                  className={cn(
                    'w-full resize-none rounded-xl border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
                    errors.content ? 'border-destructive focus:ring-destructive' : 'border-border',
                  )}
                />
                {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
              </div>

              <div className="space-y-4 rounded-xl border border-border p-3 sm:p-4">
                <MultiSelectField
                  label={t('announcements.form.collectionPoints')}
                  description={t('announcements.form.generalTargetHint')}
                  emptyLabel={t('announcements.form.allCollectionPoints')}
                  value={form.collectionPointIds}
                  options={collectionPointOptions}
                  disabled={submitting}
                  onChange={setField('collectionPointIds')}
                />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <MultiSelectField
                    label={t('announcements.form.transportModes')}
                    emptyLabel={t('announcements.form.allTransportModes')}
                    value={form.transportModeIds}
                    options={transportModeOptions}
                    disabled={submitting}
                    onChange={setField('transportModeIds')}
                  />
                  <MultiSelectField
                    label={t('announcements.form.parcelTypes')}
                    emptyLabel={t('announcements.form.allParcelTypes')}
                    value={form.parcelTypeIds}
                    options={parcelTypeOptions}
                    disabled={submitting}
                    onChange={setField('parcelTypeIds')}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  label={t('announcements.form.startDate')}
                  value={form.startDate}
                  error={errors.startDate}
                  disabled={submitting}
                  onChange={setField('startDate')}
                />
                <DateField
                  label={t('announcements.form.endDate')}
                  value={form.endDate}
                  error={errors.endDate}
                  disabled={submitting}
                  onChange={setField('endDate')}
                />
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">
                  {t('announcements.form.operationalDates')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('announcements.form.operationalDatesHint')}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DateField
                    label={t('announcements.form.parcelReceptionDeadline')}
                    value={form.parcelReceptionDeadline}
                    error={errors.parcelReceptionDeadline}
                    disabled={submitting}
                    onChange={setField('parcelReceptionDeadline')}
                  />
                  <DateField
                    label={t('announcements.form.shipmentDate')}
                    value={form.shipmentDate}
                    error={errors.shipmentDate}
                    disabled={submitting}
                    onChange={setField('shipmentDate')}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.active}
                    disabled={submitting}
                    onChange={(event) => setField('active')(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    {t('announcements.form.active')}
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.renewable}
                    disabled={submitting}
                    onChange={(event) => setField('renewable')(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    {t('announcements.form.renewable')}
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:pb-4">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={busy}>
            {submitting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {isEdit ? t('common.save') : t('announcements.form.createAction')}
          </Button>
        </div>
      </div>
    </div>
  );
}

type RenewFormState = {
  startDate: string;
  endDate: string;
  parcelReceptionDeadline: string;
  shipmentDate: string;
};

const emptyRenewForm = (): RenewFormState => ({
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  parcelReceptionDeadline: '',
  shipmentDate: '',
});

function validateRenewForm(form: RenewFormState, t: TFunction): FormErrors {
  return validateForm(
    {
      ...emptyForm(),
      title: 'renew',
      content: 'renew',
      startDate: form.startDate,
      endDate: form.endDate,
      parcelReceptionDeadline: form.parcelReceptionDeadline,
      shipmentDate: form.shipmentDate,
    },
    t,
  );
}

function RenewDialog({
  open,
  onRenew,
  onClose,
}: {
  open: boolean;
  onRenew: (data: AnnouncementRenewRequest) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const [form, setForm] = useState<RenewFormState>(emptyRenewForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(emptyRenewForm());
    setErrors({});
  }, [open]);

  const setField =
    <K extends keyof RenewFormState>(field: K) =>
    (value: RenewFormState[K]) => {
      setForm((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    };

  const handleSubmit = async () => {
    const nextErrors = validateRenewForm(form, t);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onRenew(buildRenewRequest(form));
      onClose();
    } catch (error) {
      setErrors({ form: getErrorMessage(error, t('announcements.errors.renew')) });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-t-2xl border-t border-border bg-card shadow-xl sm:rounded-2xl sm:border">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="space-y-4 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t('announcements.renew.title')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('announcements.renew.description')}
            </p>
          </div>

          {errors.form && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errors.form}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <DateField
              label={t('announcements.form.startDate')}
              value={form.startDate}
              error={errors.startDate}
              disabled={submitting}
              onChange={setField('startDate')}
            />
            <DateField
              label={t('announcements.form.endDate')}
              value={form.endDate}
              error={errors.endDate}
              disabled={submitting}
              onChange={setField('endDate')}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DateField
              label={t('announcements.form.parcelReceptionDeadline')}
              value={form.parcelReceptionDeadline}
              error={errors.parcelReceptionDeadline}
              disabled={submitting}
              onChange={setField('parcelReceptionDeadline')}
            />
            <DateField
              label={t('announcements.form.shipmentDate')}
              value={form.shipmentDate}
              error={errors.shipmentDate}
              disabled={submitting}
              onChange={setField('shipmentDate')}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {t('announcements.renew.action')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation('dashboard');

  return (
    <Badge
      className={
        active
          ? 'bg-success/10 text-success ring-1 ring-success/25'
          : 'bg-muted text-muted-foreground ring-1 ring-border'
      }
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-success' : 'bg-muted-foreground')} />
      {active ? t('announcements.status.active') : t('announcements.status.inactive')}
    </Badge>
  );
}

function AnnouncementCard({
  announcement,
  isAdmin,
  onEdit,
  onRenew,
  onToggle,
  onDelete,
}: {
  announcement: AnnouncementResponse;
  isAdmin: boolean;
  onEdit: () => void;
  onRenew: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { locale, t } = useTranslation('dashboard');
  const collectionPoints = getCollectionPoints(announcement);
  const transportModes = getTransportModes(announcement);
  const parcelTypes = getParcelTypes(announcement);
  const transportNames = listNames(transportModes);
  const TransportIcon = getTransportIcon(transportNames);
  const isExpired = toDate(announcement.endDate) < toDate(new Date().toISOString().slice(0, 10));
  const none = t('announcements.notScheduled');

  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge active={announcement.active} />
            {announcement.renewable && (
              <Badge className="bg-primary/10 text-primary ring-1 ring-primary/25">
                <RotateCcw className="h-3 w-3" />
                {t('announcements.status.renewable')}
              </Badge>
            )}
            {isExpired && (
              <Badge className="bg-warning/10 text-warning ring-1 ring-warning/25">
                {t('announcements.status.expired')}
              </Badge>
            )}
          </div>
          <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-foreground">
            {announcement.title}
          </h3>
        </div>

        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon-sm" title={t('common.edit')} onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            {announcement.renewable && (
              <Button
                variant="ghost"
                size="icon-sm"
                title={t('announcements.renew.action')}
                onClick={onRenew}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              title={
                announcement.active
                  ? t('announcements.actions.deactivate')
                  : t('announcements.actions.activate')
              }
              onClick={onToggle}
            >
              {announcement.active ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon-sm" title={t('common.delete')} onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{announcement.content}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="truncate">
            {formatListSummary(listNames(collectionPoints), t)}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <TransportIcon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="truncate">{formatListSummary(transportNames, t)}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <Package className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="truncate">{formatListSummary(listNames(parcelTypes), t)}</span>
        </span>
      </div>

      <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span>
            {t('announcements.dates.validity')}:{' '}
            <span className="font-medium text-foreground">
              {formatDate(announcement.startDate, locale, none)} -{' '}
              {formatDate(announcement.endDate, locale, none)}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-success/70" />
          <span>
            {t('announcements.dates.deadline')}:{' '}
            <span className="font-medium text-foreground">
              {formatDate(announcement.parcelReceptionDeadline, locale, none)}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 shrink-0 text-warning/70" />
          <span>
            {t('announcements.dates.shipment')}:{' '}
            <span className="font-medium text-foreground">
              {formatDate(announcement.shipmentDate, locale, none)}
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}

function CompanyAnnouncementsInner({ companyId, companyName }: { companyId: number; companyName: string }) {
  const { token, role } = useAuthStore();
  const { t } = useTranslation('dashboard');
  const { toast, success, error: showError } = useToastSimple();
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointOption[]>([]);
  const [transportModes, setTransportModes] = useState<TransportModeOption[]>([]);
  const [parcelTypes, setParcelTypes] = useState<ParcelTypeOption[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportLoaded, setSupportLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnouncementResponse | null>(null);
  const [renewTarget, setRenewTarget] = useState<AnnouncementResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementResponse | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AnnouncementResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const isAdmin = role === 'ADMIN_COMPANY' || role === 'EMPLOYEE_COMPANY';

  const loadAnnouncements = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAnnouncements(token, companyId);
      setAnnouncements(data);
    } catch (error) {
      setLoadError(getErrorMessage(error, t('announcements.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [companyId, t, token]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const ensureSupportData = useCallback(async () => {
    if (!token || supportLoaded) return;

    setSupportLoading(true);
    try {
      const [points, modes, types] = await Promise.all([
        getCompanyCollectionPoints(token, companyId),
        getCompanyTransportModes(token, companyId),
        getCompanyParcelTypes(token, companyId),
      ]);
      setCollectionPoints(points);
      setTransportModes(modes);
      setParcelTypes(types);
      setSupportLoaded(true);
    } catch (error) {
      showError(getErrorMessage(error, t('announcements.errors.supportData')));
    } finally {
      setSupportLoading(false);
    }
  }, [companyId, showError, supportLoaded, t, token]);

  const openForm = useCallback(
    (announcement: AnnouncementResponse | null) => {
      setEditTarget(announcement);
      setFormOpen(true);
      void ensureSupportData();
    },
    [ensureSupportData],
  );

  const handleSave = async (data: AnnouncementRequest) => {
    if (!token) return;

    const saved = editTarget
      ? await updateAnnouncement(token, companyId, editTarget.id, data)
      : await createAnnouncement(token, companyId, data);

    setAnnouncements((current) =>
      editTarget
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current],
    );
    success(
      editTarget
        ? t('announcements.messages.updated')
        : t('announcements.messages.created'),
    );
  };

  const handleRenew = async (data: AnnouncementRenewRequest) => {
    if (!token || !renewTarget) return;

    const updated = await renewAnnouncement(token, companyId, renewTarget.id, data);
    setAnnouncements((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setRenewTarget(null);
    success(t('announcements.messages.renewed'));
  };

  const handleToggle = async () => {
    if (!token || !toggleTarget) return;

    setToggling(true);
    try {
      const action = toggleTarget.active ? deactivateAnnouncement : activateAnnouncement;
      const updated = await action(token, companyId, toggleTarget.id);
      setAnnouncements((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      success(
        toggleTarget.active
          ? t('announcements.messages.deactivated')
          : t('announcements.messages.activated'),
      );
      setToggleTarget(null);
    } catch (error) {
      showError(getErrorMessage(error, t('announcements.errors.toggle')));
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;

    setDeleting(true);
    try {
      await deleteAnnouncement(token, companyId, deleteTarget.id);
      setAnnouncements((current) => current.filter((item) => item.id !== deleteTarget.id));
      success(t('announcements.messages.deleted'));
      setDeleteTarget(null);
    } catch (error) {
      showError(getErrorMessage(error, t('announcements.errors.delete')));
    } finally {
      setDeleting(false);
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
        icon={AlertCircle}
        tone="destructive"
        title={t('common.loadError')}
        description={loadError}
        action={
          <Button variant="outline" onClick={() => void loadAnnouncements()}>
            <RefreshCw className="h-4 w-4" />
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('announcements.title')}
        subtitle={t('announcements.subtitle', { values: { companyName } })}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void loadAnnouncements()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
            {isAdmin && (
              <Button onClick={() => openForm(null)}>
                <Plus className="h-4 w-4" />
                {t('announcements.actions.new')}
              </Button>
            )}
          </div>
        }
      />

      {announcements.length === 0 ? (
        <StatusState
          icon={Megaphone}
          title={t('announcements.empty.title')}
          description={t('announcements.empty.description')}
          action={
            isAdmin ? (
              <Button onClick={() => openForm(null)}>
                <Plus className="h-4 w-4" />
                {t('announcements.empty.action')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isAdmin={isAdmin}
              onEdit={() => openForm(announcement)}
              onRenew={() => setRenewTarget(announcement)}
              onToggle={() => setToggleTarget(announcement)}
              onDelete={() => setDeleteTarget(announcement)}
            />
          ))}
        </div>
      )}

      <AnnouncementFormDialog
        open={formOpen}
        announcement={editTarget}
        collectionPoints={collectionPoints}
        transportModes={transportModes}
        parcelTypes={parcelTypes}
        loading={supportLoading}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
      />

      <RenewDialog
        open={Boolean(renewTarget)}
        onRenew={handleRenew}
        onClose={() => setRenewTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={
          toggleTarget?.active
            ? t('announcements.toggle.deactivateTitle')
            : t('announcements.toggle.activateTitle')
        }
        description={
          toggleTarget?.active
            ? t('announcements.toggle.deactivateDescription')
            : t('announcements.toggle.activateDescription')
        }
        confirmLabel={
          toggleTarget?.active
            ? t('announcements.actions.deactivate')
            : t('announcements.actions.activate')
        }
        loading={toggling}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('announcements.delete.title')}
        description={t('announcements.delete.description', {
          values: { title: deleteTarget?.title ?? '' },
        })}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastBar toast={toast} />
    </div>
  );
}

export function CompanyAnnouncements() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CompanyAnnouncementsInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}
