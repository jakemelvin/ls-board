import type { PaymentAttemptResponse } from '@/lib/payments/types';

/**
 * Delivery gives up automatically checking a payment after 30 minutes without a
 * definitive outcome and flags it for support review. The customer may still
 * have been charged, so the UI must not offer an OTP form or a new payment.
 */
export function isReviewRequired(attempt: PaymentAttemptResponse | null | undefined): boolean {
  return attempt?.status === 'REQUIRES_ACTION' && attempt.providerStatus === 'REVIEW_REQUIRED';
}
