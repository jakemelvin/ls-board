import type { Page } from '@/lib/admin/types';
import type { PaymentAttemptResponse } from '@/lib/payments/types';

export type BillingCycle = 'MONTHLY' | 'ANNUAL';
export type BillingFeature = 'SHIPMENT_SENDING' | 'PARCEL_PICKUP';
export type BillingShipmentScope = 'NATIONAL' | 'INTERNATIONAL' | 'BOTH';
export type CompanySubscriptionStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'SUPERSEDED';
export type BillingInvoiceStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type BillingTransactionStatus =
  | 'INITIATED'
  | 'PLATFORM_FEE_PAID'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
export type BillingDisplayCurrency = 'XAF' | 'EUR' | 'USD';

export interface BillingCountryResponse {
  id?: number;
  name?: string;
  countryId?: number;
  countryName?: string;
  isoCode?: string;
}

export interface BillingHistoryResponse {
  id?: number;
  eventType?: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  changedAt?: string;
  createdAt?: string;
  changedByUsername?: string;
}

export interface BillingPlanRequest {
  title: string;
  description: string;
  monthlyAmountXaf: number;
  annualAmountXaf: number;
  features: BillingFeature[];
  shipmentScope: BillingShipmentScope;
  monthlyShipmentLimit: number | null;
  unlimitedShipments: boolean;
  availableInAllCountries: boolean;
  countryIds: number[];
}

export interface BillingPlanResponse extends BillingPlanRequest {
  id: number;
  monthlyPrices: Partial<Record<BillingDisplayCurrency, number>>;
  annualPrices: Partial<Record<BillingDisplayCurrency, number>>;
  eligibleCountries: BillingCountryResponse[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdByUserId?: number;
  createdByUsername?: string;
  history?: BillingHistoryResponse[] | null;
}

export interface BillingUsageResponse {
  cycleStart?: string;
  cycleEnd?: string;
  usedShipments: number;
  remainingShipments: number | null;
  usagePercentage: number | null;
  nationalShipments: number;
  internationalShipments: number;
  monthlyShipmentLimit: number | null;
  unlimitedShipments: boolean;
  quotaReached: boolean;
  blockingReason?: string | null;
  shipmentScope: BillingShipmentScope;
  shipmentSendingEnabled: boolean;
  parcelPickupEnabled: boolean;
}

export interface CompanySubscriptionResponse {
  id: number;
  companyId: number;
  companyName?: string;
  planId: number;
  planTitle: string;
  billingCycle: BillingCycle;
  amountXaf: number;
  status: CompanySubscriptionStatus;
  autoRenew: boolean;
  features: BillingFeature[];
  shipmentScope: BillingShipmentScope;
  monthlyShipmentLimit: number | null;
  unlimitedShipments: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  subscribedByUserId?: number;
  subscribedByUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  usage?: BillingUsageResponse | null;
  history?: BillingHistoryResponse[] | null;
}

export interface BillingInvoiceResponse {
  id: number;
  reference: string;
  companyId: number;
  companyName?: string;
  subscriptionId: number;
  planId: number;
  planTitle: string;
  billingCycle: BillingCycle;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  currency: string;
  status: BillingInvoiceStatus;
  transactionStatus?: BillingTransactionStatus | null;
  billingTransactionId?: number | null;
  billingTransactionReference?: string | null;
  promoCodeId?: number | null;
  promoCode?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  payments?: PaymentAttemptResponse[] | null;
  history?: BillingHistoryResponse[] | null;
}

export interface BillingTransactionResponse {
  id: number;
  reference: string;
  invoiceId: number;
  invoiceReference: string;
  subscriptionId: number;
  companyId: number;
  companyName?: string;
  paymentModeId?: number;
  paymentModeName?: string;
  status: BillingTransactionStatus;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  promoCodeId?: number | null;
  promoCode?: string | null;
  note?: string;
  initiatedByUserId?: number;
  initiatedByUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  payments?: PaymentAttemptResponse[];
  history?: BillingHistoryResponse[];
}

export interface CompanyBillingDashboardResponse {
  companyId: number;
  companyName: string;
  operationalSubscriptionReady: boolean;
  quotaBlocked: boolean;
  alertTitle?: string | null;
  alertMessage?: string | null;
  activeSubscription?: CompanySubscriptionResponse | null;
  currentUsage?: BillingUsageResponse | null;
  availablePlans: BillingPlanResponse[];
  recentInvoices: BillingInvoiceResponse[];
}

export interface CreateSubscriptionRequest {
  planId: number;
  billingCycle: BillingCycle;
  autoRenew: boolean;
}

export interface SubscriptionCheckoutResponse {
  subscription: CompanySubscriptionResponse;
  invoice: BillingInvoiceResponse;
  paymentRequired: boolean;
}

export interface BillingListParams {
  companyId?: number;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export type CompanySubscriptionPage = Page<CompanySubscriptionResponse>;
export type BillingInvoicePage = Page<BillingInvoiceResponse>;
export type BillingTransactionPage = Page<BillingTransactionResponse>;

