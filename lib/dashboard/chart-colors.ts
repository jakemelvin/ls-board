import type { StatusDistributionMetric } from '@/lib/dashboard/types';
import type { ShipmentStatus } from '@/lib/shipments/types';

type LegacyParcelStatus = 'ARRIVED_AT_DESTINATION' | 'REJECTED';
type DashboardStatus = ShipmentStatus | LegacyParcelStatus;

export const DASHBOARD_CHART_COLORS = {
  volume: 'var(--chart-1)',
  revenue: 'var(--chart-3)',
  fallback: 'var(--muted-foreground)',
} as const;

const SHIPMENT_STATUS_CHART_COLORS: Record<DashboardStatus, string> = {
  CREATED: 'var(--muted-foreground)',
  PAID: 'var(--chart-3)',
  AWAITING_DROP_OFF: 'var(--warning)',
  RECEIVED_AT_COLLECTION_POINT: 'var(--chart-1)',
  READY_FOR_TRANSPORT: 'var(--chart-4)',
  IN_TRANSIT: 'var(--warning)',
  ARRIVED_DESTINATION_POINT: 'var(--chart-2)',
  ARRIVED_AT_DESTINATION: 'var(--chart-2)',
  READY_FOR_PICKUP: 'var(--chart-5)',
  DELIVERED: 'var(--success)',
  CANCELLED: 'var(--destructive)',
  RETURNED: 'var(--destructive)',
  REJECTED: 'var(--destructive)',
};

export function getShipmentStatusChartColor(status?: string | null) {
  if (!status) {
    return DASHBOARD_CHART_COLORS.fallback;
  }

  return SHIPMENT_STATUS_CHART_COLORS[status as DashboardStatus] ?? DASHBOARD_CHART_COLORS.fallback;
}

export function getStatusDistributionChartColor(item: Pick<StatusDistributionMetric, 'key' | 'statuses'>) {
  return getShipmentStatusChartColor(item.statuses?.[0] ?? item.key);
}
