import type { Page } from '@/lib/admin/types';
import type {
  ShipmentPaymentCollectionMode,
  ShipmentTransactionStatus,
} from '@/lib/shipments/types';

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

export type PaymentProvider =
  | 'MTN'
  | 'ORANGE'
  | 'PAYPAL'
  | 'STRIPE'
  | 'PROMO_CODE'
  | 'COLLECTION_POINT';

export type PaymentAttemptStatus =
  | 'CREATED'
  | 'PENDING'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface PaymentAttemptHistoryResponse {
  id?: number;
  fromStatus?: PaymentAttemptStatus;
  toStatus?: PaymentAttemptStatus;
  providerStatus?: string;
  note?: string;
  createdAt?: string;
}

export interface ShipmentTransactionStatusHistoryResponse {
  id?: number;
  fromStatus?: ShipmentTransactionStatus;
  toStatus?: ShipmentTransactionStatus;
  note?: string;
  changedAt?: string;
  changedByUsername?: string;
}

export interface PaymentAttemptResponse {
  id: number;
  reference: string;
  provider: PaymentProvider;
  purpose?: 'SHIPMENT';
  status: PaymentAttemptStatus;
  shipmentId?: number;
  shipmentReference?: string;
  transactionId?: number;
  transactionReference?: string;
  transactionStatus?: ShipmentTransactionStatus;
  amount: number;
  currency?: string;
  providerAmount?: number;
  providerCurrency?: string;
  exchangeRate?: number;
  providerTransactionId?: string;
  providerReference?: string;
  providerStatus?: string;
  payerMsisdnMasked?: string;
  approvalUrl?: string;
  failureCode?: string;
  failureReason?: string;
  expiresAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  history?: PaymentAttemptHistoryResponse[];
}

export interface ShipmentTransactionResponse {
  id: number;
  reference: string;
  shipmentId?: number;
  shipmentReference?: string;
  clientUserId?: number;
  companyId?: number;
  companyName?: string;
  paymentCollectionMode?: ShipmentPaymentCollectionMode;
  paymentModeId?: number;
  paymentModeName?: string;
  promoCodeId?: number;
  promoCode?: string;
  status: ShipmentTransactionStatus;
  grossAmount?: number;
  companyPrice?: number;
  feeAmount?: number;
  discountAmount?: number;
  netAmount?: number;
  note?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  statusHistory?: ShipmentTransactionStatusHistoryResponse[];
  payments?: PaymentAttemptResponse[];
}

export interface AdminPaymentAttemptResponse extends PaymentAttemptResponse {
  idempotencyKey?: string;
  initiatedByUserId?: number;
  initiatedByUsername?: string;
  initiatedByEmail?: string;
  initiatedByPhone?: string;
  payerMsisdn?: string;
  requestTrace?: string;
  responseTrace?: string;
  lastCheckedAt?: string;
  version?: number;
}

export interface AdminTransactionPaymentResponse {
  transaction: ShipmentTransactionResponse;
  payments: AdminPaymentAttemptResponse[];
}

export type AdminTransactionPage = Page<AdminTransactionPaymentResponse>;
export type AdminPaymentAttemptPage = Page<AdminPaymentAttemptResponse>;
export type TransactionPage = Page<ShipmentTransactionResponse>;

export interface GetAdminTransactionsParams {
  status?: ShipmentTransactionStatus;
  page?: number;
  size?: number;
}

export type GetTransactionsParams = GetAdminTransactionsParams;

export interface GetAdminPaymentsParams {
  provider?: PaymentProvider;
  status?: PaymentAttemptStatus;
  transactionId?: number;
  shipmentId?: number;
  page?: number;
  size?: number;
}
