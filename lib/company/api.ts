import { apiClient } from '@/lib/api-client';
import type { CompanyResponse } from '@/lib/auth/types';
import type { UserResponse, CreateUserRequest } from '@/lib/admin/types';
import type {
  ParcelTypeResponse,
  TransportModeResponse,
  CompanyParcelTypeResponse,
  CompanyTransportModeResponse,
  ParcelTypeAssignmentRequest,
  TransportModeAssignmentRequest,
  CatalogItemRequest,
  CityResponse,
  CityRequest,
  ZoneRequest,
  ZoneResponse,
  CollectionPointRequest,
  CollectionPointResponse,
  FlotteRequest,
  FlotteResponse,
  FlotteStatus,
  FlotteTransporterAssignmentRequest,
  CompanyPricingRequest,
  CompanyPricingResponse,
  CompanyPricingRequirementsRequest,
  CompanyPricingRequirementsResponse,
  CompanyDeliveryEstimateRequest,
  CompanyDeliveryEstimateResponse,
  CompanyDeliveryEstimateRequirementsResponse,
  CompanyRouteExceptionRequest,
  CompanyRouteExceptionResponse,
  MessageResponse,
} from './types';

function buildMultipartPayload(data: unknown, file?: File) {
  const formData = new FormData();
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  if (file) {
    formData.append('photo', file);
  }
  return formData;
}

export function getCurrentUserCompany(token: string): Promise<CompanyResponse> {
  return apiClient.get<CompanyResponse>('/api/delivery/users/me/company', token);
}

// Parcel types - global catalog

export function getParcelTypes(token: string): Promise<ParcelTypeResponse[]> {
  return apiClient.get<ParcelTypeResponse[]>('/api/delivery/parcel-types', token);
}

export function createParcelType(token: string, name: string): Promise<ParcelTypeResponse> {
  const body: CatalogItemRequest = { name };
  return apiClient.post<ParcelTypeResponse>('/api/delivery/parcel-types', body, token);
}

export function updateParcelType(
  token: string,
  parcelTypeId: number,
  name: string,
): Promise<ParcelTypeResponse> {
  const body: CatalogItemRequest = { name };
  return apiClient.put<ParcelTypeResponse>(
    `/api/delivery/parcel-types/${parcelTypeId}`,
    body,
    token,
  );
}

export function deleteParcelType(token: string, parcelTypeId: number): Promise<unknown> {
  return apiClient.delete(`/api/delivery/parcel-types/${parcelTypeId}`, token);
}

// Parcel types - company assignment

export function getCompanyParcelTypes(
  token: string,
  companyId: number,
): Promise<CompanyParcelTypeResponse> {
  return apiClient.get<CompanyParcelTypeResponse>(
    `/api/delivery/companies/${companyId}/parcel-types`,
    token,
  );
}

export function syncCompanyParcelTypes(
  token: string,
  companyId: number,
  parcelTypeIds: number[],
): Promise<CompanyParcelTypeResponse> {
  const body: ParcelTypeAssignmentRequest = { parcelTypeIds };
  return apiClient.put<CompanyParcelTypeResponse>(
    `/api/delivery/companies/${companyId}/parcel-types`,
    body,
    token,
  );
}

export function addCompanyParcelType(
  token: string,
  companyId: number,
  parcelTypeId: number,
): Promise<CompanyParcelTypeResponse> {
  return apiClient.post<CompanyParcelTypeResponse>(
    `/api/delivery/companies/${companyId}/parcel-types/${parcelTypeId}`,
    undefined,
    token,
  );
}

export function removeCompanyParcelType(
  token: string,
  companyId: number,
  parcelTypeId: number,
): Promise<CompanyParcelTypeResponse> {
  return apiClient.delete<CompanyParcelTypeResponse>(
    `/api/delivery/companies/${companyId}/parcel-types/${parcelTypeId}`,
    token,
  );
}

// Transport modes - global catalog

export function getTransportModes(token: string): Promise<TransportModeResponse[]> {
  return apiClient.get<TransportModeResponse[]>('/api/delivery/transport-modes', token);
}

export function createTransportMode(token: string, name: string): Promise<TransportModeResponse> {
  const body: CatalogItemRequest = { name };
  return apiClient.post<TransportModeResponse>('/api/delivery/transport-modes', body, token);
}

export function updateTransportMode(
  token: string,
  transportModeId: number,
  name: string,
): Promise<TransportModeResponse> {
  const body: CatalogItemRequest = { name };
  return apiClient.put<TransportModeResponse>(
    `/api/delivery/transport-modes/${transportModeId}`,
    body,
    token,
  );
}

export function deleteTransportMode(token: string, transportModeId: number): Promise<unknown> {
  return apiClient.delete(`/api/delivery/transport-modes/${transportModeId}`, token);
}

// Transport modes - company assignment

export function getCompanyTransportModes(
  token: string,
  companyId: number,
): Promise<CompanyTransportModeResponse> {
  return apiClient.get<CompanyTransportModeResponse>(
    `/api/delivery/companies/${companyId}/transport-modes`,
    token,
  );
}

export function syncCompanyTransportModes(
  token: string,
  companyId: number,
  transportModeIds: number[],
): Promise<CompanyTransportModeResponse> {
  const body: TransportModeAssignmentRequest = { transportModeIds };
  return apiClient.put<CompanyTransportModeResponse>(
    `/api/delivery/companies/${companyId}/transport-modes`,
    body,
    token,
  );
}

export function addCompanyTransportMode(
  token: string,
  companyId: number,
  transportModeId: number,
): Promise<CompanyTransportModeResponse> {
  return apiClient.post<CompanyTransportModeResponse>(
    `/api/delivery/companies/${companyId}/transport-modes/${transportModeId}`,
    undefined,
    token,
  );
}

export function removeCompanyTransportMode(
  token: string,
  companyId: number,
  transportModeId: number,
): Promise<CompanyTransportModeResponse> {
  return apiClient.delete<CompanyTransportModeResponse>(
    `/api/delivery/companies/${companyId}/transport-modes/${transportModeId}`,
    token,
  );
}

// Company team

export function createCompanySubAccount(
  token: string,
  companyId: number,
  data: CreateUserRequest,
): Promise<UserResponse> {
  return apiClient.post<UserResponse>(
    `/api/delivery/users/companies/${companyId}/subaccounts`,
    data,
    token,
  );
}

// Cities and zones

export function getCities(): Promise<CityResponse[]> {
  return apiClient.get<CityResponse[]>('/api/cities');
}

export function createCity(token: string, payload: CityRequest): Promise<CityResponse> {
  return apiClient.post<CityResponse>('/api/cities', payload, token);
}

export function getZones(token: string, companyId: number): Promise<ZoneResponse[]> {
  return apiClient.get<ZoneResponse[]>(`/api/delivery/companies/${companyId}/zones`, token);
}

export function createZone(
  token: string,
  companyId: number,
  payload: ZoneRequest,
): Promise<ZoneResponse> {
  return apiClient.post<ZoneResponse>(`/api/delivery/companies/${companyId}/zones`, payload, token);
}

export function updateZone(
  token: string,
  companyId: number,
  zoneId: number,
  payload: ZoneRequest,
): Promise<ZoneResponse> {
  return apiClient.put<ZoneResponse>(
    `/api/delivery/companies/${companyId}/zones/${zoneId}`,
    payload,
    token,
  );
}

export function deleteZone(token: string, companyId: number, zoneId: number): Promise<void> {
  return apiClient.delete<void>(`/api/delivery/companies/${companyId}/zones/${zoneId}`, token);
}

// Collection points

export function getCollectionPoints(
  token: string,
  companyId: number,
): Promise<CollectionPointResponse[]> {
  return apiClient.get<CollectionPointResponse[]>(
    `/api/delivery/companies/${companyId}/collection-points`,
    token,
  );
}

export function createCollectionPoint(
  token: string,
  companyId: number,
  payload: CollectionPointRequest,
  photo?: File,
): Promise<CollectionPointResponse> {
  const formData = buildMultipartPayload(payload, photo);
  return apiClient.postForm<CollectionPointResponse>(
    `/api/delivery/companies/${companyId}/collection-points`,
    formData,
    token,
  );
}

export function updateCollectionPoint(
  token: string,
  companyId: number,
  pointId: number,
  payload: CollectionPointRequest,
  photo?: File,
): Promise<CollectionPointResponse> {
  const formData = buildMultipartPayload(payload, photo);
  return apiClient.putForm<CollectionPointResponse>(
    `/api/delivery/companies/${companyId}/collection-points/${pointId}`,
    formData,
    token,
  );
}

export function deleteCollectionPoint(
  token: string,
  companyId: number,
  pointId: number,
): Promise<MessageResponse> {
  return apiClient.delete<MessageResponse>(
    `/api/delivery/companies/${companyId}/collection-points/${pointId}`,
    token,
  );
}

export function reopenCollectionPoint(
  token: string,
  companyId: number,
  pointId: number,
): Promise<CollectionPointResponse> {
  return apiClient.patch<CollectionPointResponse>(
    `/api/delivery/companies/${companyId}/collection-points/${pointId}/reopen`,
    undefined,
    token,
  );
}

export function manuallyCloseCollectionPoint(
  token: string,
  companyId: number,
  pointId: number,
): Promise<CollectionPointResponse> {
  return apiClient.patch<CollectionPointResponse>(
    `/api/delivery/companies/${companyId}/collection-points/${pointId}/manual-close`,
    undefined,
    token,
  );
}

export function deactivateCollectionPoint(
  token: string,
  companyId: number,
  pointId: number,
): Promise<MessageResponse> {
  return apiClient.patch<MessageResponse>(
    `/api/delivery/companies/${companyId}/collection-points/${pointId}/deactivate`,
    undefined,
    token,
  );
}

export function activateCollectionPoint(
  token: string,
  companyId: number,
  pointId: number,
): Promise<MessageResponse> {
  return apiClient.patch<MessageResponse>(
    `/api/delivery/companies/${companyId}/collection-points/${pointId}/activate`,
    undefined,
    token,
  );
}

export function updateCollectionPointCommissionPercentage(
  token: string,
  companyId: number,
  pointId: number,
  commissionPercentage: number,
): Promise<CollectionPointResponse> {
  return apiClient.patch<CollectionPointResponse>(
    `/api/delivery/companies/${companyId}/collection-points/${pointId}/commission-percentage`,
    { commissionPercentage },
    token,
  );
}

export function assignCollectionPointResponsible(
  token: string,
  companyId: number,
  pointId: number,
  responsibleId: number,
): Promise<CollectionPointResponse> {
  return apiClient.patch<CollectionPointResponse>(
    `/api/delivery/companies/${companyId}/collection-points/${pointId}/assign-responsible/${responsibleId}`,
    undefined,
    token,
  );
}

// Fleet

export function getFlottes(token: string, companyId: number): Promise<FlotteResponse[]> {
  return apiClient.get<FlotteResponse[]>(`/api/delivery/companies/${companyId}/flottes`, token);
}

export function getFlotte(
  token: string,
  companyId: number,
  flotteId: number,
): Promise<FlotteResponse> {
  return apiClient.get<FlotteResponse>(
    `/api/delivery/companies/${companyId}/flottes/${flotteId}`,
    token,
  );
}

export function createFlotte(
  token: string,
  companyId: number,
  payload: FlotteRequest,
): Promise<FlotteResponse> {
  return apiClient.post<FlotteResponse>(`/api/delivery/companies/${companyId}/flottes`, payload, token);
}

export function updateFlotte(
  token: string,
  companyId: number,
  flotteId: number,
  payload: FlotteRequest,
): Promise<FlotteResponse> {
  return apiClient.put<FlotteResponse>(
    `/api/delivery/companies/${companyId}/flottes/${flotteId}`,
    payload,
    token,
  );
}

export function deleteFlotte(
  token: string,
  companyId: number,
  flotteId: number,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/api/delivery/companies/${companyId}/flottes/${flotteId}`,
    token,
  );
}

export function assignFlotteTransporters(
  token: string,
  companyId: number,
  flotteId: number,
  transporterIds: number[],
): Promise<FlotteResponse> {
  const payload: FlotteTransporterAssignmentRequest = { transporterIds };
  return apiClient.patch<FlotteResponse>(
    `/api/delivery/companies/${companyId}/flottes/${flotteId}/transporters`,
    payload,
    token,
  );
}

export function updateFlotteStatus(
  token: string,
  companyId: number,
  flotteId: number,
  status: FlotteStatus,
): Promise<FlotteResponse> {
  return apiClient.patch<FlotteResponse>(
    `/api/delivery/companies/${companyId}/flottes/${flotteId}/status`,
    { status },
    token,
  );
}

export function unassignFlotteTransporter(
  token: string,
  companyId: number,
  flotteId: number,
  transporterId: number,
): Promise<FlotteResponse> {
  return apiClient.delete<FlotteResponse>(
    `/api/delivery/companies/${companyId}/flottes/${flotteId}/transporters/${transporterId}`,
    token,
  );
}

// Pricing

export function getCompanyPricing(
  token: string,
  companyId: number,
): Promise<CompanyPricingResponse[]> {
  return apiClient.get<CompanyPricingResponse[]>(`/api/delivery/companies/${companyId}/pricing`, token);
}

export function getCompanyPricingByTransportMode(
  token: string,
  companyId: number,
  transportModeId: number,
): Promise<CompanyPricingResponse[]> {
  return apiClient.get<CompanyPricingResponse[]>(
    `/api/delivery/companies/${companyId}/pricing/${transportModeId}`,
    token,
  );
}

export function getCompanyPricingBySelection(
  token: string,
  companyId: number,
  transportModeId: number,
  originCollectionPointId: number,
  destinationCollectionPointId: number,
  parcelTypeId: number,
): Promise<CompanyPricingResponse> {
  return apiClient.get<CompanyPricingResponse>(
    `/api/delivery/companies/${companyId}/pricing/${transportModeId}/routes/${originCollectionPointId}/${destinationCollectionPointId}/parcel-types/${parcelTypeId}`,
    token,
  );
}

export function getPricingRequirements(
  token: string,
  companyId: number,
  transportModeId: number,
  payload: CompanyPricingRequirementsRequest,
): Promise<CompanyPricingRequirementsResponse> {
  return apiClient.post<CompanyPricingRequirementsResponse>(
    `/api/delivery/companies/${companyId}/pricing/${transportModeId}/requirements`,
    payload,
    token,
  );
}

export function upsertCompanyPricing(
  token: string,
  companyId: number,
  transportModeId: number,
  payload: CompanyPricingRequest,
): Promise<CompanyPricingResponse> {
  return apiClient.put<CompanyPricingResponse>(
    `/api/delivery/companies/${companyId}/pricing/${transportModeId}`,
    payload,
    token,
  );
}

// Delivery estimates

export function getCompanyDeliveryEstimates(
  token: string,
  companyId: number,
): Promise<CompanyDeliveryEstimateResponse[]> {
  return apiClient.get<CompanyDeliveryEstimateResponse[]>(
    `/api/delivery/companies/${companyId}/delivery-estimates`,
    token,
  );
}

export function getCompanyDeliveryEstimatesByTransportMode(
  token: string,
  companyId: number,
  transportModeId: number,
): Promise<CompanyDeliveryEstimateResponse[]> {
  return apiClient.get<CompanyDeliveryEstimateResponse[]>(
    `/api/delivery/companies/${companyId}/delivery-estimates/${transportModeId}`,
    token,
  );
}

export function getCompanyDeliveryEstimateBySelection(
  token: string,
  companyId: number,
  transportModeId: number,
  originCollectionPointId: number,
  destinationCollectionPointId: number,
  parcelTypeId: number,
): Promise<CompanyDeliveryEstimateResponse> {
  return apiClient.get<CompanyDeliveryEstimateResponse>(
    `/api/delivery/companies/${companyId}/delivery-estimates/${transportModeId}/routes/${originCollectionPointId}/${destinationCollectionPointId}/parcel-types/${parcelTypeId}`,
    token,
  );
}

export function getDeliveryEstimateRequirements(
  token: string,
  companyId: number,
  transportModeId: number,
): Promise<CompanyDeliveryEstimateRequirementsResponse> {
  return apiClient.get<CompanyDeliveryEstimateRequirementsResponse>(
    `/api/delivery/companies/${companyId}/delivery-estimates/${transportModeId}/requirements`,
    token,
  );
}

export function upsertCompanyDeliveryEstimate(
  token: string,
  companyId: number,
  transportModeId: number,
  payload: CompanyDeliveryEstimateRequest,
): Promise<CompanyDeliveryEstimateResponse> {
  return apiClient.put<CompanyDeliveryEstimateResponse>(
    `/api/delivery/companies/${companyId}/delivery-estimates/${transportModeId}`,
    payload,
    token,
  );
}

export function deleteCompanyDeliveryEstimate(
  token: string,
  companyId: number,
  transportModeId: number,
  originCollectionPointId: number,
  destinationCollectionPointId: number,
  parcelTypeId: number,
): Promise<MessageResponse> {
  return apiClient.delete<MessageResponse>(
    `/api/delivery/companies/${companyId}/delivery-estimates/${transportModeId}/routes/${originCollectionPointId}/${destinationCollectionPointId}/parcel-types/${parcelTypeId}`,
    token,
  );
}

// Route exceptions

export function getCompanyRouteExceptions(
  token: string,
  companyId: number,
): Promise<CompanyRouteExceptionResponse[]> {
  return apiClient.get<CompanyRouteExceptionResponse[]>(
    `/api/delivery/companies/${companyId}/route-exceptions`,
    token,
  );
}

export function createCompanyRouteException(
  token: string,
  companyId: number,
  payload: CompanyRouteExceptionRequest,
): Promise<CompanyRouteExceptionResponse> {
  return apiClient.post<CompanyRouteExceptionResponse>(
    `/api/delivery/companies/${companyId}/route-exceptions`,
    payload,
    token,
  );
}

export function updateCompanyRouteException(
  token: string,
  companyId: number,
  exceptionId: number,
  payload: CompanyRouteExceptionRequest,
): Promise<CompanyRouteExceptionResponse> {
  return apiClient.put<CompanyRouteExceptionResponse>(
    `/api/delivery/companies/${companyId}/route-exceptions/${exceptionId}`,
    payload,
    token,
  );
}

export function deleteCompanyRouteException(
  token: string,
  companyId: number,
  exceptionId: number,
): Promise<MessageResponse> {
  return apiClient.delete<MessageResponse>(
    `/api/delivery/companies/${companyId}/route-exceptions/${exceptionId}`,
    token,
  );
}
