import type {
  PaymentAttemptResponse,
  PaymentProvider,
} from '@/lib/platform-finance/types';

export type OnlinePaymentProvider = Extract<
  PaymentProvider,
  'MTN' | 'ORANGE' | 'PAYPAL' | 'STRIPE'
>;

export interface PaymentInitiationRequest {
  payerMsisdn?: string;
  idempotencyKey?: string;
  description?: string;
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
