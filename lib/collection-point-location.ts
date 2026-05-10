import type {
  City,
  CollectionPoint,
  CollectionPointGeoLocation,
  NetworkCollectionPoint,
  Country,
  Zone,
} from '@/lib/mock-data';

const EARTH_RADIUS_KM = 6371;

export function getZoneById(zones: Zone[], zoneId?: string) {
  if (!zoneId) {
    return undefined;
  }

  return zones.find((zone) => zone.id === zoneId);
}

export function getCityById(cities: City[], cityId?: string) {
  if (!cityId) {
    return undefined;
  }

  return cities.find((city) => city.id === cityId);
}

export function getCountryById(countries: Country[], countryId?: string) {
  if (!countryId) {
    return undefined;
  }

  return countries.find((country) => country.id === countryId);
}

export function getCollectionPointZone(point: Pick<CollectionPoint, 'zoneId'>, zones: Zone[]) {
  return getZoneById(zones, point.zoneId);
}

export function getCollectionPointCity(
  point: Pick<CollectionPoint, 'zoneId'>,
  zones: Zone[],
  cities: City[]
) {
  const zone = getCollectionPointZone(point, zones);
  return getCityById(cities, zone?.cityId);
}

export function getCollectionPointCountry(
  point: Pick<CollectionPoint, 'zoneId'>,
  zones: Zone[],
  cities: City[],
  countries: Country[]
) {
  const city = getCollectionPointCity(point, zones, cities);
  return getCountryById(countries, city?.countryId);
}

export function getCollectionPointLocationLabel(
  point: Pick<CollectionPoint, 'zoneId'>,
  zones: Zone[],
  cities: City[],
  countries: Country[]
) {
  const zone = getCollectionPointZone(point, zones);
  const city = getCollectionPointCity(point, zones, cities);
  const country = getCollectionPointCountry(point, zones, cities, countries);

  return [zone?.name, city?.name, country?.name].filter(Boolean).join(', ');
}

export function getCollectionPointFullAddress(
  point: Pick<CollectionPoint, 'address' | 'zoneId'>,
  zones: Zone[],
  cities: City[],
  countries: Country[]
) {
  const location = getCollectionPointLocationLabel(point, zones, cities, countries);

  return [point.address, location].filter(Boolean).join(', ');
}

export function hasCollectionPointGeoLocation(
  point: Pick<CollectionPoint, 'geoLocation'>
): point is { geoLocation: CollectionPointGeoLocation } {
  return (
    point.geoLocation !== undefined &&
    Number.isFinite(point.geoLocation.latitude) &&
    Number.isFinite(point.geoLocation.longitude)
  );
}

export function formatGeoCoordinate(value: number) {
  return value.toFixed(6);
}

export function formatCollectionPointGeoLocation(point: Pick<CollectionPoint, 'geoLocation'>) {
  if (!hasCollectionPointGeoLocation(point)) {
    return 'Position non renseignee';
  }

  return `${formatGeoCoordinate(point.geoLocation.latitude)}, ${formatGeoCoordinate(
    point.geoLocation.longitude
  )}`;
}

export function getCollectionPointGeoLocationSourceLabel(
  point: Pick<CollectionPoint, 'geoLocation'>
) {
  if (!point.geoLocation) {
    return 'Non renseignee';
  }

  return point.geoLocation.source === 'GPS_CAPTURE'
    ? 'Capture GPS collecteur'
    : 'Saisie manuelle';
}

export function getGoogleMapsUrl(point: Pick<CollectionPoint, 'geoLocation'>) {
  if (!hasCollectionPointGeoLocation(point)) {
    return undefined;
  }

  const { latitude, longitude } = point.geoLocation;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function calculateDistanceKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(destination.latitude - origin.latitude);
  const deltaLongitude = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getCollectionPointsSortedByDistance(
  points: Array<CollectionPoint | NetworkCollectionPoint>,
  userLocation: { latitude: number; longitude: number }
) {
  return points
    .flatMap((point) => {
      if (!hasCollectionPointGeoLocation(point)) {
        return [];
      }

      return [
        {
          point,
          distanceKm: calculateDistanceKm(userLocation, point.geoLocation),
        },
      ];
    })
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

export function formatDistanceKm(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}
