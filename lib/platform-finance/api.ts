import { apiClient } from '@/lib/api-client';
import type {
  AdminPaymentAttemptPage,
  AdminPaymentAttemptResponse,
  AdminTransactionPage,
  AdminTransactionPaymentResponse,
  GetAdminPaymentsParams,
  GetAdminTransactionsParams,
  GetTransactionsParams,
  PaymentModeRequest,
  PaymentModeResponse,
  PromoCodeRequest,
  PromoCodeResponse,
  ShipmentFeeRequest,
  ShipmentFeeResponse,
  ShipmentTransactionResponse,
  TransactionPage,
} from './types';

function toQuery(params: object) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function getAdminTransactions(
  token: string,
  params: GetAdminTransactionsParams = {},
): Promise<AdminTransactionPage> {
  return apiClient.get<AdminTransactionPage>(
    `/api/delivery/admin/transactions${toQuery(params)}`,
    token,
  );
}

export function getTransactions(
  token: string,
  params: GetTransactionsParams = {},
): Promise<TransactionPage> {
  return apiClient.get<TransactionPage>(
    `/api/delivery/transactions${toQuery(params)}`,
    token,
  );
}

export function getTransaction(
  token: string,
  transactionId: number,
): Promise<ShipmentTransactionResponse> {
  return apiClient.get<ShipmentTransactionResponse>(
    `/api/delivery/transactions/${transactionId}`,
    token,
  );
}

export function getAdminTransaction(
  token: string,
  transactionId: number,
): Promise<AdminTransactionPaymentResponse> {
  return apiClient.get<AdminTransactionPaymentResponse>(
    `/api/delivery/admin/transactions/${transactionId}`,
    token,
  );
}

export function getAdminPayments(
  token: string,
  params: GetAdminPaymentsParams = {},
): Promise<AdminPaymentAttemptPage> {
  return apiClient.get<AdminPaymentAttemptPage>(
    `/api/delivery/admin/payments${toQuery(params)}`,
    token,
  );
}

export function getAdminPayment(
  token: string,
  paymentReference: string,
): Promise<AdminPaymentAttemptResponse> {
  return apiClient.get<AdminPaymentAttemptResponse>(
    `/api/delivery/admin/payments/${encodeURIComponent(paymentReference)}`,
    token,
  );
}

export function getShipmentFees(token?: string | null): Promise<ShipmentFeeResponse[]> {
  return apiClient.getCached<ShipmentFeeResponse[]>('/api/delivery/shipment-fees', token, 2 * 60_000);
}

export function getShipmentFee(
  token: string,
  shipmentFeeId: number,
): Promise<ShipmentFeeResponse> {
  return apiClient.get<ShipmentFeeResponse>(
    `/api/delivery/shipment-fees/${shipmentFeeId}`,
    token,
  );
}

export function createShipmentFee(
  token: string,
  data: ShipmentFeeRequest,
): Promise<ShipmentFeeResponse> {
  return apiClient.post<ShipmentFeeResponse>('/api/delivery/shipment-fees', data, token);
}

export function updateShipmentFee(
  token: string,
  shipmentFeeId: number,
  data: ShipmentFeeRequest,
): Promise<ShipmentFeeResponse> {
  return apiClient.put<ShipmentFeeResponse>(
    `/api/delivery/shipment-fees/${shipmentFeeId}`,
    data,
    token,
  );
}

export function deleteShipmentFee(token: string, shipmentFeeId: number): Promise<void> {
  return apiClient.delete<void>(`/api/delivery/shipment-fees/${shipmentFeeId}`, token);
}

export function getPromoCodes(token?: string | null): Promise<PromoCodeResponse[]> {
  return apiClient.getCached<PromoCodeResponse[]>('/api/delivery/promo-codes', token, 2 * 60_000);
}

export function getPromoCode(token: string, promoCodeId: number): Promise<PromoCodeResponse> {
  return apiClient.get<PromoCodeResponse>(`/api/delivery/promo-codes/${promoCodeId}`, token);
}

export function createPromoCode(
  token: string,
  data: PromoCodeRequest,
): Promise<PromoCodeResponse> {
  return apiClient.post<PromoCodeResponse>('/api/delivery/promo-codes', data, token);
}

export function updatePromoCode(
  token: string,
  promoCodeId: number,
  data: PromoCodeRequest,
): Promise<PromoCodeResponse> {
  return apiClient.put<PromoCodeResponse>(
    `/api/delivery/promo-codes/${promoCodeId}`,
    data,
    token,
  );
}

export function deletePromoCode(token: string, promoCodeId: number): Promise<void> {
  return apiClient.delete<void>(`/api/delivery/promo-codes/${promoCodeId}`, token);
}

export function getPaymentModes(token?: string | null): Promise<PaymentModeResponse[]> {
  return apiClient.getCached<PaymentModeResponse[]>('/api/delivery/payment-modes', token, 2 * 60_000);
}

export function getPaymentMode(
  token: string,
  paymentModeId: number,
): Promise<PaymentModeResponse> {
  return apiClient.get<PaymentModeResponse>(
    `/api/delivery/payment-modes/${paymentModeId}`,
    token,
  );
}

export function createPaymentMode(
  token: string,
  data: PaymentModeRequest,
): Promise<PaymentModeResponse> {
  return apiClient.post<PaymentModeResponse>('/api/delivery/payment-modes', data, token);
}

export function updatePaymentMode(
  token: string,
  paymentModeId: number,
  data: PaymentModeRequest,
): Promise<PaymentModeResponse> {
  return apiClient.put<PaymentModeResponse>(
    `/api/delivery/payment-modes/${paymentModeId}`,
    data,
    token,
  );
}

export function deletePaymentMode(token: string, paymentModeId: number): Promise<void> {
  return apiClient.delete<void>(`/api/delivery/payment-modes/${paymentModeId}`, token);
}
