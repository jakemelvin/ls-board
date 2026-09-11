import type {
  PaymentAttemptResponse,
  PaymentProvider,
} from '@/lib/platform-finance/types';

export type OnlinePaymentProvider = Exclude<PaymentProvider, 'PROMO_CODE' | 'COLLECTION_POINT'>;
export type MobileMoneyProvider = Exclude<OnlinePaymentProvider, 'PAYPAL' | 'STRIPE'>;

export interface PaymentInitiationRequest {
  country?: string;
  payerMsisdn?: string;
  idempotencyKey?: string;
  description?: string;
  otpCode?: string;
}

export interface PaymentMethodResponse {
  provider: MobileMoneyProvider;
  operatorCode?: string;
  name?: string;
  enabled?: boolean;
  confirmationMode?: 'MOBILE_PROMPT' | 'OTP_CODE' | 'PROVIDER_LINK';
  otpRequired?: boolean;
  otpLength?: number;
  ussdCode?: string;
  customerInstruction?: string;
}

export interface PaymentCountryResponse {
  code: string;
  name: string;
  currency: string;
  callingCode: string;
  localOperatorCount?: number;
  localOperators?: PaymentMethodResponse[];
  globalProviders?: OnlinePaymentProvider[];
  availableProviders?: OnlinePaymentProvider[];
  provider?: MobileMoneyProvider;
  operatorCode?: string;
  operatorName?: string;
  enabled?: boolean;
  confirmationMode?: PaymentMethodResponse['confirmationMode'];
  otpRequired?: boolean;
  otpLength?: number;
  ussdCode?: string;
  customerInstruction?: string;
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
