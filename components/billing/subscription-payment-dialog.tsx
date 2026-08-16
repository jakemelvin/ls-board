'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  BadgePercent,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MobileMoneyFields } from '@/components/payments/mobile-money-fields';
import {
  getBillingInvoicePayments,
  initiateBillingPayment,
  payBillingInvoiceWithPromoCode,
} from '@/lib/billing/api';
import {
  clearBillingCheckout,
  getOrCreateBillingIdempotencyKey,
  saveBillingCheckout,
} from '@/lib/billing/checkout-storage';
import type { BillingInvoiceResponse, CompanySubscriptionResponse } from '@/lib/billing/types';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import {
  confirmPaymentAttempt,
  getPaymentAttempt,
  getPaymentConfiguration,
} from '@/lib/payments/api';
import type {
  OnlinePaymentProvider,
  PaymentAttemptResponse,
  PaymentPublicConfigResponse,
} from '@/lib/payments/types';
import { cn } from '@/lib/utils';

const ONLINE_PROVIDERS: OnlinePaymentProvider[] = ['MTN', 'ORANGE', 'PAYPAL', 'STRIPE'];
const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED']);
const FAILED_STATUSES = new Set(['FAILED', 'CANCELLED', 'EXPIRED']);
const STRIPE_FINALIZATION_DELAYS = [1_000, 2_000, 4_000, 8_000];

const PROVIDER_ICONS = {
  MTN: Smartphone,
  ORANGE: Smartphone,
  PAYPAL: WalletCards,
  STRIPE: CreditCard,
} satisfies Record<OnlinePaymentProvider, typeof Smartphone>;

interface SubscriptionPaymentDialogProps {
  open: boolean;
  invoice: BillingInvoiceResponse;
  subscription: CompanySubscriptionResponse;
  onOpenChange: (open: boolean) => void;
  onPaymentSucceeded: () => void | Promise<void>;
}

export function SubscriptionPaymentDialog({
  open,
  invoice,
  subscription,
  onOpenChange,
  onPaymentSucceeded,
}: SubscriptionPaymentDialogProps) {
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('billing');
  const [config, setConfig] = useState<PaymentPublicConfigResponse | null>(null);
  const [provider, setProvider] = useState<OnlinePaymentProvider | null>(null);
  const [country, setCountry] = useState('');
  const [attempt, setAttempt] = useState<PaymentAttemptResponse | null>(null);
  const [payerMsisdn, setPayerMsisdn] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isStripeFinalizing, setIsStripeFinalizing] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportedSuccess = useRef(false);
  const stripeFinalizationPollRef = useRef(0);

  const providers = useMemo(() => {
    const configured = new Set(config?.providers ?? []);
    return ONLINE_PROVIDERS.filter(
      (item) => configured.has(item) && (item !== 'STRIPE' || config?.stripePublishableKey),
    );
  }, [config]);
  const stripePublishableKey = config?.stripePublishableKey;
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );
  const canRetry = Boolean(attempt && FAILED_STATUSES.has(attempt.status));
  const hasActiveAttempt = Boolean(attempt && !TERMINAL_STATUSES.has(attempt.status));
  const stripeClientSecret = attempt?.provider === 'STRIPE' ? attempt.clientSecret : undefined;

  const complete = useCallback(async () => {
    if (reportedSuccess.current) return;
    reportedSuccess.current = true;
    clearBillingCheckout(invoice.id);
    await onPaymentSucceeded();
    onOpenChange(false);
  }, [invoice.id, onOpenChange, onPaymentSucceeded]);

  const consumeAttempt = useCallback(
    async (nextAttempt: PaymentAttemptResponse | null) => {
      setAttempt(nextAttempt);
      if (nextAttempt?.status === 'SUCCEEDED') await complete();
    },
    [complete],
  );

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAttempt(null);
    setCountry('');
    reportedSuccess.current = false;
    stripeFinalizationPollRef.current = 0;
    setIsStripeFinalizing(false);
    saveBillingCheckout(invoice.companyId, subscription.id, invoice.id);

    Promise.all([
      getPaymentConfiguration(token),
      getBillingInvoicePayments(token, invoice.id),
    ])
      .then(([nextConfig, attempts]) => {
        if (cancelled) return;
        setConfig(nextConfig);
        const latest = attempts[0] ?? null;
        setAttempt(latest);
        const configured = new Set(nextConfig.providers ?? []);
        const initial =
          (latest?.provider && ONLINE_PROVIDERS.includes(latest.provider as OnlinePaymentProvider)
            ? (latest.provider as OnlinePaymentProvider)
            : null) ??
          ONLINE_PROVIDERS.find(
            (item) =>
              configured.has(item) && (item !== 'STRIPE' || nextConfig.stripePublishableKey),
          ) ??
          null;
        setProvider(initial);
        if (latest && needsStripeClientSecret(latest)) {
          setError(t('payment.errors.cardSetup'));
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(apiMessage(cause, t('payment.errors.load')));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invoice.companyId, invoice.id, open, subscription.id, t, token]);

  useEffect(() => {
    if (
      !open ||
      !token ||
      !attempt ||
      !provider ||
      attempt.provider === 'STRIPE' ||
      TERMINAL_STATUSES.has(attempt.status) ||
      needsStripeClientSecret(attempt)
    ) return;
    const timer = window.setTimeout(() => {
      confirmPaymentAttempt(token, provider, attempt.reference)
        .then((nextAttempt) => void consumeAttempt(nextAttempt))
        .catch(() => undefined);
    }, 6_000);
    return () => window.clearTimeout(timer);
  }, [attempt, consumeAttempt, open, provider, token]);

  useEffect(() => {
    if (
      !open ||
      !token ||
      !attempt ||
      attempt.provider !== 'STRIPE' ||
      !isStripeFinalizing
    ) return;

    if (TERMINAL_STATUSES.has(attempt.status)) {
      setIsStripeFinalizing(false);
      return;
    }

    const delay = STRIPE_FINALIZATION_DELAYS[stripeFinalizationPollRef.current];
    if (delay === undefined) {
      setIsStripeFinalizing(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      getPaymentAttempt(token, attempt.reference)
        .then((nextAttempt) => {
          if (cancelled) return;
          if (TERMINAL_STATUSES.has(nextAttempt.status)) {
            setIsStripeFinalizing(false);
          } else {
            stripeFinalizationPollRef.current += 1;
          }
          void consumeAttempt(nextAttempt);
        })
        .catch(() => {
          if (!cancelled) setIsStripeFinalizing(false);
        });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt, consumeAttempt, isStripeFinalizing, open, token]);

  const handleStripeConfirmed = useCallback(
    async (nextAttempt: PaymentAttemptResponse) => {
      await consumeAttempt(nextAttempt);
      if (TERMINAL_STATUSES.has(nextAttempt.status)) {
        setIsStripeFinalizing(false);
        return;
      }

      stripeFinalizationPollRef.current = 0;
      setIsStripeFinalizing(true);
    },
    [consumeAttempt],
  );

  useEffect(() => {
    if (!open || !token || !attempt) return;
    const refreshOnFocus = () => {
      if (
        document.visibilityState === 'visible' &&
        attempt.provider !== 'STRIPE' &&
        !TERMINAL_STATUSES.has(attempt.status) &&
        !needsStripeClientSecret(attempt)
      ) {
        const attemptProvider = provider ?? (
          ONLINE_PROVIDERS.includes(attempt.provider as OnlinePaymentProvider)
            ? attempt.provider as OnlinePaymentProvider
            : null
        );
        if (!attemptProvider) return;
        confirmPaymentAttempt(token, attemptProvider, attempt.reference)
          .then((nextAttempt) => void consumeAttempt(nextAttempt))
          .catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => document.removeEventListener('visibilitychange', refreshOnFocus);
  }, [attempt, consumeAttempt, open, provider, token]);

  async function initiate() {
    if (!token || !provider || hasActiveAttempt) return;
    if (provider === 'MTN' || provider === 'ORANGE') {
      if (!country) {
        setError(t('payment.errors.countryRequired'));
        return;
      }
      if (payerMsisdn.trim().length < 6) {
        setError(t('payment.errors.phoneRequired'));
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const nextAttempt = await initiateBillingPayment(token, invoice.id, provider, {
        country: provider === 'MTN' || provider === 'ORANGE' ? country : undefined,
        payerMsisdn:
          provider === 'MTN' || provider === 'ORANGE' ? payerMsisdn.trim() : undefined,
        idempotencyKey: getOrCreateBillingIdempotencyKey(
          invoice.companyId,
          subscription.id,
          invoice.id,
          provider,
          canRetry,
        ),
        description: t('payment.description', { values: { plan: invoice.planTitle } }),
      });
      if (needsStripeClientSecret(nextAttempt)) {
        setError(t('payment.errors.cardSetup'));
      }
      await consumeAttempt(nextAttempt);
    } catch (cause) {
      const message = apiMessage(cause, t('payment.errors.initiation'));
      setError(message);
      if (message.toLowerCase().includes('active payment attempt')) {
        getBillingInvoicePayments(token, invoice.id)
          .then((attempts) => void consumeAttempt(attempts[0] ?? null))
          .catch(() => undefined);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function check() {
    if (!token || !provider || !attempt || attempt.provider === 'STRIPE') return;
    setChecking(true);
    setError(null);
    try {
      await consumeAttempt(await confirmPaymentAttempt(token, provider, attempt.reference));
    } catch (cause) {
      setError(apiMessage(cause, t('payment.errors.confirmation')));
    } finally {
      setChecking(false);
    }
  }

  async function applyPromo() {
    if (!token || !promoCode.trim()) {
      setError(t('payment.errors.promoRequired'));
      return;
    }
    setApplyingPromo(true);
    setError(null);
    try {
      const nextInvoice = await payBillingInvoiceWithPromoCode(token, invoice.id, promoCode.trim());
      if (nextInvoice.status === 'PAID') await complete();
    } catch (cause) {
      setError(apiMessage(cause, t('payment.errors.promo')));
    } finally {
      setApplyingPromo(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('payment.title')}</DialogTitle>
          <DialogDescription>
            {t('payment.subtitle', {
              values: { reference: invoice.reference, plan: invoice.planTitle },
            })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">{t('payment.amountDue')}</p>
              <p className="mt-1 text-2xl font-bold">
                {formatAmount(invoice.netAmount, invoice.currency)}
              </p>
            </div>

            {!hasActiveAttempt && attempt?.status !== 'SUCCEEDED' && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('payment.chooseProvider')}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {providers.map((item) => {
                    const Icon = PROVIDER_ICONS[item];
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setProvider(item);
                          setCountry('');
                          setPayerMsisdn('');
                        }}
                        className={cn(
                          'flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium',
                          provider === item
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {t(`payment.providers.${item}`)}
                      </button>
                    );
                  })}
                </div>

                {(provider === 'MTN' || provider === 'ORANGE') && (
                  <MobileMoneyFields
                    token={token}
                    provider={provider}
                    country={country}
                    payerMsisdn={payerMsisdn}
                    onCountryChange={setCountry}
                    onPayerMsisdnChange={setPayerMsisdn}
                    labels={{
                      countryLabel: t('payment.countryLabel'),
                      countryPlaceholder: t('payment.countryPlaceholder'),
                      phoneLabel: t('payment.phoneLabel'),
                      phonePlaceholder: t('payment.phonePlaceholder'),
                      phoneHint: t('payment.phoneHint'),
                      loadingCountries: t('payment.loadingCountries'),
                      countriesError: t('payment.countriesError'),
                      otpRequired: t('payment.otpRequired'),
                    }}
                  />
                )}

                <div className="rounded-xl border border-border p-3">
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                      placeholder={t('payment.promoPlaceholder')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void applyPromo()}
                      disabled={applyingPromo}
                      className="gap-2"
                    >
                      {applyingPromo ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgePercent className="h-4 w-4" />
                      )}
                      {t('payment.applyPromo')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {attempt && <AttemptState attempt={attempt} />}

            {attempt?.approvalUrl && attempt.status !== 'SUCCEEDED' && (
              <Button asChild className="w-full gap-2">
                <a href={attempt.approvalUrl} target="_blank" rel="noreferrer">
                  {t('payment.continueProvider')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}

            {attempt &&
              stripeClientSecret &&
              stripePromise &&
              attempt.status !== 'SUCCEEDED' && (
                <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                  <StripeForm
                    paymentReference={attempt.reference}
                    onConfirmed={(nextAttempt) => void handleStripeConfirmed(nextAttempt)}
                    onError={setError}
                  />
                </Elements>
              )}

            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>{t('payment.errorTitle')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('payment.payLater')}
          </Button>
          {!loading && (!attempt || canRetry) && (
            <Button
              type="button"
              onClick={() => void initiate()}
              disabled={submitting || !provider || providers.length === 0 || ((provider === 'MTN' || provider === 'ORANGE') && !country)}
              className="gap-2"
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {canRetry ? t('payment.retry') : t('payment.pay')}
            </Button>
          )}
          {hasActiveAttempt && attempt?.provider !== 'STRIPE' && !attempt?.clientSecret && (
            <Button type="button" onClick={() => void check()} disabled={checking} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', checking && 'animate-spin')} />
              {t('payment.check')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttemptState({ attempt }: { attempt: PaymentAttemptResponse }) {
  const { t } = useTranslation('billing');
  const success = attempt.status === 'SUCCEEDED';
  const failed = FAILED_STATUSES.has(attempt.status);
  return (
    <Alert
      variant={failed ? 'destructive' : 'default'}
      className={cn(success && 'border-success/40 bg-success/10')}
    >
      {success ? (
        <CheckCircle2 />
      ) : failed ? (
        <CircleAlert />
      ) : (
        <LoaderCircle className="animate-spin" />
      )}
      <AlertTitle>{t(`payment.statuses.${attempt.status}`)}</AlertTitle>
      <AlertDescription className="space-y-1">
        <p>{t(success ? 'payment.success' : failed ? 'payment.failed' : 'payment.pending')}</p>
        {attempt.providerDetails?.pendingAction && <p>{attempt.providerDetails.pendingAction}</p>}
        {!success && !failed && attempt.providerDetails?.message && <p>{attempt.providerDetails.message}</p>}
        {attempt.providerAmount !== undefined && attempt.providerCurrency && (
          <p>{t('payment.walletDebit', { values: { amount: formatAmount(attempt.providerAmount, attempt.providerCurrency) } })}</p>
        )}
        <p className="break-all font-mono text-xs">{attempt.reference}</p>
        {attempt.failureReason && <p>{attempt.failureReason}</p>}
      </AlertDescription>
    </Alert>
  );
}

function StripeForm({
  paymentReference,
  onConfirmed,
  onError,
}: {
  paymentReference: string;
  onConfirmed: (attempt: PaymentAttemptResponse) => void;
  onError: (message: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('billing');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || !token) return;
    setSubmitting(true);
    onError(null);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (result.error) {
        onError(result.error.message ?? t('payment.errors.card'));
        return;
      }
      onConfirmed(await confirmPaymentAttempt(token, 'STRIPE', paymentReference));
    } catch (cause) {
      onError(apiMessage(cause, t('payment.errors.confirmation')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border p-4">
      <PaymentElement />
      <Button type="submit" className="w-full gap-2" disabled={!stripe || submitting}>
        {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {t('payment.confirmCard')}
      </Button>
    </form>
  );
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'XAF',
    maximumFractionDigits: currency === 'XAF' ? 0 : 2,
  }).format(amount);
}

function apiMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.message : fallback;
}

function needsStripeClientSecret(attempt: PaymentAttemptResponse) {
  return (
    attempt.provider === 'STRIPE' &&
    !TERMINAL_STATUSES.has(attempt.status) &&
    !attempt.clientSecret &&
    !attempt.approvalUrl
  );
}
