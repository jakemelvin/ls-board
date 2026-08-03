import type { OnlinePaymentProvider } from '@/lib/payments/types';

const STORAGE_KEY = 'sendam_billing_checkout_v1';

export interface BillingCheckoutSession {
  companyId: number;
  subscriptionId: number;
  invoiceId: number;
  idempotencyKeys: Partial<Record<OnlinePaymentProvider, string>>;
}

function read(): BillingCheckoutSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BillingCheckoutSession) : null;
  } catch {
    return null;
  }
}

function write(session: BillingCheckoutSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function saveBillingCheckout(
  companyId: number,
  subscriptionId: number,
  invoiceId: number,
) {
  const current = read();
  const sameInvoice = current?.companyId === companyId && current.invoiceId === invoiceId;
  const session: BillingCheckoutSession = {
    companyId,
    subscriptionId,
    invoiceId,
    idempotencyKeys: sameInvoice ? current.idempotencyKeys : {},
  };
  write(session);
  return session;
}

export function getBillingCheckout(companyId: number) {
  const session = read();
  return session?.companyId === companyId ? session : null;
}

export function clearBillingCheckout(invoiceId?: number) {
  if (typeof window === 'undefined') return;
  const session = read();
  if (invoiceId === undefined || session?.invoiceId === invoiceId) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getOrCreateBillingIdempotencyKey(
  companyId: number,
  subscriptionId: number,
  invoiceId: number,
  provider: OnlinePaymentProvider,
  rotate = false,
) {
  const session = saveBillingCheckout(companyId, subscriptionId, invoiceId);
  if (!rotate && session.idempotencyKeys[provider]) {
    return session.idempotencyKeys[provider] as string;
  }

  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `billing-${companyId}-${invoiceId}-${random}`.slice(0, 120);
  session.idempotencyKeys[provider] = key;
  write(session);
  return key;
}
