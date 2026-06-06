'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Eye,
  EyeOff,
  ImagePlus,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Badge,
  CompanyGuard,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { useCollectionPointsManager } from '@/lib/company/use-collection-points';
import type { UserResponse } from '@/lib/auth/types';
import type {
  CityResponse,
  CollectionPointAvailabilityStatus,
  CollectionPointCapacityUnit,
  CollectionPointDayOfWeek,
  CollectionPointRequest,
  CollectionPointResponse,
  ZoneResponse,
} from '@/lib/company/types';

const WEEKDAY_LABELS: Record<CollectionPointDayOfWeek, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mer',
  THURSDAY: 'Jeu',
  FRIDAY: 'Ven',
  SATURDAY: 'Sam',
  SUNDAY: 'Dim',
};

const WEEKDAYS = Object.keys(WEEKDAY_LABELS) as CollectionPointDayOfWeek[];

type ZoneFormState = {
  name: string;
  cityId: string;
};

type PointFormState = {
  name: string;
  address: string;
  phone: string;
  zoneId: string;
  cityId: string;
  responsibleId: string;
  mobileAvailability: 'true' | 'false';
  manuallyClosed: 'false' | 'true';
  maxCapacity: string;
  capacityUnit: CollectionPointCapacityUnit;
  commission: string;
  commissionPercentage: string;
  latitude: string;
  longitude: string;
  photo: File | null;
  existingPhotoUrl: string;
  openingHours: Record<
    CollectionPointDayOfWeek,
    { closed: boolean; openingTime: string; closingTime: string }
  >;
};

type ZoneFormErrors = Partial<Record<'name' | 'cityId', string>>;

type PointFormErrors = Partial<
  Record<
    | 'name'
    | 'zoneId'
    | 'address'
    | 'phone'
    | 'maxCapacity'
    | 'commission'
    | 'commissionPercentage'
    | 'latitude'
    | 'longitude'
    | 'openingHours',
    string
  >
>;

function createDefaultPointForm(): PointFormState {
  return {
    name: '',
    address: '',
    phone: '',
    zoneId: '',
    cityId: '',
    responsibleId: '',
    mobileAvailability: 'true',
    manuallyClosed: 'false',
    maxCapacity: '',
    capacityUnit: 'KG',
    commission: '',
    commissionPercentage: '',
    latitude: '',
    longitude: '',
    photo: null,
    existingPhotoUrl: '',
    openingHours: WEEKDAYS.reduce(
      (acc, day) => {
        acc[day] = {
          closed: day === 'SUNDAY',
          openingTime: '08:00',
          closingTime: '18:00',
        };
        return acc;
      },
      {} as PointFormState['openingHours'],
    ),
  };
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getCityIdFromCityDto(
  city: { cityName: string; countryId: number },
  cities: CityResponse[],
) {
  const normalizedCityName = normalizeText(city.cityName);
  return cities.find(
    (item) =>
      item.countryId === city.countryId &&
      normalizeText(item.cityName) === normalizedCityName,
  )?.cityId;
}

function getCityIdFromZone(zone: ZoneResponse, cities: CityResponse[]) {
  return getCityIdFromCityDto(zone.city, cities);
}

function getCityCandidatesForZone(zone: ZoneResponse, cities: CityResponse[]) {
  const normalizedZoneCityName = normalizeText(zone.city.cityName);
  const sameCountry = cities.filter((city) => city.countryId === zone.city.countryId);
  const exactMatches = sameCountry.filter(
    (city) => normalizeText(city.cityName) === normalizedZoneCityName,
  );

  return exactMatches.length > 0 ? exactMatches : sameCountry;
}

function getZoneLocationLabel(zone: ZoneResponse, cities: CityResponse[]) {
  const city = cities.find(
    (item) =>
      item.countryId === zone.city.countryId &&
      normalizeText(item.cityName) === normalizeText(zone.city.cityName),
  );

  return city ? `${city.cityName}, ${city.countryName}` : zone.city.cityName;
}

function getPointCityLabel(point: CollectionPointResponse, cities: CityResponse[]) {
  const cityId = getCityIdFromCityDto(point.city, cities);
  const city = cityId
    ? cities.find((item) => item.cityId === cityId) ?? null
    : null;

  return city ? `${city.cityName}, ${city.countryName}` : point.city.cityName;
}

function createPointFormFromResponse(
  point: CollectionPointResponse,
  cities: CityResponse[],
): PointFormState {
  const form = createDefaultPointForm();

  point.openingHours.forEach((item) => {
    form.openingHours[item.dayOfWeek] = {
      closed: item.closed,
      openingTime: item.openingTime ?? '08:00',
      closingTime: item.closingTime ?? '18:00',
    };
  });

  return {
    ...form,
    name: point.name,
    address: point.address,
    phone: point.phone,
    zoneId: String(point.zone.id),
    cityId: String(getCityIdFromCityDto(point.city, cities) ?? getCityIdFromZone(point.zone, cities) ?? ''),
    responsibleId: point.responsible ? String(point.responsible.id) : '',
    mobileAvailability: String(point.mobileAvailability) as 'true' | 'false',
    manuallyClosed: String(point.manuallyClosed) as 'true' | 'false',
    maxCapacity: String(point.maxCapacity),
    capacityUnit: point.capacityUnit,
    commission: point.commission != null ? String(point.commission) : '',
    commissionPercentage:
      point.commissionPercentage != null ? String(point.commissionPercentage) : '',
    latitude: point.latitude != null ? String(point.latitude) : '',
    longitude: point.longitude != null ? String(point.longitude) : '',
    existingPhotoUrl: point.photoUrl ?? '',
  };
}

function formatHours(point: CollectionPointResponse) {
  const openDays = point.openingHours.filter((item) => !item.closed);
  if (openDays.length === 0) {
    return 'Horaires non definis';
  }

  return openDays
    .map(
      (item) =>
        `${WEEKDAY_LABELS[item.dayOfWeek]} ${item.openingTime ?? '--'}-${item.closingTime ?? '--'}`,
    )
    .join(' • ');
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return 'Operation impossible';
}

function getAvailabilityStatus(point: CollectionPointResponse): CollectionPointAvailabilityStatus {
  if (!point.active) {
    return 'DEACTIVATED';
  }

  if (point.availabilityStatus) {
    return point.availabilityStatus;
  }

  if (point.manuallyClosed) {
    return 'MANUALLY_CLOSED';
  }

  return point.openNow ? 'OPEN' : 'CLOSED';
}

function getAvailabilityBadgeClass(status: CollectionPointAvailabilityStatus) {
  switch (status) {
    case 'OPEN':
      return 'bg-success/15 text-success';
    case 'CLOSED':
      return 'bg-secondary text-muted-foreground';
    case 'MANUALLY_CLOSED':
      return 'bg-warning/15 text-warning';
    case 'DEACTIVATED':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-secondary text-muted-foreground';
  }
}

function getAvailabilityLabel(status: CollectionPointAvailabilityStatus) {
  switch (status) {
    case 'OPEN':
      return 'Ouvert';
    case 'CLOSED':
      return 'Ferme';
    case 'MANUALLY_CLOSED':
      return 'Ferme manuellement';
    case 'DEACTIVATED':
      return 'Desactive';
    default:
      return 'Inconnu';
  }
}

function PointMetaCard({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'min-w-0 rounded-2xl border border-border/60 bg-secondary/30 px-3.5 py-3 backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </p>
      <div className="mt-1 min-w-0 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function validateZoneForm(value: ZoneFormState): ZoneFormErrors {
  const errors: ZoneFormErrors = {};

  if (!value.cityId) {
    errors.cityId = 'Selectionnez une ville.';
  }

  if (!value.name.trim()) {
    errors.name = 'Le nom de la zone est requis.';
  }

  return errors;
}

function validatePointForm(value: PointFormState): PointFormErrors {
  const errors: PointFormErrors = {};

  if (!value.name.trim()) {
    errors.name = 'Le nom du point est requis.';
  }

  if (!value.zoneId) {
    errors.zoneId = 'Selectionnez une zone.';
  }

  if (!value.address.trim()) {
    errors.address = "L'adresse est requise.";
  }

  if (!value.phone.trim()) {
    errors.phone = 'Le telephone est requis.';
  }

  if (value.maxCapacity.trim() === '') {
    errors.maxCapacity = 'La capacite max est requise.';
  } else if (Number.isNaN(Number(value.maxCapacity)) || Number(value.maxCapacity) < 0) {
    errors.maxCapacity = 'La capacite max doit etre positive.';
  }

  if (value.commission.trim() !== '') {
    const commission = Number(value.commission);
    if (Number.isNaN(commission) || commission < 0) {
      errors.commission = 'La commission fixe doit etre positive.';
    }
  }

  if (value.commissionPercentage.trim() !== '') {
    const percentage = Number(value.commissionPercentage);
    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      errors.commissionPercentage = 'Le pourcentage doit etre compris entre 0 et 100.';
    }
  }

  if (value.latitude.trim() !== '') {
    const latitude = Number(value.latitude);
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      errors.latitude = 'La latitude doit etre comprise entre -90 et 90.';
    }
  }

  if (value.longitude.trim() !== '') {
    const longitude = Number(value.longitude);
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      errors.longitude = 'La longitude doit etre comprise entre -180 et 180.';
    }
  }

  const invalidHours = WEEKDAYS.some((day) => {
    const hours = value.openingHours[day];
    if (hours.closed) {
      return false;
    }

    return (
      !hours.openingTime ||
      !hours.closingTime ||
      hours.openingTime >= hours.closingTime
    );
  });

  if (invalidHours) {
    errors.openingHours =
      "Chaque jour ouvert doit avoir une heure d'ouverture strictement avant l'heure de fermeture.";
  }

  return errors;
}

function buildPointPayload(
  form: PointFormState,
  zones: ZoneResponse[],
  cities: CityResponse[],
): CollectionPointRequest {
  const zoneId = Number(form.zoneId);
  const zone = zones.find((item) => item.id === zoneId);

  if (!zone) {
    throw new Error('Zone introuvable');
  }

  const cityId =
    form.cityId.trim() !== ''
      ? Number(form.cityId)
      : getCityIdFromZone(zone, cities);

  return {
    name: form.name.trim(),
    zoneId,
    cityId,
    address: form.address.trim(),
    phone: form.phone.trim(),
    latitude: form.latitude.trim() !== '' ? Number(form.latitude) : undefined,
    longitude: form.longitude.trim() !== '' ? Number(form.longitude) : undefined,
    openingHours: WEEKDAYS.map((day) => ({
      dayOfWeek: day,
      closed: form.openingHours[day].closed,
      openingTime: form.openingHours[day].closed
        ? undefined
        : form.openingHours[day].openingTime,
      closingTime: form.openingHours[day].closed
        ? undefined
        : form.openingHours[day].closingTime,
    })),
    responsibleId: form.responsibleId ? Number(form.responsibleId) : undefined,
    manuallyClosed: form.manuallyClosed === 'true',
    mobileAvailability: form.mobileAvailability === 'true',
    maxCapacity: Number(form.maxCapacity),
    capacityUnit: form.capacityUnit,
    commission: form.commission.trim() !== '' ? Number(form.commission) : undefined,
    commissionPercentage:
      form.commissionPercentage.trim() !== ''
        ? Number(form.commissionPercentage)
        : undefined,
  };
}

function ZoneDialog({
  open,
  cities,
  value,
  errors,
  loading,
  editing,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  cities: CityResponse[];
  value: ZoneFormState;
  errors: ZoneFormErrors;
  loading: boolean;
  editing: boolean;
  onChange: (value: ZoneFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg border-border bg-card p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier la zone' : 'Ajouter une zone'}</DialogTitle>
          <DialogDescription>
            Chaque zone est rattachee a une ville existante.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ville</Label>
            <Select value={value.cityId} onValueChange={(cityId) => onChange({ ...value, cityId })}>
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Selectionnez une ville" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.cityId} value={String(city.cityId)}>
                    {city.cityName}, {city.countryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cityId && <p className="text-xs text-destructive">{errors.cityId}</p>}
          </div>
          <div className="space-y-2">
            <Label>Nom de la zone</Label>
            <Input
              value={value.name}
              onChange={(event) => onChange({ ...value, name: event.target.value })}
              placeholder="Centre-ville"
              className="bg-secondary"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PointDialog({
  open,
  zones,
  cities,
  responsibles,
  value,
  errors,
  loading,
  editing,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  zones: ZoneResponse[];
  cities: CityResponse[];
  responsibles: UserResponse[];
  value: PointFormState;
  errors: PointFormErrors;
  loading: boolean;
  editing: boolean;
  onChange: (value: PointFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value.photo) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(value.photo);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [value.photo]);

  const selectedZone = zones.find((zone) => String(zone.id) === value.zoneId) ?? null;
  const cityCandidates = selectedZone ? getCityCandidatesForZone(selectedZone, cities) : cities;
  const resolvedCity =
    value.cityId !== ''
      ? cities.find((city) => String(city.cityId) === value.cityId) ?? null
      : null;
  const needsManualCitySelection = selectedZone !== null && resolvedCity === null;
  const currentPhotoUrl = (previewUrl ?? value.existingPhotoUrl) || null;

  const onHourChange = (
    day: CollectionPointDayOfWeek,
    patch: Partial<PointFormState['openingHours'][CollectionPointDayOfWeek]>,
  ) => {
    onChange({
      ...value,
      openingHours: {
        ...value.openingHours,
        [day]: { ...value.openingHours[day], ...patch },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto border-0 bg-card p-4 sm:h-auto sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:rounded-2xl sm:border sm:border-border sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Modifier le point de collecte' : 'Creer un point de collecte'}
          </DialogTitle>
          <DialogDescription>
            Le point reste aligne sur les endpoints de gestion: photo, disponibilite, commissions et responsable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={value.name}
                    onChange={(event) => onChange({ ...value, name: event.target.value })}
                    className="bg-secondary"
                    placeholder="Agence Bonamoussadi"
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Zone</Label>
                  <Select
                    value={value.zoneId}
                    onValueChange={(zoneId) => {
                      const nextZone = zones.find((zone) => String(zone.id) === zoneId);
                      const nextCityId = nextZone ? getCityIdFromZone(nextZone, cities) : undefined;
                      onChange({
                        ...value,
                        zoneId,
                        cityId: nextCityId ? String(nextCityId) : '',
                      });
                    }}
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue placeholder="Selectionnez une zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={String(zone.id)}>
                          {zone.name} • {getZoneLocationLabel(zone, cities)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.zoneId && <p className="text-xs text-destructive">{errors.zoneId}</p>}
                </div>
              </div>

              <div className={selectedZone && !needsManualCitySelection ? 'hidden' : 'space-y-2'}>
                <Label>Ville de rattachement</Label>
                <Select
                  value={value.cityId || 'none'}
                  onValueChange={(cityId) =>
                    onChange({ ...value, cityId: cityId === 'none' ? '' : cityId })
                  }
                >
                  <SelectTrigger className="w-full bg-secondary">
                    <SelectValue placeholder="Selectionnez une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Laisser l'API deduire depuis la zone</SelectItem>
                    {cityCandidates.map((city) => (
                      <SelectItem key={city.cityId} value={String(city.cityId)}>
                        {city.cityName}, {city.countryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedZone && (
                  <p className="text-xs text-muted-foreground">
                    Si la zone ne permet pas de retrouver automatiquement la ville, vous pouvez la preciser ici.
                  </p>
                )}
              </div>

              {selectedZone && !needsManualCitySelection && (
                <div className="space-y-2">
                  <Label>Ville deduite</Label>
                  <div className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                    {resolvedCity
                      ? `${resolvedCity.cityName}, ${resolvedCity.countryName}`
                      : selectedZone.city.cityName}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Adresse</Label>
                <Textarea
                  value={value.address}
                  onChange={(event) => onChange({ ...value, address: event.target.value })}
                  className="min-h-24 bg-secondary"
                  placeholder="Rue, quartier, repere..."
                />
                {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Telephone</Label>
                  <Input
                    value={value.phone}
                    onChange={(event) => onChange({ ...value, phone: event.target.value })}
                    className="bg-secondary"
                    placeholder="+237 6 90 00 00 00"
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select
                    value={value.responsibleId || 'none'}
                    onValueChange={(responsibleId) =>
                      onChange({
                        ...value,
                        responsibleId: responsibleId === 'none' ? '' : responsibleId,
                      })
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue placeholder="Aucun responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun responsable</SelectItem>
                      {responsibles.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.firstName} {user.lastName} (@{user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>Capacite max</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value.maxCapacity}
                    onChange={(event) => onChange({ ...value, maxCapacity: event.target.value })}
                    className="bg-secondary"
                  />
                  {errors.maxCapacity && (
                    <p className="text-xs text-destructive">{errors.maxCapacity}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Unite</Label>
                  <Select
                    value={value.capacityUnit}
                    onValueChange={(capacityUnit: CollectionPointCapacityUnit) =>
                      onChange({ ...value, capacityUnit })
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="M3">M3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Commission fixe</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value.commission}
                    onChange={(event) => onChange({ ...value, commission: event.target.value })}
                    className="bg-secondary"
                    placeholder="Optionnel"
                  />
                  {errors.commission && (
                    <p className="text-xs text-destructive">{errors.commission}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Commission (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={value.commissionPercentage}
                    onChange={(event) =>
                      onChange({ ...value, commissionPercentage: event.target.value })
                    }
                    className="bg-secondary"
                    placeholder="Optionnel"
                  />
                  {errors.commissionPercentage && (
                    <p className="text-xs text-destructive">{errors.commissionPercentage}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    value={value.latitude}
                    onChange={(event) => onChange({ ...value, latitude: event.target.value })}
                    className="bg-secondary"
                    placeholder="4.0511"
                  />
                  {errors.latitude && <p className="text-xs text-destructive">{errors.latitude}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    value={value.longitude}
                    onChange={(event) => onChange({ ...value, longitude: event.target.value })}
                    className="bg-secondary"
                    placeholder="9.7679"
                  />
                  {errors.longitude && (
                    <p className="text-xs text-destructive">{errors.longitude}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-3 rounded-2xl border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Photo du point</p>
                  <p className="text-sm text-muted-foreground">
                    Le contrat API accepte une image en multipart.
                  </p>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    onChange({ ...value, photo: file });
                  }}
                />

                {currentPhotoUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-border">
                    <img
                      src={currentPhotoUrl}
                      alt="Photo du point"
                      className="h-44 w-full object-cover sm:h-52"
                    />
                  </div>
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/50 text-sm text-muted-foreground sm:h-52">
                    Aucune photo associee
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    className="gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {value.photo || value.existingPhotoUrl ? 'Remplacer la photo' : 'Ajouter une photo'}
                  </Button>
                  {value.photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        onChange({ ...value, photo: null });
                        if (fileRef.current) {
                          fileRef.current.value = '';
                        }
                      }}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Retirer le nouveau fichier
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">Visibilite mobile</p>
                    <p className="text-sm text-muted-foreground">
                      Controle l'exposition du point sur les parcours mobiles.
                    </p>
                  </div>
                  <Select
                    value={value.mobileAvailability}
                    onValueChange={(mobileAvailability: 'true' | 'false') =>
                      onChange({ ...value, mobileAvailability })
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary sm:max-w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Visible</SelectItem>
                      <SelectItem value="false">Masque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">Fermeture manuelle</p>
                    <p className="text-sm text-muted-foreground">
                      Utile pour garder le point dans le reseau tout en le fermant temporairement.
                    </p>
                  </div>
                  <Select
                    value={value.manuallyClosed}
                    onValueChange={(manuallyClosed: 'true' | 'false') =>
                      onChange({ ...value, manuallyClosed })
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary sm:max-w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Ouvert</SelectItem>
                      <SelectItem value="true">Ferme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Horaires d'ouverture</p>
              <p className="text-sm text-muted-foreground">
                Les jours ouverts doivent avoir des horaires coherents.
              </p>
            </div>

            <div className="space-y-3">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-[100px_120px_minmax(0,1fr)_minmax(0,1fr)]"
                >
                  <div className="font-medium text-foreground">{WEEKDAY_LABELS[day]}</div>
                  <Button
                    type="button"
                    variant={value.openingHours[day].closed ? 'outline' : 'default'}
                    onClick={() =>
                      onHourChange(day, { closed: !value.openingHours[day].closed })
                    }
                  >
                    {value.openingHours[day].closed ? 'Ferme' : 'Ouvert'}
                  </Button>
                  <Input
                    type="time"
                    disabled={value.openingHours[day].closed}
                    value={value.openingHours[day].openingTime}
                    onChange={(event) =>
                      onHourChange(day, { openingTime: event.target.value })
                    }
                    className="bg-secondary"
                  />
                  <Input
                    type="time"
                    disabled={value.openingHours[day].closed}
                    value={value.openingHours[day].closingTime}
                    onChange={(event) =>
                      onHourChange(day, { closingTime: event.target.value })
                    }
                    className="bg-secondary"
                  />
                </div>
              ))}
            </div>

            {errors.openingHours && (
              <p className="text-xs text-destructive">{errors.openingHours}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Enregistrement...' : editing ? 'Mettre a jour' : 'Creer le point'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CollectionPointsInner({
  companyId,
  companyName,
}: {
  companyId: number;
  companyName: string;
}) {
  const token = useAuthStore((state) => state.token);
  const { toast, success, error: showError } = useToastSimple();
  const {
    loading,
    error,
    saving,
    actionPointId,
    zones,
    cities,
    points,
    responsibles,
    refresh,
    saveZone,
    removeZone,
    savePoint,
    removePoint,
    togglePointAvailability,
    deactivatePoint,
    activatePoint,
  } = useCollectionPointsManager({ companyId, token });

  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'all' | string>('all');
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState<ZoneFormState>({ name: '', cityId: '' });
  const [zoneErrors, setZoneErrors] = useState<ZoneFormErrors>({});
  const [pointForm, setPointForm] = useState<PointFormState>(createDefaultPointForm());
  const [pointErrors, setPointErrors] = useState<PointFormErrors>({});
  const [editingZone, setEditingZone] = useState<ZoneResponse | null>(null);
  const [editingPoint, setEditingPoint] = useState<CollectionPointResponse | null>(null);
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<ZoneResponse | null>(null);
  const [deletePointTarget, setDeletePointTarget] = useState<CollectionPointResponse | null>(null);
  const [deactivatePointTarget, setDeactivatePointTarget] =
    useState<CollectionPointResponse | null>(null);
  const [activatePointTarget, setActivatePointTarget] =
    useState<CollectionPointResponse | null>(null);

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return points.filter((point) => {
      const matchesZone = zoneFilter === 'all' || String(point.zone.id) === zoneFilter;
      if (!matchesZone) {
        return false;
      }

      if (!q) {
        return true;
      }

      return [
        point.name,
        point.reference ?? '',
        point.address,
        point.phone,
        point.zone.name,
        point.city.cityName,
        point.responsible
          ? `${point.responsible.firstName} ${point.responsible.lastName} ${point.responsible.username}`
          : '',
        point.availabilityMessage ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [points, search, zoneFilter]);

  const pointCountByZone = useMemo(() => {
    const counts = new Map<number, number>();
    points.forEach((point) => {
      counts.set(point.zone.id, (counts.get(point.zone.id) ?? 0) + 1);
    });
    return counts;
  }, [points]);

  const stats = useMemo(
    () => ({
      active: points.filter((point) => point.active).length,
      deactivated: points.filter((point) => !point.active).length,
      openNow: points.filter((point) => getAvailabilityStatus(point) === 'OPEN').length,
      mobileVisible: points.filter((point) => point.mobileAvailability && point.active).length,
    }),
    [points],
  );

  const openZoneCreate = () => {
    setEditingZone(null);
    setZoneForm({ name: '', cityId: '' });
    setZoneErrors({});
    setZoneDialogOpen(true);
  };

  const openZoneEdit = (zone: ZoneResponse) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      cityId: String(getCityIdFromZone(zone, cities) ?? ''),
    });
    setZoneErrors({});
    setZoneDialogOpen(true);
  };

  const openPointCreate = () => {
    setEditingPoint(null);
    setPointForm(createDefaultPointForm());
    setPointErrors({});
    setPointDialogOpen(true);
  };

  const openPointEdit = (point: CollectionPointResponse) => {
    setEditingPoint(point);
    setPointForm(createPointFormFromResponse(point, cities));
    setPointErrors({});
    setPointDialogOpen(true);
  };

  const handleSaveZone = async () => {
    const errors = validateZoneForm(zoneForm);
    setZoneErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await saveZone(
        {
          name: zoneForm.name.trim(),
          cityId: Number(zoneForm.cityId),
        },
        editingZone?.id,
      );
      success(editingZone ? 'Zone mise a jour' : 'Zone creee');
      setZoneDialogOpen(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  };

  const handleSavePoint = async () => {
    const errors = validatePointForm(pointForm);
    setPointErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const payload = buildPointPayload(pointForm, zones, cities);
      await savePoint({
        pointId: editingPoint?.id,
        payload,
        photo: pointForm.photo ?? undefined,
      });
      success(editingPoint ? 'Point de collecte mis a jour' : 'Point de collecte cree');
      setPointDialogOpen(false);
    } catch (err) {
      showError(getErrorMessage(err));
    }
  };

  const handleDeleteZone = async () => {
    if (!deleteZoneTarget) {
      return;
    }

    try {
      await removeZone(deleteZoneTarget.id);
      success('Zone supprimee');
      setDeleteZoneTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Suppression impossible');
    }
  };

  const handleDeletePoint = async () => {
    if (!deletePointTarget) {
      return;
    }

    try {
      const response = await removePoint(deletePointTarget.id);
      success(response.message || 'Point de collecte supprime');
      setDeletePointTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Suppression impossible');
    }
  };

  const handleDeactivatePoint = async () => {
    if (!deactivatePointTarget) {
      return;
    }

    try {
      const response = await deactivatePoint(deactivatePointTarget.id);
      success(response.message || 'Point desactive');
      setDeactivatePointTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Desactivation impossible');
    }
  };

  const handleActivatePoint = async () => {
    if (!activatePointTarget) {
      return;
    }

    try {
      const response = await activatePoint(activatePointTarget.id);
      success(response.message || 'Point active');
      setActivatePointTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Activation impossible');
    }
  };

  const handleToggleAvailability = async (point: CollectionPointResponse) => {
    try {
      await togglePointAvailability(point);
      success(point.manuallyClosed ? 'Point rouvert' : 'Point ferme manuellement');
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Action impossible');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <StatusState
        icon={MapPin}
        tone="destructive"
        title="Erreur de chargement"
        description={error}
        action={
          <Button variant="outline" onClick={() => void refresh()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reessayer
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <ToastBar toast={toast} />

      <ZoneDialog
        open={zoneDialogOpen}
        cities={cities}
        value={zoneForm}
        errors={zoneErrors}
        loading={saving}
        editing={!!editingZone}
        onChange={setZoneForm}
        onClose={() => setZoneDialogOpen(false)}
        onSubmit={() => void handleSaveZone()}
      />

      <PointDialog
        open={pointDialogOpen}
        zones={zones}
        cities={cities}
        responsibles={responsibles}
        value={pointForm}
        errors={pointErrors}
        loading={saving}
        editing={!!editingPoint}
        onChange={setPointForm}
        onClose={() => setPointDialogOpen(false)}
        onSubmit={() => void handleSavePoint()}
      />

      <ConfirmDialog
        open={!!deleteZoneTarget}
        title="Supprimer la zone"
        description={
          deleteZoneTarget && (pointCountByZone.get(deleteZoneTarget.id) ?? 0) > 0
            ? 'Cette zone contient encore des points de collecte. Supprimez-les ou deplacez-les avant.'
            : 'Cette action supprimera definitivement la zone.'
        }
        confirmLabel="Supprimer"
        destructive
        loading={saving}
        onConfirm={() => void handleDeleteZone()}
        onCancel={() => setDeleteZoneTarget(null)}
      />

      <ConfirmDialog
        open={!!deactivatePointTarget}
        title="Desactiver le point"
        description="Le point restera historise mais il ne sera plus exploitable par les parcours actifs."
        confirmLabel="Desactiver"
        destructive
        loading={actionPointId === deactivatePointTarget?.id}
        onConfirm={() => void handleDeactivatePoint()}
        onCancel={() => setDeactivatePointTarget(null)}
      />

      <ConfirmDialog
        open={!!activatePointTarget}
        title="Activer le point"
        description="Le point sera de nouveau exploitable par les parcours actifs selon sa configuration."
        confirmLabel="Activer"
        loading={actionPointId === activatePointTarget?.id}
        onConfirm={() => void handleActivatePoint()}
        onCancel={() => setActivatePointTarget(null)}
      />

      <ConfirmDialog
        open={!!deletePointTarget}
        title="Supprimer le point"
        description="Cette action supprimera definitivement le point de collecte."
        confirmLabel="Supprimer"
        destructive
        loading={saving}
        onConfirm={() => void handleDeletePoint()}
        onCancel={() => setDeletePointTarget(null)}
      />

      <SectionHeader
        title="Zones et points de collecte"
        subtitle={`Administration du maillage logistique de ${companyName}.`}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              variant="outline"
              onClick={openZoneCreate}
              className="w-full gap-2 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Nouvelle zone
            </Button>
            <Button onClick={openPointCreate} className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Nouveau point
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground sm:text-2xl">{zones.length}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Zones actives</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-chart-2/15 p-3 text-chart-2">
              <Warehouse className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground sm:text-2xl">{stats.active}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Points actifs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-warning/15 p-3 text-warning">
              <Eye className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground sm:text-2xl">{stats.mobileVisible}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Visibles mobile</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-destructive/15 p-3 text-destructive">
              <PowerOff className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground sm:text-2xl">{stats.deactivated}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Desactives</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[380px_1fr]">
        <Card className="border-border bg-card">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Zones geographiques</h3>
              <Button variant="ghost" size="sm" onClick={openZoneCreate}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {zones.length === 0 ? (
              <StatusState
                icon={MapPin}
                title="Aucune zone"
                description="Commencez par creer une premiere zone operationnelle."
              />
            ) : (
              <div className="space-y-3">
                {zones.map((zone) => (
                  <div key={zone.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{zone.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getZoneLocationLabel(zone, cities)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pointCountByZone.get(zone.id) ?? 0} point(s)
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openZoneEdit(zone)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteZoneTarget(zone)}
                          disabled={(pointCountByZone.get(zone.id) ?? 0) > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un point, une reference, un responsable..."
                className="bg-secondary"
              />
              <Select value={zoneFilter} onValueChange={(value) => setZoneFilter(value)}>
                <SelectTrigger className="w-full bg-secondary md:w-72">
                  <SelectValue placeholder="Toutes les zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les zones</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={String(zone.id)}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredPoints.length === 0 ? (
              <StatusState
                icon={Warehouse}
                title={points.length === 0 ? 'Aucun point de collecte' : 'Aucun resultat'}
                description={
                  points.length === 0
                    ? 'Ajoutez votre premier point de collecte pour commencer.'
                    : 'Aucun point ne correspond a votre recherche.'
                }
                action={
                  points.length === 0 ? (
                    <Button onClick={openPointCreate} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter un point
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-4">
                {filteredPoints.map((point) => {
                  const availabilityStatus = getAvailabilityStatus(point);
                  const isBusy = actionPointId === point.id;

                  return (
                    <div
                      key={point.id}
                      className="group relative overflow-hidden rounded-[28px] border border-border/80 bg-gradient-to-br from-card via-card to-secondary/10 p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] transition-colors hover:border-border xl:p-5"
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                      <div className="pointer-events-none absolute -right-16 top-0 hidden h-40 w-40 rounded-full bg-primary/8 blur-3xl xl:block" />

                      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_240px] xl:items-start xl:gap-5">
                        <div className="flex w-full min-w-0 flex-1 flex-col gap-4 sm:flex-row">
                          <div className="overflow-hidden rounded-2xl border border-border bg-secondary/50 sm:hidden">
                            {point.photoUrl ? (
                              <img
                                src={point.photoUrl}
                                alt={point.name}
                                className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="flex h-24 items-center justify-center text-muted-foreground">
                                <Warehouse className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="hidden h-28 w-32 shrink-0 overflow-hidden rounded-[22px] border border-border/80 bg-secondary/50 shadow-sm sm:block">
                            {point.photoUrl ? (
                              <img
                                src={point.photoUrl}
                                alt={point.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-muted-foreground">
                                <Warehouse className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="w-full min-w-0 space-y-3">
                            <div className="space-y-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="min-w-0 break-words text-lg font-semibold leading-tight text-foreground 2xl:text-[1.65rem]">
                                  {point.name}
                                </p>
                                {point.reference && (
                                  <Badge className="bg-secondary/80 text-muted-foreground">
                                    Ref {point.reference}
                                  </Badge>
                                )}
                                <Badge className={getAvailabilityBadgeClass(availabilityStatus)}>
                                  {getAvailabilityLabel(availabilityStatus)}
                                </Badge>
                                <Badge className="bg-primary/10 text-primary">
                                  {point.zone.name}
                                </Badge>
                                <Badge className="bg-secondary text-muted-foreground">
                                  {point.mobileAvailability ? 'Visible mobile' : 'Masque mobile'}
                                </Badge>
                              </div>

                              <p className="max-w-3xl min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-muted-foreground 2xl:text-[15px]">
                                {point.address}
                              </p>
                            </div>

                            <div className="grid w-full gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                              <PointMetaCard label="Ville">
                                <p className="min-w-0 leading-6 [overflow-wrap:anywhere]">
                                  {getPointCityLabel(point, cities)}
                                </p>
                              </PointMetaCard>

                              <PointMetaCard label="Contact">
                                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
                                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span className="min-w-0 tabular-nums leading-6 [overflow-wrap:anywhere]">
                                    {point.phone}
                                  </span>
                                </div>
                              </PointMetaCard>

                              <PointMetaCard label="Capacite">
                                <p className="min-w-0 leading-6 [overflow-wrap:anywhere]">
                                  {point.maxCapacity} {point.capacityUnit}
                                </p>
                              </PointMetaCard>

                              {(point.commission != null || point.commissionPercentage != null) && (
                                <PointMetaCard label="Commission">
                                  <p className="min-w-0 leading-6 [overflow-wrap:anywhere]">
                                    {point.commission != null ? `Fixe ${point.commission}` : 'Fixe --'}
                                    {point.commissionPercentage != null
                                      ? ` • ${point.commissionPercentage}%`
                                      : ''}
                                  </p>
                                </PointMetaCard>
                              )}

                              {point.responsible && (
                                <PointMetaCard label="Responsable">
                                  <p className="min-w-0 leading-6 [overflow-wrap:anywhere]">
                                    {point.responsible.firstName} {point.responsible.lastName}
                                  </p>
                                </PointMetaCard>
                              )}

                              {(point.latitude != null || point.longitude != null) && (
                                <PointMetaCard label="GPS">
                                  <p className="min-w-0 font-mono text-[13px] leading-6 [overflow-wrap:anywhere]">
                                    {point.latitude ?? '--'}, {point.longitude ?? '--'}
                                  </p>
                                </PointMetaCard>
                              )}
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-secondary/20 px-3.5 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                                Horaires
                              </p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {formatHours(point)}
                              </p>
                            </div>

                            {point.availabilityMessage && (
                              <p className="text-xs leading-5 text-muted-foreground">
                                {point.availabilityMessage}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap xl:min-w-[240px] xl:grid-cols-1 xl:content-start xl:rounded-2xl xl:border xl:border-border/60 xl:bg-black/10 xl:p-2.5">
                          <Button
                            variant="outline"
                            onClick={() => openPointEdit(point)}
                            className="w-full gap-2 sm:w-auto xl:w-full xl:justify-start"
                          >
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => void handleToggleAvailability(point)}
                            className="w-full gap-2 sm:w-auto xl:w-full xl:justify-start"
                            disabled={isBusy || !point.active}
                          >
                            {point.manuallyClosed ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                            {isBusy
                              ? 'Traitement...'
                              : point.manuallyClosed
                                ? 'Rouvrir'
                                : 'Fermer'}
                          </Button>

                          {point.active && (
                            <Button
                              variant="outline"
                              onClick={() => setDeactivatePointTarget(point)}
                              className="w-full gap-2 text-destructive hover:text-destructive sm:w-auto xl:w-full xl:justify-start"
                              disabled={isBusy}
                            >
                              <PowerOff className="h-4 w-4" />
                              Desactiver
                            </Button>
                          )}

                          {!point.active && (
                            <Button
                              variant="outline"
                              onClick={() => setActivatePointTarget(point)}
                              className="w-full gap-2 text-success hover:text-success sm:w-auto xl:w-full xl:justify-start"
                              disabled={isBusy}
                            >
                              <Power className="h-4 w-4" />
                              {isBusy ? 'Traitement...' : 'Activer'}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            onClick={() => setDeletePointTarget(point)}
                            className="w-full gap-2 sm:w-auto xl:w-full xl:justify-start"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {points.length > 0 && (
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                {stats.openNow} point(s) actuellement ouverts selon les horaires et {stats.deactivated} desactives.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CollectionPointsView(_props: {
  currentRole?: unknown;
  currentUser?: unknown;
}) {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CollectionPointsInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}
