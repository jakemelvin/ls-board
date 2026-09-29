import { getShipment, getShipments } from '@/lib/shipments/api';
import type { Shipment, ShipmentPage, ShipmentStatus } from '@/lib/shipments/types';

export type SuperAdminShipmentStatusFilter = ShipmentStatus | 'ALL';

export interface GetSuperAdminShipmentsParams {
  page?: number;
  size?: number;
  status?: SuperAdminShipmentStatusFilter;
}

/**
 * Super administrators use the same secured shipment endpoints as the rest of
 * the platform. The backend applies their broader access scope and remains the
 * source of truth for pagination and status filtering.
 */
export function getSuperAdminShipments(
  token: string,
  params: GetSuperAdminShipmentsParams = {},
): Promise<ShipmentPage> {
  return getShipments(token, {
    page: params.page,
    size: params.size,
    status: params.status === 'ALL' ? undefined : params.status,
  });
}

export function getSuperAdminShipment(token: string, shipmentId: number): Promise<Shipment> {
  return getShipment(token, shipmentId);
}
