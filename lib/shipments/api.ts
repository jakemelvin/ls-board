import { apiClient } from '@/lib/api-client';
import type {
  CreateShipmentInput,
  GetShipmentCollectionPointOptionsParams,
  GetShipmentsParams,
  SearchShipmentCompaniesParams,
  SearchShipmentTransportModesParams,
  Shipment,
  ShipmentAvailableCompany,
  ShipmentAvailableTransportMode,
  ShipmentCollectionPointOptions,
  ShipmentPage,
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
