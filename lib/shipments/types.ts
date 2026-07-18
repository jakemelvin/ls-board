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

export type ShipmentTransactionStatus =
  | 'INITIATED'
  | 'PLATFORM_FEE_PAID'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

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
  transactionStatus?: ShipmentTransactionStatus;
  paymentCollectionMode?: ShipmentPaymentCollectionMode;
  companyPrice?: number;
  feeAmount?: number;
  expressSurchargeAmount?: number;
  insuranceAmount?: number;
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

export interface GetCollectorIncomingShipmentsParams {
  page?: number;
  size?: number;
}

export interface PageableParams {
  page?: number;
  size?: number;
}

export interface GetTransporterReadyShipmentsParams extends PageableParams {
  originCollectionPointId?: number;
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

export interface ShipmentPriceSimulationResponse {
  companyId?: number;
  companyName?: string;
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
  priority?: ShipmentPriority;
  paymentCollectionMode?: ShipmentPaymentCollectionMode;
  expectedPaymentStatus?: ShipmentPaymentStatus;
  baseCompanyPrice?: number;
  expressSurchargeAmount?: number;
  insuranceAmount?: number;
  totalCompanyPrice?: number;
  feeAmount?: number;
  discountAmount?: number;
  totalBeforeDiscount?: number;
  platformAmountBeforeDiscount?: number;
  collectionPointAmountToPay?: number;
  totalToPay?: number;
  promoCode?: string;
  promoCodeApplied?: boolean;
}

export interface PromoCodePaymentRequest {
  promoCode: string;
}

export interface CollectorIncomingShipment {
  shipmentId: number;
  companyId?: number;
  companyName?: string;
  transportModeName?: string;
  parcelTypeName?: string;
  priority?: ShipmentPriority;
  status?: ShipmentStatus;
  paymentStatus?: ShipmentPaymentStatus;
  transactionStatus?: ShipmentTransactionStatus;
  senderFullName?: string;
  receiverFullName?: string;
  originCollectionPointName?: string;
  destinationCollectionPointName?: string;
  companyPrice?: number;
  feeAmount?: number;
  discountAmount?: number;
  price?: number;
  createdAt?: string;
}

export type CollectorIncomingShipmentPage = Page<CollectorIncomingShipment>;

export interface ShipmentReceptionValidationRequest {
  shipmentReference: string;
}

export interface ShipmentReceptionRejectionRequest {
  reason: string;
}

export interface ShipmentReceptionActionResponse {
  actionId?: number;
  shipmentId?: number;
  actionType?: 'VALIDATED' | 'REJECTED';
  currentShipmentStatus?: ShipmentStatus;
  transactionStatus?: ShipmentTransactionStatus;
  submittedReference?: string;
  rejectionReason?: string;
  collectorUsername?: string;
  clientUserId?: number;
  senderFullName?: string;
  note?: string;
  actedAt?: string;
}

export interface TransporterReadyShipment {
  shipmentId: number;
  reference: string;
  originCollectionPointId?: number;
  originCollectionPointName?: string;
  destinationCollectionPointId?: number;
  destinationCollectionPointName?: string;
  senderFullName?: string;
  receiverFullName?: string;
  transportModeName?: string;
  parcelTypeName?: string;
  priority?: ShipmentPriority;
  status?: ShipmentStatus;
  price?: number;
  createdAt?: string;
}

export type TransporterReadyShipmentPage = Page<TransporterReadyShipment>;

export type ShipmentTransmissionStatus =
  | 'PENDING_COLLECTOR_APPROVAL'
  | 'COLLECTOR_APPROVED'
  | 'COLLECTOR_REJECTED'
  | 'PARTIALLY_DISPATCHED'
  | 'FULLY_DISPATCHED';

export interface ShipmentTransmissionRequestSummary {
  requestId: number;
  companyId?: number;
  companyName?: string;
  originCollectionPointId?: number;
  originCollectionPointName?: string;
  transporterUserId?: number;
  transporterUsername?: string;
  collectorUserId?: number;
  collectorUsername?: string;
  status: ShipmentTransmissionStatus;
  requestedShipmentCount?: number;
  embarkedShipmentCount?: number;
  pendingShipmentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ShipmentTransmissionRequestSummaryPage =
  Page<ShipmentTransmissionRequestSummary>;

export interface ShipmentTransmissionRequestItem {
  itemId: number;
  shipmentId: number;
  reference?: string;
  shipmentStatus?: ShipmentStatus;
  senderFullName?: string;
  receiverFullName?: string;
  destinationCollectionPointName?: string;
  embarked?: boolean;
  embarkedAt?: string;
}

export type ShipmentTransmissionActionType =
  | 'REQUEST_INITIATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'SHIPMENTS_DISPATCHED'
  | 'TRANSIT_NOTE_ADDED';

export interface ShipmentTransmissionAction {
  actionId: number;
  actionType: ShipmentTransmissionActionType;
  actorUserId?: number;
  actorUsername?: string;
  note?: string;
  rejectionReason?: string;
  actedAt?: string;
}

export interface ShipmentTransitNote {
  noteId: number;
  transporterUserId?: number;
  transporterUsername?: string;
  description?: string;
  shipmentIds?: number[];
  notedAt?: string;
}

export interface ShipmentTransmissionRequest
  extends ShipmentTransmissionRequestSummary {
  rejectionReason?: string;
  items?: ShipmentTransmissionRequestItem[];
  actions?: ShipmentTransmissionAction[];
  transitNotes?: ShipmentTransitNote[];
}

export interface ShipmentTransmissionCreateRequest {
  shipmentIds: number[];
  note?: string;
}

export interface ShipmentTransmissionApprovalRequest {
  note?: string;
}

export interface ShipmentTransmissionRejectionRequest {
  reason: string;
}

export interface ShipmentTransmissionEmbarkRequest {
  shipmentIds: number[];
  note?: string;
}

export interface ShipmentTransitNoteRequest {
  shipmentIds: number[];
  description: string;
}

export type ShipmentTransportGroupActionType =
  | 'CREATED'
  | 'NOTE_ADDED'
  | 'DISSOLVED'
  | 'SHIPMENT_REMOVED';

export interface ShipmentTransportGroupSummary {
  groupId: number;
  reference?: string;
  name?: string;
  active?: boolean;
  transporterUserId?: number;
  transporterUsername?: string;
  activeShipmentCount?: number;
  totalShipmentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ShipmentTransportGroupSummaryPage =
  Page<ShipmentTransportGroupSummary>;

export interface ShipmentTransportGroupItem {
  itemId: number;
  shipmentId: number;
  shipmentReference?: string;
  shipmentStatus?: ShipmentStatus;
  senderFullName?: string;
  receiverFullName?: string;
  active?: boolean;
  removedAt?: string;
  removalReason?: string;
}

export interface ShipmentTransportGroupAction {
  actionId: number;
  actionType: ShipmentTransportGroupActionType;
  actorUserId?: number;
  actorUsername?: string;
  note?: string;
  actedAt?: string;
}

export interface ShipmentTransportGroup extends ShipmentTransportGroupSummary {
  dissolvedAt?: string;
  dissolvedByUserId?: number;
  dissolvedByUsername?: string;
  items?: ShipmentTransportGroupItem[];
  actions?: ShipmentTransportGroupAction[];
}

export interface ShipmentTransportGroupCreateRequest {
  name?: string;
  shipmentIds: number[];
}

export interface ShipmentTransportGroupNoteRequest {
  description: string;
}

export type ShipmentDestinationDepositStatus =
  | 'PENDING_COLLECTOR_REVIEW'
  | 'FULLY_ACCEPTED'
  | 'PARTIALLY_ACCEPTED'
  | 'FULLY_REJECTED';

export interface ShipmentDestinationDepositRequestSummary {
  requestId: number;
  destinationCollectionPointId?: number;
  destinationCollectionPointName?: string;
  transporterUserId?: number;
  transporterUsername?: string;
  collectorUserId?: number;
  collectorUsername?: string;
  status: ShipmentDestinationDepositStatus;
  totalShipmentCount?: number;
  acceptedShipmentCount?: number;
  rejectedShipmentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ShipmentDestinationDepositRequestSummaryPage =
  Page<ShipmentDestinationDepositRequestSummary>;

export type ShipmentDestinationDepositItemStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED';

export interface ShipmentDestinationDepositRequestItem {
  itemId: number;
  shipmentId: number;
  shipmentReference?: string;
  senderFullName?: string;
  receiverFullName?: string;
  status?: ShipmentDestinationDepositItemStatus;
  rejectionReason?: string;
  sourceGroupReference?: string;
}

export interface ShipmentDestinationDepositRequestAction {
  actionId: number;
  actionType?: 'REQUEST_INITIATED' | 'REQUEST_REVIEWED';
  actorUserId?: number;
  actorUsername?: string;
  note?: string;
  actedAt?: string;
}

export interface ShipmentDestinationDepositRequest
  extends ShipmentDestinationDepositRequestSummary {
  items?: ShipmentDestinationDepositRequestItem[];
  actions?: ShipmentDestinationDepositRequestAction[];
}

export interface ShipmentDestinationDepositCreateRequest {
  shipmentIds?: number[];
  groupIds?: number[];
  note?: string;
}

export interface ShipmentDestinationDepositRejectionItemRequest {
  shipmentId: number;
  reason: string;
}

export interface ShipmentDestinationDepositReviewRequest {
  acceptedShipmentIds?: number[];
  rejectedShipments?: ShipmentDestinationDepositRejectionItemRequest[];
  note?: string;
}

export interface ShipmentDestinationIncomingShipment {
  shipmentId: number;
  reference?: string;
  senderFullName?: string;
  receiverFullName?: string;
  transporterUsername?: string;
  parcelTypeName?: string;
  transportModeName?: string;
  sourceGroupReference?: string;
  createdAt?: string;
}

export type ShipmentDestinationIncomingShipmentPage =
  Page<ShipmentDestinationIncomingShipment>;

export interface CollectorPickupShipment {
  shipmentId: number;
  reference?: string;
  senderFullName?: string;
  receiverFullName?: string;
  parcelTypeName?: string;
  transportModeName?: string;
  updatedAt?: string;
}

export type CollectorPickupShipmentPage = Page<CollectorPickupShipment>;

export interface ShipmentPickupValidationRequest {
  shipmentReference: string;
  shipmentCode: string;
  note?: string;
}

export interface ShipmentPickupActionResponse {
  actionId?: number;
  shipmentId?: number;
  shipmentReference?: string;
  collectorUsername?: string;
  receiverUserId?: number;
  verifiedCodeSuffix?: string;
  note?: string;
  deliveredAt?: string;
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
  companyUrl?: string;
  paymentCollectionMode?: ShipmentPaymentCollectionMode;
  deliveredShipmentCount?: number;
  reviews?: {
    reviewCount?: number;
    averageRating?: number;
  };
  pricings?: Array<{
    parcelTypeId?: number;
    parcelTypeName?: string;
  }>;
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
