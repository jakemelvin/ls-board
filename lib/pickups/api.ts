import { apiClient } from '@/lib/api-client';
import type {
  NegotiationListParams,
  OpportunityListParams,
  ParcelPickupDecisionRequest,
  ParcelPickupNegotiationPage,
  ParcelPickupNegotiationResponse,
  ParcelPickupOpportunityPage,
  ParcelPickupOpportunityRequest,
  ParcelPickupOpportunityResponse,
  ParcelPickupTrackingRequest,
  PickupParcelTypeRequest,
  PickupParcelTypeResponse,
} from './types';

function withQuery(path: string, params: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function getPickupParcelTypes(
  token: string,
  includeInactive = false,
): Promise<PickupParcelTypeResponse[]> {
  return apiClient.get<PickupParcelTypeResponse[]>(
    withQuery('/api/delivery/pickups/parcel-types', { includeInactive }),
    token,
  );
}

export function createPickupParcelType(
  token: string,
  data: PickupParcelTypeRequest,
): Promise<PickupParcelTypeResponse> {
  return apiClient.post<PickupParcelTypeResponse>('/api/delivery/pickups/parcel-types', data, token);
}

export function updatePickupParcelType(
  token: string,
  id: number,
  data: PickupParcelTypeRequest,
): Promise<PickupParcelTypeResponse> {
  return apiClient.put<PickupParcelTypeResponse>(`/api/delivery/pickups/parcel-types/${id}`, data, token);
}

export function setPickupParcelTypeActive(
  token: string,
  id: number,
  active: boolean,
): Promise<PickupParcelTypeResponse> {
  return apiClient.patch<PickupParcelTypeResponse>(
    `/api/delivery/pickups/parcel-types/${id}/activation?active=${active}`,
    undefined,
    token,
  );
}

export function getCompanyPickupOpportunities(
  token: string,
  companyId: number,
  params: OpportunityListParams = {},
): Promise<ParcelPickupOpportunityPage> {
  return apiClient.get<ParcelPickupOpportunityPage>(
    withQuery(`/api/delivery/pickups/companies/${companyId}/opportunities`, {
      page: 0,
      size: 20,
      sort: 'travelDate,asc',
      ...params,
    }),
    token,
  );
}

export function createCompanyPickupOpportunity(
  token: string,
  companyId: number,
  data: ParcelPickupOpportunityRequest,
): Promise<ParcelPickupOpportunityResponse> {
  return apiClient.post<ParcelPickupOpportunityResponse>(
    `/api/delivery/pickups/companies/${companyId}/opportunities`,
    data,
    token,
  );
}

export function updateCompanyPickupOpportunity(
  token: string,
  companyId: number,
  opportunityId: number,
  data: ParcelPickupOpportunityRequest,
): Promise<ParcelPickupOpportunityResponse> {
  return apiClient.put<ParcelPickupOpportunityResponse>(
    `/api/delivery/pickups/companies/${companyId}/opportunities/${opportunityId}`,
    data,
    token,
  );
}

export function closeCompanyPickupOpportunity(
  token: string,
  companyId: number,
  opportunityId: number,
): Promise<ParcelPickupOpportunityResponse> {
  return apiClient.post<ParcelPickupOpportunityResponse>(
    `/api/delivery/pickups/companies/${companyId}/opportunities/${opportunityId}/close`,
    {},
    token,
  );
}

export function cancelCompanyPickupOpportunity(
  token: string,
  companyId: number,
  opportunityId: number,
): Promise<ParcelPickupOpportunityResponse> {
  return apiClient.post<ParcelPickupOpportunityResponse>(
    `/api/delivery/pickups/companies/${companyId}/opportunities/${opportunityId}/cancel`,
    {},
    token,
  );
}

export function getCompanyPickupNegotiations(
  token: string,
  companyId: number,
  params: NegotiationListParams = {},
): Promise<ParcelPickupNegotiationPage> {
  return apiClient.get<ParcelPickupNegotiationPage>(
    withQuery(`/api/delivery/pickups/companies/${companyId}/negotiations`, {
      page: 0,
      size: 20,
      sort: 'createdAt,desc',
      ...params,
    }),
    token,
  );
}

export function acceptCompanyPickupNegotiation(
  token: string,
  companyId: number,
  negotiationId: number,
  data: ParcelPickupDecisionRequest = {},
): Promise<ParcelPickupNegotiationResponse> {
  return apiClient.post<ParcelPickupNegotiationResponse>(
    `/api/delivery/pickups/companies/${companyId}/negotiations/${negotiationId}/accept`,
    data,
    token,
  );
}

export function rejectCompanyPickupNegotiation(
  token: string,
  companyId: number,
  negotiationId: number,
  data: ParcelPickupDecisionRequest = {},
): Promise<ParcelPickupNegotiationResponse> {
  return apiClient.post<ParcelPickupNegotiationResponse>(
    `/api/delivery/pickups/companies/${companyId}/negotiations/${negotiationId}/reject`,
    data,
    token,
  );
}

export function getPickupNegotiation(
  token: string,
  negotiationId: number,
): Promise<ParcelPickupNegotiationResponse> {
  return apiClient.get<ParcelPickupNegotiationResponse>(
    `/api/delivery/pickups/negotiations/${negotiationId}`,
    token,
  );
}

export function updatePickupTracking(
  token: string,
  negotiationId: number,
  data: ParcelPickupTrackingRequest,
): Promise<ParcelPickupNegotiationResponse> {
  return apiClient.post<ParcelPickupNegotiationResponse>(
    `/api/delivery/pickups/negotiations/${negotiationId}/tracking`,
    data,
    token,
  );
}

