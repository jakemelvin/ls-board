import type { Page } from '@/lib/admin/types';

export type ParcelPickupOpportunityStatus = 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type ParcelPickupProposalType = 'ACCEPT_LISTED_PRICE' | 'COUNTER_OFFER';
export type ParcelPickupNegotiationStatus =
  | 'PENDING_COMPANY_REVIEW'
  | 'REJECTED'
  | 'AWAITING_DEPOSIT_PAYMENT'
  | 'DEPOSIT_PAYMENT_PENDING'
  | 'AGREED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';
export type ParcelPickupTrackingAction =
  | 'PROPOSAL_CREATED'
  | 'COMPANY_ACCEPTED'
  | 'COMPANY_REJECTED'
  | 'DEPOSIT_PAYMENT_INITIATED'
  | 'DEPOSIT_PAYMENT_CONFIRMED'
  | 'DEPOSIT_PAYMENT_FAILED'
  | 'PICKUP_CONFIRMED'
  | 'TRANSPORT_STARTED'
  | 'DELIVERY_CONFIRMED'
  | 'CANCELLED';

export interface PickupParcelTypeRequest {
  name: string;
  description?: string;
}

export interface PickupParcelTypeResponse {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ParcelPickupOpportunityRequest {
  driverUserId?: number;
  driverFullName: string;
  driverWhatsapp: string;
  originCityId: number;
  destinationCityId: number;
  vehicleType: string;
  maxAvailableVolumeM3: number;
  price?: number;
  travelDate: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  description?: string;
  publicationStartsAt: string;
}

export interface ParcelPickupOpportunityResponse {
  id: number;
  reference: string;
  companyId: number;
  companyName: string;
  companyLogoUrl?: string | null;
  originCityId: number;
  originCity: string;
  originCountryCode?: string | null;
  destinationCityId: number;
  destinationCity: string;
  destinationCountryCode?: string | null;
  vehicleType: string;
  maxAvailableVolumeM3: number;
  availableVolumeM3: number;
  price?: number | null;
  currency: string;
  travelDate: string;
  pickupWindowStart?: string | null;
  pickupWindowEnd?: string | null;
  description?: string | null;
  publicationStartsAt: string;
  status: ParcelPickupOpportunityStatus;
  driverUserId?: number | null;
  driverFullName: string;
  driverWhatsapp?: string | null;
  driverContactVisible: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ParcelPickupProposalRequest {
  parcelTypeId: number;
  proposalType: ParcelPickupProposalType;
  requestedVolumeM3: number;
  proposedPrice?: number;
  note?: string;
}

export interface ParcelPickupDecisionRequest {
  note?: string;
}

export interface ParcelPickupTrackingRequest {
  action: ParcelPickupTrackingAction;
  note?: string;
}

export interface ParcelPickupTrackingResponse {
  id: number;
  action: ParcelPickupTrackingAction;
  fromStatus?: ParcelPickupNegotiationStatus | null;
  toStatus?: ParcelPickupNegotiationStatus | null;
  actorUserId?: number | null;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface ParcelPickupNegotiationResponse {
  activityType: 'PARCEL_PICKUP' | string;
  id: number;
  reference: string;
  opportunity: ParcelPickupOpportunityResponse;
  clientId: number;
  clientName: string;
  parcelTypeId: number;
  parcelTypeName: string;
  proposalType: ParcelPickupProposalType;
  requestedVolumeM3: number;
  proposedPrice?: number | null;
  agreedPrice?: number | null;
  depositAmount?: number | null;
  remainingAmount?: number | null;
  currency: string;
  status: ParcelPickupNegotiationStatus;
  contactsUnlocked: boolean;
  clientWhatsapp?: string | null;
  companyPhone?: string | null;
  driverWhatsapp?: string | null;
  trackingHistory?: ParcelPickupTrackingResponse[];
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface OpportunityListParams {
  status?: ParcelPickupOpportunityStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export interface NegotiationListParams {
  status?: ParcelPickupNegotiationStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export type ParcelPickupOpportunityPage = Page<ParcelPickupOpportunityResponse>;
export type ParcelPickupNegotiationPage = Page<ParcelPickupNegotiationResponse>;

