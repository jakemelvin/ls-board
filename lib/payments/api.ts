import { apiClient } from '@/lib/api-client';
import type {
  OnlinePaymentProvider,
  MobileMoneyProvider,
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
  provider: MobileMoneyProvider,
): Promise<PaymentCountryResponse[]> {
  return apiClient
    .get<PaymentCountriesPayload>(
      `/api/delivery/payments/providers/${provider}/countries`,
      token,
    )
    .then((payload) => normalizePaymentProviderCountries(payload, provider));
}

type PaymentCountriesPayload =
  | PaymentCountryResponse[]
  | { content?: PaymentCountryResponse[] };

function normalizePaymentProviderCountries(
  payload: PaymentCountriesPayload,
  provider: MobileMoneyProvider,
): PaymentCountryResponse[] {
  const countries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : [];

  return countries.filter(
    (country): country is PaymentCountryResponse =>
      country?.provider === provider &&
      typeof country.code === 'string' &&
      typeof country.name === 'string' &&
      typeof country.currency === 'string' &&
      typeof country.callingCode === 'string',
  );
}

export function getPaymentCountries(token: string): Promise<PaymentCountryResponse[]> {
  return apiClient.get<PaymentCountryResponse[]>('/api/delivery/payments/countries', token)
    .then((payload) => Array.isArray(payload) ? payload : []);
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
