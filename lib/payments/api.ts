import { apiClient } from '@/lib/api-client';
import type {
  OnlinePaymentProvider,
  PaymentAttemptResponse,
  PaymentInitiationRequest,
  PaymentPublicConfigResponse,
} from './types';

export function getPaymentConfiguration(token: string): Promise<PaymentPublicConfigResponse> {
  return apiClient.get<PaymentPublicConfigResponse>('/api/delivery/payments/config', token);
}

export function initiateShipmentPayment(
  token: string,
  provider: OnlinePaymentProvider,
  shipmentId: number,
  data: PaymentInitiationRequest,
): Promise<PaymentAttemptResponse> {
  return apiClient.post<PaymentAttemptResponse>(
    `/api/delivery/payments/${provider}/shipments/${shipmentId}`,
    data,
    token,
  );
}

export function confirmShipmentPayment(
  token: string,
  provider: OnlinePaymentProvider,
  paymentReference: string,
): Promise<PaymentAttemptResponse> {
  return apiClient.post<PaymentAttemptResponse>(
    `/api/delivery/payments/${provider}/attempts/${encodeURIComponent(paymentReference)}/confirm`,
    {},
    token,
  );
}

export function getPaymentAttempt(
  token: string,
  paymentReference: string,
): Promise<PaymentAttemptResponse> {
  return apiClient.get<PaymentAttemptResponse>(
    `/api/delivery/payments/attempts/${encodeURIComponent(paymentReference)}`,
    token,
  );
}

export function getShipmentPaymentAttempts(
  token: string,
  shipmentId: number,
): Promise<PaymentAttemptResponse[]> {
  return apiClient.get<PaymentAttemptResponse[]>(
    `/api/delivery/payments/shipments/${shipmentId}/attempts`,
    token,
  );
}
