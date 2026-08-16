import { apiClient } from '@/lib/api-client';
import type {
  OnlinePaymentProvider,
  PaymentAttemptResponse,
  PaymentCountryResponse,
  PaymentInitiationRequest,
  PaymentPublicConfigResponse,
} from './types';

export function getPaymentConfiguration(token: string): Promise<PaymentPublicConfigResponse> {
  return apiClient.get<PaymentPublicConfigResponse>('/api/delivery/payments/config', token);
}

export function getPaymentProviderCountries(
  token: string,
  provider: Extract<OnlinePaymentProvider, 'MTN' | 'ORANGE'>,
): Promise<PaymentCountryResponse[]> {
  return apiClient.get<PaymentCountryResponse[]>(
    `/api/delivery/payments/providers/${provider}/countries`,
    token,
  );
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

export const confirmPaymentAttempt = confirmShipmentPayment;

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

export function initiatePickupPayment(
  token: string,
  provider: OnlinePaymentProvider,
  negotiationId: number,
  data: PaymentInitiationRequest,
): Promise<PaymentAttemptResponse> {
  return apiClient.post<PaymentAttemptResponse>(
    `/api/delivery/payments/${provider}/pickups/${negotiationId}`,
    data,
    token,
  );
}

export function getPickupPaymentAttempts(
  token: string,
  negotiationId: number,
): Promise<PaymentAttemptResponse[]> {
  return apiClient.get<PaymentAttemptResponse[]>(
    `/api/delivery/payments/pickups/${negotiationId}/attempts`,
    token,
  );
}
