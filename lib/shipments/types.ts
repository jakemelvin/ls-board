import type { Page } from '@/lib/admin/types';

export type ShipmentStatus =
  | 'CREATED'
  | 'PAID'
  | 'AWAITING_DROP_OFF'
  | 'RECEIVED_AT_COLLECTION_POINT'
  | 'READY_FOR_TRANSPORT'
  | 'IN_TRANSIT'
  | 'ARRIVED_DESTINATION_POINT'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type ShipmentPriority = 'STANDARD' | 'EXPRESS';

export type ShipmentPaymentStatus = 'UNPAID' | 'PAID' | 'PAYMENT_AT_COLLECTION_POINT';

export type ShipmentPaymentCollectionMode = 'PLATFORM' | 'COLLECTION_POINT';

export interface ShipmentCollectionPoint {
  id: number;
  reference?: string;
  name: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  cityId?: number;
  cityName?: string;
  countryId?: number;
  countryName?: string;
}

export interface ShipmentParty {
  linkedUserId?: number;
  usesRegisteredProfile?: boolean;
  fullName?: string;
  address?: string;
  whatsappNumber?: string;
  countryName?: string;
  cityName?: string;
  idCardNumber?: string;
  frontIdCardUrl?: string;
  backIdCardUrl?: string;
}

export interface ShipmentPhoto {
  id: number;
  photoUrl: string;
  uploadedAt?: string;
}

export interface ShipmentStatusHistory {
  id: number;
  fromStatus?: ShipmentStatus;
  toStatus: ShipmentStatus;
  changedAt: string;
  changedByUserId?: number;
  changedByUsername?: string;
  note?: string;
}

export interface Shipment {
  id: number;
  reference: string;
  code?: string;
  clientUserId?: number;
  createdByUserId?: number;
  companyId: number;
  companyName: string;
  originCountryId?: number;
  originCountryName?: string;
  originCityId?: number;
  originCityName?: string;
  destinationCountryId?: number;
  destinationCountryName?: string;
  destinationCityId?: number;
  destinationCityName?: string;
  transportModeId?: number;
  transportModeName?: string;
  parcelTypeId?: number;
  parcelTypeName?: string;
  originCollectionPoint?: ShipmentCollectionPoint;
  destinationCollectionPoint?: ShipmentCollectionPoint;
  priority: ShipmentPriority;
  description?: string;
  volumeM3?: number;
  weightKg?: number;
  status: ShipmentStatus;
  paymentStatus?: ShipmentPaymentStatus;
  paymentCollectionMode?: ShipmentPaymentCollectionMode;
  companyPrice?: number;
  feeAmount?: number;
  discountAmount?: number;
  price?: number;
  qrCodeUrl?: string;
  sender?: ShipmentParty;
  receiver?: ShipmentParty;
  photos?: ShipmentPhoto[];
  statusHistory?: ShipmentStatusHistory[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type ShipmentPage = Page<Shipment>;

export interface GetShipmentsParams {
  page?: number;
  size?: number;
  status?: ShipmentStatus;
}

export interface ShipmentCreatePartyRequest {
  fullName?: string;
  address?: string;
  whatsappNumber?: string;
  idCardNumber?: string;
}

export interface ShipmentCreateRequest {
  companyId: number;
  transportModeId: number;
  originCountryId: number;
  originCityId: number;
  destinationCountryId: number;
  destinationCityId: number;
  originCollectionPointId: number;
  destinationCollectionPointId: number;
  receiverUserId?: number;
  parcelTypeId: number;
  priority: ShipmentPriority;
  description?: string;
  promoCode?: string;
  volumeM3?: number;
  weightKg?: number;
  senderUsesRegisteredProfile?: boolean;
  sender?: ShipmentCreatePartyRequest;
  receiver: ShipmentCreatePartyRequest;
}

export interface CreateShipmentInput {
  data: ShipmentCreateRequest;
  senderFrontIdCard?: File | null;
  senderBackIdCard?: File | null;
  parcelPhotos?: File[];
}

export interface ShipmentAvailableTransportMode {
  transportModeId: number;
  transportModeName: string;
  companyCount: number;
}

export interface ShipmentAvailableCompany {
  companyId: number;
  companyName: string;
  companyLogoUrl?: string;
  originCollectionPointCount: number;
  destinationCollectionPointCount: number;
}

export type ShipmentCollectionPointOption = ShipmentCollectionPoint;

export interface ShipmentCollectionPointOptions {
  companyId: number;
  companyName: string;
  originCollectionPoints: ShipmentCollectionPointOption[];
  destinationCollectionPoints: ShipmentCollectionPointOption[];
}

export interface SearchShipmentTransportModesParams {
  originCountryId: number;
  originCityId: number;
  destinationCountryId: number;
  destinationCityId: number;
}

export interface SearchShipmentCompaniesParams
  extends SearchShipmentTransportModesParams {
  transportModeId: number;
  parcelTypeId?: number;
}

export interface GetShipmentCollectionPointOptionsParams
  extends SearchShipmentCompaniesParams {
  companyId: number;
}
