export interface ShipmentFeeRequest {
  originCountryId: number;
  amount: number;
  active?: boolean;
}

export interface ShipmentFeeResponse {
  id: number;
  originCountryId: number;
  originCountryName?: string;
  amount: number;
  active?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export type PromoCodeDiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE';

export interface PromoCodeRequest {
  code: string;
  description?: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  multiUse?: boolean;
  multiUser?: boolean;
  active?: boolean;
  expiresAt?: string;
}

export interface PromoCodeResponse {
  id: number;
  code: string;
  description?: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  multiUse?: boolean;
  multiUser?: boolean;
  active?: boolean;
  expiresAt?: string;
  totalUsageCount?: number;
  distinctUserCount?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface PaymentModeRequest {
  name: string;
  active?: boolean;
}

export interface PaymentModeResponse {
  id: number;
  name: string;
  active?: boolean;
  systemDefined?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string | null;
}
