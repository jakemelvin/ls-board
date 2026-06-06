// Re-export shared types used across the admin module
export type {
  UserResponse,
  CompanyResponse,
  CountryResponse,
  CreateUserRequest,
  ApiRole,
  UserStatus,
  Gender,
  PaymentCollectionMode,
} from '@/lib/auth/types';

// ─── Pagination ────────────────────────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PageParams {
  page?: number;
  size?: number;
}

// ─── Company ───────────────────────────────────────────────────────────────

export interface CompanyOperationalReadiness {
  companyId: number;
  companyName: string;
  exploitable: boolean;
  checkedAt: string;
  parcelTypesConfigured: boolean;
  parcelTypeCount: number;
  transportModesConfigured: boolean;
  transportModeCount: number;
  pricingConfigured: boolean;
  pricingCount: number;
  missingPricingTransportModes: string[];
  missingPricingConfigurations: string[];
  envelopePricingCompatible: boolean;
  missingEnvelopeCompatiblePricingTransportModes: string[];
  deliveryEstimatesConfigured: boolean;
  deliveryEstimateCount: number;
  missingDeliveryEstimateTransportModes: string[];
  missingDeliveryEstimateConfigurations: string[];
  zonesConfigured: boolean;
  zoneCount: number;
  collectionPointsConfigured: boolean;
  collectionPointCount: number;
  collectionPointResponsiblesConfigured: boolean;
  collectionPointsWithResponsibleCount: number;
  transportersConfigured: boolean;
  transporterCount: number;
  assignedFlottesConfigured: boolean;
  assignedFlotteCount: number;
  missingItems: string[];
  summary: string;
}

// ─── User actions ──────────────────────────────────────────────────────────

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface CommissionUpdatePayload {
  commissionPercentage: number;
}
