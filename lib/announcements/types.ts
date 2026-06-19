export interface AnnouncementRequest {
  originCollectionPointId: number;
  destinationCollectionPointId: number;
  transportModeId: number;
  title: string;
  content?: string;
  startDate: string;
  endDate: string;
  parcelReceptionDeadline?: string;
  shipmentDate?: string;
  active?: boolean;
  renewable?: boolean;
}

export interface AnnouncementRenewRequest {
  startDate: string;
  endDate: string;
  parcelReceptionDeadline?: string;
  shipmentDate?: string;
  active?: boolean;
}

export interface AnnouncementCollectionPoint {
  id: number;
  name: string;
  countryId?: number;
  countryName?: string;
  cityId?: number;
  cityName?: string;
}

export interface AnnouncementOption {
  id: number;
  name: string;
}

export interface AnnouncementResponse {
  id: number;
  companyId: number;
  companyName: string;
  originCollectionPointId?: number;
  originCollectionPointName?: string;
  originCountryId?: number;
  originCountryName?: string;
  originCityId?: number;
  originCityName?: string;
  destinationCollectionPointId?: number;
  destinationCollectionPointName?: string;
  destinationCountryId?: number;
  destinationCountryName?: string;
  destinationCityId?: number;
  destinationCityName?: string;
  collectionPointId?: number;
  collectionPointName?: string;
  countryId?: number;
  countryName?: string;
  cityId?: number;
  cityName?: string;
  transportModeId?: number;
  transportModeName?: string;
  parcelTypeId?: number;
  parcelTypeName?: string;
  originCollectionPoint?: AnnouncementCollectionPoint | null;
  destinationCollectionPoint?: AnnouncementCollectionPoint | null;
  collectionPoints?: AnnouncementCollectionPoint[] | null;
  transportModes?: AnnouncementOption[] | null;
  parcelTypes?: AnnouncementOption[] | null;
  title: string;
  content?: string;
  startDate: string;
  endDate: string;
  parcelReceptionDeadline?: string;
  shipmentDate?: string;
  active: boolean;
  renewable: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionPointOption {
  id: number;
  name: string;
  reference?: string;
  active?: boolean;
  manuallyClosed?: boolean;
  mobileAvailability?: boolean;
  cityName?: string;
  countryName?: string;
  responsible?: unknown;
}

export interface TransportModeOption {
  id: number;
  name: string;
}
