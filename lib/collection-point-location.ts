import type { City, CollectionPoint, Country, Zone } from '@/lib/mock-data';

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

export function getCollectionPointZone(point: CollectionPoint, zones: Zone[]) {
  return getZoneById(zones, point.zoneId);
}

export function getCollectionPointCity(point: CollectionPoint, zones: Zone[], cities: City[]) {
  const zone = getCollectionPointZone(point, zones);
  return getCityById(cities, zone?.cityId);
}

export function getCollectionPointCountry(
  point: CollectionPoint,
  zones: Zone[],
  cities: City[],
  countries: Country[]
) {
  const city = getCollectionPointCity(point, zones, cities);
  return getCountryById(countries, city?.countryId);
}

export function getCollectionPointLocationLabel(
  point: CollectionPoint,
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
  point: CollectionPoint,
  zones: Zone[],
  cities: City[],
  countries: Country[]
) {
  const location = getCollectionPointLocationLabel(point, zones, cities, countries);

  return [point.address, location].filter(Boolean).join(', ');
}
