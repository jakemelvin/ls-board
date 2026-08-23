'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Globe2,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLatestRequest } from '@/hooks/use-latest-request';
import { ApiError } from '@/lib/api-client';
import { getOperationalServedCountries } from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import type { CountryResponse } from '@/lib/auth/types';
import {
  searchCollectionPointsByLocation,
  searchNearbyCollectionPoints,
} from '@/lib/collection-points-map/api';
import type {
  GeoCoordinates,
  PlatformCollectionPointSearchResponse,
} from '@/lib/collection-points-map/types';
import { calculateDistanceKm, formatDistanceKm } from '@/lib/collection-point-location';
import { getOperationalServedCitiesByCountry } from '@/lib/company/api';
import type {
  CityResponse,
  CollectionPointAvailabilityStatus,
  CollectionPointDayOfWeek,
  CollectionPointOpeningHourResponse,
} from '@/lib/company/types';
import { useTranslation } from '@/lib/i18n';
import type { User, UserRole } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

type ScopeFilter = 'ALL' | 'COMPANY' | 'NETWORK';
type SearchMode = 'NEARBY' | 'LOCATION';

interface CollectionPointsMapProps {
  currentRole: UserRole;
  currentUser: User;
}

const SCOPE_FILTERS: ScopeFilter[] = ['ALL', 'COMPANY', 'NETWORK'];
const GEOLOCATION_CACHE_MAX_AGE_MS = 15 * 60_000;
const GEOLOCATION_TIMEOUT_MS = 30_000;
const WEEKDAY_LABELS: Record<CollectionPointDayOfWeek, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mer',
  THURSDAY: 'Jeu',
  FRIDAY: 'Ven',
  SATURDAY: 'Sam',
  SUNDAY: 'Dim',
};

const SCOPE_STYLES = {
  COMPANY: {
    marker: 'border-sky-500 bg-sky-500 text-white',
    dot: 'bg-sky-500',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    card: 'border-l-sky-500',
  },
  NETWORK: {
    marker: 'border-orange-500 bg-orange-500 text-white',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    card: 'border-l-orange-500',
  },
} as const;

function pointKey(item: PlatformCollectionPointSearchResponse) {
  return `${item.companyId}:${item.collectionPoint.id}`;
}

function hasCoordinates(item: PlatformCollectionPointSearchResponse) {
  return (
    typeof item.collectionPoint.latitude === 'number' &&
    Number.isFinite(item.collectionPoint.latitude) &&
    typeof item.collectionPoint.longitude === 'number' &&
    Number.isFinite(item.collectionPoint.longitude)
  );
}

function getCoordinates(item: PlatformCollectionPointSearchResponse): GeoCoordinates | null {
  if (!hasCoordinates(item)) return null;
  return {
    latitude: item.collectionPoint.latitude!,
    longitude: item.collectionPoint.longitude!,
  };
}

function getGoogleMapsUrl(item: PlatformCollectionPointSearchResponse) {
  const coordinates = getCoordinates(item);
  if (!coordinates) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
}

function getMarkerPosition(
  item: PlatformCollectionPointSearchResponse,
  bounds: { minLatitude: number; maxLatitude: number; minLongitude: number; maxLongitude: number },
) {
  const coordinates = getCoordinates(item);
  if (!coordinates) return { left: 50, top: 50 };
  const longitudeRange = Math.max(bounds.maxLongitude - bounds.minLongitude, 0.000001);
  const latitudeRange = Math.max(bounds.maxLatitude - bounds.minLatitude, 0.000001);
  return {
    left: Math.min(Math.max(((coordinates.longitude - bounds.minLongitude) / longitudeRange) * 100, 4), 96),
    top: Math.min(Math.max(100 - ((coordinates.latitude - bounds.minLatitude) / latitudeRange) * 100, 4), 96),
  };
}

function formatOpeningHours(hours: CollectionPointOpeningHourResponse[]) {
  const openDays = hours.filter((item) => !item.closed);
  if (openDays.length === 0) return null;
  const firstSchedule = openDays.find((item) => item.openingTime && item.closingTime);
  const days = openDays.map((item) => WEEKDAY_LABELS[item.dayOfWeek]).join(', ');
  return firstSchedule
    ? `${days} · ${firstSchedule.openingTime} - ${firstSchedule.closingTime}`
    : days;
}

function statusClassName(status?: CollectionPointAvailabilityStatus, openNow?: boolean) {
  if (openNow || status === 'OPEN') return 'bg-success/15 text-success';
  if (status === 'MANUALLY_CLOSED') return 'bg-warning/15 text-warning';
  return 'bg-destructive/15 text-destructive';
}

export function CollectionPointsMap({ currentRole, currentUser }: CollectionPointsMapProps) {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((state) => state.token);
  const companyId = useAuthStore((state) => state.companyId);
  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [cities, setCities] = useState<CityResponse[]>([]);
  const [countryId, setCountryId] = useState('');
  const [cityId, setCityId] = useState('');
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<PlatformCollectionPointSearchResponse[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode | null>(null);
  const [userLocation, setUserLocation] = useState<GeoCoordinates | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  useEffect(() => {
    let isCurrent = true;
    getOperationalServedCountries()
      .then((response) => {
        if (isCurrent) setCountries(response);
      })
      .catch(() => {
        if (isCurrent) setError(t('collectionPointsMap.errors.countries'));
      })
      .finally(() => {
        if (isCurrent) setMetadataLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [t]);

  const getScope = useCallback(
    (item: PlatformCollectionPointSearchResponse): Exclude<ScopeFilter, 'ALL'> =>
      companyId && item.companyId === companyId ? 'COMPANY' : 'NETWORK',
    [companyId],
  );

  const setSearchResults = useCallback((items: PlatformCollectionPointSearchResponse[]) => {
    setResults(items);
    setSelectedPointKey(items[0] ? pointKey(items[0]) : null);
  }, []);

  const loadByLocation = useCallback(
    async (nextCountryId: number, nextCityId: number) => {
      if (!token) return;
      const requestId = beginRequest();
      setResultsLoading(true);
      setError(null);
      setMessage(null);
      try {
        const response = await searchCollectionPointsByLocation(token, {
          countryId: nextCountryId,
          cityId: nextCityId,
        });
        if (!isLatestRequest(requestId)) return;
        setSearchMode('LOCATION');
        const matchingLocation = response.filter(
          (item) =>
            item.collectionPoint.city.countryId === nextCountryId &&
            item.collectionPoint.city.cityId === nextCityId,
        );
        setUserLocation(null);
        setSearchResults(matchingLocation);
        setMessage(
          matchingLocation.length > 0
            ? t('collectionPointsMap.messages.locationResults', { values: { count: matchingLocation.length } })
            : t('collectionPointsMap.messages.noLocationResults'),
        );
      } catch (cause) {
        if (isLatestRequest(requestId)) {
          setError(cause instanceof ApiError ? cause.message : t('collectionPointsMap.errors.search'));
        }
      } finally {
        if (isLatestRequest(requestId)) setResultsLoading(false);
      }
    },
    [beginRequest, isLatestRequest, setSearchResults, t, token],
  );

  const handleCountryChange = async (value: string) => {
    setCountryId(value);
    setCityId('');
    setCities([]);
    if (!value) return;
    setCitiesLoading(true);
    setError(null);
    try {
      setCities(await getOperationalServedCitiesByCountry(Number(value)));
    } catch {
      setError(t('collectionPointsMap.errors.cities'));
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleCityChange = (value: string) => {
    setCityId(value);
    if (countryId && value) void loadByLocation(Number(countryId), Number(value));
  };

  const loadNearby = useCallback(
    async (coordinates: GeoCoordinates) => {
      if (!token) return;
      const requestId = beginRequest();
      setResultsLoading(true);
      setError(null);
      try {
        const response = await searchNearbyCollectionPoints(token, coordinates);
        if (!isLatestRequest(requestId)) return;
        setSearchMode('NEARBY');
        setUserLocation(coordinates);
        setSearchResults(response);
        setMessage(
          response.length > 0
            ? t('collectionPointsMap.messages.nearbyResults', { values: { count: response.length } })
            : t('collectionPointsMap.messages.noNearbyResults'),
        );
      } catch (cause) {
        if (isLatestRequest(requestId)) {
          setError(cause instanceof ApiError ? cause.message : t('collectionPointsMap.errors.search'));
        }
      } finally {
        if (isLatestRequest(requestId)) {
          setResultsLoading(false);
          setIsLocating(false);
        }
      }
    },
    [beginRequest, isLatestRequest, setSearchResults, t, token],
  );

  const handleLocateUser = () => {
    if (!('geolocation' in navigator)) {
      setError(t('collectionPointsMap.errors.unsupportedLocation'));
      return;
    }
    setIsLocating(true);
    setError(null);
    setMessage(t('collectionPointsMap.messages.locating'));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadNearby({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (geolocationError) => {
        setIsLocating(false);
        setMessage(null);
        setError(
          geolocationError.code === geolocationError.PERMISSION_DENIED
            ? t('collectionPointsMap.errors.locationDenied')
            : geolocationError.code === geolocationError.TIMEOUT
              ? t('collectionPointsMap.errors.locationTimeout')
              : t('collectionPointsMap.errors.locationFailed'),
        );
      },
      {
        // A coarse position is enough for the backend proximity search and is
        // substantially faster on desktop browsers that rely on Windows location.
        enableHighAccuracy: false,
        maximumAge: GEOLOCATION_CACHE_MAX_AGE_MS,
        timeout: GEOLOCATION_TIMEOUT_MS,
      },
    );
  };

  const refreshResults = () => {
    if (searchMode === 'NEARBY' && userLocation) void loadNearby(userLocation);
    if (searchMode === 'LOCATION' && countryId && cityId) {
      void loadByLocation(Number(countryId), Number(cityId));
    }
  };

  const filteredResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return results.filter((item) => {
      if (scopeFilter !== 'ALL' && getScope(item) !== scopeFilter) return false;
      if (!query) return true;
      const point = item.collectionPoint;
      return [
        point.name,
        point.reference,
        point.address,
        point.phone,
        point.city?.cityName,
        point.zone?.name,
        item.companyName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [getScope, results, scopeFilter, searchTerm]);

  const pointsWithCoordinates = filteredResults.filter(hasCoordinates);
  const selectedPoint =
    filteredResults.find((item) => pointKey(item) === selectedPointKey) ?? filteredResults[0] ?? null;

  const mapBounds = useMemo(() => {
    const coordinates = pointsWithCoordinates.flatMap((item) => {
      const value = getCoordinates(item);
      return value ? [value] : [];
    });
    if (userLocation) coordinates.push(userLocation);
    if (coordinates.length === 0) {
      return { minLatitude: 0, maxLatitude: 1, minLongitude: 0, maxLongitude: 1 };
    }
    const latitudes = coordinates.map((item) => item.latitude);
    const longitudes = coordinates.map((item) => item.longitude);
    const latitudePadding = Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 0.14, 0.02);
    const longitudePadding = Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * 0.14, 0.02);
    return {
      minLatitude: Math.min(...latitudes) - latitudePadding,
      maxLatitude: Math.max(...latitudes) + latitudePadding,
      minLongitude: Math.min(...longitudes) - longitudePadding,
      maxLongitude: Math.max(...longitudes) + longitudePadding,
    };
  }, [pointsWithCoordinates, userLocation]);

  const userPosition = userLocation
    ? (() => {
        const longitudeRange = Math.max(mapBounds.maxLongitude - mapBounds.minLongitude, 0.000001);
        const latitudeRange = Math.max(mapBounds.maxLatitude - mapBounds.minLatitude, 0.000001);
        return {
          left: Math.min(Math.max(((userLocation.longitude - mapBounds.minLongitude) / longitudeRange) * 100, 4), 96),
          top: Math.min(Math.max(100 - ((userLocation.latitude - mapBounds.minLatitude) / latitudeRange) * 100, 4), 96),
        };
      })()
    : null;

  const getDistance = (item: PlatformCollectionPointSearchResponse) => {
    if (typeof item.distanceKm === 'number') return item.distanceKm;
    const coordinates = getCoordinates(item);
    return userLocation && coordinates ? calculateDistanceKm(userLocation, coordinates) : null;
  };

  const companyPointCount = filteredResults.filter((item) => getScope(item) === 'COMPANY').length;
  const networkPointCount = filteredResults.filter((item) => getScope(item) === 'NETWORK').length;
  const openPointCount = filteredResults.filter((item) => item.collectionPoint.openNow).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('collectionPointsMap.title')}</h2>
          <p className="text-muted-foreground">{t('collectionPointsMap.subtitle')}</p>
        </div>
        <Button className="min-h-11 gap-2" onClick={handleLocateUser} disabled={isLocating || resultsLoading}>
          {isLocating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {isLocating ? t('collectionPointsMap.actions.locating') : t('collectionPointsMap.actions.nearMe')}
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="space-y-2 text-sm font-medium text-foreground">
            {t('collectionPointsMap.filters.country')}
            <select
              value={countryId}
              onChange={(event) => void handleCountryChange(event.target.value)}
              disabled={metadataLoading}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t('collectionPointsMap.filters.selectCountry')}</option>
              {countries.map((country) => <option key={country.countryId} value={country.countryId}>{country.countryName}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-foreground">
            {t('collectionPointsMap.filters.city')}
            <select
              value={cityId}
              onChange={(event) => handleCityChange(event.target.value)}
              disabled={!countryId || citiesLoading}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{citiesLoading ? t('collectionPointsMap.filters.loadingCities') : t('collectionPointsMap.filters.selectCity')}</option>
              {cities.map((city) => <option key={city.cityId} value={city.cityId}>{city.cityName}</option>)}
            </select>
          </label>
          <Button variant="outline" onClick={refreshResults} disabled={!searchMode || resultsLoading} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', resultsLoading && 'animate-spin')} />
            {t('collectionPointsMap.actions.refresh')}
          </Button>
        </CardContent>
      </Card>

      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">{message}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MapMetric icon={Building2} value={companyPointCount} label={t('collectionPointsMap.metrics.company')} />
        <MapMetric icon={Globe2} value={networkPointCount} label={t('collectionPointsMap.metrics.network')} />
        <MapMetric icon={CheckCircle2} value={openPointCount} label={t('collectionPointsMap.metrics.open')} />
        <MapMetric icon={Navigation} value={filteredResults.length} label={searchMode === 'NEARBY' ? t('collectionPointsMap.metrics.nearby') : t('collectionPointsMap.metrics.results')} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {SCOPE_FILTERS.map((scope) => (
            <Button key={scope} size="sm" variant={scopeFilter === scope ? 'default' : 'outline'} onClick={() => setScopeFilter(scope)}>
              {t(`collectionPointsMap.scopes.${scope}`)}
            </Button>
          ))}
        </div>
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('collectionPointsMap.filters.search')} className="bg-secondary pl-9" />
        </div>
      </div>

      {resultsLoading ? (
        <Card className="border-border bg-card"><CardContent className="flex min-h-80 items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
      ) : !searchMode ? (
        <EmptyMap icon={Crosshair} title={t('collectionPointsMap.empty.initialTitle')} description={t('collectionPointsMap.empty.initialDescription')} />
      ) : filteredResults.length === 0 ? (
        <EmptyMap icon={MapPin} title={t('collectionPointsMap.empty.noResultsTitle')} description={t('collectionPointsMap.empty.noResultsDescription')} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px] xl:gap-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>{t('collectionPointsMap.map.title')}</CardTitle>
              <CardDescription>{t('collectionPointsMap.map.description', { values: { count: filteredResults.length, geocoded: pointsWithCoordinates.length } })}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="relative min-h-[55dvh] overflow-hidden rounded-2xl border border-border bg-secondary/20 sm:min-h-[520px]">
                <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:72px_72px]" />
                <div className="absolute inset-6 rounded-[2rem] border border-border/70" />
                {pointsWithCoordinates.map((item) => {
                  const key = pointKey(item);
                  const scope = getScope(item);
                  const position = getMarkerPosition(item, mapBounds);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={t('collectionPointsMap.map.showPoint', { values: { name: item.collectionPoint.name } })}
                      onClick={() => setSelectedPointKey(key)}
                      className={cn(
                        'absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-lg transition-transform hover:scale-110',
                        SCOPE_STYLES[scope].marker,
                        selectedPoint && pointKey(selectedPoint) === key && 'scale-125 ring-4 ring-primary/25',
                      )}
                      style={{ left: `${position.left}%`, top: `${position.top}%` }}
                    >
                      <MapPin className="h-5 w-5" />
                    </button>
                  );
                })}
                {userPosition && (
                  <div aria-label={t('collectionPointsMap.map.yourPosition')} className="absolute z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-warning bg-warning text-warning-foreground shadow-lg" style={{ left: `${userPosition.left}%`, top: `${userPosition.top}%` }}>
                    <Crosshair className="h-5 w-5" />
                  </div>
                )}
                {selectedPoint && <MapPopup item={selectedPoint} scope={getScope(selectedPoint)} distance={getDistance(selectedPoint)} t={t} />}
              </div>
            </CardContent>
          </Card>

          <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
            {filteredResults.map((item) => (
              <PointCard
                key={pointKey(item)}
                item={item}
                scope={getScope(item)}
                selected={selectedPoint ? pointKey(selectedPoint) === pointKey(item) : false}
                assigned={String(item.collectionPoint.id) === currentUser.assignedPointId}
                distance={getDistance(item)}
                onSelect={() => setSelectedPointKey(pointKey(item))}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t('collectionPointsMap.roleHint', { values: { role: currentRole } })}</p>
    </div>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

function MapMetric({ icon: Icon, value, label }: { icon: typeof MapPin; value: number; label: string }) {
  return (
    <Card className="border-border bg-card"><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
  );
}

function MapPopup({ item, scope, distance, t }: { item: PlatformCollectionPointSearchResponse; scope: Exclude<ScopeFilter, 'ALL'>; distance: number | null; t: Translate }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-30 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur md:left-auto md:w-[370px]">
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{item.collectionPoint.name}</p><p className="text-sm text-muted-foreground">{item.companyName}</p></div><Badge className={SCOPE_STYLES[scope].badge}>{t(`collectionPointsMap.scopes.${scope}`)}</Badge></div>
      <p className="mt-3 text-sm text-foreground">{[item.collectionPoint.address, item.collectionPoint.city?.cityName].filter(Boolean).join(', ')}</p>
      <div className="mt-3 flex flex-wrap gap-2"><Badge className={statusClassName(item.collectionPoint.availabilityStatus, item.collectionPoint.openNow)}>{item.collectionPoint.availabilityMessage ?? (item.collectionPoint.openNow ? t('collectionPointsMap.status.open') : t('collectionPointsMap.status.closed'))}</Badge>{distance != null && <Badge variant="outline">{formatDistanceKm(distance)}</Badge>}</div>
    </div>
  );
}

function PointCard({ item, scope, selected, assigned, distance, onSelect, t }: { item: PlatformCollectionPointSearchResponse; scope: Exclude<ScopeFilter, 'ALL'>; selected: boolean; assigned: boolean; distance: number | null; onSelect: () => void; t: Translate }) {
  const point = item.collectionPoint;
  const mapsUrl = getGoogleMapsUrl(item);
  const hours = formatOpeningHours(point.openingHours ?? []);
  return (
    <Card className={cn('border-l-4 bg-card transition-colors', SCOPE_STYLES[scope].card, selected && 'border-primary ring-1 ring-primary/30')}>
      <CardContent className="p-4">
        <button type="button" onClick={onSelect} className="w-full text-left">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{point.name}</p>{assigned && <Badge className="bg-warning/15 text-warning">{t('collectionPointsMap.badges.assigned')}</Badge>}</div><p className="text-sm text-muted-foreground">{item.companyName}</p></div><Badge className={SCOPE_STYLES[scope].badge}>{t(`collectionPointsMap.scopes.${scope}`)}</Badge></div>
          <div className="mt-3 space-y-1.5 text-sm"><p className="text-foreground">{[point.address, point.city?.cityName].filter(Boolean).join(', ')}</p>{point.phone && <p className="text-muted-foreground">{point.phone}</p>}{hours && <p className="text-muted-foreground">{hours}</p>}</div>
          <div className="mt-3 flex flex-wrap gap-2"><Badge className={statusClassName(point.availabilityStatus, point.openNow)}>{point.availabilityMessage ?? (point.openNow ? t('collectionPointsMap.status.open') : t('collectionPointsMap.status.closed'))}</Badge>{distance != null && <Badge variant="outline">{formatDistanceKm(distance)}</Badge>}{item.sameCity && <Badge variant="outline">{t('collectionPointsMap.badges.sameCity')}</Badge>}</div>
        </button>
        {mapsUrl && <Button variant="outline" size="sm" className="mt-4 gap-2" asChild><a href={mapsUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{t('collectionPointsMap.actions.openMaps')}</a></Button>}
      </CardContent>
    </Card>
  );
}

function EmptyMap({ icon: Icon, title, description }: { icon: typeof MapPin; title: string; description: string }) {
  return <Card className="border-border bg-card"><CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-center"><Icon className="h-10 w-10 text-muted-foreground" /><p className="font-semibold text-foreground">{title}</p><p className="max-w-xl text-sm text-muted-foreground">{description}</p></CardContent></Card>;
}
