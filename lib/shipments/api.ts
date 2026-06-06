import { apiClient } from '@/lib/api-client';
import type {
  CollectorIncomingShipmentPage,
  CollectorPickupShipmentPage,
  CreateShipmentInput,
  GetCollectorIncomingShipmentsParams,
  GetShipmentCollectionPointOptionsParams,
  GetShipmentsParams,
  GetTransporterReadyShipmentsParams,
  PageableParams,
  PromoCodePaymentRequest,
  SearchShipmentCompaniesParams,
  SearchShipmentTransportModesParams,
  Shipment,
  ShipmentAvailableCompany,
  ShipmentAvailableTransportMode,
  ShipmentCollectionPointOptions,
  ShipmentDestinationDepositCreateRequest,
  ShipmentDestinationDepositRequest,
  ShipmentDestinationDepositRequestSummaryPage,
  ShipmentDestinationDepositReviewRequest,
  ShipmentDestinationIncomingShipmentPage,
  ShipmentPage,
  ShipmentPickupActionResponse,
  ShipmentPickupValidationRequest,
  ShipmentPriceSimulationResponse,
  ShipmentReceptionActionResponse,
  ShipmentReceptionRejectionRequest,
  ShipmentReceptionValidationRequest,
  ShipmentTransitNoteRequest,
  ShipmentTransmissionApprovalRequest,
  ShipmentTransmissionCreateRequest,
  ShipmentTransmissionEmbarkRequest,
  ShipmentTransmissionRejectionRequest,
  ShipmentTransmissionRequest,
  ShipmentTransmissionRequestSummaryPage,
  ShipmentTransportGroup,
  ShipmentTransportGroupCreateRequest,
  ShipmentTransportGroupNoteRequest,
  ShipmentTransportGroupSummaryPage,
  TransporterReadyShipmentPage,
} from './types';

function buildShipmentQuery(params: GetShipmentsParams = {}) {
  const search = new URLSearchParams();
  search.set('page', String(params.page ?? 0));
  search.set('size', String(params.size ?? 20));

  if (params.status) {
    search.set('status', params.status);
  }

  return search.toString();
}

function buildPageableQuery(params: PageableParams = {}) {
  const search = new URLSearchParams();
  search.set('page', String(params.page ?? 0));
  search.set('size', String(params.size ?? 20));
  return search.toString();
}

function buildTransporterReadyQuery(params: GetTransporterReadyShipmentsParams = {}) {
  const search = new URLSearchParams(buildPageableQuery(params));

  if (params.originCollectionPointId != null) {
    search.set('originCollectionPointId', String(params.originCollectionPointId));
  }

  return search.toString();
}

function buildCreationQuery(
  params:
    | SearchShipmentTransportModesParams
    | SearchShipmentCompaniesParams
    | GetShipmentCollectionPointOptionsParams,
) {
  const search = new URLSearchParams();
  search.set('originCountryId', String(params.originCountryId));
  search.set('originCityId', String(params.originCityId));
  search.set('destinationCountryId', String(params.destinationCountryId));
  search.set('destinationCityId', String(params.destinationCityId));

  if ('transportModeId' in params) {
    search.set('transportModeId', String(params.transportModeId));
  }

  if ('parcelTypeId' in params && params.parcelTypeId != null) {
    search.set('parcelTypeId', String(params.parcelTypeId));
  }

  return search.toString();
}

export function getShipments(
  token: string,
  params: GetShipmentsParams = {},
): Promise<ShipmentPage> {
  return apiClient.get<ShipmentPage>(`/api/delivery/shipments?${buildShipmentQuery(params)}`, token);
}

export function getShipment(token: string, shipmentId: number): Promise<Shipment> {
  return apiClient.get<Shipment>(`/api/delivery/shipments/${shipmentId}`, token);
}

export function createShipment(token: string, input: CreateShipmentInput): Promise<Shipment> {
  const formData = new FormData();
  formData.append('data', new Blob([JSON.stringify(input.data)], { type: 'application/json' }));

  if (input.senderFrontIdCard) {
    formData.append('senderFrontIdCard', input.senderFrontIdCard);
  }

  if (input.senderBackIdCard) {
    formData.append('senderBackIdCard', input.senderBackIdCard);
  }

  input.parcelPhotos?.forEach((file) => {
    formData.append('parcelPhotos', file);
  });

  return apiClient.postForm<Shipment>('/api/delivery/shipments', formData, token);
}

export function simulateShipmentPrice(
  token: string,
  data: CreateShipmentInput['data'],
): Promise<ShipmentPriceSimulationResponse> {
  return apiClient.post<ShipmentPriceSimulationResponse>(
    '/api/delivery/shipments/simulate-price',
    data,
    token,
  );
}

export function payShipmentWithPromoCode(
  token: string,
  shipmentId: number,
  data: PromoCodePaymentRequest,
): Promise<Shipment> {
  return apiClient.post<Shipment>(
    `/api/delivery/shipments/${shipmentId}/payments/promo-code`,
    data,
    token,
  );
}

export function getCollectorIncomingShipments(
  token: string,
  params: GetCollectorIncomingShipmentsParams = {},
): Promise<CollectorIncomingShipmentPage> {
  return apiClient.get<CollectorIncomingShipmentPage>(
    `/api/delivery/shipments/reception?${buildPageableQuery(params)}`,
    token,
  );
}

export function validateIncomingShipment(
  token: string,
  shipmentId: number,
  data: ShipmentReceptionValidationRequest,
): Promise<ShipmentReceptionActionResponse> {
  return apiClient.post<ShipmentReceptionActionResponse>(
    `/api/delivery/shipments/reception/${shipmentId}/validate`,
    data,
    token,
  );
}

export function rejectIncomingShipment(
  token: string,
  shipmentId: number,
  data: ShipmentReceptionRejectionRequest,
): Promise<ShipmentReceptionActionResponse> {
  return apiClient.post<ShipmentReceptionActionResponse>(
    `/api/delivery/shipments/reception/${shipmentId}/reject`,
    data,
    token,
  );
}

export function getReadyForPickupShipments(
  token: string,
  params: PageableParams = {},
): Promise<CollectorPickupShipmentPage> {
  return apiClient.get<CollectorPickupShipmentPage>(
    `/api/delivery/shipments/pickup?${buildPageableQuery(params)}`,
    token,
  );
}

export function deliverShipment(
  token: string,
  shipmentId: number,
  data: ShipmentPickupValidationRequest,
): Promise<ShipmentPickupActionResponse> {
  return apiClient.post<ShipmentPickupActionResponse>(
    `/api/delivery/shipments/pickup/${shipmentId}/deliver`,
    data,
    token,
  );
}

export function getTransporterReadyShipments(
  token: string,
  params: GetTransporterReadyShipmentsParams = {},
): Promise<TransporterReadyShipmentPage> {
  return apiClient.get<TransporterReadyShipmentPage>(
    `/api/delivery/shipments/transmission/transporters/ready-shipments?${buildTransporterReadyQuery(params)}`,
    token,
  );
}

export function getTransporterInTransitShipments(
  token: string,
  params: PageableParams = {},
): Promise<TransporterReadyShipmentPage> {
  return apiClient.get<TransporterReadyShipmentPage>(
    `/api/delivery/shipments/transmission/transporters/in-transit-shipments?${buildPageableQuery(params)}`,
    token,
  );
}

export function getTransporterTransmissionRequests(
  token: string,
  params: PageableParams = {},
): Promise<ShipmentTransmissionRequestSummaryPage> {
  return apiClient.get<ShipmentTransmissionRequestSummaryPage>(
    `/api/delivery/shipments/transmission/transporters/requests?${buildPageableQuery(params)}`,
    token,
  );
}

export function getCollectorTransmissionRequests(
  token: string,
  params: PageableParams = {},
): Promise<ShipmentTransmissionRequestSummaryPage> {
  return apiClient.get<ShipmentTransmissionRequestSummaryPage>(
    `/api/delivery/shipments/transmission/collectors/requests?${buildPageableQuery(params)}`,
    token,
  );
}

export function getTransmissionRequest(
  token: string,
  requestId: number,
): Promise<ShipmentTransmissionRequest> {
  return apiClient.get<ShipmentTransmissionRequest>(
    `/api/delivery/shipments/transmission/requests/${requestId}`,
    token,
  );
}

export function createTransmissionRequest(
  token: string,
  data: ShipmentTransmissionCreateRequest,
): Promise<ShipmentTransmissionRequest> {
  return apiClient.post<ShipmentTransmissionRequest>(
    '/api/delivery/shipments/transmission/transporters/requests',
    data,
    token,
  );
}

export function approveTransmissionRequest(
  token: string,
  requestId: number,
  data: ShipmentTransmissionApprovalRequest,
): Promise<ShipmentTransmissionRequest> {
  return apiClient.post<ShipmentTransmissionRequest>(
    `/api/delivery/shipments/transmission/collectors/requests/${requestId}/approve`,
    data,
    token,
  );
}

export function rejectTransmissionRequest(
  token: string,
  requestId: number,
  data: ShipmentTransmissionRejectionRequest,
): Promise<ShipmentTransmissionRequest> {
  return apiClient.post<ShipmentTransmissionRequest>(
    `/api/delivery/shipments/transmission/collectors/requests/${requestId}/reject`,
    data,
    token,
  );
}

export function embarkTransmissionShipments(
  token: string,
  requestId: number,
  data: ShipmentTransmissionEmbarkRequest,
): Promise<ShipmentTransmissionRequest> {
  return apiClient.post<ShipmentTransmissionRequest>(
    `/api/delivery/shipments/transmission/transporters/requests/${requestId}/embark`,
    data,
    token,
  );
}

export function addTransmissionTransitNote(
  token: string,
  requestId: number,
  data: ShipmentTransitNoteRequest,
): Promise<ShipmentTransmissionRequest> {
  return apiClient.post<ShipmentTransmissionRequest>(
    `/api/delivery/shipments/transmission/transporters/requests/${requestId}/transit-notes`,
    data,
    token,
  );
}

export function getTransportGroups(
  token: string,
  params: PageableParams = {},
): Promise<ShipmentTransportGroupSummaryPage> {
  return apiClient.get<ShipmentTransportGroupSummaryPage>(
    `/api/delivery/shipments/transport-groups?${buildPageableQuery(params)}`,
    token,
  );
}

export function getTransportGroup(
  token: string,
  groupId: number,
): Promise<ShipmentTransportGroup> {
  return apiClient.get<ShipmentTransportGroup>(
    `/api/delivery/shipments/transport-groups/${groupId}`,
    token,
  );
}

export function createTransportGroup(
  token: string,
  data: ShipmentTransportGroupCreateRequest,
): Promise<ShipmentTransportGroup> {
  return apiClient.post<ShipmentTransportGroup>(
    '/api/delivery/shipments/transport-groups',
    data,
    token,
  );
}

export function addTransportGroupNote(
  token: string,
  groupId: number,
  data: ShipmentTransportGroupNoteRequest,
): Promise<ShipmentTransportGroup> {
  return apiClient.post<ShipmentTransportGroup>(
    `/api/delivery/shipments/transport-groups/${groupId}/notes`,
    data,
    token,
  );
}

export function dissolveTransportGroup(
  token: string,
  groupId: number,
): Promise<ShipmentTransportGroup> {
  return apiClient.post<ShipmentTransportGroup>(
    `/api/delivery/shipments/transport-groups/${groupId}/dissolve`,
    {},
    token,
  );
}

export function getTransporterDestinationDepositRequests(
  token: string,
  params: PageableParams = {},
): Promise<ShipmentDestinationDepositRequestSummaryPage> {
  return apiClient.get<ShipmentDestinationDepositRequestSummaryPage>(
    `/api/delivery/shipments/destination-deposits/transporters/requests?${buildPageableQuery(params)}`,
    token,
  );
}

export function getCollectorDestinationDepositRequests(
  token: string,
  params: PageableParams = {},
): Promise<ShipmentDestinationDepositRequestSummaryPage> {
  return apiClient.get<ShipmentDestinationDepositRequestSummaryPage>(
    `/api/delivery/shipments/destination-deposits/collectors/requests?${buildPageableQuery(params)}`,
    token,
  );
}

export function getDestinationDepositRequest(
  token: string,
  requestId: number,
): Promise<ShipmentDestinationDepositRequest> {
  return apiClient.get<ShipmentDestinationDepositRequest>(
    `/api/delivery/shipments/destination-deposits/requests/${requestId}`,
    token,
  );
}

export function createDestinationDepositRequest(
  token: string,
  data: ShipmentDestinationDepositCreateRequest,
): Promise<ShipmentDestinationDepositRequest> {
  return apiClient.post<ShipmentDestinationDepositRequest>(
    '/api/delivery/shipments/destination-deposits/transporters/requests',
    data,
    token,
  );
}

export function reviewDestinationDepositRequest(
  token: string,
  requestId: number,
  data: ShipmentDestinationDepositReviewRequest,
): Promise<ShipmentDestinationDepositRequest> {
  return apiClient.post<ShipmentDestinationDepositRequest>(
    `/api/delivery/shipments/destination-deposits/collectors/requests/${requestId}/review`,
    data,
    token,
  );
}

export function getDestinationIncomingShipments(
  token: string,
  params: PageableParams = {},
): Promise<ShipmentDestinationIncomingShipmentPage> {
  return apiClient.get<ShipmentDestinationIncomingShipmentPage>(
    `/api/delivery/shipments/destination-deposits/collectors/incoming-shipments?${buildPageableQuery(params)}`,
    token,
  );
}

export function getDestinationIncomingGroups(
  token: string,
  params: PageableParams = {},
): Promise<ShipmentTransportGroupSummaryPage> {
  return apiClient.get<ShipmentTransportGroupSummaryPage>(
    `/api/delivery/shipments/destination-deposits/collectors/incoming-groups?${buildPageableQuery(params)}`,
    token,
  );
}

export function searchShipmentTransportModes(
  token: string,
  params: SearchShipmentTransportModesParams,
): Promise<ShipmentAvailableTransportMode[]> {
  return apiClient.get<ShipmentAvailableTransportMode[]>(
    `/api/delivery/shipments/creation/transport-modes?${buildCreationQuery(params)}`,
    token,
  );
}

export function searchShipmentCompanies(
  token: string,
  params: SearchShipmentCompaniesParams,
): Promise<ShipmentAvailableCompany[]> {
  return apiClient.get<ShipmentAvailableCompany[]>(
    `/api/delivery/shipments/creation/companies?${buildCreationQuery(params)}`,
    token,
  );
}

export function getShipmentCollectionPointOptions(
  token: string,
  params: GetShipmentCollectionPointOptionsParams,
): Promise<ShipmentCollectionPointOptions> {
  return apiClient.get<ShipmentCollectionPointOptions>(
    `/api/delivery/shipments/creation/companies/${params.companyId}/collection-points?${buildCreationQuery(params)}`,
    token,
  );
}
