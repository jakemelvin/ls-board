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
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import {
  confirmShipmentPayment,
  getPaymentAttempt,
  getPaymentConfiguration,
  initiateShipmentPayment,
} from '@/lib/payments/api';
import type {
  OnlinePaymentProvider,
  PaymentAttemptResponse,
  PaymentPublicConfigResponse,
} from '@/lib/payments/types';
import { payShipmentWithPromoCode } from '@/lib/shipments/api';
import type { Shipment } from '@/lib/shipments/types';
import { cn } from '@/lib/utils';

const ONLINE_PROVIDERS: OnlinePaymentProvider[] = ['MTN', 'ORANGE', 'PAYPAL', 'STRIPE'];
const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED']);

const PROVIDER_ICONS = {
  MTN: Smartphone,
  ORANGE: Smartphone,
  PAYPAL: WalletCards,
  STRIPE: CreditCard,
} satisfies Record<OnlinePaymentProvider, typeof Smartphone>;

interface ShipmentPaymentDialogProps {
  open: boolean;
  shipment: PayableShipment;
  onOpenChange: (open: boolean) => void;
  onPaymentSucceeded: (payment?: PaymentAttemptResponse) => void | Promise<void>;
}

export interface PayableShipment {
  id: number;
  reference?: string;
  feeAmount?: number;
  discountAmount?: number;
}

export function ShipmentPaymentDialog({
  open,
  shipment,
  onOpenChange,
  onPaymentSucceeded,
}: ShipmentPaymentDialogProps) {
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const [config, setConfig] = useState<PaymentPublicConfigResponse | null>(null);
  const [provider, setProvider] = useState<OnlinePaymentProvider | null>(null);
  const [payerMsisdn, setPayerMsisdn] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoShipment, setPromoShipment] = useState<Shipment | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoCompleted, setPromoCompleted] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<PaymentAttemptResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportedSuccessReference = useRef<string | null>(null);

  const providers = useMemo(() => {
    const configured = new Set(config?.providers ?? []);
    return ONLINE_PROVIDERS.filter(
      (item) => configured.has(item) && (item !== 'STRIPE' || config?.stripePublishableKey),
    );
  }, [config]);

  const stripePublishableKey = config?.stripePublishableKey;
  const stripePromise = useMemo(
    () => stripePublishableKey ? loadStripe(stripePublishableKey) : null,
    [stripePublishableKey],
  );

  const reportSuccess = useCallback(
    async (payment: PaymentAttemptResponse) => {
      if (
        payment.status !== 'SUCCEEDED' ||
        reportedSuccessReference.current === payment.reference
      ) {
        return;
      }
      reportedSuccessReference.current = payment.reference;
      toast({
        title: t('shipmentPayment.successTitle'),
        description: t('shipmentPayment.successDescription'),
      });
      await onPaymentSucceeded(payment);
    },
    [onPaymentSucceeded, t],
  );

  useEffect(() => {
    if (!open || !token) return;

    let cancelled = false;
    setLoadingConfig(true);
    setConfig(null);
    setProvider(null);
    setAttempt(null);
    setPayerMsisdn('');
    setPromoCode('');
    setPromoShipment(null);
    setApplyingPromo(false);
    setPromoCompleted(false);
    setPromoError(null);
    setError(null);
    reportedSuccessReference.current = null;

    getPaymentConfiguration(token)
      .then((response) => {
        if (cancelled) return;
        setConfig(response);
        const configured = new Set(response.providers ?? []);
        const firstProvider = ONLINE_PROVIDERS.find(
          (item) => configured.has(item) && (item !== 'STRIPE' || response.stripePublishableKey),
        );
        setProvider(firstProvider ?? null);
      })
      .catch((paymentError) => {
        if (!cancelled) setError(apiMessage(paymentError, t('shipmentPayment.errors.config')));
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, shipment.id, t, token]);

  useEffect(() => {
    if (!open || !token || !attempt || TERMINAL_STATUSES.has(attempt.status)) return;

    const timer = window.setTimeout(() => {
      getPaymentAttempt(token, attempt.reference)
        .then((payment) => {
          setAttempt(payment);
          setError(null);
          void reportSuccess(payment);
        })
        .catch(() => undefined);
    }, 4_000);

    return () => window.clearTimeout(timer);
  }, [attempt, open, reportSuccess, token]);

  async function initiatePayment() {
    if (!token || !provider) return;

    if ((provider === 'MTN' || provider === 'ORANGE') && payerMsisdn.trim().length < 6) {
      setError(t('shipmentPayment.errors.phoneRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payment = await initiateShipmentPayment(token, provider, shipment.id, {
        payerMsisdn:
          provider === 'MTN' || provider === 'ORANGE' ? payerMsisdn.trim() : undefined,
        idempotencyKey: createIdempotencyKey(shipment.id),
        description: `Platform fee for shipment ${shipment.reference ?? `#${shipment.id}`}`,
      });
      setAttempt(payment);
      await reportSuccess(payment);
    } catch (paymentError) {
      setError(apiMessage(paymentError, t('shipmentPayment.errors.initiation')));
    } finally {
      setSubmitting(false);
    }
  }

  async function checkPayment() {
    if (!token || !attempt || !provider) return;
    setChecking(true);
    setError(null);
    try {
      const payment = await confirmShipmentPayment(token, provider, attempt.reference);
      setAttempt(payment);
      await reportSuccess(payment);
    } catch (paymentError) {
      setError(apiMessage(paymentError, t('shipmentPayment.errors.confirmation')));
    } finally {
      setChecking(false);
    }
  }

  async function applyPromoCode() {
    if (!token) return;

    const code = promoCode.trim();
    if (!code) {
      setPromoError(t('shipmentPayment.errors.promoRequired'));
      return;
    }

    setApplyingPromo(true);
    setPromoError(null);
    try {
      const updatedShipment = await payShipmentWithPromoCode(token, shipment.id, {
        promoCode: code,
      });
      const remainingAmount = getRemainingPlatformFee(updatedShipment);
      const completed =
        updatedShipment.transactionStatus === 'PLATFORM_FEE_PAID' ||
        (typeof updatedShipment.feeAmount === 'number' && remainingAmount === 0);

      setPromoShipment(updatedShipment);
      setPromoCompleted(completed);
      setPromoCode('');
      toast({
        title: t(
          completed
            ? 'shipmentPayment.promoSuccessTitle'
            : 'shipmentPayment.promoAppliedTitle',
        ),
        description: t(
          completed
            ? 'shipmentPayment.promoSuccessDescription'
            : 'shipmentPayment.promoAppliedDescription',
          { values: { amount: formatMoney(remainingAmount) } },
        ),
      });

      if (completed) {
        await onPaymentSucceeded();
      }
    } catch (promoPaymentError) {
      setPromoError(
        apiMessage(promoPaymentError, t('shipmentPayment.errors.promo')),
      );
    } finally {
      setApplyingPromo(false);
    }
  }

  const amount = promoShipment
    ? getRemainingPlatformFee(promoShipment)
    : Math.max((shipment.feeAmount ?? 0) - (shipment.discountAmount ?? 0), 0);
  const hasStarted = Boolean(attempt);
  const isSuccessful = attempt?.status === 'SUCCEEDED' || promoCompleted;
  const canRetry = attempt ? ['FAILED', 'CANCELLED', 'EXPIRED'].includes(attempt.status) : false;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && !applyingPromo && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-xl">
        <div className="border-b border-border bg-primary/5 p-5 sm:p-6">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle>{t('shipmentPayment.title')}</DialogTitle>
            <DialogDescription>
              {t('shipmentPayment.description', { values: { id: shipment.id } })}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 pb-2 sm:px-6">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-muted/20 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('shipmentPayment.platformFee')}
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">{formatMoney(amount)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('shipmentPayment.shipment')}
              </p>
              <p className="mt-1 truncate font-mono text-sm font-semibold text-foreground">
                #{shipment.id}
              </p>
            </div>
          </div>

          {!promoCompleted && !hasStarted && (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BadgePercent className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {t('shipmentPayment.promoTitle')}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t('shipmentPayment.promoDescription')}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void applyPromoCode();
                    }
                  }}
                  autoComplete="off"
                  placeholder={t('shipmentPayment.promoPlaceholder')}
                  aria-label={t('shipmentPayment.promoLabel')}
                  disabled={applyingPromo}
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void applyPromoCode()}
                  disabled={applyingPromo || !promoCode.trim()}
                  className="shrink-0 gap-2"
                >
                  {applyingPromo ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <BadgePercent className="h-4 w-4" />
                  )}
                  {t('shipmentPayment.applyPromo')}
                </Button>
              </div>
              {promoError && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {promoError}
                </p>
              )}
              {promoShipment && amount > 0 && (
                <p className="mt-2 text-sm font-medium text-primary">
                  {t('shipmentPayment.promoAppliedDescription', {
                    values: { amount: formatMoney(amount) },
                  })}
                </p>
              )}
            </div>
          )}

          {promoCompleted && (
            <Alert className="border-success/40 bg-success/10">
              <CheckCircle2 />
              <AlertTitle>{t('shipmentPayment.promoSuccessTitle')}</AlertTitle>
              <AlertDescription>
                {t('shipmentPayment.promoSuccessDescription')}
              </AlertDescription>
            </Alert>
          )}

          {!promoCompleted && (
            <>
              {loadingConfig ? (
                <div className="flex min-h-36 items-center justify-center">
                  <LoaderCircle className="h-7 w-7 animate-spin text-primary" aria-label={t('shipmentPayment.loading')} />
                </div>
              ) : !config || providers.length === 0 ? (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertTitle>{t('shipmentPayment.unavailableTitle')}</AlertTitle>
                  <AlertDescription>{error ?? t('shipmentPayment.unavailableDescription')}</AlertDescription>
                </Alert>
              ) : (
                <>
                  {!hasStarted && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('shipmentPayment.chooseProvider')}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('shipmentPayment.chooseProvider')}>
                          {providers.map((item) => {
                            const Icon = PROVIDER_ICONS[item];
                            const selected = provider === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => {
                                  setProvider(item);
                                  setError(null);
                                }}
                                className={cn(
                                  'flex min-h-20 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  selected
                                    ? 'border-primary bg-primary/10 text-foreground'
                                    : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                                )}
                              >
                                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="text-sm font-semibold">{t(`shipmentPayment.providers.${item}`)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {(provider === 'MTN' || provider === 'ORANGE') && (
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-foreground">{t('shipmentPayment.phoneLabel')}</span>
                          <Input
                            value={payerMsisdn}
                            onChange={(event) => setPayerMsisdn(event.target.value)}
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder={t('shipmentPayment.phonePlaceholder')}
                          />
                          <span className="block text-xs leading-5 text-muted-foreground">{t('shipmentPayment.phoneHint')}</span>
                        </label>
                      )}
                    </div>
                  )}

                  {attempt && (
                    <PaymentAttemptState attempt={attempt} />
                  )}

                  {attempt?.approvalUrl && attempt.status !== 'SUCCEEDED' && (
                    <Button asChild className="w-full gap-2">
                      <a href={attempt.approvalUrl} target="_blank" rel="noreferrer">
                        {t('shipmentPayment.continueProvider')}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}

                  {attempt?.clientSecret && provider === 'STRIPE' && stripePromise && attempt.status !== 'SUCCEEDED' && (
                    <Elements stripe={stripePromise} options={{ clientSecret: attempt.clientSecret }}>
                      <StripePaymentForm
                        paymentReference={attempt.reference}
                        onConfirmed={(payment) => {
                          setAttempt(payment);
                          void reportSuccess(payment);
                        }}
                        onError={setError}
                      />
                    </Elements>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <CircleAlert />
                      <AlertTitle>{t('shipmentPayment.errorTitle')}</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting || applyingPromo}>
            {isSuccessful ? t('shipmentPayment.close') : t('shipmentPayment.payLater')}
          </Button>
          {!promoCompleted && (!hasStarted || canRetry) ? (
            <Button type="button" onClick={() => void initiatePayment()} disabled={submitting || !provider || providers.length === 0} className="gap-2">
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {canRetry ? t('shipmentPayment.retry') : t('shipmentPayment.pay')}
            </Button>
          ) : !isSuccessful && !attempt?.clientSecret ? (
            <Button type="button" onClick={() => void checkPayment()} disabled={checking} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', checking && 'animate-spin')} />
              {t('shipmentPayment.check')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentAttemptState({ attempt }: { attempt: PaymentAttemptResponse }) {
  const { t } = useTranslation('dashboard');
  const successful = attempt.status === 'SUCCEEDED';
  const failed = ['FAILED', 'CANCELLED', 'EXPIRED'].includes(attempt.status);

  return (
    <Alert className={cn(successful && 'border-success/40 bg-success/10', failed && 'border-destructive/30')} variant={failed ? 'destructive' : 'default'}>
      {successful ? <CheckCircle2 /> : failed ? <CircleAlert /> : <LoaderCircle className="animate-spin" />}
      <AlertTitle>{t(`shipmentPayment.statuses.${attempt.status}`)}</AlertTitle>
      <AlertDescription>
        <p>{t(successful ? 'shipmentPayment.successDescription' : failed ? 'shipmentPayment.failedDescription' : 'shipmentPayment.pendingDescription')}</p>
        <p className="font-mono text-xs">{attempt.reference}</p>
        {attempt.failureReason && <p>{attempt.failureReason}</p>}
      </AlertDescription>
    </Alert>
  );
}

function StripePaymentForm({
  paymentReference,
  onConfirmed,
  onError,
}: {
  paymentReference: string;
  onConfirmed: (payment: PaymentAttemptResponse) => void;
  onError: (message: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('dashboard');
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
        onError(result.error.message ?? t('shipmentPayment.errors.card'));
        return;
      }
      const payment = await confirmShipmentPayment(token, 'STRIPE', paymentReference);
      onConfirmed(payment);
    } catch (paymentError) {
      onError(apiMessage(paymentError, t('shipmentPayment.errors.confirmation')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-background p-4">
      <PaymentElement />
      <Button type="submit" className="w-full gap-2" disabled={!stripe || submitting}>
        {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {t('shipmentPayment.confirmCard')}
      </Button>
    </form>
  );
}

function createIdempotencyKey(shipmentId: number) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `shipment-${shipmentId}-${random}`.slice(0, 120);
}

function getRemainingPlatformFee(shipment: Pick<Shipment, 'feeAmount' | 'discountAmount'>) {
  return Math.max((shipment.feeAmount ?? 0) - (shipment.discountAmount ?? 0), 0);
}

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
