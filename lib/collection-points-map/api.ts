import { apiClient } from '@/lib/api-client';
import type {
  CollectionPointLocationSearchParams,
  GeoCoordinates,
  PlatformCollectionPointSearchResponse,
} from './types';

export function searchNearbyCollectionPoints(
  token: string,
  coordinates: GeoCoordinates,
): Promise<PlatformCollectionPointSearchResponse[]> {
  const query = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
  });
  return apiClient.get<PlatformCollectionPointSearchResponse[]>(
    `/api/delivery/collection-points/search/nearby?${query.toString()}`,
    token,
  );
}

export function searchCollectionPointsByLocation(
  token: string,
  params: CollectionPointLocationSearchParams,
): Promise<PlatformCollectionPointSearchResponse[]> {
  const query = new URLSearchParams({
    countryId: String(params.countryId),
    cityId: String(params.cityId),
  });
  return apiClient.getCached<PlatformCollectionPointSearchResponse[]>(
    `/api/delivery/collection-points/search/by-location?${query.toString()}`,
    token,
    2 * 60_000,
  );
}
