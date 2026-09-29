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
  forceRefresh = false,
): Promise<PlatformCollectionPointSearchResponse[]> {
  const query = new URLSearchParams({
    countryId: String(params.countryId),
    cityId: String(params.cityId),
  });
  const path = `/api/delivery/collection-points/search/by-location?${query.toString()}`;
  return forceRefresh
    ? apiClient.get<PlatformCollectionPointSearchResponse[]>(path, token)
    : apiClient.getCached<PlatformCollectionPointSearchResponse[]>(path, token, 2 * 60_000);
}
