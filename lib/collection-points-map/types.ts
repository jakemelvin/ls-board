import type { CollectionPointResponse } from '@/lib/company/types';

export interface PlatformCollectionPointSearchResponse {
  collectionPoint: CollectionPointResponse;
  companyId: number;
  companyName: string;
  companyLogoUrl?: string;
  companyUrl?: string;
  companyPhone?: string;
  sameCity?: boolean;
  distanceKm?: number;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface CollectionPointLocationSearchParams {
  countryId: number;
  cityId: number;
}
