'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { getCompanyEmployees } from '@/lib/admin/api';
import {
  assignCollectionPointResponsible,
  createCollectionPoint,
  createZone,
  deleteCollectionPoint,
  deleteZone,
  getCities,
  getCollectionPoints,
  getZones,
  manuallyCloseCollectionPoint,
  reopenCollectionPoint,
  updateCollectionPoint,
  updateZone,
} from '@/lib/company/api';
import type {
  CityResponse,
  CollectionPointCapacityUnit,
  CollectionPointDayOfWeek,
  CollectionPointRequest,
  CollectionPointResponse,
  ZoneResponse,
} from '@/lib/company/types';
import type { UserResponse } from '@/lib/auth/types';
import {
  CompanyGuard,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';

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
  commissionPercentage: string;
  latitude: string;
  longitude: string;
  openingHours: Record<CollectionPointDayOfWeek, { closed: boolean; openingTime: string; closingTime: string }>;
};

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
    commissionPercentage: '',
    latitude: '',
    longitude: '',
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

function createPointFormFromResponse(
  point: CollectionPointResponse,
  zones: ZoneResponse[],
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
    cityId: String(getCityIdFromZone(point.zone, cities) ?? ''),
    responsibleId: point.responsible ? String(point.responsible.id) : '',
    mobileAvailability: String(point.mobileAvailability) as 'true' | 'false',
    manuallyClosed: String(point.manuallyClosed) as 'false' | 'true',
    maxCapacity: String(point.maxCapacity),
    capacityUnit: point.capacityUnit,
    commissionPercentage: point.commissionPercentage != null ? String(point.commissionPercentage) : '',
    latitude: point.latitude != null ? String(point.latitude) : '',
    longitude: point.longitude != null ? String(point.longitude) : '',
  };
}

function formatHours(point: CollectionPointResponse) {
  const openDays = point.openingHours.filter((item) => !item.closed);
  if (openDays.length === 0) return 'Horaires non définis';
  return openDays
    .map((item) => `${WEEKDAY_LABELS[item.dayOfWeek]} ${item.openingTime ?? '--'}-${item.closingTime ?? '--'}`)
    .join(' • ');
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getCityIdFromZone(zone: ZoneResponse, cities: CityResponse[]) {
  const normalizedZoneCityName = normalizeText(zone.city.cityName);
  const match = cities.find(
    (city) =>
      city.countryId === zone.city.countryId &&
      normalizeText(city.cityName) === normalizedZoneCityName,
  );
  return match?.cityId;
}

function getCityCandidatesForZone(zone: ZoneResponse, cities: CityResponse[]) {
  const normalizedZoneCityName = normalizeText(zone.city.cityName);
  const sameCountry = cities.filter((city) => city.countryId === zone.city.countryId);
  const exactMatches = sameCountry.filter(
    (city) => normalizeText(city.cityName) === normalizedZoneCityName,
  );

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  return sameCountry;
}

function getZoneLocationLabel(zone: ZoneResponse, cities: CityResponse[]) {
  const city = cities.find(
    (item) => item.cityName === zone.city.cityName && item.countryId === zone.city.countryId,
  );
  return city ? `${city.cityName}, ${city.countryName}` : zone.city.cityName;
}

function getPointCity(zoneId: number, zones: ZoneResponse[], cities: CityResponse[]) {
  const zone = zones.find((item) => item.id === zoneId);
  if (!zone) return null;
  const cityId = getCityIdFromZone(zone, cities);
  return cityId ? cities.find((city) => city.cityId === cityId) ?? null : null;
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

  return 'Enregistrement impossible';
}

function buildPointPayload(form: PointFormState, zones: ZoneResponse[], cities: CityResponse[]): CollectionPointRequest {
  const zoneId = Number(form.zoneId);
  const zone = zones.find((item) => item.id === zoneId);
  const cityId = form.cityId ? Number(form.cityId) : undefined;

  if (!zone || !cityId) {
    throw new Error('Zone ou ville introuvable');
  }

  return {
    name: form.name.trim(),
    address: form.address.trim(),
    phone: form.phone.trim(),
    zoneId,
    cityId,
    mobileAvailability: form.mobileAvailability === 'true',
    manuallyClosed: form.manuallyClosed === 'true',
    maxCapacity: Number(form.maxCapacity),
    capacityUnit: form.capacityUnit,
    responsibleId: form.responsibleId ? Number(form.responsibleId) : undefined,
    commissionPercentage:
      form.commissionPercentage.trim() !== '' ? Number(form.commissionPercentage) : undefined,
    latitude: form.latitude.trim() !== '' ? Number(form.latitude) : undefined,
    longitude: form.longitude.trim() !== '' ? Number(form.longitude) : undefined,
    openingHours: WEEKDAYS.map((day) => ({
      dayOfWeek: day,
      closed: form.openingHours[day].closed,
      openingTime: form.openingHours[day].closed ? undefined : form.openingHours[day].openingTime,
      closingTime: form.openingHours[day].closed ? undefined : form.openingHours[day].closingTime,
    })),
  };
}

function ZoneDialog({
  open,
  cities,
  value,
  loading,
  editing,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  cities: CityResponse[];
  value: ZoneFormState;
  loading: boolean;
  editing: boolean;
  onChange: (value: ZoneFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier la zone' : 'Ajouter une zone'}</DialogTitle>
          <DialogDescription>Chaque zone est rattachée à une ville existante.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ville</Label>
            <Select value={value.cityId} onValueChange={(cityId) => onChange({ ...value, cityId })}>
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Sélectionnez une ville" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.cityId} value={String(city.cityId)}>
                    {city.cityName}, {city.countryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nom de la zone</Label>
            <Input
              value={value.name}
              onChange={(event) => onChange({ ...value, name: event.target.value })}
              placeholder="Centre-ville"
              className="bg-secondary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={loading || !value.name.trim() || !value.cityId}>
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
  loading: boolean;
  editing: boolean;
  onChange: (value: PointFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const selectedZone = zones.find((zone) => String(zone.id) === value.zoneId) ?? null;
  const cityCandidates = selectedZone ? getCityCandidatesForZone(selectedZone, cities) : cities;
  const resolvedCity =
    value.cityId !== ''
      ? cities.find((city) => String(city.cityId) === value.cityId) ?? null
      : null;
  const needsManualCitySelection =
    selectedZone !== null &&
    (value.cityId === '' || resolvedCity === null);

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
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-x-hidden overflow-y-auto border-border bg-card p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier le point de collecte' : 'Créer un point de collecte'}</DialogTitle>
          <DialogDescription>
            Le point sera visible dans l’entreprise et sur mobile selon sa disponibilité.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Nom</Label>
              <Input
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                className="bg-secondary"
                placeholder="Agence Bonamoussadi"
              />
            </div>
            <div className="min-w-0 space-y-2">
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
                  <SelectValue placeholder="Sélectionnez une zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={String(zone.id)}>
                      {zone.name} • {getZoneLocationLabel(zone, cities)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedZone && !needsManualCitySelection && (
            <div className="min-w-0 space-y-2">
              <Label>Ville</Label>
              <div className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                {resolvedCity ? `${resolvedCity.cityName}, ${resolvedCity.countryName}` : selectedZone.city.cityName}
              </div>
            </div>
          )}

          <div className={selectedZone && !needsManualCitySelection ? 'hidden' : 'min-w-0 space-y-2'}>
            <Label>Ville</Label>
            <Select
              value={value.cityId || 'none'}
              onValueChange={(cityId) => onChange({ ...value, cityId: cityId === 'none' ? '' : cityId })}
            >
              <SelectTrigger className="w-full bg-secondary">
                <SelectValue placeholder="Sélectionnez une ville" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sélectionner une ville</SelectItem>
                {cityCandidates.map((city) => (
                  <SelectItem key={city.cityId} value={String(city.cityId)}>
                    {city.cityName}, {city.countryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!value.cityId && (
              <p className="text-xs text-warning">
                La ville n&apos;a pas pu être déduite automatiquement depuis la zone. Sélectionnez-la manuellement.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Adresse</Label>
            <Textarea
              value={value.address}
              onChange={(event) => onChange({ ...value, address: event.target.value })}
              className="min-h-24 w-full bg-secondary"
              placeholder="Rue, quartier, repère..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={value.phone}
                onChange={(event) => onChange({ ...value, phone: event.target.value })}
                className="bg-secondary"
                placeholder="+237 6 90 00 00 00"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Responsable</Label>
              <Select
                value={value.responsibleId || 'none'}
                onValueChange={(responsibleId) =>
                  onChange({ ...value, responsibleId: responsibleId === 'none' ? '' : responsibleId })
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
            <div className="min-w-0 space-y-2">
              <Label>Capacité max</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value.maxCapacity}
                onChange={(event) => onChange({ ...value, maxCapacity: event.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Unité</Label>
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
            <div className="min-w-0 space-y-2">
              <Label>Commission (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={value.commissionPercentage}
                onChange={(event) => onChange({ ...value, commissionPercentage: event.target.value })}
                className="bg-secondary"
                placeholder="Optionnel"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Disponibilité mobile</Label>
              <Select
                value={value.mobileAvailability}
                onValueChange={(mobileAvailability: 'true' | 'false') =>
                  onChange({ ...value, mobileAvailability })
                }
              >
                <SelectTrigger className="w-full bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Visible</SelectItem>
                  <SelectItem value="false">Masqué</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Latitude</Label>
              <Input
                value={value.latitude}
                onChange={(event) => onChange({ ...value, latitude: event.target.value })}
                className="bg-secondary"
                placeholder="4.0511"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label>Longitude</Label>
              <Input
                value={value.longitude}
                onChange={(event) => onChange({ ...value, longitude: event.target.value })}
                className="bg-secondary"
                placeholder="9.7679"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Fermeture manuelle</p>
                <p className="text-sm text-muted-foreground">Permet de garder le point interne mais fermé temporairement.</p>
              </div>
              <Select
                value={value.manuallyClosed}
                onValueChange={(manuallyClosed: 'false' | 'true') =>
                  onChange({ ...value, manuallyClosed })
                }
              >
                <SelectTrigger className="w-full max-w-40 bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Ouvert</SelectItem>
                  <SelectItem value="true">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border p-4">
            <p className="font-medium text-foreground">Horaires d’ouverture</p>
            <div className="space-y-3">
              {WEEKDAYS.map((day) => (
                <div key={day} className="grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-[100px_120px_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="min-w-0 font-medium text-foreground">{WEEKDAY_LABELS[day]}</div>
                  <Button
                    type="button"
                    variant={value.openingHours[day].closed ? 'outline' : 'default'}
                    onClick={() => onHourChange(day, { closed: !value.openingHours[day].closed })}
                  >
                    {value.openingHours[day].closed ? 'Fermé' : 'Ouvert'}
                  </Button>
                  <Input
                    type="time"
                    disabled={value.openingHours[day].closed}
                    value={value.openingHours[day].openingTime}
                    onChange={(event) => onHourChange(day, { openingTime: event.target.value })}
                    className="min-w-0 bg-secondary"
                  />
                  <Input
                    type="time"
                    disabled={value.openingHours[day].closed}
                    value={value.openingHours[day].closingTime}
                    onChange={(event) => onHourChange(day, { closingTime: event.target.value })}
                    className="min-w-0 bg-secondary"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer le point'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CollectionPointsInner({ companyId, companyName }: { companyId: number; companyName: string }) {
  const token = useAuthStore((state) => state.token);
  const { toast, success, error: showError } = useToastSimple();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneResponse[]>([]);
  const [cities, setCities] = useState<CityResponse[]>([]);
  const [points, setPoints] = useState<CollectionPointResponse[]>([]);
  const [employees, setEmployees] = useState<UserResponse[]>([]);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'all' | string>('all');
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState<ZoneFormState>({ name: '', cityId: '' });
  const [pointForm, setPointForm] = useState<PointFormState>(createDefaultPointForm());
  const [editingZone, setEditingZone] = useState<ZoneResponse | null>(null);
  const [editingPoint, setEditingPoint] = useState<CollectionPointResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<ZoneResponse | null>(null);
  const [deletePointTarget, setDeletePointTarget] = useState<CollectionPointResponse | null>(null);
  const [actionPointId, setActionPointId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [citiesData, zonesData, pointsData, employeesData] = await Promise.all([
        getCities(),
        getZones(token, companyId),
        getCollectionPoints(token, companyId),
        getCompanyEmployees(token, companyId),
      ]);
      setCities(citiesData);
      setZones(zonesData);
      setPoints(pointsData);
      setEmployees(employeesData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const responsibles = useMemo(
    () =>
      employees.filter((user) =>
        ['ADMIN_COMPANY', 'EMPLOYEE_COMPANY', 'COLLECTOR'].includes(user.role),
      ),
    [employees],
  );

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return points.filter((point) => {
      const matchesZone = zoneFilter === 'all' || String(point.zone.id) === zoneFilter;
      if (!matchesZone) return false;
      if (!q) return true;
      return (
        point.name.toLowerCase().includes(q) ||
        point.address.toLowerCase().includes(q) ||
        point.phone.toLowerCase().includes(q) ||
        point.zone.name.toLowerCase().includes(q)
      );
    });
  }, [points, search, zoneFilter]);

  const pointCountByZone = useMemo(() => {
    const counts = new Map<number, number>();
    points.forEach((point) => {
      counts.set(point.zone.id, (counts.get(point.zone.id) ?? 0) + 1);
    });
    return counts;
  }, [points]);

  const openZoneCreate = () => {
    setEditingZone(null);
    setZoneForm({ name: '', cityId: '' });
    setZoneDialogOpen(true);
  };

  const openZoneEdit = (zone: ZoneResponse) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      cityId: String(getCityIdFromZone(zone, cities) ?? ''),
    });
    setZoneDialogOpen(true);
  };

  const openPointCreate = () => {
    setEditingPoint(null);
    setPointForm(createDefaultPointForm());
    setPointDialogOpen(true);
  };

  const openPointEdit = (point: CollectionPointResponse) => {
    setEditingPoint(point);
    setPointForm(createPointFormFromResponse(point, zones, cities));
    setPointDialogOpen(true);
  };

  const handleSaveZone = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload = { name: zoneForm.name.trim(), cityId: Number(zoneForm.cityId) };
      const zone = editingZone
        ? await updateZone(token, companyId, editingZone.id, payload)
        : await createZone(token, companyId, payload);
      setZones((current) =>
        editingZone ? current.map((item) => (item.id === zone.id ? zone : item)) : [zone, ...current],
      );
      success(editingZone ? 'Zone mise à jour' : 'Zone créée');
      setZoneDialogOpen(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePoint = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload = buildPointPayload(pointForm, zones, cities);
      const saved = editingPoint
        ? await updateCollectionPoint(token, companyId, editingPoint.id, payload)
        : await createCollectionPoint(token, companyId, payload);

      if (saved.responsible == null && payload.responsibleId) {
        const reloaded = await assignCollectionPointResponsible(token, companyId, saved.id, payload.responsibleId);
        setPoints((current) =>
          editingPoint
            ? current.map((item) => (item.id === reloaded.id ? reloaded : item))
            : [reloaded, ...current],
        );
      } else {
        setPoints((current) =>
          editingPoint
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...current],
        );
      }

      success(editingPoint ? 'Point de collecte mis à jour' : 'Point de collecte créé');
      setPointDialogOpen(false);
    } catch (err) {
      console.error('Collection point save failed', err, {
        pointForm,
        editingPointId: editingPoint?.id,
      });
      showError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async () => {
    if (!token || !deleteZoneTarget) return;
    setSaving(true);
    try {
      await deleteZone(token, companyId, deleteZoneTarget.id);
      setZones((current) => current.filter((item) => item.id !== deleteZoneTarget.id));
      success('Zone supprimée');
      setDeleteZoneTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePoint = async () => {
    if (!token || !deletePointTarget) return;
    setSaving(true);
    try {
      await deleteCollectionPoint(token, companyId, deletePointTarget.id);
      setPoints((current) => current.filter((item) => item.id !== deletePointTarget.id));
      success('Point de collecte supprimé');
      setDeletePointTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const togglePointAvailability = async (point: CollectionPointResponse) => {
    if (!token) return;
    setActionPointId(point.id);
    try {
      const updated = point.manuallyClosed
        ? await reopenCollectionPoint(token, companyId, point.id)
        : await manuallyCloseCollectionPoint(token, companyId, point.id);
      setPoints((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      success(point.manuallyClosed ? 'Point rouvert' : 'Point fermé manuellement');
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Action impossible');
    } finally {
      setActionPointId(null);
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
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
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
        loading={saving}
        editing={!!editingZone}
        onChange={setZoneForm}
        onClose={() => setZoneDialogOpen(false)}
        onSubmit={handleSaveZone}
      />

      <PointDialog
        open={pointDialogOpen}
        zones={zones}
        cities={cities}
        responsibles={responsibles}
        value={pointForm}
        loading={saving}
        editing={!!editingPoint}
        onChange={setPointForm}
        onClose={() => setPointDialogOpen(false)}
        onSubmit={handleSavePoint}
      />

      <ConfirmDialog
        open={!!deleteZoneTarget}
        title="Supprimer la zone"
        description={
          deleteZoneTarget && (pointCountByZone.get(deleteZoneTarget.id) ?? 0) > 0
            ? 'Cette zone contient encore des points de collecte. Supprimez ou déplacez-les avant.'
            : 'Cette action supprimera définitivement la zone.'
        }
        confirmLabel="Supprimer"
        destructive
        loading={saving}
        onConfirm={handleDeleteZone}
        onCancel={() => setDeleteZoneTarget(null)}
      />

      <ConfirmDialog
        open={!!deletePointTarget}
        title="Supprimer le point"
        description="Cette action supprimera définitivement le point de collecte."
        confirmLabel="Supprimer"
        destructive
        loading={saving}
        onConfirm={handleDeletePoint}
        onCancel={() => setDeletePointTarget(null)}
      />

      <SectionHeader
        title="Zones et points de collecte"
        subtitle={`Administration du maillage logistique de ${companyName}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openZoneCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle zone
            </Button>
            <Button onClick={openPointCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau point
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{zones.length}</p>
              <p className="text-sm text-muted-foreground">Zones actives</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-chart-2/15 p-3 text-chart-2">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{points.length}</p>
              <p className="text-sm text-muted-foreground">Points de collecte</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-warning/15 p-3 text-warning">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {points.filter((point) => point.mobileAvailability && point.active).length}
              </p>
              <p className="text-sm text-muted-foreground">Visibles sur mobile</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="border-border bg-card">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Zones géographiques</h3>
              <Button variant="ghost" size="sm" onClick={openZoneCreate}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {zones.length === 0 ? (
              <StatusState
                icon={MapPin}
                title="Aucune zone"
                description="Commencez par créer une première zone opérationnelle."
              />
            ) : (
              <div className="space-y-3">
                {zones.map((zone) => (
                  <div key={zone.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{zone.name}</p>
                        <p className="text-sm text-muted-foreground">{getZoneLocationLabel(zone, cities)}</p>
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
                placeholder="Rechercher un point, une zone ou un téléphone..."
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
                title={points.length === 0 ? 'Aucun point de collecte' : 'Aucun résultat'}
                description={
                  points.length === 0
                    ? 'Ajoutez votre premier point de collecte pour commencer.'
                    : 'Aucun point ne correspond à votre recherche.'
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
              <div className="grid gap-3">
                {filteredPoints.map((point) => {
                  const city = getPointCity(point.zone.id, zones, cities);
                  return (
                    <div key={point.id} className="rounded-2xl border border-border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{point.name}</p>
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              {point.zone.name}
                            </span>
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                              {point.mobileAvailability ? 'Visible mobile' : 'Masqué mobile'}
                            </span>
                            {point.manuallyClosed && (
                              <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                                Fermé manuellement
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{point.address}</p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>{city ? `${city.cityName}, ${city.countryName}` : point.zone.city.cityName}</span>
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {point.phone}
                            </span>
                            <span>
                              Capacité: {point.maxCapacity} {point.capacityUnit}
                            </span>
                            {point.commissionPercentage != null && (
                              <span>Commission: {point.commissionPercentage}%</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{formatHours(point)}</p>
                          {point.responsible && (
                            <p className="text-xs text-muted-foreground">
                              Responsable: {point.responsible.firstName} {point.responsible.lastName}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => openPointEdit(point)} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => togglePointAvailability(point)}
                            className="gap-2"
                            disabled={actionPointId === point.id}
                          >
                            {point.manuallyClosed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            {actionPointId === point.id
                              ? 'Traitement...'
                              : point.manuallyClosed
                                ? 'Rouvrir'
                                : 'Fermer'}
                          </Button>
                          <Button variant="ghost" onClick={() => setDeletePointTarget(point)} className="gap-2">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CollectionPointsView(_props: { currentRole?: unknown; currentUser?: unknown }) {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CollectionPointsInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}
