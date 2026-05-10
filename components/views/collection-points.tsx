'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Layers3,
  Map as MapIcon,
  MessageCircle,
  MapPin,
  Power,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  formatCapacity,
  formatCollectionPointLoadRatio,
  getCollectionPointCurrentLoad,
  getCollectionPointSaturationRate,
  getCollectionPointStoredParcels,
} from '@/lib/collection-point-capacity';
import {
  formatCollectionPointGeoLocation,
  getCollectionPointFullAddress,
  getCollectionPointGeoLocationSourceLabel,
  getCollectionPointLocationLabel,
  getGoogleMapsUrl,
  hasCollectionPointGeoLocation,
} from '@/lib/collection-point-location';
import {
  formatCommissionRate,
  formatOpeningHours,
  getCollectionPointStatusClassName,
  getCollectionPointStatusLabel,
  WEEKDAY_LABELS,
} from '@/lib/collection-point-availability';
import {
  type City,
  type CollectionPoint,
  type CollectionPointCapacityUnit,
  type CollectionPointGeoLocation,
  type Country,
  type User,
  type UserRole,
  type WeekdayKey,
  type Zone,
} from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type DeleteTarget =
  | { type: 'country'; country: Country }
  | { type: 'city'; city: City }
  | { type: 'zone'; zone: Zone }
  | { type: 'point'; point: CollectionPoint };

type PointFormState = {
  name: string;
  address: string;
  whatsappPhone: string;
  zoneId: string;
  maxCapacityValue: string;
  maxCapacityUnit: CollectionPointCapacityUnit;
  responsibleId: string;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  openingDays: WeekdayKey[];
  commissionRate: string;
  latitude: string;
  longitude: string;
};

interface CollectionPointsViewProps {
  currentRole: UserRole;
  currentUser: User;
}

const DEFAULT_OPENING_DAYS: WeekdayKey[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const ALL_WEEKDAYS = Object.keys(WEEKDAY_LABELS) as WeekdayKey[];
const WHATSAPP_PHONE_PATTERN = /^\+?[0-9\s().-]{8,24}$/;

function isValidWhatsAppPhone(value: string) {
  return WHATSAPP_PHONE_PATTERN.test(value.trim());
}

function getWhatsAppUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : undefined;
}

export function CollectionPointsView({ currentRole, currentUser }: CollectionPointsViewProps) {
  const {
    countries,
    cities,
    zones,
    collectionPoints,
    users,
    parcels,
    transferRequests,
    addCountry,
    updateCountry,
    deleteCountry,
    addCity,
    updateCity,
    deleteCity,
    addZone,
    updateZone,
    deleteZone,
    addCollectionPoint,
    updateCollectionPoint,
    setCollectionPointOpenStatus,
    deleteCollectionPoint,
  } = useStore();

  const canConfigureCommission = currentRole === 'ADMIN' || currentRole === 'EMPLOYEE';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);
  const [isCityDialogOpen, setIsCityDialogOpen] = useState(false);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [isPointDialogOpen, setIsPointDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingPoint, setEditingPoint] = useState<CollectionPoint | null>(null);

  const [countryForm, setCountryForm] = useState({ name: '', code: '' });
  const [cityForm, setCityForm] = useState({ name: '', countryId: '' });
  const [zoneForm, setZoneForm] = useState({ name: '', cityId: '' });
  const [pointForm, setPointForm] = useState<PointFormState>({
    name: '',
    address: '',
    whatsappPhone: '',
    zoneId: '',
    maxCapacityValue: '',
    maxCapacityUnit: 'KG',
    responsibleId: '',
    isOpen: true,
    opensAt: '08:00',
    closesAt: '18:00',
    openingDays: DEFAULT_OPENING_DAYS,
    commissionRate: '',
    latitude: '',
    longitude: '',
  });

  const collectors = users.filter((user) => user.role === 'COLLECTOR');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();

  const countriesById = useMemo(
    () =>
      new Map(countries.map((country) => [country.id, country])),
    [countries]
  );
  const citiesById = useMemo(
    () =>
      new Map(cities.map((city) => [city.id, city])),
    [cities]
  );
  const zonesById = useMemo(
    () =>
      new Map(zones.map((zone) => [zone.id, zone])),
    [zones]
  );

  const filteredCountries = useMemo(
    () =>
      countries.filter(
        (country) =>
          !normalizedSearchTerm ||
          country.name.toLowerCase().includes(normalizedSearchTerm) ||
          country.code.toLowerCase().includes(normalizedSearchTerm)
      ),
    [countries, normalizedSearchTerm]
  );

  useEffect(() => {
    if (filteredCountries.length === 0) {
      setSelectedCountryId(null);
      return;
    }

    const isCurrentCountryVisible = filteredCountries.some(
      (country) => country.id === selectedCountryId
    );

    if (!selectedCountryId || !isCurrentCountryVisible) {
      setSelectedCountryId(filteredCountries[0].id);
    }
  }, [filteredCountries, selectedCountryId]);

  const selectedCountry = selectedCountryId ? countriesById.get(selectedCountryId) ?? null : null;

  const filteredCities = useMemo(
    () =>
      cities.filter((city) => {
        if (selectedCountryId && city.countryId !== selectedCountryId) {
          return false;
        }

        return !normalizedSearchTerm || city.name.toLowerCase().includes(normalizedSearchTerm);
      }),
    [cities, normalizedSearchTerm, selectedCountryId]
  );

  useEffect(() => {
    if (filteredCities.length === 0) {
      setSelectedCityId(null);
      return;
    }

    const isCurrentCityVisible = filteredCities.some((city) => city.id === selectedCityId);

    if (!selectedCityId || !isCurrentCityVisible) {
      setSelectedCityId(filteredCities[0].id);
    }
  }, [filteredCities, selectedCityId]);

  const selectedCity = selectedCityId ? citiesById.get(selectedCityId) ?? null : null;

  const filteredZones = useMemo(
    () =>
      zones.filter((zone) => {
        if (selectedCityId && zone.cityId !== selectedCityId) {
          return false;
        }

        return !normalizedSearchTerm || zone.name.toLowerCase().includes(normalizedSearchTerm);
      }),
    [normalizedSearchTerm, selectedCityId, zones]
  );

  useEffect(() => {
    if (filteredZones.length === 0) {
      setSelectedZoneId(null);
      return;
    }

    const isCurrentZoneVisible = filteredZones.some((zone) => zone.id === selectedZoneId);

    if (!selectedZoneId || !isCurrentZoneVisible) {
      setSelectedZoneId(filteredZones[0].id);
    }
  }, [filteredZones, selectedZoneId]);

  const selectedZone = selectedZoneId ? zonesById.get(selectedZoneId) ?? null : null;

  const zonePoints = collectionPoints.filter((point) => {
    if (selectedZoneId && point.zoneId !== selectedZoneId) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    const location = getCollectionPointLocationLabel(point, zones, cities, countries).toLowerCase();
    const geoLocation = formatCollectionPointGeoLocation(point).toLowerCase();

    return (
      point.name.toLowerCase().includes(normalizedSearchTerm) ||
      point.address.toLowerCase().includes(normalizedSearchTerm) ||
      location.includes(normalizedSearchTerm) ||
      geoLocation.includes(normalizedSearchTerm)
    );
  });

  const getResponsible = (responsibleId: string) =>
    users.find((user) => user.id === responsibleId) ?? null;

  const cityCountByCountryId = useMemo(() => {
    const counts = new Map<string, number>();

    cities.forEach((city) => {
      counts.set(city.countryId, (counts.get(city.countryId) ?? 0) + 1);
    });

    return counts;
  }, [cities]);

  const zoneCountByCityId = useMemo(() => {
    const counts = new Map<string, number>();

    zones.forEach((zone) => {
      counts.set(zone.cityId, (counts.get(zone.cityId) ?? 0) + 1);
    });

    return counts;
  }, [zones]);

  const pointCountByZoneId = useMemo(() => {
    const counts = new Map<string, number>();

    collectionPoints.forEach((point) => {
      counts.set(point.zoneId, (counts.get(point.zoneId) ?? 0) + 1);
    });

    return counts;
  }, [collectionPoints]);

  const getDeleteMeta = (target: DeleteTarget | null) => {
    if (!target) {
      return { blocked: true, message: '' };
    }

    if (target.type === 'country') {
      const cityCount = cityCountByCountryId.get(target.country.id) ?? 0;

      if (cityCount > 0) {
        return {
          blocked: true,
          message: `Supprimez d'abord les ${cityCount} ville(s) rattachee(s) a ce pays.`,
        };
      }
    }

    if (target.type === 'city') {
      const zoneCount = zoneCountByCityId.get(target.city.id) ?? 0;

      if (zoneCount > 0) {
        return {
          blocked: true,
          message: `Supprimez d'abord les ${zoneCount} zone(s) rattachee(s) a cette ville.`,
        };
      }
    }

    if (target.type === 'zone') {
      const pointCount = pointCountByZoneId.get(target.zone.id) ?? 0;

      if (pointCount > 0) {
        return {
          blocked: true,
          message: `Supprimez ou deplacez d'abord les ${pointCount} point(s) de collecte de cette zone.`,
        };
      }
    }

    if (target.type === 'point') {
      const assignedCollectorCount = users.filter(
        (user) => user.assignedPointId === target.point.id
      ).length;
      const relatedParcelCount = parcels.filter(
        (parcel) =>
          parcel.originPointId === target.point.id || parcel.destinationPointId === target.point.id
      ).length;
      const relatedTransferCount = transferRequests.filter(
        (request) => request.collectionPointId === target.point.id
      ).length;

      if (assignedCollectorCount > 0 || relatedParcelCount > 0 || relatedTransferCount > 0) {
        return {
          blocked: true,
          message:
            "Ce point est encore utilise par l'equipe ou par des flux colis. Retirez d'abord ses dependances.",
        };
      }
    }

    return { blocked: false, message: 'Cette action est irreversible.' };
  };

  const resetCountryForm = () => {
    setCountryForm({ name: '', code: '' });
    setEditingCountry(null);
  };

  const resetCityForm = () => {
    setCityForm({ name: '', countryId: selectedCountryId ?? '' });
    setEditingCity(null);
  };

  const resetZoneForm = () => {
    setZoneForm({ name: '', cityId: selectedCityId ?? '' });
    setEditingZone(null);
  };

  const resetPointForm = () => {
    setPointForm({
      name: '',
      address: '',
      whatsappPhone: '',
      zoneId: selectedZoneId ?? '',
      maxCapacityValue: '',
      maxCapacityUnit: 'KG',
      responsibleId: '',
      isOpen: true,
      opensAt: '08:00',
      closesAt: '18:00',
      openingDays: DEFAULT_OPENING_DAYS,
      commissionRate: '',
      latitude: '',
      longitude: '',
    });
    setEditingPoint(null);
  };

  const openCountryDialog = (country?: Country) => {
    if (country) {
      setEditingCountry(country);
      setCountryForm({ name: country.name, code: country.code });
    } else {
      resetCountryForm();
    }

    setIsCountryDialogOpen(true);
  };

  const openCityDialog = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setCityForm({ name: city.name, countryId: city.countryId });
    } else {
      resetCityForm();
    }

    setIsCityDialogOpen(true);
  };

  const openZoneDialog = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({ name: zone.name, cityId: zone.cityId });
    } else {
      resetZoneForm();
    }

    setIsZoneDialogOpen(true);
  };

  const openPointDialog = (point?: CollectionPoint) => {
    if (point) {
      setEditingPoint(point);
      setPointForm({
        name: point.name,
        address: point.address,
        whatsappPhone: point.whatsappPhone ?? '',
        zoneId: point.zoneId,
        maxCapacityValue: point.maxCapacity.value.toString(),
        maxCapacityUnit: point.maxCapacity.unit,
        responsibleId: point.responsibleId,
        isOpen: point.isOpen,
        opensAt: point.openingHours.opensAt,
        closesAt: point.openingHours.closesAt,
        openingDays: point.openingHours.days,
        commissionRate: point.commissionRate?.toString() ?? '',
        latitude: point.geoLocation?.latitude.toString() ?? '',
        longitude: point.geoLocation?.longitude.toString() ?? '',
      });
    } else {
      resetPointForm();
    }

    setIsPointDialogOpen(true);
  };

  const handleSaveCountry = () => {
    if (!countryForm.name || !countryForm.code) {
      return;
    }

    if (editingCountry) {
      updateCountry(editingCountry.id, {
        name: countryForm.name,
        code: countryForm.code.toUpperCase(),
      });
    } else {
      addCountry({
        name: countryForm.name,
        code: countryForm.code.toUpperCase(),
      });
    }

    setIsCountryDialogOpen(false);
    resetCountryForm();
  };

  const handleSaveCity = () => {
    if (!cityForm.name || !cityForm.countryId) {
      return;
    }

    if (editingCity) {
      updateCity(editingCity.id, cityForm);
    } else {
      addCity(cityForm);
    }

    setSelectedCountryId(cityForm.countryId);
    setIsCityDialogOpen(false);
    resetCityForm();
  };

  const handleSaveZone = () => {
    if (!zoneForm.name || !zoneForm.cityId) {
      return;
    }

    if (editingZone) {
      updateZone(editingZone.id, zoneForm);
    } else {
      addZone(zoneForm);
    }

    setSelectedCityId(zoneForm.cityId);
    setIsZoneDialogOpen(false);
    resetZoneForm();
  };

  const parseCoordinate = (value: string) => Number(value.trim().replace(',', '.'));

  const getPointFormGeoLocation = (): CollectionPointGeoLocation | undefined => {
    if (!pointForm.latitude.trim() && !pointForm.longitude.trim()) {
      return undefined;
    }

    const latitude = parseCoordinate(pointForm.latitude);
    const longitude = parseCoordinate(pointForm.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return undefined;
    }

    const existingGeoLocation = editingPoint?.geoLocation;
    const isUnchanged =
      existingGeoLocation &&
      Math.abs(existingGeoLocation.latitude - latitude) < 0.000001 &&
      Math.abs(existingGeoLocation.longitude - longitude) < 0.000001;

    if (isUnchanged) {
      return existingGeoLocation;
    }

    return {
      latitude,
      longitude,
      source: 'MANUAL',
      capturedByUserId: currentUser.id,
      capturedByName: currentUser.name,
      capturedAt: new Date(),
    };
  };

  const handleSavePoint = () => {
    if (
      !pointForm.name ||
      !pointForm.address ||
      !pointForm.zoneId ||
      !pointForm.maxCapacityValue
    ) {
      return;
    }

    const maxCapacityValue = Number(pointForm.maxCapacityValue);
    const commissionRate = pointForm.commissionRate.trim() === '' ? undefined : Number(pointForm.commissionRate);

    if (!Number.isFinite(maxCapacityValue) || maxCapacityValue <= 0) {
      return;
    }

    if (
      commissionRate !== undefined &&
      (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100)
    ) {
      return;
    }

    if (pointForm.openingDays.length === 0 || pointForm.opensAt >= pointForm.closesAt) {
      return;
    }

    if (pointFormCapacityConflict) {
      return;
    }

    if (pointFormGeoLocationInvalid) {
      return;
    }

    if (pointFormWhatsappPhoneInvalid) {
      return;
    }

    const payload = {
      name: pointForm.name.trim(),
      address: pointForm.address.trim(),
      whatsappPhone: pointForm.whatsappPhone.trim() || undefined,
      zoneId: pointForm.zoneId,
      maxCapacity: {
        value: maxCapacityValue,
        unit: pointForm.maxCapacityUnit,
      },
      responsibleId: pointForm.responsibleId,
      isOpen: pointForm.isOpen,
      openingHours: {
        days: pointForm.openingDays,
        opensAt: pointForm.opensAt,
        closesAt: pointForm.closesAt,
      },
      closedReason: pointForm.isOpen ? undefined : editingPoint?.closedReason ?? 'Indisponible temporairement',
      commissionRate,
      geoLocation: getPointFormGeoLocation(),
    };

    if (editingPoint) {
      updateCollectionPoint(editingPoint.id, payload);
    } else {
      addCollectionPoint(payload);
    }

    setSelectedZoneId(pointForm.zoneId);
    setIsPointDialogOpen(false);
    resetPointForm();
  };

  const handleDelete = () => {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.type === 'country') {
      deleteCountry(deleteTarget.country.id);
    }

    if (deleteTarget.type === 'city') {
      deleteCity(deleteTarget.city.id);
    }

    if (deleteTarget.type === 'zone') {
      deleteZone(deleteTarget.zone.id);
    }

    if (deleteTarget.type === 'point') {
      deleteCollectionPoint(deleteTarget.point.id);
    }

    setDeleteTarget(null);
  };

  const deleteMeta = getDeleteMeta(deleteTarget);

  const toggleOpeningDay = (day: WeekdayKey) => {
    setPointForm((current) => ({
      ...current,
      openingDays: current.openingDays.includes(day)
        ? current.openingDays.filter((item) => item !== day)
        : [...current.openingDays, day],
    }));
  };

  const renderListItem = ({
    itemKey,
    isSelected,
    title,
    subtitle,
    onSelect,
    onEdit,
    onDelete,
  }: {
    itemKey: string;
    isSelected: boolean;
    title: string;
    subtitle: string;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <div
      key={itemKey}
      className={cn(
        'rounded-xl border border-border bg-secondary/20 p-3 transition-colors',
        isSelected && 'border-primary bg-primary/10'
      )}
    >
      <button className="w-full text-left" onClick={onSelect}>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </button>
      <div className="mt-3 flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const selectedZonePoints = collectionPoints.filter((point) => point.zoneId === selectedZoneId);
  const selectedZoneParcelCount = selectedZonePoints.reduce(
    (sum, point) => sum + getCollectionPointStoredParcels(point.id, parcels).length,
    0
  );
  const selectedZoneCapacityByUnit = useMemo(() => {
    const totals = new Map<CollectionPointCapacityUnit, number>();

    selectedZonePoints.forEach((point) => {
      totals.set(
        point.maxCapacity.unit,
        (totals.get(point.maxCapacity.unit) ?? 0) + point.maxCapacity.value
      );
    });

    return Array.from(totals.entries()).map(([unit, value]) => ({
      unit,
      formatted: formatCapacity(value, unit),
    }));
  }, [selectedZonePoints]);
  const selectedZoneCurrentLoadByUnit = useMemo(() => {
    const totals = new Map<CollectionPointCapacityUnit, number>();

    selectedZonePoints.forEach((point) => {
      const currentLoad = getCollectionPointCurrentLoad(point, parcels);

      totals.set(point.maxCapacity.unit, (totals.get(point.maxCapacity.unit) ?? 0) + currentLoad);
    });

    return Array.from(totals.entries()).map(([unit, value]) => ({
      unit,
      formatted: formatCapacity(value, unit),
    }));
  }, [parcels, selectedZonePoints]);
  const editingPointPreview = useMemo(() => {
    if (!editingPoint) {
      return null;
    }

    const maxCapacityValue = Number(pointForm.maxCapacityValue);

    return {
      ...editingPoint,
      maxCapacity: {
        value:
          Number.isFinite(maxCapacityValue) && maxCapacityValue > 0
            ? maxCapacityValue
            : editingPoint.maxCapacity.value,
        unit: pointForm.maxCapacityUnit,
      },
    };
  }, [editingPoint, pointForm.maxCapacityUnit, pointForm.maxCapacityValue]);
  const pointFormCapacityConflict = useMemo(() => {
    if (!editingPointPreview) {
      return false;
    }

    return (
      getCollectionPointCurrentLoad(editingPointPreview, parcels) >
      editingPointPreview.maxCapacity.value
    );
  }, [editingPointPreview, parcels]);
  const pointFormScheduleInvalid =
    pointForm.openingDays.length === 0 || pointForm.opensAt >= pointForm.closesAt;
  const pointFormCommissionInvalid =
    pointForm.commissionRate.trim() !== '' &&
    (!Number.isFinite(Number(pointForm.commissionRate)) ||
      Number(pointForm.commissionRate) < 0 ||
      Number(pointForm.commissionRate) > 100);
  const pointFormWhatsappPhoneInvalid =
    pointForm.whatsappPhone.trim() !== '' && !isValidWhatsAppPhone(pointForm.whatsappPhone);
  const pointFormLatitude = pointForm.latitude.trim() ? parseCoordinate(pointForm.latitude) : undefined;
  const pointFormLongitude = pointForm.longitude.trim()
    ? parseCoordinate(pointForm.longitude)
    : undefined;
  const pointFormGeoLocationInvalid =
    Boolean(pointForm.latitude.trim() || pointForm.longitude.trim()) &&
    (pointFormLatitude === undefined ||
      pointFormLongitude === undefined ||
      !Number.isFinite(pointFormLatitude) ||
      !Number.isFinite(pointFormLongitude) ||
      pointFormLatitude < -90 ||
      pointFormLatitude > 90 ||
      pointFormLongitude < -180 ||
      pointFormLongitude > 180);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion Territoriale</h2>
          <p className="text-muted-foreground">
            Structurez votre reseau par pays, villes, zones puis points de collecte
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Rechercher un pays, une ville, une zone ou un point..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-secondary sm:w-96"
          />
          <Button className="gap-2" onClick={() => openPointDialog()} disabled={!selectedZoneId}>
            <Plus className="h-4 w-4" />
            Ajouter un point
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Globe2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{countries.length}</p>
              <p className="text-xs text-muted-foreground">Pays desservis</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/20">
              <Building2 className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{cities.length}</p>
              <p className="text-xs text-muted-foreground">Villes actives</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/20">
              <Layers3 className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{zones.length}</p>
              <p className="text-xs text-muted-foreground">Zones desservies</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <MapPin className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{collectionPoints.length}</p>
              <p className="text-xs text-muted-foreground">Points de collecte</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base">Pays</CardTitle>
                <CardDescription>Entites racines de votre couverture</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => openCountryDialog()}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCountries.map((country) =>
                renderListItem({
                  itemKey: country.id,
                  isSelected: selectedCountryId === country.id,
                  title: country.name,
                  subtitle: country.code,
                  onSelect: () => setSelectedCountryId(country.id),
                  onEdit: () => openCountryDialog(country),
                  onDelete: () => setDeleteTarget({ type: 'country', country }),
                })
              )}
              {filteredCountries.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Aucun pays ne correspond a votre recherche.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base">Villes</CardTitle>
                <CardDescription>
                  {selectedCountry ? `Rattachees a ${selectedCountry.name}` : 'Selectionnez un pays'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => openCityDialog()}
                disabled={!selectedCountryId}
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCities.map((city) =>
                renderListItem({
                  itemKey: city.id,
                  isSelected: selectedCityId === city.id,
                  title: city.name,
                  subtitle: selectedCountry?.name ?? 'Pays',
                  onSelect: () => setSelectedCityId(city.id),
                  onEdit: () => openCityDialog(city),
                  onDelete: () => setDeleteTarget({ type: 'city', city }),
                })
              )}
              {filteredCities.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Aucune ville disponible pour ce pays.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base">Zones</CardTitle>
                <CardDescription>
                  {selectedCity ? `Decoupage de ${selectedCity.name}` : 'Selectionnez une ville'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => openZoneDialog()}
                disabled={!selectedCityId}
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredZones.map((zone) =>
                renderListItem({
                  itemKey: zone.id,
                  isSelected: selectedZoneId === zone.id,
                  title: zone.name,
                  subtitle: selectedCity?.name ?? 'Ville',
                  onSelect: () => setSelectedZoneId(zone.id),
                  onEdit: () => openZoneDialog(zone),
                  onDelete: () => setDeleteTarget({ type: 'zone', zone }),
                })
              )}
              {filteredZones.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Aucune zone disponible pour cette ville.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Zone active</CardTitle>
              <CardDescription>
                {selectedZone && selectedCity && selectedCountry
                  ? `${selectedZone.name}, ${selectedCity.name}, ${selectedCountry.name}`
                  : 'Selectionnez un pays, une ville et une zone pour gerer les points'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground">Points dans la zone</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{selectedZonePoints.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedZoneParcelCount} colis actuellement rattaches
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground">Capacite cumulee</p>
                  <div className="mt-2 space-y-1">
                    {selectedZoneCapacityByUnit.length > 0 ? (
                      selectedZoneCapacityByUnit.map((item) => (
                        <p key={item.unit} className="text-2xl font-bold text-foreground">
                          {item.formatted}
                        </p>
                      ))
                    ) : (
                      <p className="text-2xl font-bold text-foreground">0</p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground">Charge actuelle</p>
                  <div className="mt-2 space-y-1">
                    {selectedZoneCurrentLoadByUnit.length > 0 ? (
                      selectedZoneCurrentLoadByUnit.map((item) => (
                        <p key={item.unit} className="text-2xl font-bold text-foreground">
                          {item.formatted}
                        </p>
                      ))
                    ) : (
                      <p className="text-2xl font-bold text-foreground">0</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Points de collecte</CardTitle>
                <CardDescription>
                  {selectedZone
                    ? "Tous les points rattaches a la zone selectionnee"
                    : 'Selectionnez une zone pour afficher ses points'}
                </CardDescription>
              </div>
              <Button className="gap-2" onClick={() => openPointDialog()} disabled={!selectedZoneId}>
                <Plus className="h-4 w-4" />
                Ajouter un point
              </Button>
            </CardHeader>
            <CardContent>
              {selectedZoneId ? (
                zonePoints.length > 0 ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {zonePoints.map((point) => {
                      const responsible = getResponsible(point.responsibleId);
                      const saturation = getCollectionPointSaturationRate(point, parcels);
                      const mapsUrl = getGoogleMapsUrl(point);

                      return (
                        <div
                          key={point.id}
                          className="rounded-2xl border border-border bg-secondary/20 p-4 shadow-sm transition-colors hover:border-primary/40"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                                  <MapPin className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-foreground">{point.name}</h3>
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
                                        getCollectionPointStatusClassName(point)
                                      )}
                                    >
                                      {point.isOpen ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                      {getCollectionPointStatusLabel(point)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {getCollectionPointLocationLabel(point, zones, cities, countries)}
                                  </p>
                                  <p className="mt-2 text-sm text-foreground">
                                    {getCollectionPointFullAddress(point, zones, cities, countries)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 self-start rounded-xl border border-border bg-card p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn('h-8 w-8', point.isOpen ? 'text-warning' : 'text-success')}
                                onClick={() =>
                                  setCollectionPointOpenStatus(
                                    point.id,
                                    !point.isOpen,
                                    point.isOpen ? 'Indisponible temporairement' : undefined
                                  )
                                }
                                title={point.isOpen ? 'Fermer le point' : 'Rouvrir le point'}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPointDialog(point)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteTarget({ type: 'point', point })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border bg-card p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Horaires</p>
                              <p className="mt-1 text-sm font-medium text-foreground">{formatOpeningHours(point)}</p>
                              {point.closedReason && !point.isOpen && (
                                <p className="mt-1 text-xs text-muted-foreground">{point.closedReason}</p>
                              )}
                            </div>
                            <div className="rounded-xl border border-border bg-card p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Responsable</p>
                              {responsible ? (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {responsible.avatar}
                                  </div>
                                  <span className="text-sm font-medium text-foreground">{responsible.name}</span>
                                </div>
                              ) : (
                                <p className="mt-1 text-sm text-muted-foreground">Non assigne</p>
                              )}
                            </div>
                            <div className="rounded-xl border border-border bg-card p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Capacite</p>
                              <p className="mt-1 text-sm font-medium text-foreground">{formatCollectionPointLoadRatio(point, parcels)}</p>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className={cn('h-full', saturation > 80 ? 'bg-destructive' : saturation > 50 ? 'bg-warning' : 'bg-success')}
                                  style={{ width: `${Math.min(saturation, 100)}%` }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{saturation}% de saturation</p>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Commission</p>
                              <p className="mt-1 text-sm font-medium text-foreground">{formatCommissionRate(point)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Configurable par admin ou employe.</p>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-3 md:col-span-2">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">WhatsApp</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">
                                    {point.whatsappPhone ?? 'Non configure'}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Numero utilise pour contacter directement ce point de collecte.
                                  </p>
                                </div>
                                {point.whatsappPhone && getWhatsAppUrl(point.whatsappPhone) && (
                                  <Button variant="outline" size="sm" className="gap-2" asChild>
                                    <a href={getWhatsAppUrl(point.whatsappPhone)} target="_blank" rel="noreferrer">
                                      <MessageCircle className="h-4 w-4" />
                                      WhatsApp
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-3 md:col-span-2">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Carte mobile</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">
                                    {formatCollectionPointGeoLocation(point)}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {hasCollectionPointGeoLocation(point)
                                      ? `${getCollectionPointGeoLocationSourceLabel(point)}${
                                          point.geoLocation?.accuracyMeters
                                            ? ` - precision ${point.geoLocation.accuracyMeters} m`
                                            : ''
                                        }`
                                      : 'A capturer par le collecteur ou a saisir manuellement.'}
                                  </p>
                                </div>
                                {mapsUrl && (
                                  <Button variant="outline" size="sm" className="gap-2" asChild>
                                    <a href={mapsUrl} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                      Google Maps
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
                    <MapPin className="h-10 w-10 text-muted-foreground" />
                    <p className="font-medium text-foreground">Aucun point dans cette zone</p>
                    <p className="text-sm text-muted-foreground">Ajoutez un point pour demarrer la couverture locale.</p>
                  </div>
                )
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
                  <MapIcon className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium text-foreground">Aucune zone selectionnee</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Commencez par choisir un pays, puis une ville, puis une zone. Les points de
                    collecte sont crees et geres uniquement au niveau de la zone.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCountryDialogOpen} onOpenChange={setIsCountryDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingCountry ? 'Modifier le pays' : 'Ajouter un pays'}
            </DialogTitle>
            <DialogDescription>
              Definissez un pays dessert par votre entreprise.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Nom du pays</label>
              <Input
                value={countryForm.name}
                onChange={(event) =>
                  setCountryForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="France"
                className="bg-secondary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Code pays</label>
              <Input
                value={countryForm.code}
                onChange={(event) =>
                  setCountryForm((current) => ({ ...current, code: event.target.value }))
                }
                placeholder="FR"
                className="bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCountryDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveCountry} className="gap-2">
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCityDialogOpen} onOpenChange={setIsCityDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingCity ? 'Modifier la ville' : 'Ajouter une ville'}
            </DialogTitle>
            <DialogDescription>
              Rattachez une ville a un pays deja dessert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Pays</label>
              <Select
                value={cityForm.countryId}
                onValueChange={(value) =>
                  setCityForm((current) => ({ ...current, countryId: value }))
                }
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Selectionnez un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Ville</label>
              <Input
                value={cityForm.name}
                onChange={(event) =>
                  setCityForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Paris"
                className="bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCityDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveCity} className="gap-2">
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingZone ? 'Modifier la zone' : 'Ajouter une zone'}
            </DialogTitle>
            <DialogDescription>
              Organisez les villes en zones operationnelles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Ville</label>
              <Select
                value={zoneForm.cityId}
                onValueChange={(value) =>
                  setZoneForm((current) => ({ ...current, cityId: value }))
                }
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Selectionnez une ville" />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter((city) => !selectedCountryId || city.countryId === selectedCountryId)
                    .map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Zone</label>
              <Input
                value={zoneForm.name}
                onChange={(event) =>
                  setZoneForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Centre Ville"
                className="bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsZoneDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveZone} className="gap-2">
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPointDialogOpen} onOpenChange={setIsPointDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden border-border bg-card sm:max-w-[860px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingPoint ? 'Modifier le point de collecte' : 'Ajouter un point de collecte'}
            </DialogTitle>
            <DialogDescription>
              Un point est toujours rattache a une zone, elle-meme rattachee a une ville et a un pays.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="rounded-2xl border border-border bg-secondary/10 p-4">
              <p className="mb-4 text-sm font-semibold text-foreground">Informations principales</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Nom</label>
                <Input
                  value={pointForm.name}
                  onChange={(event) =>
                    setPointForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Pharmacie du Centre"
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Zone</label>
                <Select
                  value={pointForm.zoneId}
                  onValueChange={(value) =>
                    setPointForm((current) => ({ ...current, zoneId: value }))
                  }
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selectionnez une zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => {
                      const city = citiesById.get(zone.cityId);
                      const country = city ? countriesById.get(city.countryId) : undefined;

                      return (
                        <SelectItem key={zone.id} value={zone.id}>
                          {[zone.name, city?.name, country?.name].filter(Boolean).join(', ')}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Adresse</label>
              <Input
                value={pointForm.address}
                onChange={(event) =>
                  setPointForm((current) => ({ ...current, address: event.target.value }))
                }
                placeholder="15 Rue de la Paix"
                className="bg-secondary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Numero WhatsApp <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <Input
                inputMode="tel"
                value={pointForm.whatsappPhone}
                onChange={(event) =>
                  setPointForm((current) => ({ ...current, whatsappPhone: event.target.value }))
                }
                placeholder="+33 6 55 12 12 12"
                className="bg-secondary"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Ce numero permet aux utilisateurs ou operations de contacter le point via WhatsApp.
              </p>
              {pointFormWhatsappPhoneInvalid && (
                <p className="mt-2 text-xs text-destructive">
                  Renseignez un numero WhatsApp valide, avec indicatif pays si possible.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">Position carte mobile</p>
                <p className="text-xs text-muted-foreground">
                  Le collecteur capture normalement la position GPS depuis l'interieur du point.
                  Admin et employe peuvent corriger manuellement les coordonnees si necessaire.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Latitude</label>
                  <Input
                    inputMode="decimal"
                    value={pointForm.latitude}
                    onChange={(event) =>
                      setPointForm((current) => ({ ...current, latitude: event.target.value }))
                    }
                    placeholder="48.869800"
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Longitude</label>
                  <Input
                    inputMode="decimal"
                    value={pointForm.longitude}
                    onChange={(event) =>
                      setPointForm((current) => ({ ...current, longitude: event.target.value }))
                    }
                    placeholder="2.332200"
                    className="bg-secondary"
                  />
                </div>
              </div>
              {editingPoint?.geoLocation && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Source actuelle: {getCollectionPointGeoLocationSourceLabel(editingPoint)}.
                </p>
              )}
              {pointFormGeoLocationInvalid && (
                <p className="mt-3 text-xs text-destructive">
                  Renseignez une latitude entre -90 et 90 et une longitude entre -180 et 180,
                  ou laissez les deux champs vides.
                </p>
              )}
            </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/10 p-4">
              <p className="mb-4 text-sm font-semibold text-foreground">Disponibilite et horaires</p>
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Disponibilite mobile</p>
                  <p className="text-xs text-muted-foreground">
                    Un point ferme reste gere en interne mais disparait de l'application mobile client.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={pointForm.isOpen ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={() => setPointForm((current) => ({ ...current, isOpen: !current.isOpen }))}
                >
                  {pointForm.isOpen ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {pointForm.isOpen ? 'Visible mobile' : 'Masque mobile'}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Heure d'ouverture</label>
                <Input
                  type="time"
                  value={pointForm.opensAt}
                  onChange={(event) =>
                    setPointForm((current) => ({ ...current, opensAt: event.target.value }))
                  }
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Heure de fermeture</label>
                <Input
                  type="time"
                  value={pointForm.closesAt}
                  onChange={(event) =>
                    setPointForm((current) => ({ ...current, closesAt: event.target.value }))
                  }
                  className="bg-secondary"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Jours d'ouverture</label>
              <div className="flex flex-wrap gap-2">
                {ALL_WEEKDAYS.map((day) => {
                  const isSelected = pointForm.openingDays.includes(day);

                  return (
                    <Button
                      key={day}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleOpeningDay(day)}
                    >
                      {WEEKDAY_LABELS[day]}
                    </Button>
                  );
                })}
              </div>
              {pointForm.openingDays.length === 0 && (
                <p className="mt-2 text-xs text-destructive">
                  Selectionnez au moins un jour d'ouverture.
                </p>
              )}
              {pointForm.opensAt >= pointForm.closesAt && (
                <p className="mt-2 text-xs text-destructive">
                  L'heure d'ouverture doit etre avant l'heure de fermeture.
                </p>
              )}
            </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/10 p-4">
              <p className="mb-4 text-sm font-semibold text-foreground">Capacite, responsable et commission</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Capacite maximale
                </label>
                <Input
                  type="number"
                  min="0"
                  step={pointForm.maxCapacityUnit === 'KG' ? '1' : '0.01'}
                  value={pointForm.maxCapacityValue}
                  onChange={(event) =>
                    setPointForm((current) => ({
                      ...current,
                      maxCapacityValue: event.target.value,
                    }))
                  }
                  placeholder={pointForm.maxCapacityUnit === 'KG' ? '100' : '2.50'}
                  className="bg-secondary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Unite</label>
                <Select
                  value={pointForm.maxCapacityUnit}
                  onValueChange={(value: CollectionPointCapacityUnit) =>
                    setPointForm((current) => ({ ...current, maxCapacityUnit: value }))
                  }
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selectionnez une unite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">Poids (kg)</SelectItem>
                    <SelectItem value="M3">Volume (m3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Responsable</label>
                <Select
                  value={pointForm.responsibleId}
                  onValueChange={(value) =>
                    setPointForm((current) => ({ ...current, responsibleId: value }))
                  }
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selectionnez un responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectors.map((collector) => (
                      <SelectItem key={collector.id} value={collector.id}>
                        {collector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canConfigureCommission && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Commission optionnelle du point (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={pointForm.commissionRate}
                  onChange={(event) =>
                    setPointForm((current) => ({ ...current, commissionRate: event.target.value }))
                  }
                  placeholder="Exemple: 7.5"
                  className="bg-secondary"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Laissez vide si ce point ne percoit pas de commission specifique.
                </p>
                {pointFormCommissionInvalid && (
                  <p className="mt-2 text-xs text-destructive">
                    La commission doit etre comprise entre 0 et 100%.
                  </p>
                )}
              </div>
            )}

            {editingPointPreview && (
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-sm font-medium text-foreground">Charge actuelle observee</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatCollectionPointLoadRatio(editingPointPreview, parcels)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cette valeur est calculee automatiquement a partir des colis actuellement stockes
                  sur le point.
                </p>
              </div>
            )}

            {pointFormCapacityConflict && editingPointPreview && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-foreground">
                  Capacite insuffisante pour la charge actuelle
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le point stocke deja{' '}
                  {formatCollectionPointLoadRatio(editingPointPreview, parcels)}. Augmentez la
                  capacite maximale ou changez d&apos;unite avant d&apos;enregistrer.
                </p>
              </div>
            )}
            </div>
          </div>
          <DialogFooter className="sticky -bottom-6 border-t border-border bg-card/95 pt-4 backdrop-blur">
            <Button variant="outline" onClick={() => setIsPointDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSavePoint}
              className="gap-2"
              disabled={
                pointFormCapacityConflict ||
                pointFormScheduleInvalid ||
                pointFormCommissionInvalid ||
                pointFormWhatsappPhoneInvalid ||
                pointFormGeoLocationInvalid
              }
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmer la suppression</DialogTitle>
            <DialogDescription>{deleteMeta.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Fermer
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMeta.blocked}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
