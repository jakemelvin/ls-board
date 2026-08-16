import type { Page } from '@/lib/admin/types';

export type CommissionBeneficiaryType = 'COLLECTOR' | 'TRANSPORTER';
export type CommissionStatus =
  | 'ACCRUED'
  | 'PAYMENT_PROPOSED'
  | 'PAYMENT_DISPUTED'
  | 'PAID'
  | 'CANCELLED';
export type CommissionHistoryAction =
  | 'ACCRUED'
  | 'PAYMENT_DECLARED'
  | 'PAYMENT_ACCEPTED'
  | 'PAYMENT_REFUSED'
  | 'PAYMENT_DECLARATION_CANCELLED';
export type CommissionPaymentBatchStatus =
  | 'AWAITING_BENEFICIARY_CONFIRMATION'
  | 'PAID'
  | 'REFUSED'
  | 'CANCELLED';

export interface CommissionHistoryItem {
  fromStatus?: CommissionStatus | null;
  toStatus?: CommissionStatus | null;
  action: CommissionHistoryAction;
  actorId?: number | null;
  actorUsername?: string | null;
  batchReference?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface CommissionResponse {
  id: number;
  reference: string;
  companyId: number;
  companyName?: string | null;
  shipmentId: number;
  shipmentReference: string;
  beneficiaryId: number;
  beneficiaryFullName: string;
  beneficiaryUsername?: string | null;
  beneficiaryType: CommissionBeneficiaryType;
  baseAmount: number;
  percentageSnapshot: number;
  amount: number;
  currency: string;
  sourceType?: string | null;
  sourceActionId?: number | null;
  sourceLabel?: string | null;
  status: CommissionStatus;
  paymentBatchId?: number | null;
  paymentBatchReference?: string | null;
  accruedAt: string;
  updatedAt?: string | null;
  history?: CommissionHistoryItem[];
}

export interface CommissionSummaryResponse {
  configuredPercentage: number;
  generatedAmount: number;
  pendingAmount: number;
  awaitingConfirmationAmount: number;
  disputedAmount: number;
  paidAmount: number;
  commissionedShipmentCount: number;
  lastCommissionAmount?: number | null;
  lastCommissionAt?: string | null;
}

export interface CompanyCommissionDashboardResponse {
  companyId: number;
  periodStart: string;
  periodEnd: string;
  toPayAmount: number;
  toPayCount: number;
  awaitingConfirmationAmount: number;
  awaitingConfirmationCount: number;
  paidAmount: number;
  paidCount: number;
  collectorAmount: number;
  collectorCount: number;
  transporterAmount: number;
  transporterCount: number;
  currency: string;
}

export interface CommissionItem {
  id: number;
  reference: string;
  shipmentId: number;
  shipmentReference: string;
  amount: number;
}

export interface CommissionPaymentBatchResponse {
  id: number;
  reference: string;
  companyId: number;
  companyName?: string | null;
  beneficiaryId: number;
  beneficiaryFullName: string;
  beneficiaryUsername?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalAmount: number;
  currency: string;
  status: CommissionPaymentBatchStatus;
  proposedById?: number | null;
  proposedByUsername?: string | null;
  respondedById?: number | null;
  respondedByUsername?: string | null;
  note?: string | null;
  responseNote?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  commissions?: CommissionItem[];
}

export interface CommissionSearchParams {
  beneficiaryId?: number;
  beneficiaryType?: CommissionBeneficiaryType;
  status?: CommissionStatus;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface MyCommissionSearchParams {
  status?: CommissionStatus;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CommissionPaymentBatchRequest {
  commissionIds?: number[];
  beneficiaryId?: number;
  periodStart?: string;
  periodEnd?: string;
  note?: string;
}

export interface CommissionPaymentDecisionRequest {
  note?: string;
}

export type CommissionPage = Page<CommissionResponse>;
export type CommissionPaymentBatchPage = Page<CommissionPaymentBatchResponse>;

