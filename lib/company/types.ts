// Domain types for company configuration and operations.
// Mirrors the Delivery Service OpenAPI schemas.

import type { UserResponse } from '@/lib/auth/types';
import type { PaymentCollectionMode } from '@/lib/auth/types';

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

export interface MessageResponse {
  message: string;
}

// Company profile

export interface CompanyProfileUpdateRequest {
  name: string;
  email?: string;
  phone: string;
  companyUrl: string;
  address?: string;
  countryId: number;
  city: string;
  paymentCollectionMode?: PaymentCollectionMode;
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
  cityId?: number;
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
    cityId: number;
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

export type PricingCriterion = 'FIXED' | 'WEIGHT' | 'VOLUME';
export type PricingApplicationMode = 'PROPORTIONAL' | 'ROUND_UP_UNIT';

export interface CompanyPricingRangeRuleRequest {
  minValue: number;
  maxValue?: number;
  amount: number;
}

export interface CompanyPricingRequest {
  originCollectionPointId: number;
  destinationCollectionPointId: number;
  parcelTypeId: number;
  selectedCriteria: PricingCriterion[];
  fixedPrice?: number;
  expressSurcharge?: number;
  weightApplicationMode?: PricingApplicationMode;
  volumeApplicationMode?: PricingApplicationMode;
  weightRules?: CompanyPricingRangeRuleRequest[];
  volumeRules?: CompanyPricingRangeRuleRequest[];
}

export interface CompanyPricingRouteResponse {
  originCollectionPointId: number;
  originCollectionPointName: string;
  destinationCollectionPointId: number;
  destinationCollectionPointName: string;
}

// Route exceptions

export interface CompanyRouteExceptionRequest {
  originCollectionPointId: number;
  destinationCollectionPointId: number;
  reason?: string;
}

export interface CompanyRouteExceptionResponse {
  id: number;
  companyId: number;
  originCollectionPointId: number;
  originCollectionPointName: string;
  destinationCollectionPointId: number;
  destinationCollectionPointName: string;
  reason?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
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
  originCollectionPointId: number;
  originCollectionPointName: string;
  destinationCollectionPointId: number;
  destinationCollectionPointName: string;
  parcelTypeId: number;
  parcelTypeName: string;
  selectedCriteria: PricingCriterion[];
  fixedPrice?: number;
  expressSurcharge?: number;
  insurancePrice?: number;
  weightApplicationMode?: PricingApplicationMode;
  volumeApplicationMode?: PricingApplicationMode;
  weightRules: CompanyPricingRangeRuleResponse[];
  volumeRules: CompanyPricingRangeRuleResponse[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyPricingRequirementsRequest {
  selectedCriteria: PricingCriterion[];
  originCollectionPointId?: number;
  destinationCollectionPointId?: number;
  parcelTypeId?: number;
}

export interface CompanyPricingRequirementsResponse {
  companyId: number;
  transportModeId: number;
  transportModeName: string;
  selectedCriteria: PricingCriterion[];
  availableRoutes: CompanyPricingRouteResponse[];
  availableParcelTypes: ParcelTypeResponse[];
  fixedPriceRequired: boolean;
  weightRulesRequired: boolean;
  volumeRulesRequired: boolean;
  weightApplicationModeRequired: boolean;
  volumeApplicationModeRequired: boolean;
  defaultInsurancePrice?: number;
  weightRulesInstruction?: string;
  volumeRulesInstruction?: string;
}

// Delivery estimates

export type DeliveryEstimateUnit = 'HOURS' | 'DAYS';

export interface CompanyDeliveryEstimateRequest {
  originCollectionPointId: number;
  destinationCollectionPointId: number;
  parcelTypeId: number;
  durationValue: number;
  durationUnit: DeliveryEstimateUnit;
}

export interface CompanyDeliveryEstimateResponse {
  id: number;
  companyId: number;
  transportModeId: number;
  transportModeName: string;
  originCollectionPointId: number;
  originCollectionPointName: string;
  destinationCollectionPointId: number;
  destinationCollectionPointName: string;
  parcelTypeId: number;
  parcelTypeName: string;
  durationValue: number;
  durationUnit: DeliveryEstimateUnit;
  label?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyDeliveryEstimateRequirementsResponse {
  companyId: number;
  transportModeId: number;
  transportModeName: string;
  availableRoutes: CompanyPricingRouteResponse[];
  availableParcelTypes: ParcelTypeResponse[];
  instruction?: string;
}
