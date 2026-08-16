import { apiClient } from '@/lib/api-client';
import type {
  CommissionPage,
  CommissionPaymentBatchPage,
  CommissionPaymentBatchRequest,
  CommissionPaymentBatchResponse,
  CommissionPaymentBatchStatus,
  CommissionPaymentDecisionRequest,
  CommissionResponse,
  CommissionSearchParams,
  CommissionSummaryResponse,
  CompanyCommissionDashboardResponse,
  MyCommissionSearchParams,
} from './types';

function withQuery(path: string, params: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function getCompanyCommissions(
  token: string,
  companyId: number,
  params: CommissionSearchParams = {},
): Promise<CommissionPage> {
  return apiClient.get<CommissionPage>(
    withQuery(`/api/delivery/companies/${companyId}/commissions`, {
      page: 0,
      size: 20,
      sort: 'accruedAt,desc',
      ...params,
    }),
    token,
  );
}

export function getCompanyCommissionDashboard(
  token: string,
  companyId: number,
  params: { from?: string; to?: string } = {},
): Promise<CompanyCommissionDashboardResponse> {
  return apiClient.get<CompanyCommissionDashboardResponse>(
    withQuery(`/api/delivery/companies/${companyId}/commissions/dashboard`, params),
    token,
  );
}

export function getCompanyCommission(
  token: string,
  companyId: number,
  commissionId: number,
): Promise<CommissionResponse> {
  return apiClient.get<CommissionResponse>(
    `/api/delivery/companies/${companyId}/commissions/${commissionId}`,
    token,
  );
}

export function createCommissionPaymentBatch(
  token: string,
  companyId: number,
  data: CommissionPaymentBatchRequest,
): Promise<CommissionPaymentBatchResponse> {
  return apiClient.post<CommissionPaymentBatchResponse>(
    `/api/delivery/companies/${companyId}/commission-payment-batches`,
    data,
    token,
  );
}

export function getCompanyCommissionPaymentBatches(
  token: string,
  companyId: number,
  params: { status?: CommissionPaymentBatchStatus; page?: number; size?: number; sort?: string } = {},
): Promise<CommissionPaymentBatchPage> {
  return apiClient.get<CommissionPaymentBatchPage>(
    withQuery(`/api/delivery/companies/${companyId}/commission-payment-batches`, {
      page: 0,
      size: 20,
      sort: 'createdAt,desc',
      ...params,
    }),
    token,
  );
}

export function cancelCommissionPaymentBatch(
  token: string,
  companyId: number,
  batchId: number,
  data: CommissionPaymentDecisionRequest = {},
): Promise<CommissionPaymentBatchResponse> {
  return apiClient.post<CommissionPaymentBatchResponse>(
    `/api/delivery/companies/${companyId}/commission-payment-batches/${batchId}/cancel`,
    data,
    token,
  );
}

export function getMyCommissions(
  token: string,
  params: MyCommissionSearchParams = {},
): Promise<CommissionPage> {
  return apiClient.get<CommissionPage>(
    withQuery('/api/delivery/commissions/me', {
      page: 0,
      size: 20,
      sort: 'accruedAt,desc',
      ...params,
    }),
    token,
  );
}

export function getMyCommissionSummary(token: string): Promise<CommissionSummaryResponse> {
  return apiClient.get<CommissionSummaryResponse>('/api/delivery/commissions/me/summary', token);
}

export function getMyCommission(
  token: string,
  commissionId: number,
): Promise<CommissionResponse> {
  return apiClient.get<CommissionResponse>(
    `/api/delivery/commissions/me/${commissionId}`,
    token,
  );
}

export function getMyCommissionPaymentBatches(
  token: string,
  params: { page?: number; size?: number; sort?: string } = {},
): Promise<CommissionPaymentBatchPage> {
  return apiClient.get<CommissionPaymentBatchPage>(
    withQuery('/api/delivery/commissions/me/payment-batches', {
      page: 0,
      size: 20,
      sort: 'createdAt,desc',
      ...params,
    }),
    token,
  );
}

export function acceptMyCommissionPaymentBatch(
  token: string,
  batchId: number,
  data: CommissionPaymentDecisionRequest = {},
): Promise<CommissionPaymentBatchResponse> {
  return apiClient.post<CommissionPaymentBatchResponse>(
    `/api/delivery/commissions/me/payment-batches/${batchId}/accept`,
    data,
    token,
  );
}

export function refuseMyCommissionPaymentBatch(
  token: string,
  batchId: number,
  data: CommissionPaymentDecisionRequest,
): Promise<CommissionPaymentBatchResponse> {
  return apiClient.post<CommissionPaymentBatchResponse>(
    `/api/delivery/commissions/me/payment-batches/${batchId}/refuse`,
    data,
    token,
  );
}

