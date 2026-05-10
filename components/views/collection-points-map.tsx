'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Globe2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  formatOpeningHours,
  getCollectionPointStatusClassName,
  getCollectionPointStatusLabel,
} from '@/lib/collection-point-availability';
import {
  calculateDistanceKm,
  formatCollectionPointGeoLocation,
  formatDistanceKm,
  getCollectionPointFullAddress,
  getCollectionPointLocationLabel,
  getGoogleMapsUrl,
  hasCollectionPointGeoLocation,
} from '@/lib/collection-point-location';
import type {
  CollectionPoint,
  CollectionPointMapScope,
  NetworkCollectionPoint,
  User,
  UserRole,
} from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type MapPoint = (CollectionPoint | NetworkCollectionPoint) & {
  mapScope: CollectionPointMapScope;
  organizationName: string;
  services?: string[];
};

type ScopeFilter = 'ALL' | CollectionPointMapScope;

interface CollectionPointsMapProps {
  currentRole: UserRole;
  currentUser: User;
}

const scopeFilters: { value: ScopeFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'COMPANY', label: 'Entreprise' },
  { value: 'NETWORK', label: 'Reseau' },
];

const pointScopeStyles: Record<
  CollectionPointMapScope,
  {
    marker: string;
    markerDot: string;
    markerSelectedRing: string;
    badge: string;
    card: string;
    iconSurface: string;
    icon: string;
    hover: string;
  }
> = {
  COMPANY: {
    marker: 'border-sky-500 bg-sky-500 text-white',
    markerDot: 'bg-sky-500',
    markerSelectedRing: 'ring-sky-500/30',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    card: 'border-l-4 border-l-sky-500',
    iconSurface: 'bg-sky-500/15',
    icon: 'text-sky-600 dark:text-sky-300',
    hover: 'hover:border-sky-500/70',
  },
  NETWORK: {
    marker: 'border-orange-500 bg-orange-500 text-white',
    markerDot: 'bg-orange-500',
    markerSelectedRing: 'ring-orange-500/30',
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    card: 'border-l-4 border-l-orange-500',
    iconSurface: 'bg-orange-500/15',
    icon: 'text-orange-600 dark:text-orange-300',
    hover: 'hover:border-orange-500/70',
  },
};

function getPointPosition(
  point: Pick<MapPoint, 'geoLocation'>,
  bounds: { minLatitude: number; maxLatitude: number; minLongitude: number; maxLongitude: number }
) {
  if (!hasCollectionPointGeoLocation(point)) {
    return { left: 50, top: 50 };
  }

  const longitudeRange = Math.max(bounds.maxLongitude - bounds.minLongitude, 0.000001);
  const latitudeRange = Math.max(bounds.maxLatitude - bounds.minLatitude, 0.000001);
  const left = ((point.geoLocation.longitude - bounds.minLongitude) / longitudeRange) * 100;
  const top = 100 - ((point.geoLocation.latitude - bounds.minLatitude) / latitudeRange) * 100;

  return {
    left: Math.min(Math.max(left, 4), 96),
    top: Math.min(Math.max(top, 4), 96),
  };
}

export function CollectionPointsMap({ currentRole, currentUser }: CollectionPointsMapProps) {
  const {
    collectionPoints,
    networkCollectionPoints,
    countries,
    cities,
    zones,
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    currentUser.assignedPointId ?? null
  );
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const companyMapPoints = useMemo<MapPoint[]>(
    () =>
      collectionPoints.map((point) => ({
        ...point,
        mapScope: 'COMPANY',
        organizationName: point.organizationName ?? 'Votre entreprise',
      })),
    [collectionPoints]
  );

  const networkMapPoints = useMemo<MapPoint[]>(
    () =>
      networkCollectionPoints.map((point) => ({
        ...point,
        mapScope: 'NETWORK',
      })),
    [networkCollectionPoints]
  );

  const allMapPoints = useMemo(
    () => [...companyMapPoints, ...networkMapPoints],
    [companyMapPoints, networkMapPoints]
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPoints = useMemo(() => {
    const points = allMapPoints.filter((point) => {
      if (scopeFilter !== 'ALL' && point.mapScope !== scopeFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const locationLabel = getCollectionPointLocationLabel(point, zones, cities, countries);
      const fullAddress = getCollectionPointFullAddress(point, zones, cities, countries);

      return [
        point.name,
        point.address,
        point.organizationName,
        locationLabel,
        fullAddress,
        formatCollectionPointGeoLocation(point),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });

    return points.sort((left, right) => {
      const leftGeoLocation = left.geoLocation;
      const rightGeoLocation = right.geoLocation;

      if (userLocation && leftGeoLocation && rightGeoLocation) {
        return (
          calculateDistanceKm(userLocation, leftGeoLocation) -
          calculateDistanceKm(userLocation, rightGeoLocation)
        );
      }

      if (left.mapScope !== right.mapScope) {
        return left.mapScope === 'COMPANY' ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [allMapPoints, cities, countries, normalizedSearch, scopeFilter, userLocation, zones]);

  const pointsWithGeoLocation = filteredPoints.filter(hasCollectionPointGeoLocation);
  const selectedPoint =
    filteredPoints.find((point) => point.id === selectedPointId) ?? filteredPoints[0] ?? null;

  const mapBounds = useMemo(() => {
    const latitudes = pointsWithGeoLocation.flatMap((point) =>
      point.geoLocation ? [point.geoLocation.latitude] : []
    );
    const longitudes = pointsWithGeoLocation.flatMap((point) =>
      point.geoLocation ? [point.geoLocation.longitude] : []
    );

    if (userLocation) {
      latitudes.push(userLocation.latitude);
      longitudes.push(userLocation.longitude);
    }

    if (latitudes.length === 0 || longitudes.length === 0) {
      return {
        minLatitude: 0,
        maxLatitude: 1,
        minLongitude: 0,
        maxLongitude: 1,
      };
    }

    const latitudePadding = Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 0.14, 0.04);
    const longitudePadding = Math.max(
      (Math.max(...longitudes) - Math.min(...longitudes)) * 0.14,
      0.04
    );

    return {
      minLatitude: Math.min(...latitudes) - latitudePadding,
      maxLatitude: Math.max(...latitudes) + latitudePadding,
      minLongitude: Math.min(...longitudes) - longitudePadding,
      maxLongitude: Math.max(...longitudes) + longitudePadding,
    };
  }, [pointsWithGeoLocation, userLocation]);

  const userPosition = userLocation
    ? getPointPosition(
        {
          geoLocation: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            source: 'GPS_CAPTURE',
            capturedAt: new Date(),
          },
        },
        mapBounds
      )
    : null;

  const handleLocateUser = () => {
    if (!('geolocation' in navigator)) {
      setLocationMessage("La geolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }

    setIsLocating(true);
    setLocationMessage('Recherche de votre position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
        setLocationMessage('Points tries du plus proche au plus eloigne.');
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Autorisez la localisation pour trier les points autour de vous.'
            : error.code === error.TIMEOUT
              ? 'La localisation a pris trop de temps. Reessayez dans un instant.'
              : "Impossible de recuperer votre position pour l'instant.";

        setIsLocating(false);
        setLocationMessage(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 12000,
      }
    );
  };

  const getDistanceLabel = (point: MapPoint) => {
    if (!userLocation || !hasCollectionPointGeoLocation(point)) {
      return null;
    }

    return formatDistanceKm(calculateDistanceKm(userLocation, point.geoLocation));
  };

  const companyPointCount = allMapPoints.filter((point) => point.mapScope === 'COMPANY').length;
  const networkPointCount = allMapPoints.filter((point) => point.mapScope === 'NETWORK').length;
  const visibleOpenCount = filteredPoints.filter((point) => point.isOpen).length;
  const assignedPointVisible = currentUser.assignedPointId
    ? allMapPoints.find((point) => point.id === currentUser.assignedPointId)
    : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Carte des points de collecte</h2>
          <p className="text-muted-foreground">
            Points internes et points reseau consultables par tous les roles operationnels.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un point, une ville, une adresse..."
              className="bg-secondary pl-10"
            />
          </div>
          <Button className="min-h-11 gap-2" onClick={handleLocateUser} disabled={isLocating}>
            <LocateFixed className="h-4 w-4" />
            {isLocating ? 'Localisation...' : 'Autour de moi'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', pointScopeStyles.COMPANY.iconSurface)}>
              <Building2 className={cn('h-5 w-5', pointScopeStyles.COMPANY.icon)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{companyPointCount}</p>
              <p className="text-xs text-muted-foreground">Points entreprise</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', pointScopeStyles.NETWORK.iconSurface)}>
              <Globe2 className={cn('h-5 w-5', pointScopeStyles.NETWORK.icon)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{networkPointCount}</p>
              <p className="text-xs text-muted-foreground">Autres points</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{visibleOpenCount}</p>
              <p className="text-xs text-muted-foreground">Ouverts affiches</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <Navigation className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {assignedPointVisible ? assignedPointVisible.name : currentRole}
              </p>
              <p className="text-xs text-muted-foreground">
                {assignedPointVisible ? 'Point assigne' : 'Vue reseau'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {scopeFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={scopeFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setScopeFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {locationMessage && (
        <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
          {locationMessage}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px] xl:gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Vue carte</CardTitle>
              <CardDescription>
                {filteredPoints.length} point(s) affiche(s), {pointsWithGeoLocation.length} avec coordonnees.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-muted-foreground">
                <span className={cn('h-2.5 w-2.5 rounded-full', pointScopeStyles.COMPANY.markerDot)} />
                Entreprise
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-muted-foreground">
                <span className={cn('h-2.5 w-2.5 rounded-full', pointScopeStyles.NETWORK.markerDot)} />
                Reseau
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="relative min-h-[55dvh] overflow-hidden rounded-2xl border border-border bg-secondary/20 sm:min-h-[520px]">
              <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:72px_72px]" />
              <div className="absolute inset-6 rounded-[2rem] border border-border/70" />
              <div className="absolute left-8 right-8 top-1/2 h-px bg-border" />
              <div className="absolute bottom-8 top-8 left-1/2 w-px bg-border" />

              {pointsWithGeoLocation.map((point) => {
                const position = getPointPosition(point, mapBounds);
                const isSelected = selectedPoint?.id === point.id;
                const isAssigned = currentUser.assignedPointId === point.id;
                const scopeStyle = pointScopeStyles[point.mapScope];

                return (
                  <button
                    key={point.id}
                    type="button"
                    aria-label={`Afficher ${point.name}`}
                    onClick={() => setSelectedPointId(point.id)}
                    className={cn(
                      'absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-lg transition-transform hover:scale-110',
                      scopeStyle.marker,
                      isSelected && cn('scale-125 ring-4', scopeStyle.markerSelectedRing),
                      isAssigned && 'ring-4 ring-warning/30'
                    )}
                    style={{ left: `${position.left}%`, top: `${position.top}%` }}
                  >
                    <MapPin className="h-5 w-5" />
                  </button>
                );
              })}

              {userPosition && (
                <div
                  className="absolute z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-warning bg-warning text-warning-foreground shadow-lg"
                  style={{ left: `${userPosition.left}%`, top: `${userPosition.top}%` }}
                >
                  <Crosshair className="h-5 w-5" />
                </div>
              )}

              {selectedPoint && (
                <div className="absolute bottom-3 left-3 right-3 z-30 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur sm:bottom-4 sm:left-4 sm:right-4 sm:p-4 md:left-auto md:w-[360px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{selectedPoint.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedPoint.organizationName}
                      </p>
                    </div>
                    <Badge
                      className={pointScopeStyles[selectedPoint.mapScope].badge}
                    >
                      {selectedPoint.mapScope === 'COMPANY' ? 'Entreprise' : 'Reseau'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {getCollectionPointFullAddress(selectedPoint, zones, cities, countries)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex rounded-lg px-2 py-1 text-xs font-medium',
                        getCollectionPointStatusClassName(selectedPoint)
                      )}
                    >
                      {getCollectionPointStatusLabel(selectedPoint)}
                    </span>
                    {getDistanceLabel(selectedPoint) && (
                      <span className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground">
                        {getDistanceLabel(selectedPoint)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 sm:space-y-4">
          {filteredPoints.map((point) => {
            const mapsUrl = getGoogleMapsUrl(point);
            const distanceLabel = getDistanceLabel(point);
            const isSelected = selectedPoint?.id === point.id;
            const isAssigned = currentUser.assignedPointId === point.id;
            const scopeStyle = pointScopeStyles[point.mapScope];

            return (
              <button
                key={point.id}
                type="button"
                onClick={() => setSelectedPointId(point.id)}
                className={cn(
                  'w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors',
                  scopeStyle.card,
                  scopeStyle.hover,
                  isSelected && (point.mapScope === 'COMPANY' ? 'border-sky-500' : 'border-orange-500'),
                  isAssigned && 'ring-2 ring-warning/30'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{point.name}</p>
                      {isAssigned && (
                        <Badge className="bg-warning/20 text-warning">Assigne</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{point.organizationName}</p>
                  </div>
                  <Badge
                    className={scopeStyle.badge}
                  >
                    {point.mapScope === 'COMPANY' ? 'Entreprise' : 'Reseau'}
                  </Badge>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-foreground">
                    {getCollectionPointFullAddress(point, zones, cities, countries)}
                  </p>
                  <p className="text-muted-foreground">{formatOpeningHours(point)}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatCollectionPointGeoLocation(point)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex rounded-lg px-2 py-1 text-xs font-medium',
                      getCollectionPointStatusClassName(point)
                    )}
                  >
                    {getCollectionPointStatusLabel(point)}
                  </span>
                  <span className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    {getCollectionPointLocationLabel(point, zones, cities, countries)}
                  </span>
                  {distanceLabel && (
                    <span className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground">
                      {distanceLabel}
                    </span>
                  )}
                </div>

                {Array.isArray(point.services) && point.services.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {point.services.map((service) => (
                      <span
                        key={service}
                        className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}

                {mapsUrl && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={mapsUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir dans Google Maps
                      </a>
                    </Button>
                  </div>
                )}
              </button>
            );
          })}

          {filteredPoints.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
                <MapPin className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium text-foreground">Aucun point trouve</p>
                <p className="text-sm text-muted-foreground">
                  Modifiez la recherche ou affichez toutes les sources.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
