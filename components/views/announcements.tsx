'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import {
  AlertCircle,
  Bike,
  Calendar,
  CalendarCheck,
  MapPin,
  Megaphone,
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
  TransportModeOption,
} from '@/lib/announcements/types';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type FormState = {
  originCollectionPointId: string;
  destinationCollectionPointId: string;
  transportModeId: string;
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
  originCollectionPointId: '',
  destinationCollectionPointId: '',
  transportModeId: '',
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

function toFormState(announcement: AnnouncementResponse): FormState {
  return {
    originCollectionPointId: String(
      announcement.originCollectionPointId ??
        announcement.originCollectionPoint?.id ??
        announcement.collectionPointId ??
        '',
    ),
    destinationCollectionPointId: String(
      announcement.destinationCollectionPointId ??
        announcement.destinationCollectionPoint?.id ??
        '',
    ),
    transportModeId: String(announcement.transportModeId ?? ''),
    title: announcement.title,
    content: announcement.content ?? '',
    startDate: announcement.startDate,
    endDate: announcement.endDate,
    parcelReceptionDeadline: announcement.parcelReceptionDeadline ?? '',
    shipmentDate: announcement.shipmentDate ?? '',
    active: announcement.active,
    renewable: announcement.renewable,
  };
}

function findCollectionPoint(points: CollectionPointOption[], value: string) {
  return points.find((point) => String(point.id) === value) ?? null;
}

function isCollectionPointSelectable(point: CollectionPointOption) {
  return point.active !== false && point.responsible !== null;
}

function isCollectionPointOperational(point: CollectionPointOption | null) {
  return (
    point != null &&
    point.active !== false &&
    point.manuallyClosed !== true &&
    point.mobileAvailability !== false
  );
}

function getCollectionPointDescription(point: CollectionPointOption, t: TFunction) {
  if (point.active === false) return t('announcements.form.collectionPointUnavailable');
  if (point.responsible === null) return t('announcements.form.collectionPointWithoutResponsible');
  if (!isCollectionPointOperational(point)) {
    return t('announcements.form.collectionPointNotOperational');
  }

  return undefined;
}

function validateForm(
  form: FormState,
  t: TFunction,
  collectionPoints: CollectionPointOption[] = [],
): FormErrors {
  const errors: FormErrors = {};
  const originCollectionPoint = findCollectionPoint(
    collectionPoints,
    form.originCollectionPointId,
  );
  const destinationCollectionPoint = findCollectionPoint(
    collectionPoints,
    form.destinationCollectionPointId,
  );

  if (!form.title.trim()) errors.title = t('announcements.validation.required');
  if (!form.originCollectionPointId) {
    errors.originCollectionPointId = t('announcements.validation.required');
  }
  if (!form.destinationCollectionPointId) {
    errors.destinationCollectionPointId = t('announcements.validation.required');
  }
  if (
    form.originCollectionPointId &&
    form.destinationCollectionPointId &&
    form.originCollectionPointId === form.destinationCollectionPointId
  ) {
    errors.destinationCollectionPointId = t('announcements.validation.differentCollectionPoints');
  }
  if (
    form.active &&
    form.originCollectionPointId &&
    !isCollectionPointOperational(originCollectionPoint)
  ) {
    errors.originCollectionPointId = t(
      'announcements.validation.operationalCollectionPointRequired',
    );
  }
  if (
    form.active &&
    form.destinationCollectionPointId &&
    !isCollectionPointOperational(destinationCollectionPoint)
  ) {
    errors.destinationCollectionPointId = t(
      'announcements.validation.operationalCollectionPointRequired',
    );
  }
  if (!form.transportModeId) errors.transportModeId = t('announcements.validation.required');
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
    originCollectionPointId: Number(form.originCollectionPointId),
    destinationCollectionPointId: Number(form.destinationCollectionPointId),
    transportModeId: Number(form.transportModeId),
    title: form.title.trim(),
    content: form.content.trim() || undefined,
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

function getLegacyCollectionPoints(
  announcement: AnnouncementResponse,
): AnnouncementCollectionPoint[] {
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

function getOriginCollectionPoint(
  announcement: AnnouncementResponse,
): AnnouncementCollectionPoint | null {
  if (announcement.originCollectionPoint) return announcement.originCollectionPoint;

  if (announcement.originCollectionPointName && announcement.originCollectionPointId) {
    return {
      id: announcement.originCollectionPointId,
      name: announcement.originCollectionPointName,
      countryId: announcement.originCountryId,
      countryName: announcement.originCountryName,
      cityId: announcement.originCityId,
      cityName: announcement.originCityName,
    };
  }

  const legacy = getLegacyCollectionPoints(announcement);
  return legacy[0] ?? null;
}

function getDestinationCollectionPoint(
  announcement: AnnouncementResponse,
): AnnouncementCollectionPoint | null {
  if (announcement.destinationCollectionPoint) return announcement.destinationCollectionPoint;

  if (announcement.destinationCollectionPointName && announcement.destinationCollectionPointId) {
    return {
      id: announcement.destinationCollectionPointId,
      name: announcement.destinationCollectionPointName,
      countryId: announcement.destinationCountryId,
      countryName: announcement.destinationCountryName,
      cityId: announcement.destinationCityId,
      cityName: announcement.destinationCityName,
    };
  }

  const legacy = getLegacyCollectionPoints(announcement);
  return legacy[1] ?? null;
}

function getTransportModes(announcement: AnnouncementResponse): AnnouncementOption[] {
  return announcement.transportModes && announcement.transportModes.length > 0
    ? announcement.transportModes
    : legacyOption(announcement.transportModeName, announcement.transportModeId);
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

function SelectField({
  label,
  placeholder,
  options,
  value,
  error,
  disabled,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'w-full rounded-xl border bg-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
          error ? 'border-destructive focus:ring-destructive' : 'border-border',
          !value && 'text-muted-foreground',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {selectedOption?.description && (
        <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
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
  loading,
  onSave,
  onClose,
}: {
  open: boolean;
  announcement: AnnouncementResponse | null;
  collectionPoints: CollectionPointOption[];
  transportModes: TransportModeOption[];
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
        disabled: !isCollectionPointSelectable(point),
        description: getCollectionPointDescription(point, t),
      })),
    [collectionPoints, t],
  );

  const transportModeOptions = useMemo<SelectOption[]>(
    () => transportModes.map((mode) => ({ value: String(mode.id), label: mode.name })),
    [transportModes],
  );

  const handleSubmit = async () => {
    const nextErrors = validateForm(form, t, collectionPoints);

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
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <SelectField
                    label={t('announcements.form.originCollectionPoint')}
                    placeholder={t('announcements.form.selectCollectionPoint')}
                    value={form.originCollectionPointId}
                    error={errors.originCollectionPointId}
                    options={collectionPointOptions}
                    disabled={submitting}
                    onChange={setField('originCollectionPointId')}
                  />
                  <SelectField
                    label={t('announcements.form.destinationCollectionPoint')}
                    placeholder={t('announcements.form.selectCollectionPoint')}
                    value={form.destinationCollectionPointId}
                    error={errors.destinationCollectionPointId}
                    options={collectionPointOptions}
                    disabled={submitting}
                    onChange={setField('destinationCollectionPointId')}
                  />
                </div>
                <SelectField
                  label={t('announcements.form.transportMode')}
                  placeholder={t('announcements.form.selectTransportMode')}
                  value={form.transportModeId}
                  error={errors.transportModeId}
                  options={transportModeOptions}
                  disabled={submitting}
                  onChange={setField('transportModeId')}
                />
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
  const originCollectionPoint = getOriginCollectionPoint(announcement);
  const destinationCollectionPoint = getDestinationCollectionPoint(announcement);
  const transportModes = getTransportModes(announcement);
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

      {announcement.content && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {announcement.content}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="truncate">
            {originCollectionPoint?.name ?? t('announcements.notScheduled')}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-success/70" />
          <span className="truncate">
            {destinationCollectionPoint?.name ?? t('announcements.notScheduled')}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <TransportIcon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="truncate">{formatListSummary(transportNames, t)}</span>
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
      const [points, modes] = await Promise.all([
        getCompanyCollectionPoints(token, companyId),
        getCompanyTransportModes(token, companyId),
      ]);
      setCollectionPoints(points);
      setTransportModes(modes);
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
