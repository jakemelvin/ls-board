import type {
  PaymentAttemptResponse,
  PaymentProvider,
} from '@/lib/platform-finance/types';

export type OnlinePaymentProvider = Extract<
  PaymentProvider,
  'MTN' | 'ORANGE' | 'PAYPAL' | 'STRIPE'
>;

export interface PaymentInitiationRequest {
  country?: string;
  payerMsisdn?: string;
  idempotencyKey?: string;
  description?: string;
}

export interface PaymentCountryResponse {
  code: string;
  name: string;
  currency: string;
  callingCode: string;
  provider: OnlinePaymentProvider;
  otpRequired?: boolean;
}

export interface PaymentPublicConfigResponse {
  localCurrency?: string;
  providers?: PaymentProvider[];
  stripePublishableKey?: string;
}

export interface ShipmentPaymentInitiationResponse {
  shipment: import('@/lib/shipments/types').Shipment;
  payment: PaymentAttemptResponse;
}

export type { PaymentAttemptResponse, PaymentProvider };
