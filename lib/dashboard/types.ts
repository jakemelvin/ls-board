import type { CollectionPointCapacityUnit, FlotteStatus, FlotteType } from '@/lib/company/types';
import type {
  ShipmentDestinationDepositStatus,
  ShipmentPaymentStatus,
  ShipmentStatus,
  ShipmentTransmissionStatus,
} from '@/lib/shipments/types';

export interface DashboardDateRangeParams {
  startDate: string;
  endDate: string;
}

export interface DailyShipmentMetric {
  date: string;
  shipmentCount?: number;
  totalWeightKg?: number;
  totalVolumeM3?: number;
}

export interface DailyRevenueMetric {
  date: string;
  platformRevenue?: number;
  estimatedRevenue?: number;
  grossShipmentRevenue?: number;
  revenue?: number;
  amount?: number;
}

export interface StatusDistributionMetric {
  key?: string;
  label?: string;
  statuses?: ShipmentStatus[];
  count?: number;
  percentage?: number;
}

export interface PlatformMetrics {
  companyCount?: number;
  approvedCompanyCount?: number;
  exploitableCompanyCount?: number;
  shipmentCount?: number;
  platformRevenue?: number;
  grossShipmentRevenue?: number;
  deliveredShipmentCount?: number;
  deliveryRatePercent?: number;
  exceptionShipmentCount?: number;
  exceptionRatePercent?: number;
}

export interface CompanyHealthMetric {
  companyId: number;
  companyName?: string;
  companyUrl?: string;
  shipmentCount?: number;
  platformRevenue?: number;
  grossShipmentRevenue?: number;
  healthScorePercent?: number;
  statusLabel?: string;
  deliveryRatePercent?: number;
  exceptionRatePercent?: number;
  approved?: boolean;
  exploitable?: boolean;
  totalCollectionPointCount?: number;
  closedCollectionPointCount?: number;
}

export interface PriorityAlert {
  key?: string;
  label?: string;
  description?: string;
  count?: number;
  percentage?: number;
  available?: boolean;
}

export interface OperationsOverview {
  totalUserCount?: number;
  activeUserCount?: number;
  inTransitShipmentCount?: number;
  maintenanceVehicleCount?: number;
  deliveredShipmentCount?: number;
  exceptionShipmentCount?: number;
  closedCollectionPointCount?: number;
  pendingTransportRequestCount?: number;
  kycReviewCount?: number;
  generatedCommissionCount?: number;
  paidCommissionCount?: number;
}

export interface CommissionOverview {
  generatedAmount?: number;
  pendingAmount?: number;
  paidAmount?: number;
  generatedCommissionCount?: number;
  paidCommissionCount?: number;
}

export interface SuperAdminDashboardResponse {
  startDate?: string;
  endDate?: string;
  metrics?: PlatformMetrics;
  shipmentVolumeByDay?: DailyShipmentMetric[];
  platformRevenueByDay?: DailyRevenueMetric[];
  statusDistribution?: StatusDistributionMetric[];
  companyHealth?: CompanyHealthMetric[];
  priorityAlerts?: PriorityAlert[];
  operations?: OperationsOverview;
  commissions?: CommissionOverview;
}

export interface CollectionPointSaturationMetric {
  collectionPointId: number;
  collectionPointName?: string;
  capacityUnit?: CollectionPointCapacityUnit;
  currentLoad?: number;
  maxCapacity?: number;
  saturationPercent?: number;
  active?: boolean;
  manuallyClosed?: boolean;
}

export interface QuickOverview {
  activeVehicleCount?: number;
  availableVehicleCount?: number;
  maintenanceVehicleCount?: number;
  teamMemberCount?: number;
  activeTeamMemberCount?: number;
  rejectedShipmentCount?: number;
}

export interface CompanyDashboardResponse {
  companyId: number;
  companyName?: string;
  startDate?: string;
  endDate?: string;
  shipmentCount?: number;
  estimatedRevenue?: number;
  deliveredShipmentCount?: number;
  deliveryRatePercent?: number;
  collectionPointSaturationPercent?: number;
  shipmentVolumeByDay?: DailyShipmentMetric[];
  revenueByDay?: DailyRevenueMetric[];
  statusDistribution?: StatusDistributionMetric[];
  collectionPoints?: CollectionPointSaturationMetric[];
  quickOverview?: QuickOverview;
}

export interface CommissionSummary {
  configuredPercentage?: number;
  generatedAmount?: number;
  pendingAmount?: number;
  paidAmount?: number;
  commissionedShipmentCount?: number;
  lastCommissionAmount?: number;
  lastCommissionAt?: string;
}

export interface PriorityItem {
  key?: string;
  label?: string;
  description?: string;
  count?: number;
  percentage?: number;
}

export interface OpeningHourSnapshot {
  dayOfWeek?: string;
  closed?: boolean;
  openingTime?: string;
  closingTime?: string;
}

export interface CollectionPointSnapshot {
  id: number;
  reference?: string;
  name?: string;
  address?: string;
  zoneName?: string;
  cityName?: string;
  countryName?: string;
  active?: boolean;
  manuallyClosed?: boolean;
  mobileAvailability?: boolean;
  openNow?: boolean;
  availabilityStatus?: 'OPEN' | 'CLOSED' | 'MANUALLY_CLOSED' | 'DEACTIVATED';
  openingHours?: OpeningHourSnapshot[];
  capacityUnit?: CollectionPointCapacityUnit;
  currentLoad?: number;
  maxCapacity?: number;
  saturationPercent?: number;
  presentShipmentCount?: number;
}

export interface LocationSnapshot {
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
}

export interface RecentOperation {
  type?: string;
  label?: string;
  shipmentId?: number;
  shipmentReference?: string;
  collectionPointId?: number;
  collectionPointName?: string;
  receptionActionType?: 'VALIDATED' | 'REJECTED';
  operatedAt?: string;
}

export interface PendingReceptionShipment {
  shipmentId: number;
  shipmentReference?: string;
  senderFullName?: string;
  senderKycDocumentsAvailable?: boolean;
  destinationCollectionPointName?: string;
  weightKg?: number;
  volumeM3?: number;
  status?: ShipmentStatus;
  paymentStatus?: ShipmentPaymentStatus;
  createdAt?: string;
}

export interface CollectorDashboardMetrics {
  pendingReceptionCount?: number;
  localStockCount?: number;
  pendingPickupRequestCount?: number;
  arrivedAtPointCount?: number;
  pendingDestinationDepositShipmentCount?: number;
  readyForPickupCount?: number;
}

export interface CollectorDashboardResponse {
  collectorId?: number;
  collectorUsername?: string;
  companyId?: number;
  companyName?: string;
  collectionPoint?: CollectionPointSnapshot;
  metrics?: CollectorDashboardMetrics;
  commissions?: CommissionSummary;
  location?: LocationSnapshot;
  priorities?: PriorityItem[];
  recentOperations?: RecentOperation[];
  pendingReceptions?: PendingReceptionShipment[];
}

export interface VehicleSnapshot {
  id: number;
  type?: FlotteType;
  immatriculation?: string;
  status?: FlotteStatus;
  active?: boolean;
  currentWeightKg?: number;
  currentVolumeM3?: number;
  maxWeightKg?: number;
  maxVolumeM3?: number;
  loadRatePercent?: number;
}

export interface AcceptedLoadRequest {
  requestId: number;
  status?: ShipmentTransmissionStatus;
  originCollectionPointId?: number;
  originCollectionPointName?: string;
  collectorUsername?: string;
  shipmentCount?: number;
  pendingShipmentCount?: number;
  createdAt?: string;
}

export interface OnboardShipment {
  shipmentId: number;
  shipmentReference?: string;
  senderFullName?: string;
  receiverFullName?: string;
  originCollectionPointName?: string;
  destinationCollectionPointName?: string;
  weightKg?: number;
  volumeM3?: number;
  status?: ShipmentStatus;
  createdAt?: string;
}

export interface CompletedTrip {
  requestId: number;
  status?: ShipmentDestinationDepositStatus;
  destinationCollectionPointId?: number;
  destinationCollectionPointName?: string;
  collectorUsername?: string;
  acceptedShipmentCount?: number;
  totalShipmentCount?: number;
  commissionAmount?: number;
  completedAt?: string;
}

export interface TransporterDashboardMetrics {
  acceptedRequestsToLoadCount?: number;
  onboardShipmentCount?: number;
  completedTripCount?: number;
  deliveredShipmentCount?: number;
  currentWeightKg?: number;
  currentVolumeM3?: number;
  loadRatePercent?: number;
}

export interface TransporterDashboardResponse {
  transporterId?: number;
  transporterUsername?: string;
  companyId?: number;
  companyName?: string;
  vehicle?: VehicleSnapshot;
  metrics?: TransporterDashboardMetrics;
  commissions?: CommissionSummary;
  priorities?: PriorityItem[];
  acceptedRequestsToLoad?: AcceptedLoadRequest[];
  onboardShipments?: OnboardShipment[];
  completedTrips?: CompletedTrip[];
}
