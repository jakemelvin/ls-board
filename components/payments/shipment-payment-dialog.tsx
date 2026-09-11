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
import { MobileMoneyFields } from '@/components/payments/mobile-money-fields';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import {
  confirmShipmentPayment,
  getPaymentAttempt,
  getPaymentCountries,
  getPaymentConfiguration,
  getPaymentProviderCountries,
  getShipmentPaymentAttempts,
  initiateShipmentPayment,
} from '@/lib/payments/api';
import type {
  OnlinePaymentProvider,
  PaymentCountryResponse,
  PaymentAttemptResponse,
  PaymentPublicConfigResponse,
} from '@/lib/payments/types';
import { payShipmentWithPromoCode } from '@/lib/shipments/api';
import type { Shipment } from '@/lib/shipments/types';
import { cn } from '@/lib/utils';

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED']);
const STRIPE_FINALIZATION_DELAYS = [1_000, 2_000, 4_000, 8_000];

const PROVIDER_ICONS: Partial<Record<OnlinePaymentProvider, typeof Smartphone>> = {
  MTN: Smartphone, ORANGE: Smartphone, MOOV: Smartphone, WAVE: WalletCards,
  EXPRESSO: Smartphone, FREE: Smartphone, WLIGDICASH: Smartphone, CELTIIS: Smartphone,
  CORIS: Smartphone, TMONEY: Smartphone, AIRTEL: Smartphone, TELECEL: Smartphone,
  MPESA: Smartphone, AFRIMONEY: Smartphone,
  PAYPAL: WalletCards,
  STRIPE: CreditCard,
};

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
  const [countries, setCountries] = useState<PaymentCountryResponse[]>([]);
  const [provider, setProvider] = useState<OnlinePaymentProvider | null>(null);
  const [country, setCountry] = useState('');
  const [payerMsisdn, setPayerMsisdn] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoShipment, setPromoShipment] = useState<Shipment | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoCompleted, setPromoCompleted] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<PaymentAttemptResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isStripeFinalizing, setIsStripeFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportedSuccessReference = useRef<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const stripeFinalizationPollRef = useRef(0);

  const selectedCountry = useMemo(
    () => countries.find((item) => item.code === country),
    [countries, country],
  );
  const mobileMethods = useMemo(
    () => (selectedCountry?.localOperators ?? []).filter((item) => item.enabled !== false),
    [selectedCountry],
  );
  const selectedMethod = useMemo(
    () => mobileMethods.find((item) => item.provider === provider),
    [mobileMethods, provider],
  );
  const providers = useMemo(() => {
    const configured = new Set(config?.providers ?? []);
    const countryProviders = selectedCountry?.availableProviders
      ?? [...mobileMethods.map((item) => item.provider), ...(selectedCountry?.globalProviders ?? [])];
    return countryProviders.filter(
      (item) => configured.has(item) && (item !== 'STRIPE' || config?.stripePublishableKey),
    );
  }, [config, mobileMethods, selectedCountry]);

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
      onOpenChange(false);
    },
    [onOpenChange, onPaymentSucceeded, t],
  );

  useEffect(() => {
    if (!open || !token) return;

    let cancelled = false;
    setLoadingConfig(true);
    setConfig(null);
    setCountries([]);
    setProvider(null);
    setCountry('');
    setAttempt(null);
    setPayerMsisdn('');
    setOtpCode('');
    setPromoCode('');
    setPromoShipment(null);
    setApplyingPromo(false);
    setPromoCompleted(false);
    setPromoError(null);
    setError(null);
    reportedSuccessReference.current = null;
    idempotencyKeyRef.current = null;
    stripeFinalizationPollRef.current = 0;
    setIsStripeFinalizing(false);

    Promise.all([getPaymentConfiguration(token), getPaymentCountries(token), getShipmentPaymentAttempts(token, shipment.id)])
      .then(async ([response, paymentCountries, attempts]) => {
        if (cancelled) return;
        setConfig(response);
        let resolvedCountries = paymentCountries;
        // Legacy servers only expose the provider-centric endpoint. Keep that
        // contract usable while preferring the country-first catalogue.
        if (resolvedCountries.length === 0 && (response.providers ?? []).includes('MTN')) {
          const legacy = await getPaymentProviderCountries(token, 'MTN');
          resolvedCountries = legacy.map((item) => ({
            ...item,
            localOperators: item.provider ? [{
              provider: item.provider,
              name: item.operatorName,
              enabled: item.enabled,
              confirmationMode: item.confirmationMode,
              otpRequired: item.otpRequired,
            }] : [],
            availableProviders: item.provider ? [item.provider] : [],
          }));
        }
        if (cancelled) return;
        setCountries(resolvedCountries);
        const defaultCountry = resolvedCountries.find((item) => item.code === 'CM') ?? resolvedCountries[0];
        setCountry(defaultCountry?.code ?? '');
        const latestAttempt = attempts[0] ?? null;
        setAttempt(latestAttempt);
        const configured = new Set(response.providers ?? []);
        const latestProvider = latestAttempt?.provider;
        const firstProvider = defaultCountry?.availableProviders?.find(
          (item) => configured.has(item) && (item !== 'STRIPE' || response.stripePublishableKey),
        ) ?? defaultCountry?.localOperators?.find((item) => item.enabled !== false && configured.has(item.provider))?.provider;
        setProvider(
          latestProvider && !['PROMO_CODE', 'COLLECTION_POINT'].includes(latestProvider)
            ? latestProvider as OnlinePaymentProvider
            : firstProvider ?? null,
        );
        if (latestAttempt && needsStripeClientSecret(latestAttempt)) {
          setError(t('shipmentPayment.errors.cardSetup'));
        }
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
      confirmShipmentPayment(token, provider, attempt.reference)
        .then((payment) => {
          setAttempt(payment);
          if (TERMINAL_STATUSES.has(payment.status)) idempotencyKeyRef.current = null;
          setError(null);
          void reportSuccess(payment);
        })
        .catch(() => undefined);
    }, 6_000);

    return () => window.clearTimeout(timer);
  }, [attempt, open, provider, reportSuccess, token]);

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
        .then((payment) => {
          if (cancelled) return;
          setAttempt(payment);
          if (TERMINAL_STATUSES.has(payment.status)) {
            idempotencyKeyRef.current = null;
            setIsStripeFinalizing(false);
            void reportSuccess(payment);
          } else {
            stripeFinalizationPollRef.current += 1;
          }
        })
        .catch(() => {
          if (!cancelled) setIsStripeFinalizing(false);
        });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt, isStripeFinalizing, open, reportSuccess, token]);

  const handleStripeConfirmed = useCallback(
    async (payment: PaymentAttemptResponse) => {
      setAttempt(payment);
      if (TERMINAL_STATUSES.has(payment.status)) {
        idempotencyKeyRef.current = null;
        setIsStripeFinalizing(false);
        await reportSuccess(payment);
        return;
      }

      stripeFinalizationPollRef.current = 0;
      setIsStripeFinalizing(true);
    },
    [reportSuccess],
  );

  async function initiatePayment() {
    if (!token || !provider) return;

    const isMobileMoney = provider !== 'PAYPAL' && provider !== 'STRIPE';
    if (isMobileMoney) {
      if (!country) {
        setError(t('shipmentPayment.errors.countryRequired'));
        return;
      }
      if (payerMsisdn.trim().length < 6) {
        setError(t('shipmentPayment.errors.phoneRequired'));
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const payment = await initiateShipmentPayment(token, provider, shipment.id, {
        country: isMobileMoney ? country : undefined,
        payerMsisdn: isMobileMoney ? payerMsisdn.trim() : undefined,
        idempotencyKey: idempotencyKeyRef.current ??= createIdempotencyKey(shipment.id),
        otpCode: otpCode || undefined,
        description: `Platform fee for shipment ${shipment.reference ?? `#${shipment.id}`}`,
      });
      setAttempt(payment);
      if (payment.status !== 'REQUIRES_ACTION') setOtpCode('');
      if (TERMINAL_STATUSES.has(payment.status)) idempotencyKeyRef.current = null;
      if (needsStripeClientSecret(payment)) {
        setError(t('shipmentPayment.errors.cardSetup'));
      }
      await reportSuccess(payment);
    } catch (paymentError) {
      setError(apiMessage(paymentError, t('shipmentPayment.errors.initiation')));
    } finally {
      setSubmitting(false);
    }
  }

  async function checkPayment() {
    if (!token || !attempt || !provider || attempt.provider === 'STRIPE') return;
    setChecking(true);
    setError(null);
    try {
      const payment = await confirmShipmentPayment(token, provider, attempt.reference);
      setAttempt(payment);
      if (TERMINAL_STATUSES.has(payment.status)) idempotencyKeyRef.current = null;
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
  const isSuccessful = attempt?.status === 'SUCCEEDED' || promoCompleted;
  const canRetry = attempt ? ['FAILED', 'CANCELLED', 'EXPIRED'].includes(attempt.status) : false;
  const hasActiveAttempt = Boolean(attempt && !TERMINAL_STATUSES.has(attempt.status));
  const stripeClientSecret = attempt?.provider === 'STRIPE' ? attempt.clientSecret : undefined;
  const requiresOtp = attempt?.status === 'REQUIRES_ACTION'
    && (attempt.providerDetails?.confirmationMode === 'OTP_CODE' || attempt.providerDetails?.otpRequired);
  const providerLink = attempt?.providerDetails?.providerLink ?? attempt?.approvalUrl;

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

          {!promoCompleted && !hasActiveAttempt && (
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
                  {!hasActiveAttempt && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('shipmentPayment.chooseProvider')}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('shipmentPayment.chooseProvider')}>
                           {providers.map((item) => {
                             const Icon = PROVIDER_ICONS[item] ?? Smartphone;
                            const selected = provider === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => {
                                  setProvider(item);
                                  setCountry('');
                                  setPayerMsisdn('');
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
                                 <span className="text-sm font-semibold">{providerLabel(item, selectedCountry, t)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                       {provider && provider !== 'PAYPAL' && provider !== 'STRIPE' && (
                         <MobileMoneyFields
                           countries={countries}
                           country={country}
                           payerMsisdn={payerMsisdn}
                           method={selectedMethod}
                           onCountryChange={(nextCountry) => {
                             setCountry(nextCountry);
                             const next = countries.find((item) => item.code === nextCountry);
                             const nextProvider = next?.localOperators?.find((item) => item.enabled !== false)?.provider
                               ?? next?.availableProviders?.find((item) => item !== 'PAYPAL' && item !== 'STRIPE')
                               ?? next?.globalProviders?.[0]
                               ?? null;
                             setProvider(nextProvider);
                             setPayerMsisdn('');
                           }}
                           onPayerMsisdnChange={setPayerMsisdn}
                           labels={{
                            countryLabel: t('shipmentPayment.countryLabel'),
                            countryPlaceholder: t('shipmentPayment.countryPlaceholder'),
                            phoneLabel: t('shipmentPayment.phoneLabel'),
                            phonePlaceholder: t('shipmentPayment.phonePlaceholder'),
                            phoneHint: t('shipmentPayment.phoneHint'),
                             otpRequired: t('shipmentPayment.otpRequired'),
                          }}
                        />
                      )}
                    </div>
                  )}

                  {attempt && (
                    <PaymentAttemptState attempt={attempt} />
                  )}

                   {requiresOtp && (
                     <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
                       <label className="block space-y-1.5">
                         <span className="text-sm font-semibold text-foreground">{t('shipmentPayment.otpLabel')}</span>
                         <Input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, attempt!.providerDetails?.otpLength ?? 6))} inputMode="numeric" autoComplete="one-time-code" placeholder={t('shipmentPayment.otpPlaceholder')} />
                       </label>
                       {(attempt.providerDetails?.customerInstruction ?? attempt.providerDetails?.pendingAction ?? attempt.providerDetails?.ussdCode) && <p className="text-sm text-muted-foreground">{attempt.providerDetails?.customerInstruction ?? attempt.providerDetails?.pendingAction ?? attempt.providerDetails?.ussdCode}</p>}
                     </div>
                   )}

                   {providerLink && attempt?.status !== 'SUCCEEDED' && (
                     <Button asChild className="w-full gap-2">
                       <a href={providerLink} target="_blank" rel="noreferrer">
                        {t('shipmentPayment.continueProvider')}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}

                  {attempt && stripeClientSecret && stripePromise && attempt.status !== 'SUCCEEDED' && (
                    <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                      <StripePaymentForm
                        paymentReference={attempt.reference}
                        onConfirmed={(payment) => void handleStripeConfirmed(payment)}
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
          {!promoCompleted && (!hasActiveAttempt || canRetry || requiresOtp) ? (
            <Button type="button" onClick={() => void initiatePayment()} disabled={submitting || !provider || providers.length === 0 || (provider !== 'PAYPAL' && provider !== 'STRIPE' && (!country || (requiresOtp && otpCode.length !== (attempt?.providerDetails?.otpLength ?? 6))))} className="gap-2">
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {requiresOtp ? t('shipmentPayment.submitOtp') : canRetry ? t('shipmentPayment.retry') : t('shipmentPayment.pay')}
            </Button>
          ) : !isSuccessful && attempt?.provider !== 'STRIPE' && !attempt?.clientSecret ? (
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
        {attempt.providerDetails?.pendingAction && <p>{attempt.providerDetails.pendingAction}</p>}
        {!successful && !failed && attempt.providerDetails?.message && <p>{attempt.providerDetails.message}</p>}
        {attempt.providerAmount !== undefined && attempt.providerCurrency && (
          <p>{t('shipmentPayment.walletDebit', { values: { amount: formatPaymentAmount(attempt.providerAmount, attempt.providerCurrency) } })}</p>
        )}
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

function formatPaymentAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function providerLabel(
  provider: OnlinePaymentProvider,
  country: PaymentCountryResponse | undefined,
  t: (key: string) => string,
) {
  const method = country?.localOperators?.find((item) => item.provider === provider);
  if (method?.name) return method.name;
  const translated = t(`shipmentPayment.providers.${provider}`);
  return translated === `shipmentPayment.providers.${provider}` ? provider : translated;
}

function needsStripeClientSecret(attempt: PaymentAttemptResponse) {
  return (
    attempt.provider === 'STRIPE' &&
    !TERMINAL_STATUSES.has(attempt.status) &&
    !attempt.clientSecret &&
    !attempt.approvalUrl
  );
}

function getRemainingPlatformFee(shipment: Pick<Shipment, 'feeAmount' | 'discountAmount'>) {
  return Math.max((shipment.feeAmount ?? 0) - (shipment.discountAmount ?? 0), 0);
}

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
