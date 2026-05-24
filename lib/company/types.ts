// Domain types for company configuration and operations.
// Mirrors the Delivery Service OpenAPI schemas.

import type { UserResponse } from '@/lib/auth/types';

// Catalog

export interface CatalogItemResponse {
  id: number;
  name: string;
  systemDefined: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export type ParcelTypeResponse = CatalogItemResponse;
export type TransportModeResponse = CatalogItemResponse;

export interface CatalogItemRequest {
  name: string;
}

export interface CompanyParcelTypeResponse {
  companyId: number;
  companyName: string;
  parcelTypeCount: number;
  parcelTypes: ParcelTypeResponse[];
}

export interface CompanyTransportModeResponse {
  companyId: number;
  companyName: string;
  transportModeCount: number;
  transportModes: TransportModeResponse[];
}

export interface ParcelTypeAssignmentRequest {
  parcelTypeIds: number[];
}

export interface TransportModeAssignmentRequest {
  transportModeIds: number[];
}

// Geography

export interface CityResponse {
  cityId: number;
  cityName: string;
  countryId: number;
  countryName: string;
}

export interface CityRequest {
  cityName: string;
  countryId: number;
}

export interface ZoneRequest {
  name: string;
  cityId: number;
}

export interface ZoneResponse {
  id: number;
  name: string;
  city: {
    cityName: string;
    countryId: number;
  };
  createdAt?: string;
  updatedAt?: string;
  createdById?: number;
  createdByUsername?: string;
}

// Collection points

export type CollectionPointDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type CollectionPointCapacityUnit = 'KG' | 'M3';
export type CollectionPointAvailabilityStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'MANUALLY_CLOSED'
  | 'DEACTIVATED';

export interface CollectionPointOpeningHourRequest {
  dayOfWeek: CollectionPointDayOfWeek;
  closed?: boolean;
  openingTime?: string;
  closingTime?: string;
}

export interface CollectionPointOpeningHourResponse {
  dayOfWeek: CollectionPointDayOfWeek;
  closed: boolean;
  openingTime?: string;
  closingTime?: string;
}

export interface CollectionPointRequest {
  name: string;
  cityId: number;
  zoneId: number;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  openingHours: CollectionPointOpeningHourRequest[];
  responsibleId?: number;
  manuallyClosed?: boolean;
  mobileAvailability?: boolean;
  maxCapacity: number;
  capacityUnit: CollectionPointCapacityUnit;
  commission?: number;
  commissionPercentage?: number;
}

export interface CollectionPointResponse {
  id: number;
  reference?: string;
  name: string;
  city: {
    cityName: string;
    countryId: number;
  };
  zone: ZoneResponse;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  openingHours: CollectionPointOpeningHourResponse[];
  responsible?: UserResponse;
  manuallyClosed: boolean;
  mobileAvailability: boolean;
  active: boolean;
  maxCapacity: number;
  capacityUnit: CollectionPointCapacityUnit;
  commission?: number;
  commissionPercentage?: number;
  photoUrl?: string;
  openNow?: boolean;
  availabilityStatus?: CollectionPointAvailabilityStatus;
  availabilityMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Fleet

export type FlotteType =
  | 'VAN'
  | 'MOTO'
  | 'CAMION'
  | 'VOITURE'
  | 'PICKUP'
  | 'TRICYCLE'
  | 'AUTRE';

export type FlotteStatus = 'DISPONIBLE' | 'EN_TRANSIT' | 'MAINTENANCE';

export interface FlotteRequest {
  type: FlotteType;
  immatriculation: string;
  maxVolumeM3: number;
  maxWeightKg: number;
  status: FlotteStatus;
  transporterIds?: number[];
}

export interface FlotteResponse {
  id: number;
  type: FlotteType;
  immatriculation: string;
  maxVolumeM3: number;
  maxWeightKg: number;
  status: FlotteStatus;
  assignable: boolean;
  transporterCount: number;
  transporters: UserResponse[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface FlotteTransporterAssignmentRequest {
  transporterIds: number[];
}

export interface FlotteStatusUpdateRequest {
  status: FlotteStatus;
}

// Pricing

export type PricingCriterion = 'FIXED' | 'DISTANCE' | 'WEIGHT' | 'VOLUME';

export interface CompanyPricingDistanceRuleRequest {
  originCollectionPointId: number;
  destinationCollectionPointId: number;
  amount: number;
}

export interface CompanyPricingRangeRuleRequest {
  minValue: number;
  maxValue?: number;
  amount: number;
}

export interface CompanyPricingRequest {
  selectedCriteria: PricingCriterion[];
  fixedPrice?: number;
  distanceRules?: CompanyPricingDistanceRuleRequest[];
  weightRules?: CompanyPricingRangeRuleRequest[];
  volumeRules?: CompanyPricingRangeRuleRequest[];
}

export interface CompanyPricingDistanceRuleResponse {
  id: number;
  originCollectionPointId: number;
  originCollectionPointName: string;
  destinationCollectionPointId: number;
  destinationCollectionPointName: string;
  amount: number;
}

export interface CompanyPricingRangeRuleResponse {
  id: number;
  minValue: number;
  maxValue?: number;
  amount: number;
}

export interface CompanyPricingResponse {
  id: number;
  companyId: number;
  transportModeId: number;
  transportModeName: string;
  selectedCriteria: PricingCriterion[];
  fixedPrice?: number;
  distanceRules: CompanyPricingDistanceRuleResponse[];
  weightRules: CompanyPricingRangeRuleResponse[];
  volumeRules: CompanyPricingRangeRuleResponse[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyPricingRequirementsRequest {
  selectedCriteria: PricingCriterion[];
}

export interface CompanyPricingRequiredDistancePairResponse {
  originCollectionPointId: number;
  originCollectionPointName: string;
  destinationCollectionPointId: number;
  destinationCollectionPointName: string;
}

export interface CompanyPricingRequirementsResponse {
  companyId: number;
  transportModeId: number;
  transportModeName: string;
  selectedCriteria: PricingCriterion[];
  fixedPriceRequired: boolean;
  distanceRulesRequired: boolean;
  weightRulesRequired: boolean;
  volumeRulesRequired: boolean;
  requiredDistancePairs: CompanyPricingRequiredDistancePairResponse[];
  weightRulesInstruction?: string;
  volumeRulesInstruction?: string;
}
