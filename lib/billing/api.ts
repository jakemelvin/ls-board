import { apiClient } from '@/lib/api-client';
import type {
  BillingInvoicePage,
  BillingInvoiceResponse,
  BillingListParams,
  BillingPlanRequest,
  BillingPlanResponse,
  BillingTransactionPage,
  BillingTransactionResponse,
  CompanyBillingDashboardResponse,
  CompanySubscriptionPage,
  CompanySubscriptionResponse,
  CreateSubscriptionRequest,
  SubscriptionCheckoutResponse,
} from './types';
import type {
  OnlinePaymentProvider,
  PaymentAttemptResponse,
  PaymentInitiationRequest,
} from '@/lib/payments/types';

function toQuery(params: BillingListParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function getBillingPlans(token: string): Promise<BillingPlanResponse[]> {
  return apiClient.get<BillingPlanResponse[]>('/api/delivery/billing/plans', token);
}

export function getBillingPlan(token: string, planId: number): Promise<BillingPlanResponse> {
  return apiClient.get<BillingPlanResponse>(`/api/delivery/billing/plans/${planId}`, token);
}

export function createBillingPlan(
  token: string,
  data: BillingPlanRequest,
): Promise<BillingPlanResponse> {
  return apiClient.post<BillingPlanResponse>('/api/delivery/billing/plans', data, token);
}

export function updateBillingPlan(
  token: string,
  planId: number,
  data: BillingPlanRequest,
): Promise<BillingPlanResponse> {
  return apiClient.put<BillingPlanResponse>(
    `/api/delivery/billing/plans/${planId}`,
    data,
    token,
  );
}

export function setBillingPlanStatus(
  token: string,
  planId: number,
  active: boolean,
): Promise<BillingPlanResponse> {
  return apiClient.patch<BillingPlanResponse>(
    `/api/delivery/billing/plans/${planId}/status?active=${active}`,
    undefined,
    token,
  );
}

export function getAvailableBillingPlans(
  token: string,
  companyId: number,
): Promise<BillingPlanResponse[]> {
  return apiClient.get<BillingPlanResponse[]>(
    `/api/delivery/billing/plans/available/company/${companyId}`,
    token,
  );
}

export function getCompanyBillingDashboard(
  token: string,
  companyId: number,
): Promise<CompanyBillingDashboardResponse> {
  return apiClient.get<CompanyBillingDashboardResponse>(
    `/api/delivery/billing/companies/${companyId}/dashboard`,
    token,
  );
}

export function createCompanySubscription(
  token: string,
  companyId: number,
  data: CreateSubscriptionRequest,
): Promise<SubscriptionCheckoutResponse> {
  return apiClient.post<SubscriptionCheckoutResponse>(
    `/api/delivery/billing/companies/${companyId}/subscriptions`,
    data,
    token,
  );
}

export function getBillingSubscriptions(
  token: string,
  params: BillingListParams = {},
): Promise<CompanySubscriptionPage> {
  return apiClient.get<CompanySubscriptionPage>(
    `/api/delivery/billing/subscriptions${toQuery(params)}`,
    token,
  );
}

export function getBillingSubscription(
  token: string,
  subscriptionId: number,
): Promise<CompanySubscriptionResponse> {
  return apiClient.get<CompanySubscriptionResponse>(
    `/api/delivery/billing/subscriptions/${subscriptionId}`,
    token,
  );
}

export function setSubscriptionAutoRenew(
  token: string,
  subscriptionId: number,
  enabled: boolean,
): Promise<CompanySubscriptionResponse> {
  return apiClient.patch<CompanySubscriptionResponse>(
    `/api/delivery/billing/subscriptions/${subscriptionId}/auto-renew`,
    { enabled },
    token,
  );
}

export function cancelBillingSubscription(
  token: string,
  subscriptionId: number,
): Promise<CompanySubscriptionResponse> {
  return apiClient.post<CompanySubscriptionResponse>(
    `/api/delivery/billing/subscriptions/${subscriptionId}/cancel`,
    {},
    token,
  );
}

export function getBillingInvoices(
  token: string,
  params: BillingListParams = {},
): Promise<BillingInvoicePage> {
  return apiClient.get<BillingInvoicePage>(
    `/api/delivery/billing/invoices${toQuery(params)}`,
    token,
  );
}

export function getBillingInvoice(
  token: string,
  invoiceId: number,
): Promise<BillingInvoiceResponse> {
  return apiClient.get<BillingInvoiceResponse>(
    `/api/delivery/billing/invoices/${invoiceId}`,
    token,
  );
}

export function initiateBillingPayment(
  token: string,
  invoiceId: number,
  provider: OnlinePaymentProvider,
  data: PaymentInitiationRequest,
): Promise<PaymentAttemptResponse> {
  return apiClient.post<PaymentAttemptResponse>(
    `/api/delivery/billing/invoices/${invoiceId}/payments/${provider}`,
    data,
    token,
  );
}

export function payBillingInvoiceWithPromoCode(
  token: string,
  invoiceId: number,
  promoCode: string,
): Promise<BillingInvoiceResponse> {
  return apiClient.post<BillingInvoiceResponse>(
    `/api/delivery/billing/invoices/${invoiceId}/payments/promo-code`,
    { promoCode },
    token,
  );
}

export function getBillingInvoicePayments(
  token: string,
  invoiceId: number,
): Promise<PaymentAttemptResponse[]> {
  return apiClient.get<PaymentAttemptResponse[]>(
    `/api/delivery/billing/invoices/${invoiceId}/payments`,
    token,
  );
}

export function getBillingTransactions(
  token: string,
  params: BillingListParams = {},
): Promise<BillingTransactionPage> {
  return apiClient.get<BillingTransactionPage>(
    `/api/delivery/billing/transactions${toQuery(params)}`,
    token,
  );
}

export function getBillingTransaction(
  token: string,
  transactionId: number,
): Promise<BillingTransactionResponse> {
  return apiClient.get<BillingTransactionResponse>(
    `/api/delivery/billing/transactions/${transactionId}`,
    token,
  );
}

